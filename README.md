# Priorix Backend

Sistema de gestión de productividad personal con arquitectura de microservicios, implementando patrones de resiliencia y observabilidad.

## Arquitectura del Sistema

### Microservicios

- **priorix-core**: API principal de negocio (actividades, tareas, planificación)
- **priorix-gamification**: API de gamificación y estadísticas
- **Nginx**: Proxy reverso y balanceador de carga

### Tecnologías

- **Framework**: Laravel 11 con PHP 8.3
- **Base de Datos**: MySQL para datos persistentes
- **Cache/Sesiones**: Redis
- **Autenticación**: JWT (JSON Web Tokens)
- **Contenerización**: Docker + Docker Compose
- **Observabilidad**: OpenTelemetry + Jaeger + Prometheus + Grafana

### Patrones Implementados

- **Circuit Breaker**: Resiliencia en comunicación inter-servicios
- **Service Layer**: Separación de lógica de negocio
- **Repository Pattern**: Abstracción de capa de datos
- **JWT Authentication**: Autenticación stateless
- **Tracing Distribuido**: Seguimiento de requests con OpenTelemetry

## Implementaciones Completas

### Arquitectura REST - Rutas API

**`priorix-core/routes/api.php` - Definición completa de rutas**

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\PlannerController;
use Illuminate\Support\Facades\Route;

// ========== RUTAS PÚBLICAS ==========
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// ========== RUTAS PROTEGIDAS JWT ==========
Route::middleware('jwt.auth')->group(function () {

    // Auth protegidas
    Route::prefix('auth')->group(function () {
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::post('logout',  [AuthController::class, 'logout']);
        Route::get('me',       [AuthController::class, 'me']);
    });

    // Activities CRUD + custom
    Route::apiResource('activities', ActivityController::class);
    Route::post('activities/{id}/complete', [ActivityController::class, 'complete']);

    // Tasks CRUD + custom
    Route::apiResource('tasks', TaskController::class);
    Route::post('tasks/{id}/complete', [TaskController::class, 'complete']);
    Route::get('tasks/date-range', [TaskController::class, 'getByDateRange']);
    Route::get('tasks/today/pending', [TaskController::class, 'getTodayPending']);

    // Planner
    Route::prefix('planner')->group(function () {
        Route::post('generate-weekly', [PlannerController::class, 'generateWeeklyPlan']);
        Route::post('reschedule-activity/{activityId}', [PlannerController::class, 'rescheduleActivity']);
    });
});
```

**`priorix-gamification/routes/api.php` - Rutas de gamificación**

```php
<?php

use App\Http\Controllers\GamificationController;
use App\Http\Controllers\StatisticsController;
use Illuminate\Support\Facades\Route;

// ========== RUTAS GAMIFICACIÓN ==========
Route::get('gamification/pet',                    [GamificationController::class, 'getPetStatus']);
Route::post('gamification/update-experience',     [GamificationController::class, 'updateExperience']);
Route::get('statistics/weekly',                   [StatisticsController::class, 'weekly']);
Route::post('statistics/record-activity',         [StatisticsController::class, 'recordActivity']);
```

### Patrón Circuit Breaker - Implementación Completa

**`priorix-core/app/Infrastructure/Resilience/CircuitBreaker.php`**

```php
<?php

namespace App\Infrastructure\Resilience;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class CircuitBreaker
{
    private const CLOSED    = 'CLOSED';
    private const OPEN      = 'OPEN';
    private const HALF_OPEN = 'HALF_OPEN';

    private int $failureThreshold;
    private int $recoveryTime;

    public function __construct(private readonly string $serviceName)
    {
        $this->failureThreshold = config('resilience.circuit_breaker.failure_threshold', 3);
        $this->recoveryTime     = config('resilience.circuit_breaker.recovery_time', 30);
    }

    public function call(callable $action, callable $fallback): mixed
    {
        $state = $this->getState();

        Log::info("CircuitBreaker [{$this->serviceName}]: state={$state}");

        if ($state === self::OPEN)      return $fallback(null);
        if ($state === self::HALF_OPEN) return $this->executeHalfOpen($action, $fallback);

        return $this->executeNormal($action, $fallback);
    }

    private function executeNormal(callable $action, callable $fallback): mixed
    {
        try {
            $result = $action();
            $this->recordSuccess();
            return $result;
        } catch (\Exception $e) {
            $this->recordFailure();

            if ($this->getFailureCount() >= $this->failureThreshold) {
                $this->openCircuit();
                Log::critical("CircuitBreaker [{$this->serviceName}]: OPENED after {$this->failureThreshold} failures");
            }

            return $fallback($e);
        }
    }

    private function executeHalfOpen(callable $action, callable $fallback): mixed
    {
        try {
            $result = $action();
            $this->closeCircuit();
            Log::info("CircuitBreaker [{$this->serviceName}]: CLOSED (recovered)");
            return $result;
        } catch (\Exception $e) {
            $this->openCircuit();
            Log::warning("CircuitBreaker [{$this->serviceName}]: REOPENED after failed probe");
            return $fallback($e);
        }
    }

    private function getState(): string
    {
        $state = Redis::get($this->stateKey());

        if ($state === self::OPEN) {
            $openedAt = (int) Redis::get($this->openedAtKey());
            if (time() - $openedAt >= $this->recoveryTime) {
                $this->setHalfOpen();
                return self::HALF_OPEN;
            }
        }

        return $state ?? self::CLOSED;
    }

    private function recordFailure(): void
    {
        Redis::incr($this->failureKey());
        Redis::expire($this->failureKey(), $this->recoveryTime * 2);
    }

    private function recordSuccess(): void
    {
        Redis::del($this->failureKey());
    }

    private function getFailureCount(): int
    {
        return (int) Redis::get($this->failureKey());
    }

    private function openCircuit(): void
    {
        Redis::set($this->stateKey(), self::OPEN);
        Redis::set($this->openedAtKey(), time());
        Redis::del($this->failureKey());
    }

    private function closeCircuit(): void
    {
        Redis::del($this->stateKey());
        Redis::del($this->openedAtKey());
        Redis::del($this->failureKey());
    }

    private function setHalfOpen(): void
    {
        Redis::set($this->stateKey(), self::HALF_OPEN);
    }

    public function getStatus(): array
    {
        return [
            'service'       => $this->serviceName,
            'state'         => $this->getState(),
            'failure_count' => $this->getFailureCount(),
            'opened_at'     => Redis::get($this->openedAtKey()),
        ];
    }

    private function stateKey(): string    { return "cb:{$this->serviceName}:state"; }
    private function openedAtKey(): string { return "cb:{$this->serviceName}:opened_at"; }
    private function failureKey(): string  { return "cb:{$this->serviceName}:failures"; }
}
```

### Cliente HTTP Resiliente - Implementación Completa

**`priorix-core/app/Infrastructure/Http/ResilientHttpClient.php`**

```php
<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Resilience\CircuitBreaker;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Prometheus\CollectorRegistry;

class ResilientHttpClient
{
    private int $timeout;
    private array $breakers = [];

    public function __construct(
        private CollectorRegistry $registry
    ) {
        $this->timeout = config('resilience.circuit_breaker.timeout', 5);
    }

    public function post(string $url, array $data = [], ?string $token = null, ?callable $fallback = null, ?int $userId = null): array
    {
        $breaker = $this->getBreaker($this->extractServiceName($url));

        $action = function () use ($url, $data, $token, $userId) {
            $internalSecret = config('resilience.internal_service_secret');

            $headers = [
                'X-Internal-Service'        => 'priorix-core',
                'X-Internal-Service-Secret' => $internalSecret,
                'Accept'                    => 'application/json',
            ];

            if ($userId !== null) {
                $headers['X-Internal-User-Id'] = (string) $userId;
            }

            Log::debug('ResilientHttpClient.post', [
                'url' => $url,
                'headers_set' => [
                    'X-Internal-Service'        => 'priorix-core',
                    'X-Internal-Service-Secret' => $internalSecret ? 'present' : 'null',
                    'X-Internal-User-Id'        => $userId ?? 'null',
                ],
            ]);

            if ($token) {
                $headers['Authorization'] = "Bearer {$token}";
            }

            $response = Http::timeout($this->timeout)
                ->withHeaders($headers)
                ->post($url, $data);

            if ($response->failed()) {
                $message = "HTTP {$response->status()} from {$url}";
                $body = trim($response->body());
                if ($body !== '') {
                    $message .= " - {$body}";
                }
                throw new \RuntimeException($message);
            }

            return $response->json();
        };

        $defaultFallback = $fallback ?? function (?\Throwable $exception = null) use ($url) {
            Log::warning("Using fallback for {$url}" . ($exception ? ": {$exception->getMessage()}" : ''));
            return [
                'status'              => 'fallback',
                'service_unavailable' => true,
                'reason'              => $exception?->getMessage(),
            ];
        };

        $result = $breaker->call($action, $defaultFallback);
        $this->updateCircuitBreakerMetric($this->extractServiceName($url), $breaker);
        return $result;
    }

