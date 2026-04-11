<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\Gamification\GamificationService;
use App\Services\Statistics\StatisticsService;

class ServicesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(GamificationService::class);
        $this->app->singleton(StatisticsService::class);
    }
}