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
        
        // Debug routes (no middleware)
        if (file_exists(base_path('routes/debug.php'))) {
            require base_path('routes/debug.php');
        }
    })
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'jwt.auth' => \App\Http\Middleware\InternalServiceAuthMiddleware::class,
            'internal.auth' => \App\Http\Middleware\InternalServiceAuthMiddleware::class,
        ]);

        $middleware->append(\App\Http\Middleware\PrometheusMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