    public function get(string $url, array $query = [], ?string $token = null, ?callable $fallback = null): array
    {
        $breaker = $this->getBreaker($this->extractServiceName($url));

        $action = function () use ($url, $query, $token) {
            $headers = [
                'X-Internal-Service'        => 'priorix-core',
                'X-Internal-Service-Secret' => config('resilience.internal_service_secret'),
                'Accept'                    => 'application/json',
            ];

            if ($token) {
                $headers['Authorization'] = "Bearer {$token}";
            }

            $response = Http::timeout($this->timeout)
                ->withHeaders($headers)
                ->get($url, $query);

            if ($response->failed()) {
                $message = "HTTP {$response->status()} from {$url}";
                $body = trim($response->body());
                if ($body !== '') {
                    $message .= " - {$body}";
                }
                throw new \RuntimeException($message);
            }

            return $response->json();
        };

        $defaultFallback = $fallback ?? function (?\Throwable $exception = null) use ($url) {
            Log::warning("Using fallback for {$url}" . ($exception ? ": {$exception->getMessage()}" : ''));
            return [
                'status'              => 'fallback',
                'service_unavailable' => true,
                'reason'              => $exception?->getMessage(),
            ];
        };

        $result = $breaker->call($action, $defaultFallback);
        $this->updateCircuitBreakerMetric($this->extractServiceName($url), $breaker);
        return $result;
    }

    public function getAllBreakersStatus(): array
    {
        return array_map(
            fn(CircuitBreaker $b) => $b->getStatus(),
            $this->breakers
        );
    }

    private function getBreaker(string $name): CircuitBreaker
    {
        if (!isset($this->breakers[$name])) {
            $this->breakers[$name] = new CircuitBreaker($name);
        }
        return $this->breakers[$name];
    }

    private function extractServiceName(string $url): string
    {
        $path     = parse_url($url, PHP_URL_PATH);
        $segments = explode('/', trim($path, '/'));
        $idx      = array_search('api', $segments);
        return $segments[$idx + 1] ?? 'unknown';
    }

    private function updateCircuitBreakerMetric(string $service, CircuitBreaker $breaker): void
    {
        $stateMap = [
            'CLOSED'    => 0,
            'OPEN'      => 1,
            'HALF_OPEN' => 2,
        ];

        $status = $breaker->getStatus();
        $state  = $stateMap[$status['state'] ?? 'closed'] ?? 0;

        $this->registry
            ->getOrRegisterGauge(
                config('prometheus.prefix'),
                'circuit_breaker_state',
                'Estado del circuit breaker por servicio (0=closed, 1=open, 2=half-open)',
                ['service']
            )
            ->set($state, [$service]);
    }
}
```

### Sistema de Autenticación JWT - Implementación Completa

**`priorix-core/app/Http/Controllers/AuthController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $result = $this->authService->register($data);
        return response()->json($result, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            $result = $this->authService->login($data['email'], $data['password']);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }

        return response()->json($result);
    }

    public function me(): JsonResponse
    {
        return response()->json($this->authService->me());
    }

    public function refresh(): JsonResponse
    {
        return response()->json($this->authService->refresh());
    }

    public function logout(): JsonResponse
    {
        $this->authService->logout();
        return response()->json(['message' => 'Sesión cerrada']);
    }
}
```

**`priorix-core/app/Services/Auth/AuthService.php`**

```php
<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $token = JWTAuth::fromUser($user);

        return $this->buildTokenResponse($token, $user);
    }

    public function login(string $email, string $password): array
    {
        $credentials = ['email' => $email, 'password' => $password];

        if (!$token = auth('api')->attempt($credentials)) {
            throw new \RuntimeException('Credenciales inválidas', 401);
        }

        return $this->buildTokenResponse($token, auth('api')->user());
    }

    public function refresh(): array
    {
        $token = auth('api')->refresh();
        return $this->buildTokenResponse($token, auth('api')->user());
    }

    public function logout(): void
    {
        auth('api')->logout();
    }

    public function me(): User
    {
        return auth('api')->user();
    }

    private function buildTokenResponse(string $token, User $user): array
    {
        return [
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => config('jwt.ttl') * 60,
            'user'         => $user,
        ];
    }
}
```

**`priorix-core/app/Http/Middleware/JwtAuthMiddleware.php`**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            JWTAuth::parseToken()->authenticate();
        } catch (TokenExpiredException) {
            return response()->json(['error' => 'Token expirado'], 401);
        } catch (TokenInvalidException) {
            return response()->json(['error' => 'Token inválido'], 401);
        } catch (JWTException) {
            return response()->json(['error' => 'Token ausente'], 401);
        }

        return $next($request);
    }
}
```

### Modelos Eloquent - Implementación Completa

**`priorix-core/app/Models/User.php`**

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable;

    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = ['password' => 'hashed'];

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'name'  => $this->name,
            'email' => $this->email,
        ];
    }
}
```

**`priorix-core/app/Models/Activity.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    protected $fillable = [
        'user_id', 'title', 'type', 'description',
        'estimated_minutes', 'max_session_minutes', 'max_sessions',
        'priority', 'label', 'is_fixed', 'repeats_weekly',
        'deadline', 'status',
    ];

    protected $casts = [
        'deadline'       => 'datetime',
        'is_fixed'       => 'boolean',
        'repeats_weekly' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function focusSessions(): HasMany
    {
        return $this->hasMany(FocusSession::class);
    }

    public function markAsCompleted(): void
    {
        $this->update(['status' => 'completed']);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}
```

### Servicio de Actividades - Implementación Completa

**`priorix-core/app/Http/Controllers/ActivityController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Services\Activity\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    public function __construct(private readonly ActivityService $activityService) {}

    public function index(Request $request): JsonResponse
    {
        $activities = $this->activityService->getActivitiesByUser(auth('api')->id());

        return response()->json($activities);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateActivity($request);

        $activity = $this->activityService->createActivity($data, auth('api')->id());

        return response()->json($activity, 201);
    }

    public function show(int $id): JsonResponse
    {
        $activity = $this->activityService->getActivity($id, auth('api')->id());

        return response()->json($activity);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $this->validateActivity($request, true);

        $activity = $this->activityService->updateActivity($id, auth('api')->id(), $data);

        return response()->json($activity);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->activityService->deleteActivity($id, auth('api')->id());

        return response()->json(null, 204);
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $result = $this->activityService->completeActivity($id, auth('api')->id());

        return response()->json($result);
    }

    private function validateActivity(Request $request, bool $isUpdate = false): array
    {
        $rules = [
            'title' => $isUpdate ? 'sometimes|string|max:255' : 'required|string|max:255',
            'type' => $isUpdate ? 'sometimes|string|max:100' : 'required|string|max:100',
            'description' => 'sometimes|nullable|string',
            'estimated_minutes' => 'sometimes|nullable|integer|min:0',
            'max_session_minutes' => 'sometimes|nullable|integer|min:0',
            'max_sessions' => 'sometimes|nullable|integer|min:0',
            'priority' => 'sometimes|nullable|string|in:alta,media,baja',
            'label' => 'sometimes|nullable|string|max:100',
            'is_fixed' => 'sometimes|boolean',
            'repeats_weekly' => 'sometimes|boolean',
            'deadline' => 'sometimes|nullable|date',
            'status' => 'sometimes|nullable|string|max:50',
        ];

        return $request->validate($rules);
    }
}
```

**`priorix-core/app/Services/Activity/ActivityService.php`**

```php
<?php

namespace App\Services\Activity;

use App\Models\Activity;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;
use App\Infrastructure\Observability\TracingService;

class ActivityService
{
    public function __construct(
        private ResilientHttpClient $httpClient,
        private TracingService $tracing,
    ) {}

    public function getActivitiesByUser(int $userId)
    {
        return Activity::where('user_id', $userId)->get();
    }

    public function createActivity(array $data, int $userId): Activity
    {
        $data['user_id'] = $userId;

        return Activity::create($data);
    }

    public function getActivity(int $activityId, int $userId): Activity
    {
        return Activity::where('id', $activityId)
            ->where('user_id', $userId)
            ->firstOrFail();
    }

    public function updateActivity(int $activityId, int $userId, array $data): Activity
    {
        $activity = $this->getActivity($activityId, $userId);
        $activity->update($data);

        return $activity;
    }

    public function deleteActivity(int $activityId, int $userId): void
    {
        $this->getActivity($activityId, $userId)->delete();
    }

    public function completeActivity(int $activityId, int $userId): array
    {
        return $this->tracing->trace('activity.complete', function () use ($activityId, $userId) {

            $activity = $this->tracing->trace('activity.fetch', fn() =>
                $this->getActivity($activityId, $userId)
            , ['activity.id' => $activityId]);

            $this->tracing->trace('activity.mark_completed', fn() =>
                $activity->markAsCompleted()
            , ['activity.priority' => $activity->priority]);

            $xpReward = $this->calculateXpReward($activity);

            $gamificationResult = $this->tracing->trace('gamification.update_experience', fn() =>
                $this->notifyGamification($userId, $activity, $xpReward)
            , ['xp.reward' => $xpReward]);

            $statisticsResult = $this->tracing->trace('statistics.record_activity', fn() =>
                $this->notifyStatistics($userId, $activity)
            , ['activity.id' => $activity->id]);

            return ['activity' => $activity, 'gamification' => $gamificationResult, 'statistics' => $statisticsResult];

        }, ['activity.id' => $activityId, 'user.id' => $userId]);
    }

