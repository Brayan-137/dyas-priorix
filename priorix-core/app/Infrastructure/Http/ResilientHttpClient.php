<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Resilience\CircuitBreaker;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Prometheus\CollectorRegistry; // ← agregar

class ResilientHttpClient
{
    private int $timeout;
    private array $breakers = [];

    public function __construct(
        private CollectorRegistry $registry // ← agregar
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
        $this->updateCircuitBreakerMetric($this->extractServiceName($url), $breaker); // ← agregar
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
        $this->updateCircuitBreakerMetric($this->extractServiceName($url), $breaker); // ← agregar
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