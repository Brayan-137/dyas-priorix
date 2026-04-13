<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Prometheus\CollectorRegistry;

class PrometheusMiddleware
{
    public function __construct(private readonly CollectorRegistry $registry) {}

    public function handle(Request $request, Closure $next)
    {
        $start    = microtime(true);
        $response = $next($request);
        $duration = microtime(true) - $start;

        $route  = $request->route()?->getName() ?? $request->path();
        $method = $request->method();
        $status = (string) $response->getStatusCode();
        $prefix = config('prometheus.prefix');

        $this->registry
            ->getOrRegisterCounter($prefix, 'http_requests_total', 'Total peticiones HTTP', ['route', 'method', 'status'])
            ->inc([$route, $method, $status]);

        $this->registry
            ->getOrRegisterHistogram($prefix, 'http_request_duration_seconds', 'Duración en segundos', ['route', 'method'], [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0])
            ->observe($duration, [$route, $method]);

        return $response;
    }
}