    private function notifyGamification(int $userId, Activity $activity, int $xpReward): array
    {
        try {
            $url = rtrim(config('resilience.services.gamification'), '/');
            return $this->httpClient->post(
                "{$url}/update-experience",
                [
                    'user_id' => $userId,
                    'type' => 'activity_completed',
                    'xp_reward' => $xpReward,
                ],
                userId: $userId
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify gamification: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function notifyStatistics(int $userId, Activity $activity): array
    {
        try {
            $url = rtrim(config('resilience.services.statistics'), '/');
            return $this->httpClient->post(
                "{$url}/record-activity",
                [
                    'user_id' => $userId,
                    'activity_id' => $activity->id,
                ],
                userId: $userId
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify statistics: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function calculateXpReward(Activity $activity): int
    {
        $priorityMap = ['baja' => 10, 'media' => 20, 'alta' => 30];
        $baseXp = $priorityMap[$activity->priority] ?? 10;

        $estimatedBonus = min(50, (int) ($activity->estimated_minutes / 10));

        return $baseXp + $estimatedBonus;
    }
}
```

### Sistema de Tracing Distribuido - Implementación Completa

**`priorix-core/app/Infrastructure/Observability/TracingService.php`**

```php
<?php
namespace App\Infrastructure\Observability;

use OpenTelemetry\API\Trace\SpanInterface;
use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SemConventions\TraceAttributes;

class TracingService
{
    private TracerInterface $tracer;

    public function __construct()
    {
        $transport = (new OtlpHttpTransportFactory())->create(
            config('tracing.jaeger_endpoint', 'http://jaeger:4318/v1/traces'),
            'application/x-protobuf'
        );

        $exporter = new SpanExporter($transport);

        $provider = new TracerProvider(
            new SimpleSpanProcessor($exporter),
            null,
            ResourceInfo::create(Attributes::create([
                'service.name' => 'priorix-core',
            ]))
        );

        $this->tracer = $provider->getTracer('priorix-core');
    }

    public function startSpan(string $name): SpanInterface
    {
        return $this->tracer->spanBuilder($name)->startSpan();
    }

    public function trace(string $name, callable $callback, array $attributes = []): mixed
  {
      $span  = $this->startSpan($name);
      $scope = $span->activate();

      foreach ($attributes as $key => $value) {
          $span->setAttribute($key, $value);
      }

      try {
          $result = $callback($span);
          $span->setStatus(\OpenTelemetry\API\Trace\StatusCode::STATUS_OK);
          return $result;
      } catch (\Throwable $e) {
          $span->recordException($e);
          $span->setStatus(\OpenTelemetry\API\Trace\StatusCode::STATUS_ERROR, $e->getMessage());
          throw $e;
      } finally {
          $scope->detach();
          $span->end();
      }
  }
}
```

### Base de Datos

| Variable        | Descripción   | Valor                                   |
| --------------- | ------------- | --------------------------------------- |
| `DB_CONNECTION` | Tipo de BD    | `mysql`                                 |
| `DB_HOST`       | Host MySQL    | `mysql-core` / `mysql-gamification`     |
| `DB_DATABASE`   | Nombre BD     | `priorix_core` / `priorix_gamification` |
| `DB_USERNAME`   | Usuario BD    | `priorix`                               |
| `DB_PASSWORD`   | Contraseña BD | `secret`                                |

### Autenticación y Seguridad

| Variable                  | Descripción          | Valor                                                              |
| ------------------------- | -------------------- | ------------------------------------------------------------------ |
| `JWT_SECRET`              | Clave JWT            | `doDEtIR5D2y6DJ7ws7zrMX3QT79FgMleOkUvcU2dZcnvx4ZqhYA3ouNa3tKZlqZD` |
| `INTERNAL_SERVICE_SECRET` | Comunicación interna | `MHJ9q5+s0YeULKmD0F+DcvXcUgjhI9/GXjX5XqGEg7Q=`                     |

### Servicios Externos (Core)

| Variable                   | Descripción      | Valor                                  |
| -------------------------- | ---------------- | -------------------------------------- |
| `GAMIFICATION_SERVICE_URL` | URL gamificación | `http://gamification/api/gamification` |
| `STATISTICS_SERVICE_URL`   | URL estadísticas | `http://gamification/api/statistics`   |

### Circuit Breaker (Core)

| Variable               | Descripción         | Valor |
| ---------------------- | ------------------- | ----- |
| `CB_FAILURE_THRESHOLD` | Umbral fallos       | `3`   |
| `CB_RECOVERY_TIME`     | Tiempo recuperación | `30`  |
| `CB_TIMEOUT`           | Timeout HTTP        | `5`   |

### Variables Requeridas

Las siguientes variables son **obligatorias** para el funcionamiento:

- `APP_KEY` - Clave de aplicación Laravel
- `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET` - Para autenticación de usuarios
- `REDIS_HOST`, `REDIS_PORT` - Para caché y sesiones

## Tecnologías Implementadas

### Framework y Lenguaje

- **Laravel 11** - Framework PHP moderno para desarrollo web
- **PHP 8.3** - Última versión del lenguaje con características avanzadas

### Base de Datos y Cache

- **MySQL 8.0** - Sistema de gestión de bases de datos relacional
- **Redis** - Almacenamiento en memoria para caché y sesiones

### Arquitectura de Microservicios

- **Servicio Core** (puerto 8000) - API principal de negocio
- **Servicio Gamification** (puerto 8001) - API de gamificación
- **Nginx** - Proxy reverso y balanceador de carga

### Observabilidad y Monitoreo

- **Prometheus** - Recolección y almacenamiento de métricas
- **Grafana** - Visualización de métricas y dashboards
- **Jaeger** - Sistema de trazabilidad distribuida (OpenTelemetry)

### Contenedores y Orquestación

- **Docker** - Contenerización de aplicaciones
- **Docker Compose** - Orquestación de servicios multi-contenedor

### Patrones de Diseño Implementados

- **JWT Authentication** - Autenticación stateless con tokens
- **Circuit Breaker** - Patrón de resiliencia para fallos de servicios
- **Repository Pattern** - Abstracción de la capa de datos
- **Service Layer** - Separación de la lógica de negocio

#### Tracing con Jaeger

Visualiza traces en:

- `http://your-domain.com/jaeger`

### Estrategias de Backup

#### Base de Datos

```bash
# Backup manual
docker exec priorix_mysql-core mysqldump -u priorix -p priorix_core > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker exec -i priorix_mysql-core mysql -u priorix -p priorix_core < backup_file.sql
```

#### Redis

```bash
# Backup Redis
docker exec priorix_redis redis-cli --rdb /data/backup.rdb

# Backup de configuración
docker exec priorix_redis redis-cli CONFIG GET "*" > redis_config_$(date +%Y%m%d_%H%M%S).txt
```

## Seguridad

### Autenticación y Autorización

- **JWT Tokens**: Implementación segura con expiración configurable
- **Middleware de Autenticación**: Protección automática de rutas
- **Validación de Tokens**: Verificación completa en cada request

### Manejo de Secrets

#### Variables de Entorno Seguras

Nunca commitear secrets en el código. Use:

```bash
# Archivo .env (NO commitear)
JWT_SECRET=your-super-secure-jwt-secret-key-here
DB_PASSWORD=your-database-password
REDIS_PASSWORD=your-redis-password
INTERNAL_SERVICE_SECRET=your-internal-service-secret

# Archivo .env.example (SÍ commitear)
JWT_SECRET=
DB_PASSWORD=
REDIS_PASSWORD=
INTERNAL_SERVICE_SECRET=
```

#### Docker Secrets (Producción)

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  core:
    secrets:
      - jwt_secret
      - db_password
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt
```

### Configuración CORS

```php
// config/cors.php
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    'allowed_origins' => ['https://your-frontend-domain.com'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

### Rate Limiting

Implementado a nivel de aplicación y base de datos:

```php
// En routes/api.php
Route::middleware(['throttle:api'])->group(function () {
    // Rutas con rate limiting
});
```

### Validación de Entrada

Todas las entradas se validan usando Form Requests:

```php
// app/Http/Requests/CreateActivityRequest.php
public function rules()
{
    return [
        'title' => 'required|string|max:255',
        'description' => 'nullable|string',
        'due_date' => 'nullable|date|after:today',
    ];
}
```

### Auditoría y Logging

- **Logs estructurados**: Todos los eventos importantes se registran
- **Tracing distribuido**: Seguimiento completo de requests
- **Métricas de seguridad**: Monitoreo de intentos de acceso fallidos

### Convenciones de Código

#### PHP/Laravel

- Sigue PSR-12 para el estilo de código
- Usa type hints en todos los métodos
- Documenta con PHPDoc
- Mantén la complejidad ciclomática baja

```php
/**
 * Crea una nueva actividad para el usuario.
 *
 * @param CreateActivityRequest $request
 * @return JsonResponse
 */
public function store(CreateActivityRequest $request): JsonResponse
{
    $activity = Activity::create($request->validated());

    return response()->json($activity, 201);
}
```

#### JavaScript/Vue (si aplica)

- Usa ESLint con configuración estándar
- Sigue Vue Style Guide
- Usa TypeScript para nuevos componentes

## Implementación Completa

Esta sección muestra las implementaciones completas de las clases y componentes más importantes del sistema.

### Arquitectura REST - Rutas API

**`priorix-core/routes/api.php` - Definición completa de rutas**

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\PlannerController;
use Illuminate\Support\Facades\Route;

// ========== RUTAS PÚBLICAS ==========
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// ========== RUTAS PROTEGIDAS JWT ==========
Route::middleware('jwt.auth')->group(function () {

    // Auth protegidas
    Route::prefix('auth')->group(function () {
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::post('logout',  [AuthController::class, 'logout']);
        Route::get('me',       [AuthController::class, 'me']);
    });

    // Activities CRUD + custom
    Route::apiResource('activities', ActivityController::class);
    Route::post('activities/{id}/complete', [ActivityController::class, 'complete']);

    // Tasks CRUD + custom
    Route::apiResource('tasks', TaskController::class);
    Route::post('tasks/{id}/complete', [TaskController::class, 'complete']);
    Route::get('tasks/date-range', [TaskController::class, 'getByDateRange']);
    Route::get('tasks/today/pending', [TaskController::class, 'getTodayPending']);

    // Planner
    Route::prefix('planner')->group(function () {
        Route::post('generate-weekly', [PlannerController::class, 'generateWeeklyPlan']);
        Route::post('reschedule-activity/{activityId}', [PlannerController::class, 'rescheduleActivity']);
    });
});
```

**`priorix-gamification/routes/api.php` - Rutas de gamificación**

```php
<?php

use App\Http\Controllers\GamificationController;
use App\Http\Controllers\StatisticsController;
use Illuminate\Support\Facades\Route;

// ========== RUTAS GAMIFICACIÓN ==========
Route::get('gamification/pet',                    [GamificationController::class, 'getPetStatus']);
Route::post('gamification/update-experience',     [GamificationController::class, 'updateExperience']);
Route::get('statistics/weekly',                   [StatisticsController::class, 'weekly']);
Route::post('statistics/record-activity',         [StatisticsController::class, 'recordActivity']);
```

### Patrón Circuit Breaker - Implementación Completa

**`priorix-core/app/Infrastructure/Resilience/CircuitBreaker.php`**

```php
<?php

namespace App\Infrastructure\Resilience;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class CircuitBreaker
{
    private const CLOSED    = 'CLOSED';
    private const OPEN      = 'OPEN';
    private const HALF_OPEN = 'HALF_OPEN';

    private int $failureThreshold;
    private int $recoveryTime;

    public function __construct(private readonly string $serviceName)
    {
        $this->failureThreshold = config('resilience.circuit_breaker.failure_threshold', 3);
        $this->recoveryTime     = config('resilience.circuit_breaker.recovery_time', 30);
    }

    public function call(callable $action, callable $fallback): mixed
    {
        $state = $this->getState();

        Log::info("CircuitBreaker [{$this->serviceName}]: state={$state}");

        if ($state === self::OPEN)      return $fallback(null);
        if ($state === self::HALF_OPEN) return $this->executeHalfOpen($action, $fallback);

        return $this->executeNormal($action, $fallback);
    }

    private function executeNormal(callable $action, callable $fallback): mixed
    {
        try {
            $result = $action();
            $this->recordSuccess();
            return $result;
        } catch (\Exception $e) {
            $this->recordFailure();

            if ($this->getFailureCount() >= $this->failureThreshold) {
                $this->openCircuit();
                Log::critical("CircuitBreaker [{$this->serviceName}]: OPENED after {$this->failureThreshold} failures");
            }

            return $fallback($e);
        }
    }

    private function executeHalfOpen(callable $action, callable $fallback): mixed
    {
        try {
            $result = $action();
            $this->closeCircuit();
            Log::info("CircuitBreaker [{$this->serviceName}]: CLOSED (recovered)");
            return $result;
        } catch (\Exception $e) {
            $this->openCircuit();
            Log::warning("CircuitBreaker [{$this->serviceName}]: REOPENED after failed probe");
            return $fallback($e);
        }
    }

    private function getState(): string
    {
        $state = Redis::get($this->stateKey());

        if ($state === self::OPEN) {
            $openedAt = (int) Redis::get($this->openedAtKey());
            if (time() - $openedAt >= $this->recoveryTime) {
                $this->setHalfOpen();
                return self::HALF_OPEN;
            }
        }

        return $state ?? self::CLOSED;
    }

    private function recordFailure(): void
    {
        Redis::incr($this->failureKey());
        Redis::expire($this->failureKey(), $this->recoveryTime * 2);
    }

    private function recordSuccess(): void
    {
        Redis::del($this->failureKey());
    }

    private function getFailureCount(): int
    {
        return (int) Redis::get($this->failureKey());
    }

    private function openCircuit(): void
    {
        Redis::set($this->stateKey(), self::OPEN);
        Redis::set($this->openedAtKey(), time());
        Redis::del($this->failureKey());
    }

    private function closeCircuit(): void
    {
        Redis::del($this->stateKey());
        Redis::del($this->openedAtKey());
        Redis::del($this->failureKey());
    }

    private function setHalfOpen(): void
    {
        Redis::set($this->stateKey(), self::HALF_OPEN);
    }

    public function getStatus(): array
    {
        return [
            'service'       => $this->serviceName,
            'state'         => $this->getState(),
            'failure_count' => $this->getFailureCount(),
            'opened_at'     => Redis::get($this->openedAtKey()),
        ];
    }

    private function stateKey(): string    { return "cb:{$this->serviceName}:state"; }
    private function openedAtKey(): string { return "cb:{$this->serviceName}:opened_at"; }
    private function failureKey(): string  { return "cb:{$this->serviceName}:failures"; }
}
```

### Cliente HTTP Resiliente - Implementación Completa

**`priorix-core/app/Infrastructure/Http/ResilientHttpClient.php`**

```php
<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Resilience\CircuitBreaker;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Prometheus\CollectorRegistry;

class ResilientHttpClient
{
    private int $timeout;
    private array $breakers = [];

    public function __construct(
        private CollectorRegistry $registry
    ) {
        $this->timeout = config('resilience.circuit_breaker.timeout', 5);
    }

    public function post(string $url, array $data = [], ?string $token = null, ?callable $fallback = null, ?int $userId = null): array
    {
        $breaker = $this->getBreaker($this->extractServiceName($url));

        $action = function () use ($url, $data, $token, $userId) {
            $internalSecret = config('resilience.internal_service_secret');

            $headers = [
                'X-Internal-Service'        => 'priorix-core',
                'X-Internal-Service-Secret' => $internalSecret,
                'Accept'                    => 'application/json',
            ];

            if ($userId !== null) {
                $headers['X-Internal-User-Id'] = (string) $userId;
            }

            Log::debug('ResilientHttpClient.post', [
                'url' => $url,
                'headers_set' => [
                    'X-Internal-Service'        => 'priorix-core',
                    'X-Internal-Service-Secret' => $internalSecret ? 'present' : 'null',
                    'X-Internal-User-Id'        => $userId ?? 'null',
                ],
            ]);

            if ($token) {
                $headers['Authorization'] = "Bearer {$token}";
            }

            $response = Http::timeout($this->timeout)
                ->withHeaders($headers)
                ->post($url, $data);

            if ($response->failed()) {
                $message = "HTTP {$response->status()} from {$url}";
                $body = trim($response->body());
                if ($body !== '') {
                    $message .= " - {$body}";
                }
                throw new \RuntimeException($message);
            }

            return $response->json();
        };

        $defaultFallback = $fallback ?? function (?\Throwable $exception = null) use ($url) {
            Log::warning("Using fallback for {$url}" . ($exception ? ": {$exception->getMessage()}" : ''));
            return [
                'status'              => 'fallback',
                'service_unavailable' => true,
                'reason'              => $exception?->getMessage(),
            ];
        };

        $result = $breaker->call($action, $defaultFallback);
        $this->updateCircuitBreakerMetric($this->extractServiceName($url), $breaker);
        return $result;
    }

    public function get(string $url, array $query = [], ?string $token = null, ?callable $fallback = null): array
    {
        $breaker = $this->getBreaker($this->extractServiceName($url));

        $action = function () use ($url, $query, $token) {
            $headers = [
                'X-Internal-Service'        => 'priorix-core',
                'X-Internal-Service-Secret' => config('resilience.internal_service_secret'),
                'Accept'                    => 'application/json',
            ];

            if ($token) {
                $headers['Authorization'] = "Bearer {$token}";
            }

            $response = Http::timeout($this->timeout)
                ->withHeaders($headers)
                ->get($url, $query);

            if ($response->failed()) {
                $message = "HTTP {$response->status()} from {$url}";
                $body = trim($response->body());
                if ($body !== '') {
                    $message .= " - {$body}";
                }
                throw new \RuntimeException($message);
            }

            return $response->json();
        };

        $defaultFallback = $fallback ?? function (?\Throwable $exception = null) use ($url) {
            Log::warning("Using fallback for {$url}" . ($exception ? ": {$exception->getMessage()}" : ''));
            return [
                'status'              => 'fallback',
                'service_unavailable' => true,
                'reason'              => $exception?->getMessage(),
            ];
        };

        $result = $breaker->call($action, $defaultFallback);
        $this->updateCircuitBreakerMetric($this->extractServiceName($url), $breaker);
        return $result;
    }

    public function getAllBreakersStatus(): array
    {
        return array_map(
            fn(CircuitBreaker $b) => $b->getStatus(),
            $this->breakers
        );
    }

    private function getBreaker(string $name): CircuitBreaker
    {
        if (!isset($this->breakers[$name])) {
            $this->breakers[$name] = new CircuitBreaker($name);
        }
        return $this->breakers[$name];
    }

    private function extractServiceName(string $url): string
    {
        $path     = parse_url($url, PHP_URL_PATH);
        $segments = explode('/', trim($path, '/'));
        $idx      = array_search('api', $segments);
        return $segments[$idx + 1] ?? 'unknown';
    }

    private function updateCircuitBreakerMetric(string $service, CircuitBreaker $breaker): void
    {
        $stateMap = [
            'CLOSED'    => 0,
            'OPEN'      => 1,
            'HALF_OPEN' => 2,
        ];

        $status = $breaker->getStatus();
        $state  = $stateMap[$status['state'] ?? 'closed'] ?? 0;

        $this->registry
            ->getOrRegisterGauge(
                config('prometheus.prefix'),
                'circuit_breaker_state',
                'Estado del circuit breaker por servicio (0=closed, 1=open, 2=half-open)',
                ['service']
            )
            ->set($state, [$service]);
    }
}
```

### Sistema de Autenticación JWT - Implementación Completa

**`priorix-core/app/Http/Controllers/AuthController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $result = $this->authService->register($data);
        return response()->json($result, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            $result = $this->authService->login($data['email'], $data['password']);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }

        return response()->json($result);
    }

    public function me(): JsonResponse
    {
        return response()->json($this->authService->me());
    }

    public function refresh(): JsonResponse
    {
        return response()->json($this->authService->refresh());
    }

    public function logout(): JsonResponse
    {
        $this->authService->logout();
        return response()->json(['message' => 'Sesión cerrada']);
    }
}
```

**`priorix-core/app/Services/Auth/AuthService.php`**

```php
<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $token = JWTAuth::fromUser($user);

        return $this->buildTokenResponse($token, $user);
    }

    public function login(string $email, string $password): array
    {
        $credentials = ['email' => $email, 'password' => $password];

        if (!$token = auth('api')->attempt($credentials)) {
            throw new \RuntimeException('Credenciales inválidas', 401);
        }

        return $this->buildTokenResponse($token, auth('api')->user());
    }

    public function refresh(): array
    {
        $token = auth('api')->refresh();
        return $this->buildTokenResponse($token, auth('api')->user());
    }

    public function logout(): void
    {
        auth('api')->logout();
    }

    public function me(): User
    {
        return auth('api')->user();
    }

    private function buildTokenResponse(string $token, User $user): array
    {
        return [
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => config('jwt.ttl') * 60,
            'user'         => $user,
        ];
    }
}
```

**`priorix-core/app/Http\Middleware/JwtAuthMiddleware.php`**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            JWTAuth::parseToken()->authenticate();
        } catch (TokenExpiredException) {
            return response()->json(['error' => 'Token expirado'], 401);
        } catch (TokenInvalidException) {
            return response()->json(['error' => 'Token inválido'], 401);
        } catch (JWTException) {
            return response()->json(['error' => 'Token ausente'], 401);
        }

        return $next($request);
    }
}
```

### Modelos Eloquent - Implementación Completa

**`priorix-core/app/Models/User.php`**

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable;

    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = ['password' => 'hashed'];

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'name'  => $this->name,
            'email' => $this->email,
        ];
    }
}
```

**`priorix-core/app/Models/Activity.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    protected $fillable = [
        'user_id', 'title', 'type', 'description',
        'estimated_minutes', 'max_session_minutes', 'max_sessions',
        'priority', 'label', 'is_fixed', 'repeats_weekly',
        'deadline', 'status',
    ];

    protected $casts = [
        'deadline'       => 'datetime',
        'is_fixed'       => 'boolean',
        'repeats_weekly' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function focusSessions(): HasMany
    {
        return $this->hasMany(FocusSession::class);
    }

    public function markAsCompleted(): void
    {
        $this->update(['status' => 'completed']);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}
```

### Servicio de Actividades - Implementación Completa

**`priorix-core/app/Http/Controllers/ActivityController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Services\Activity\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    public function __construct(private readonly ActivityService $activityService) {}

    public function index(Request $request): JsonResponse
    {
        $activities = $this->activityService->getActivitiesByUser(auth('api')->id());

        return response()->json($activities);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateActivity($request);

        $activity = $this->activityService->createActivity($data, auth('api')->id());

        return response()->json($activity, 201);
    }

    public function show(int $id): JsonResponse
    {
        $activity = $this->activityService->getActivity($id, auth('api')->id());

        return response()->json($activity);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $this->validateActivity($request, true);

        $activity = $this->activityService->updateActivity($id, auth('api')->id(), $data);

        return response()->json($activity);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->activityService->deleteActivity($id, auth('api')->id());

        return response()->json(null, 204);
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $result = $this->activityService->completeActivity($id, auth('api')->id());

        return response()->json($result);
    }

    private function validateActivity(Request $request, bool $isUpdate = false): array
    {
        $rules = [
            'title' => $isUpdate ? 'sometimes|string|max:255' : 'required|string|max:255',
            'type' => $isUpdate ? 'sometimes|string|max:100' : 'required|string|max:100',
            'description' => 'sometimes|nullable|string',
            'estimated_minutes' => 'sometimes|nullable|integer|min:0',
            'max_session_minutes' => 'sometimes|nullable|integer|min:0',
            'max_sessions' => 'sometimes|nullable|integer|min:0',
            'priority' => 'sometimes|nullable|string|in:alta,media,baja',
            'label' => 'sometimes|nullable|string|max:100',
            'is_fixed' => 'sometimes|boolean',
            'repeats_weekly' => 'sometimes|boolean',
            'deadline' => 'sometimes|nullable|date',
            'status' => 'sometimes|nullable|string|max:50',
        ];

        return $request->validate($rules);
    }
}
```

**`priorix-core/app/Services/Activity/ActivityService.php`**

```php
<?php

