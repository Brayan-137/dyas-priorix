<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\Activity\ActivityService;
use App\Infrastructure\Http\ResilientHttpClient;

class ServicesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ResilientHttpClient::class);

        $this->app->bind(ActivityService::class, function ($app) {
            return new ActivityService(
                $app->make(ResilientHttpClient::class)
            );
        });
    }
}