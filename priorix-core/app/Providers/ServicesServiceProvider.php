<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\Activity\ActivityService;
use App\Infrastructure\Http\ResilientHttpClient;
use App\Services\Auth\AuthService;
use App\Services\Planner\PlannerService;
use App\Services\Planner\SchedulingAlgorithm;
use App\Services\Planner\AvailabilityManager;
use App\Services\Planner\PriorityScorer;
use App\Services\Task\TaskService;

class ServicesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ResilientHttpClient::class);
        $this->app->singleton(AuthService::class);
        
        $this->app->bind(ActivityService::class, function ($app) {
            return new ActivityService(
                $app->make(ResilientHttpClient::class)
            );
        });

        $this->app->bind(TaskService::class, function ($app) {
            return new TaskService(
                $app->make(ResilientHttpClient::class)
            );
        });

        $this->app->bind(SchedulingAlgorithm::class);
        $this->app->bind(AvailabilityManager::class);
        $this->app->bind(PriorityScorer::class);
        
        $this->app->bind(PlannerService::class, function ($app) {
            return new PlannerService(
                $app->make(ResilientHttpClient::class),
                $app->make(SchedulingAlgorithm::class),
                $app->make(AvailabilityManager::class),
                $app->make(PriorityScorer::class)
            );
        });
    }
}