namespace App\Services\Activity;

use App\Models\Activity;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;
use App\Infrastructure\Observability\TracingService;

class ActivityService
{
    public function __construct(
        private ResilientHttpClient $httpClient,
        private TracingService $tracing,
    ) {}

    public function getActivitiesByUser(int $userId)
    {
        return Activity::where('user_id', $userId)->get();
    }

    public function createActivity(array $data, int $userId): Activity
    {
        $data['user_id'] = $userId;

        return Activity::create($data);
    }

    public function getActivity(int $activityId, int $userId): Activity
    {
        return Activity::where('id', $activityId)
            ->where('user_id', $userId)
            ->firstOrFail();
    }

    public function updateActivity(int $activityId, int $userId, array $data): Activity
    {
        $activity = $this->getActivity($activityId, $userId);
        $activity->update($data);

        return $activity;
    }

    public function deleteActivity(int $activityId, int $userId): void
    {
        $this->getActivity($activityId, $userId)->delete();
    }

    public function completeActivity(int $activityId, int $userId): array
    {
        return $this->tracing->trace('activity.complete', function () use ($activityId, $userId) {

            $activity = $this->tracing->trace('activity.fetch', fn() =>
                $this->getActivity($activityId, $userId)
            , ['activity.id' => $activityId]);

            $this->tracing->trace('activity.mark_completed', fn() =>
                $activity->markAsCompleted()
            , ['activity.priority' => $activity->priority]);

            $xpReward = $this->calculateXpReward($activity);

            $gamificationResult = $this->tracing->trace('gamification.update_experience', fn() =>
                $this->notifyGamification($userId, $activity, $xpReward)
            , ['xp.reward' => $xpReward]);

            $statisticsResult = $this->tracing->trace('statistics.record_activity', fn() =>
                $this->notifyStatistics($userId, $activity)
            , ['activity.id' => $activity->id]);

            return ['activity' => $activity, 'gamification' => $gamificationResult, 'statistics' => $statisticsResult];

        }, ['activity.id' => $activityId, 'user.id' => $userId]);
    }

