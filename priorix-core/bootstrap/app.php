<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Routing\Router;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(function (Router $router) {
        $router->middleware('api')
            ->prefix('api')
            ->group(base_path('routes/api.php'));

        $router->middleware('web')
            ->group(base_path('routes/web.php'));
    })
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'jwt.auth' => \App\Http\Middleware\JwtAuthMiddleware::class,
        ]);

        $middleware->append(\App\Http\Middleware\PrometheusMiddleware::class);
        $middleware->append(\App\Http\Middleware\TracingMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();