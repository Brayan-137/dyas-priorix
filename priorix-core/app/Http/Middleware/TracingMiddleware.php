<?php
namespace App\Http\Middleware;

use App\Infrastructure\Observability\TracingService;
use Closure;
use Illuminate\Http\Request;

class TracingMiddleware
{
    public function __construct(private readonly TracingService $tracing) {}

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