    private function notifyGamification(int $userId, Activity $activity, int $xpReward): array
    {
        try {
            $url = rtrim(config('resilience.services.gamification'), '/');
            return $this->httpClient->post(
                "{$url}/update-experience",
                [
                    'user_id' => $userId,
                    'type' => 'activity_completed',
                    'xp_reward' => $xpReward,
                ],
                userId: $userId
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify gamification: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function notifyStatistics(int $userId, Activity $activity): array
    {
        try {
            $url = rtrim(config('resilience.services.statistics'), '/');
            return $this->httpClient->post(
                "{$url}/record-activity",
                [
                    'user_id' => $userId,
                    'activity_id' => $activity->id,
                ],
                userId: $userId
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify statistics: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function calculateXpReward(Activity $activity): int
    {
        $priorityMap = ['baja' => 10, 'media' => 20, 'alta' => 30];
        $baseXp = $priorityMap[$activity->priority] ?? 10;

        $estimatedBonus = min(50, (int) ($activity->estimated_minutes / 10));

        return $baseXp + $estimatedBonus;
    }
}
```

### Sistema de Tracing Distribuido - Implementación Completa

**`priorix-core/app/Infrastructure/Observability/TracingService.php`**

```php
<?php
namespace App\Infrastructure\Observability;

use OpenTelemetry\API\Trace\SpanInterface;
use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SemConventions\TraceAttributes;

class TracingService
{
    private TracerInterface $tracer;

    public function __construct()
    {
        $transport = (new OtlpHttpTransportFactory())->create(
            config('tracing.jaeger_endpoint', 'http://jaeger:4318/v1/traces'),
            'application/x-protobuf'
        );

        $exporter = new SpanExporter($transport);

        $provider = new TracerProvider(
            new SimpleSpanProcessor($exporter),
            null,
            ResourceInfo::create(Attributes::create([
                'service.name' => 'priorix-core',
            ]))
        );

        $this->tracer = $provider->getTracer('priorix-core');
    }

    public function startSpan(string $name): SpanInterface
    {
        return $this->tracer->spanBuilder($name)->startSpan();
    }

    public function trace(string $name, callable $callback, array $attributes = []): mixed
  {
      $span  = $this->startSpan($name);
      $scope = $span->activate();

      foreach ($attributes as $key => $value) {
          $span->setAttribute($key, $value);
      }

      try {
          $result = $callback($span);
          $span->setStatus(\OpenTelemetry\API\Trace\StatusCode::STATUS_OK);
          return $result;
      } catch (\Throwable $e) {
          $span->recordException($e);
          $span->setStatus(\OpenTelemetry\API\Trace\StatusCode::STATUS_ERROR, $e->getMessage());
          throw $e;
      } finally {
          $scope->detach();
          $span->end();
      }
  }
}
```

            $result = $action();
            $this->recordSuccess();
            return $result;
        } catch (\Exception $e) {
            $this->recordFailure();

            if ($this->getFailureCount() >= $this->failureThreshold) {
                $this->openCircuit();
                Log::critical("CircuitBreaker [{$this->serviceName}]: OPENED after {$this->failureThreshold} failures");
            }

            return $fallback($e);
        }
    }
    // ... resto de métodos

}

````

**`priorix-core/config/resilience.php` - Configuración circuit breaker**

```php
<?php
// ========== CONFIGURACIÓN COMPLETA (líneas 1-15) ==========
return [
    'circuit_breaker' => [
        'failure_threshold' => env('CB_FAILURE_THRESHOLD', 3),
        'recovery_time'     => env('CB_RECOVERY_TIME', 30),
        'timeout'           => env('CB_TIMEOUT', 5),
    ],

    'services' => [
        'gamification' => env('GAMIFICATION_SERVICE_URL', 'http://gamification/api/gamification'),
        'statistics'   => env('STATISTICS_SERVICE_URL', 'http://gamification/api/statistics'),
    ],

    'internal_service_secret' => env('INTERNAL_SERVICE_SECRET', 'change-me'),
];
````

**Uso en servicios - ejemplo en `priorix-core/app/Services/Task/TaskService.php`:**

```php
// ========== USO EN SERVICIOS (línea 137) ==========
$url = rtrim(config('resilience.services.gamification'), '/');
// Aquí se implementa la llamada HTTP con circuit breaker
```

### Observabilidad

Se implementa tracing distribuido con OpenTelemetry y métricas con Prometheus para monitoreo completo del sistema.

**`priorix-core/app/Infrastructure/Observability/TracingService.php` - Servicio de tracing**

```php
<?php
// ========== CLASE TRACING SERVICE (líneas 1-50) ==========
namespace App\Infrastructure\Observability;

use OpenTelemetry\API\Trace\SpanInterface;
use OpenTelemetry\API\Trace\TracerInterface;
// ... imports

class TracingService
{
    private TracerInterface $tracer;

    // ========== CONSTRUCTOR CON JAEGER (líneas 18-35) ==========
    public function __construct()
    {
        $transport = (new OtlpHttpTransportFactory())->create(
            config('tracing.jaeger_endpoint', 'http://jaeger:4318/v1/traces'), // ← línea 21
            'application/x-protobuf'
        );

        $exporter = new SpanExporter($transport);

        $provider = new TracerProvider(
            new SimpleSpanProcessor($exporter),
            null,
            ResourceInfo::create(Attributes::create([
                'service.name' => 'priorix-core',
            ]))
        );

        $this->tracer = $provider->getTracer('priorix-core');
    }

    // ========== MÉTODO TRACE() (líneas 40-50+) ==========
    public function trace(string $name, callable $callback, array $attributes = []): mixed
    {
        $span  = $this->startSpan($name);
        $scope = $span->activate();

        foreach ($attributes as $key => $value) {
            $span->setAttribute($key, $value);
        }
        // ... implementación completa
    }
}
```

**`priorix-core/app/Http/Middleware/TracingMiddleware.php` - Middleware HTTP**

```php
<?php
// ========== MIDDLEWARE DE TRACING (líneas 1-50) ==========
namespace App\Http\Middleware;

use App\Infrastructure\Observability\TracingService;
use Closure;
use Illuminate\Http\Request;

class TracingMiddleware
{
    public function __construct(private readonly TracingService $tracing) {}

    // ========== HANDLE REQUEST (líneas 15-40) ==========
    public function handle(Request $request, Closure $next)
    {
        $spanName = $request->method() . ' ' . ($request->route()?->getName() ?? $request->path());
        $span = $this->tracing->startSpan($spanName);

        $span->setAttribute('http.method', $request->method());
        $span->setAttribute('http.route', $request->path());
        $span->setAttribute('user.id', $request->user()?->id ?? 'anonymous');

        try {
            $response = $next($request);
            $span->setAttribute('http.status_code', $response->getStatusCode());
            return $response;
        } catch (\Throwable $e) {
            $span->recordException($e);
            $span->setStatus(\OpenTelemetry\API\Trace\StatusCode::STATUS_ERROR, $e->getMessage());
            throw $e;
        } finally {
            $span->end();
        }
    }
}
```

**`priorix-core/app/Providers/PrometheusServiceProvider.php` - Métricas Prometheus**

```php
<?php
// ========== PROVIDER PROMETHEUS (líneas 1-25) ==========
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Prometheus\CollectorRegistry;
use Prometheus\Storage\Redis as RedisAdapter;

class PrometheusServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(CollectorRegistry::class, function () {
            // ========== CONFIG REDIS (líneas 10-18) ==========
            $adapter = new RedisAdapter([
                'host'     => config('database.redis.default.host', 'redis'),
                'port'     => (int) config('database.redis.default.port', 6379),
                'database' => (int) config('prometheus.redis_database', 1),
            ]);

            return new CollectorRegistry($adapter);
        });
    }
}
```

**📁 `priorix-core/app/Services/Task/TaskService.php` - Instrumentación en servicios**

```php
// ========== USO DE TRACING (líneas 61, 63, 71, 75) ==========
return $this->tracing->trace('task.complete', function () use ($taskId, $userId) {
    // Operación instrumentada
    $task = $this->tracing->trace('task.fetch', fn() =>
        Task::findOrFail($taskId)
    );
    // ... más operaciones trazadas
```

### Seguridad

Se implementa autenticación JWT con middleware personalizado para proteger rutas y validar tokens.

**`priorix-core/app/Http/Middleware/JwtAuthMiddleware.php` - Middleware JWT**

```php
<?php
// ========== MIDDLEWARE JWT COMPLETO (líneas 1-30) ==========
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
// ... imports

class JwtAuthMiddleware
{
    // ========== VALIDACIÓN DE TOKEN (líneas 15-25) ==========
    public function handle(Request $request, Closure $next): Response
    {
        try {
            JWTAuth::parseToken()->authenticate();
        } catch (TokenExpiredException) {
            return response()->json(['error' => 'Token expirado'], 401);
        } catch (TokenInvalidException) {
            return response()->json(['error' => 'Token inválido'], 401);
        } catch (JWTException) {
            return response()->json(['error' => 'Token ausente'], 401);
        }

        return $next($request);
    }
}
```

**📁 `priorix-core/bootstrap/app.php` - Registro del middleware (línea 21)**

```php
// ========== REGISTRO MIDDLEWARE (línea 21) ==========
'middleware' => [
    // ... otros middlewares
    'jwt.auth' => \App\Http\Middleware\JwtAuthMiddleware::class,
],
```

**📁 `priorix-core/routes/api.php` - Aplicación del middleware (línea 16)**

```php
// ========== APLICACIÓN JWT (línea 16) ==========
Route::middleware('jwt.auth')->group(function () {
    // Todas las rutas protegidas aquí
});
```

## Roadmap

Esta sección muestra las implementaciones completas de las clases y componentes más importantes del sistema.

### Arquitectura REST - Rutas API

**`priorix-core/routes/api.php` - Definición completa de rutas**

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\PlannerController;
use Illuminate\Support\Facades\Route;

// ========== RUTAS PÚBLICAS ==========
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// ========== RUTAS PROTEGIDAS JWT ==========
Route::middleware('jwt.auth')->group(function () {

    // Auth protegidas
    Route::prefix('auth')->group(function () {
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::post('logout',  [AuthController::class, 'logout']);
        Route::get('me',       [AuthController::class, 'me']);
    });

    // Activities CRUD + custom
    Route::apiResource('activities', ActivityController::class);
    Route::post('activities/{id}/complete', [ActivityController::class, 'complete']);

    // Tasks CRUD + custom
    Route::apiResource('tasks', TaskController::class);
    Route::post('tasks/{id}/complete', [TaskController::class, 'complete']);
    Route::get('tasks/date-range', [TaskController::class, 'getByDateRange']);
    Route::get('tasks/today/pending', [TaskController::class, 'getTodayPending']);

    // Planner
    Route::prefix('planner')->group(function () {
        Route::post('generate-weekly', [PlannerController::class, 'generateWeeklyPlan']);
        Route::post('reschedule-activity/{activityId}', [PlannerController::class, 'rescheduleActivity']);
    });
});
```

**`priorix-gamification/routes/api.php` - Rutas de gamificación**

```php
<?php

use App\Http\Controllers\GamificationController;
use App\Http\Controllers\StatisticsController;
use Illuminate\Support\Facades\Route;

// ========== RUTAS GAMIFICACIÓN ==========
Route::get('gamification/pet',                    [GamificationController::class, 'getPetStatus']);
Route::post('gamification/update-experience',     [GamificationController::class, 'updateExperience']);
Route::get('statistics/weekly',                   [StatisticsController::class, 'weekly']);
Route::post('statistics/record-activity',         [StatisticsController::class, 'recordActivity']);
```

### Patrón Circuit Breaker - Implementación Completa

**`priorix-core/app/Infrastructure/Resilience/CircuitBreaker.php`**

```php
<?php

namespace App\Infrastructure\Resilience;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class CircuitBreaker
{
    private const CLOSED    = 'CLOSED';
    private const OPEN      = 'OPEN';
    private const HALF_OPEN = 'HALF_OPEN';

    private int $failureThreshold;
    private int $recoveryTime;

    public function __construct(private readonly string $serviceName)
    {
        $this->failureThreshold = config('resilience.circuit_breaker.failure_threshold', 3);
        $this->recoveryTime     = config('resilience.circuit_breaker.recovery_time', 30);
    }

    public function call(callable $action, callable $fallback): mixed
    {
        $state = $this->getState();

        Log::info("CircuitBreaker [{$this->serviceName}]: state={$state}");

        if ($state === self::OPEN)      return $fallback(null);
        if ($state === self::HALF_OPEN) return $this->executeHalfOpen($action, $fallback);

        return $this->executeNormal($action, $fallback);
    }

    private function executeNormal(callable $action, callable $fallback): mixed
    {
        try {
            $result = $action();
            $this->recordSuccess();
            return $result;
        } catch (\Exception $e) {
            $this->recordFailure();

            if ($this->getFailureCount() >= $this->failureThreshold) {
                $this->openCircuit();
                Log::critical("CircuitBreaker [{$this->serviceName}]: OPENED after {$this->failureThreshold} failures");
            }

            return $fallback($e);
        }
    }

    private function executeHalfOpen(callable $action, callable $fallback): mixed
    {
        try {
            $result = $action();
            $this->closeCircuit();
            Log::info("CircuitBreaker [{$this->serviceName}]: CLOSED (recovered)");
            return $result;
        } catch (\Exception $e) {
            $this->openCircuit();
            Log::warning("CircuitBreaker [{$this->serviceName}]: REOPENED after failed probe");
            return $fallback($e);
        }
    }

    private function getState(): string
    {
        $state = Redis::get($this->stateKey());

        if ($state === self::OPEN) {
            $openedAt = (int) Redis::get($this->openedAtKey());
            if (time() - $openedAt >= $this->recoveryTime) {
                $this->setHalfOpen();
                return self::HALF_OPEN;
            }
        }

        return $state ?? self::CLOSED;
    }

    private function recordFailure(): void
    {
        Redis::incr($this->failureKey());
        Redis::expire($this->failureKey(), $this->recoveryTime * 2);
    }

    private function recordSuccess(): void
    {
        Redis::del($this->failureKey());
    }

    private function getFailureCount(): int
    {
        return (int) Redis::get($this->failureKey());
    }

    private function openCircuit(): void
    {
        Redis::set($this->stateKey(), self::OPEN);
        Redis::set($this->openedAtKey(), time());
        Redis::del($this->failureKey());
    }

    private function closeCircuit(): void
    {
        Redis::del($this->stateKey());
        Redis::del($this->openedAtKey());
        Redis::del($this->failureKey());
    }

    private function setHalfOpen(): void
    {
        Redis::set($this->stateKey(), self::HALF_OPEN);
    }

    public function getStatus(): array
    {
        return [
            'service'       => $this->serviceName,
            'state'         => $this->getState(),
            'failure_count' => $this->getFailureCount(),
            'opened_at'     => Redis::get($this->openedAtKey()),
        ];
    }

    private function stateKey(): string    { return "cb:{$this->serviceName}:state"; }
    private function openedAtKey(): string { return "cb:{$this->serviceName}:opened_at"; }
    private function failureKey(): string  { return "cb:{$this->serviceName}:failures"; }
}
```

### Cliente HTTP Resiliente - Implementación Completa

**`priorix-core/app/Infrastructure/Http/ResilientHttpClient.php`**

```php
<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Resilience\CircuitBreaker;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Prometheus\CollectorRegistry;

class ResilientHttpClient
{
    private int $timeout;
    private array $breakers = [];

    public function __construct(
        private CollectorRegistry $registry
    ) {
        $this->timeout = config('resilience.circuit_breaker.timeout', 5);
    }

    public function post(string $url, array $data = [], ?string $token = null, ?callable $fallback = null, ?int $userId = null): array
    {
        $breaker = $this->getBreaker($this->extractServiceName($url));

        $action = function () use ($url, $data, $token, $userId) {
            $internalSecret = config('resilience.internal_service_secret');

            $headers = [
                'X-Internal-Service'        => 'priorix-core',
                'X-Internal-Service-Secret' => $internalSecret,
                'Accept'                    => 'application/json',
            ];

            if ($userId !== null) {
                $headers['X-Internal-User-Id'] = (string) $userId;
            }

            Log::debug('ResilientHttpClient.post', [
                'url' => $url,
                'headers_set' => [
                    'X-Internal-Service'        => 'priorix-core',
                    'X-Internal-Service-Secret' => $internalSecret ? 'present' : 'null',
                    'X-Internal-User-Id'        => $userId ?? 'null',
                ],
            ]);

            if ($token) {
                $headers['Authorization'] = "Bearer {$token}";
            }

            $response = Http::timeout($this->timeout)
                ->withHeaders($headers)
                ->post($url, $data);

            if ($response->failed()) {
                $message = "HTTP {$response->status()} from {$url}";
                $body = trim($response->body());
                if ($body !== '') {
                    $message .= " - {$body}";
                }
                throw new \RuntimeException($message);
            }

            return $response->json();
        };

        $defaultFallback = $fallback ?? function (?\Throwable $exception = null) use ($url) {
            Log::warning("Using fallback for {$url}" . ($exception ? ": {$exception->getMessage()}" : ''));
            return [
                'status'              => 'fallback',
                'service_unavailable' => true,
                'reason'              => $exception?->getMessage(),
            ];
        };

        $result = $breaker->call($action, $defaultFallback);
        $this->updateCircuitBreakerMetric($this->extractServiceName($url), $breaker);
        return $result;
    }

    public function get(string $url, array $query = [], ?string $token = null, ?callable $fallback = null): array
    {
        $breaker = $this->getBreaker($this->extractServiceName($url));

        $action = function () use ($url, $query, $token) {
            $headers = [
                'X-Internal-Service'        => 'priorix-core',
                'X-Internal-Service-Secret' => config('resilience.internal_service_secret'),
                'Accept'                    => 'application/json',
            ];

            if ($token) {
                $headers['Authorization'] = "Bearer {$token}";
            }

            $response = Http::timeout($this->timeout)
                ->withHeaders($headers)
                ->get($url, $query);

            if ($response->failed()) {
                $message = "HTTP {$response->status()} from {$url}";
                $body = trim($response->body());
                if ($body !== '') {
                    $message .= " - {$body}";
                }
                throw new \RuntimeException($message);
            }

            return $response->json();
        };

        $defaultFallback = $fallback ?? function (?\Throwable $exception = null) use ($url) {
            Log::warning("Using fallback for {$url}" . ($exception ? ": {$exception->getMessage()}" : ''));
            return [
                'status'              => 'fallback',
                'service_unavailable' => true,
                'reason'              => $exception?->getMessage(),
            ];
        };

        $result = $breaker->call($action, $defaultFallback);
        $this->updateCircuitBreakerMetric($this->extractServiceName($url), $breaker);
        return $result;
    }

    public function getAllBreakersStatus(): array
    {
        return array_map(
            fn(CircuitBreaker $b) => $b->getStatus(),
            $this->breakers
        );
    }

    private function getBreaker(string $name): CircuitBreaker
    {
        if (!isset($this->breakers[$name])) {
            $this->breakers[$name] = new CircuitBreaker($name);
        }
        return $this->breakers[$name];
    }

    private function extractServiceName(string $url): string
    {
        $path     = parse_url($url, PHP_URL_PATH);
        $segments = explode('/', trim($path, '/'));
        $idx      = array_search('api', $segments);
        return $segments[$idx + 1] ?? 'unknown';
    }

    private function updateCircuitBreakerMetric(string $service, CircuitBreaker $breaker): void
    {
        $stateMap = [
            'CLOSED'    => 0,
            'OPEN'      => 1,
            'HALF_OPEN' => 2,
        ];

        $status = $breaker->getStatus();
        $state  = $stateMap[$status['state'] ?? 'closed'] ?? 0;

        $this->registry
            ->getOrRegisterGauge(
                config('prometheus.prefix'),
                'circuit_breaker_state',
                'Estado del circuit breaker por servicio (0=closed, 1=open, 2=half-open)',
                ['service']
            )
            ->set($state, [$service]);
    }
}
```

### Sistema de Autenticación JWT - Implementación Completa

**`priorix-core/app/Http/Controllers/AuthController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $result = $this->authService->register($data);
        return response()->json($result, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            $result = $this->authService->login($data['email'], $data['password']);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }

        return response()->json($result);
    }

    public function me(): JsonResponse
    {
        return response()->json($this->authService->me());
    }

    public function refresh(): JsonResponse
    {
        return response()->json($this->authService->refresh());
    }

    public function logout(): JsonResponse
    {
        $this->authService->logout();
        return response()->json(['message' => 'Sesión cerrada']);
    }
}
```

**`priorix-core/app/Services/Auth/AuthService.php`**

```php
<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $token = JWTAuth::fromUser($user);

        return $this->buildTokenResponse($token, $user);
    }

    public function login(string $email, string $password): array
    {
        $credentials = ['email' => $email, 'password' => $password];

        if (!$token = auth('api')->attempt($credentials)) {
            throw new \RuntimeException('Credenciales inválidas', 401);
        }

        return $this->buildTokenResponse($token, auth('api')->user());
    }

    public function refresh(): array
    {
        $token = auth('api')->refresh();
        return $this->buildTokenResponse($token, auth('api')->user());
    }

    public function logout(): void
    {
        auth('api')->logout();
    }

    public function me(): User
    {
        return auth('api')->user();
    }

    private function buildTokenResponse(string $token, User $user): array
    {
        return [
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => config('jwt.ttl') * 60,
            'user'         => $user,
        ];
    }
}
```

**`priorix-core/app/Http/Middleware/JwtAuthMiddleware.php`**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            JWTAuth::parseToken()->authenticate();
        } catch (TokenExpiredException) {
            return response()->json(['error' => 'Token expirado'], 401);
        } catch (TokenInvalidException) {
            return response()->json(['error' => 'Token inválido'], 401);
        } catch (JWTException) {
            return response()->json(['error' => 'Token ausente'], 401);
        }

        return $next($request);
    }
}
```

### Modelos Eloquent - Implementación Completa

**`priorix-core/app/Models/User.php`**

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable;

    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = ['password' => 'hashed'];

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'name'  => $this->name,
            'email' => $this->email,
        ];
    }
}
```

**`priorix-core/app/Models/Activity.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    protected $fillable = [
        'user_id', 'title', 'type', 'description',
        'estimated_minutes', 'max_session_minutes', 'max_sessions',
        'priority', 'label', 'is_fixed', 'repeats_weekly',
        'deadline', 'status',
    ];

    protected $casts = [
        'deadline'       => 'datetime',
        'is_fixed'       => 'boolean',
        'repeats_weekly' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function focusSessions(): HasMany
    {
        return $this->hasMany(FocusSession::class);
    }

    public function markAsCompleted(): void
    {
        $this->update(['status' => 'completed']);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}
```

### Servicio de Actividades - Implementación Completa

**`priorix-core/app/Http/Controllers/ActivityController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Services\Activity\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    public function __construct(private readonly ActivityService $activityService) {}

    public function index(Request $request): JsonResponse
    {
        $activities = $this->activityService->getActivitiesByUser(auth('api')->id());

        return response()->json($activities);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateActivity($request);

        $activity = $this->activityService->createActivity($data, auth('api')->id());

        return response()->json($activity, 201);
    }

    public function show(int $id): JsonResponse
    {
        $activity = $this->activityService->getActivity($id, auth('api')->id());

        return response()->json($activity);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $this->validateActivity($request, true);

        $activity = $this->activityService->updateActivity($id, auth('api')->id(), $data);

        return response()->json($activity);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->activityService->deleteActivity($id, auth('api')->id());

        return response()->json(null, 204);
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $result = $this->activityService->completeActivity($id, auth('api')->id());

        return response()->json($result);
    }

    private function validateActivity(Request $request, bool $isUpdate = false): array
    {
        $rules = [
            'title' => $isUpdate ? 'sometimes|string|max:255' : 'required|string|max:255',
            'type' => $isUpdate ? 'sometimes|string|max:100' : 'required|string|max:100',
            'description' => 'sometimes|nullable|string',
            'estimated_minutes' => 'sometimes|nullable|integer|min:0',
            'max_session_minutes' => 'sometimes|nullable|integer|min:0',
            'max_sessions' => 'sometimes|nullable|integer|min:0',
            'priority' => 'sometimes|nullable|string|in:alta,media,baja',
            'label' => 'sometimes|nullable|string|max:100',
            'is_fixed' => 'sometimes|boolean',
            'repeats_weekly' => 'sometimes|boolean',
            'deadline' => 'sometimes|nullable|date',
            'status' => 'sometimes|nullable|string|max:50',
        ];

        return $request->validate($rules);
    }
}
```

**`priorix-core/app/Services/Activity/ActivityService.php`**

```php
<?php

