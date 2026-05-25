<?php

namespace Tests\Autonomous;

use App\Http\Controllers\StatisticsController;
use App\Services\Statistics\StatisticsService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\TestCase;

class StatisticsControllerValidationMockeryTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function internalRequest(string $method, string $uri, array $payload = [], int $userId = 30): Request
    {
        $request = Request::create($uri, $method, $payload);
        $request->headers->set('X-Internal-Service', 'priorix-core');
        $request->headers->set('X-Internal-Service-Secret', 'test-internal-secret');
        $request->headers->set('X-Internal-User-Id', (string) $userId);
        $request->attributes->set('resolved_user_id', $userId);

        return $request;
    }

    public function test_record_activity_does_not_call_service_when_activity_id_is_missing(): void
    {
        $service = Mockery::mock(StatisticsService::class);
        $service->shouldNotReceive('recordActivityCompletion');

        $this->expectException(ValidationException::class);

        (new StatisticsController($service))->recordActivity(
            $this->internalRequest('POST', '/api/statistics/record-activity', [])
        );
    }
}
