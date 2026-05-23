<?php

namespace Tests\Autonomous;

use App\Http\Controllers\StatisticsController;
use App\Models\DailySummary;
use App\Services\Statistics\StatisticsService;
use Illuminate\Http\Request;
use Mockery;
use Tests\TestCase;

class StatisticsControllerMockeryTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function internalRequest(string $method, string $uri, array $payload = [], int $userId = 77): Request
    {
        $request = Request::create($uri, $method, $payload);
        $request->headers->set('X-Internal-Service', 'priorix-core');
        $request->headers->set('X-Internal-Service-Secret', 'test-internal-secret');
        $request->headers->set('X-Internal-User-Id', (string) $userId);

        return $request;
    }

    public function test_weekly_uses_statistics_service_mock(): void
    {
        $service = Mockery::mock(StatisticsService::class);
        $service->shouldReceive('getWeeklyStats')
            ->once()
            ->with(77)
            ->andReturn([
                'days' => [],
                'total_completed' => 8,
                'current_streak' => 4,
            ]);

        $response = (new StatisticsController($service))
            ->weekly($this->internalRequest('GET', '/api/statistics/weekly'));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(8, $response->getData(true)['total_completed']);
    }

    public function test_record_activity_uses_statistics_service_mock(): void
    {
        $summary = new DailySummary([
            'user_id' => 66,
            'date' => '2026-05-22',
            'completed_count' => 1,
            'pending_count' => 0,
            'streak_day' => 1,
        ]);
        $summary->id = 1;

        $service = Mockery::mock(StatisticsService::class);
        $service->shouldReceive('recordActivityCompletion')
            ->once()
            ->with(66, 5001)
            ->andReturn($summary);

        $response = (new StatisticsController($service))
            ->recordActivity($this->internalRequest('POST', '/api/statistics/record-activity', [
                'activity_id' => 5001,
            ], 66));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(1, $response->getData(true)['completed_count']);
    }
}
