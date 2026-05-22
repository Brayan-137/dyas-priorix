<?php

namespace Tests\Autonomous;

use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Http;
use Prometheus\CollectorRegistry;
use Prometheus\Storage\InMemory;
use Tests\TestCase;

class ResilientHttpClientHttpFakeTest extends TestCase
{
    public function test_post_sends_internal_headers_and_returns_json_response(): void
    {
        config([
            'resilience.internal_service_secret' => 'test-secret',
            'resilience.circuit_breaker.timeout' => 2,
            'prometheus.prefix' => 'priorix_test',
        ]);

        Http::fake([
            'priorix-gamification/api/update-experience' => Http::response([
                'status' => 'updated',
                'xp' => 5,
            ], 200),
        ]);

        $client = new ResilientHttpClient(new CollectorRegistry(new InMemory()));

        $result = $client->post(
            'http://priorix-gamification/api/update-experience',
            ['user_id' => 1, 'type' => 'task_completed', 'xp_reward' => 5],
            userId: 1
        );

        $this->assertSame(['status' => 'updated', 'xp' => 5], $result);

        Http::assertSent(function ($request) {
            return $request->hasHeader('X-Internal-Service', 'priorix-core')
                && $request->hasHeader('X-Internal-Service-Secret', 'test-secret')
                && $request->hasHeader('X-Internal-User-Id', '1');
        });
    }
}