namespace App\Services\Activity;

use App\Models\Activity;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;
use App\Infrastructure\Observability\TracingService;

class ActivityService
{
    public function __construct(
        private ResilientHttpClient $httpClient,
        private TracingService $tracing,
    ) {}

    public function getActivitiesByUser(int $userId)
    {
        return Activity::where('user_id', $userId)->get();
    }

    public function createActivity(array $data, int $userId): Activity
    {
        $data['user_id'] = $userId;

        return Activity::create($data);
    }

    public function getActivity(int $activityId, int $userId): Activity
    {
        return Activity::where('id', $activityId)
            ->where('user_id', $userId)
            ->firstOrFail();
    }

    public function updateActivity(int $activityId, int $userId, array $data): Activity
    {
        $activity = $this->getActivity($activityId, $userId);
        $activity->update($data);

        return $activity;
    }

    public function deleteActivity(int $activityId, int $userId): void
    {
        $this->getActivity($activityId, $userId)->delete();
    }

    public function completeActivity(int $activityId, int $userId): array
    {
        return $this->tracing->trace('activity.complete', function () use ($activityId, $userId) {

            $activity = $this->tracing->trace('activity.fetch', fn() =>
                $this->getActivity($activityId, $userId)
            , ['activity.id' => $activityId]);

            $this->tracing->trace('activity.mark_completed', fn() =>
                $activity->markAsCompleted()
            , ['activity.priority' => $activity->priority]);

            $xpReward = $this->calculateXpReward($activity);

            $gamificationResult = $this->tracing->trace('gamification.update_experience', fn() =>
                $this->notifyGamification($userId, $activity, $xpReward)
            , ['xp.reward' => $xpReward]);

            $statisticsResult = $this->tracing->trace('statistics.record_activity', fn() =>
                $this->notifyStatistics($userId, $activity)
            , ['activity.id' => $activity->id]);

            return ['activity' => $activity, 'gamification' => $gamificationResult, 'statistics' => $statisticsResult];

        }, ['activity.id' => $activityId, 'user.id' => $userId]);
    }

