<?php

namespace Tests\Feature\Api;

use App\Models\DailySummary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class StatisticsApiTest extends TestCase
{
    use RefreshDatabase;

    private function internalHeaders(int $userId = 1): array
    {
        return [
            'X-Internal-Service' => 'priorix-core',
            'X-Internal-Service-Secret' => 'test-internal-secret',
            'X-Internal-User-Id' => (string) $userId,
        ];
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_internal_service_can_record_completed_activity(): void
    {
        Carbon::setTestNow('2026-05-22 10:00:00');

        $response = $this->withHeaders($this->internalHeaders(30))
            ->postJson('/api/statistics/record-activity', [
                'activity_id' => 1001,
            ]);

        $response->assertOk()
            ->assertJsonPath('user_id', 30)
            ->assertJsonPath('completed_count', 1)
            ->assertJsonPath('streak_day', 1);

        $this->assertDatabaseHas('daily_summaries', [
            'user_id' => 30,
            'date' => '2026-05-22 00:00:00',
            'completed_count' => 1,
            'streak_day' => 1,
        ]);
    }

    public function test_weekly_statistics_return_total_completed_and_current_streak(): void
    {
        Carbon::setTestNow('2026-05-22 10:00:00');

        DailySummary::create([
            'user_id' => 40,
            'date' => '2026-05-21',
            'completed_count' => 2,
            'pending_count' => 1,
            'streak_day' => 3,
        ]);

        DailySummary::create([
            'user_id' => 40,
            'date' => '2026-05-22',
            'completed_count' => 4,
            'pending_count' => 0,
            'streak_day' => 4,
        ]);

        DailySummary::create([
            'user_id' => 999,
            'date' => '2026-05-22',
            'completed_count' => 99,
            'pending_count' => 0,
            'streak_day' => 1,
        ]);

        $response = $this->withHeaders($this->internalHeaders(40))
            ->getJson('/api/statistics/weekly');

        $response->assertOk()
            ->assertJsonPath('total_completed', 6)
            ->assertJsonPath('current_streak', 4)
            ->assertJsonCount(2, 'days');
    }

    public function test_record_activity_validates_required_payload(): void
    {
        $response = $this->withHeaders($this->internalHeaders(50))
            ->postJson('/api/statistics/record-activity', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['activity_id']);
    }

    public function test_statistics_endpoints_require_internal_auth(): void
    {
        $this->getJson('/api/statistics/weekly')->assertUnauthorized();

        $this->withHeaders([
            'X-Internal-Service' => 'priorix-core',
            'X-Internal-Service-Secret' => 'invalid',
            'X-Internal-User-Id' => '5',
        ])->getJson('/api/statistics/weekly')
            ->assertForbidden();
    }
}
