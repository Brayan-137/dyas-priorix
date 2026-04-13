<?php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Prometheus\CollectorRegistry;
use Prometheus\Storage\Redis as RedisAdapter;

class PrometheusServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(CollectorRegistry::class, function () {
            $adapter = new RedisAdapter([
                'host'     => config('database.redis.default.host', 'redis'),
                'port'     => (int) config('database.redis.default.port', 6379), // ← cast obligatorio
                'database' => (int) config('prometheus.redis_database', 1),      // ← cast obligatorio
            ]);

            return new CollectorRegistry($adapter);
        });
    }
}