    private function notifyGamification(int $userId, Activity $activity, int $xpReward): array
    {
        try {
            $url = rtrim(config('resilience.services.gamification'), '/');
            return $this->httpClient->post(
                "{$url}/update-experience",
                [
                    'user_id' => $userId,
                    'type' => 'activity_completed',
                    'xp_reward' => $xpReward,
                ],
                userId: $userId
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify gamification: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function notifyStatistics(int $userId, Activity $activity): array
    {
        try {
            $url = rtrim(config('resilience.services.statistics'), '/');
            return $this->httpClient->post(
                "{$url}/record-activity",
                [
                    'user_id' => $userId,
                    'activity_id' => $activity->id,
                ],
                userId: $userId
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify statistics: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function calculateXpReward(Activity $activity): int
    {
        $priorityMap = ['baja' => 10, 'media' => 20, 'alta' => 30];
        $baseXp = $priorityMap[$activity->priority] ?? 10;

        $estimatedBonus = min(50, (int) ($activity->estimated_minutes / 10));

        return $baseXp + $estimatedBonus;
    }
}
```

### Sistema de Tracing Distribuido - Implementación Completa

**`priorix-core/app/Infrastructure/Observability/TracingService.php`**

```php
<?php
namespace App\Infrastructure\Observability;

use OpenTelemetry\API\Trace\SpanInterface;
use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SemConventions\TraceAttributes;

class TracingService
{
    private TracerInterface $tracer;

    public function __construct()
    {
        $transport = (new OtlpHttpTransportFactory())->create(
            config('tracing.jaeger_endpoint', 'http://jaeger:4318/v1/traces'),
            'application/x-protobuf'
        );

        $exporter = new SpanExporter($transport);

        $provider = new TracerProvider(
            new SimpleSpanProcessor($exporter),
            null,
            ResourceInfo::create(Attributes::create([
                'service.name' => 'priorix-core',
            ]))
        );

        $this->tracer = $provider->getTracer('priorix-core');
    }

    public function startSpan(string $name): SpanInterface
    {
        return $this->tracer->spanBuilder($name)->startSpan();
    }

    public function trace(string $name, callable $callback, array $attributes = []): mixed
  {
      $span  = $this->startSpan($name);
      $scope = $span->activate();

      foreach ($attributes as $key => $value) {
          $span->setAttribute($key, $value);
      }

      try {
          $result = $callback($span);
          $span->setStatus(\OpenTelemetry\API\Trace\StatusCode::STATUS_OK);
          return $result;
      } catch (\Throwable $e) {
          $span->recordException($e);
          $span->setStatus(\OpenTelemetry\API\Trace\StatusCode::STATUS_ERROR, $e->getMessage());
          throw $e;
      } finally {
          $scope->detach();
          $span->end();
      }
  }
}
```
