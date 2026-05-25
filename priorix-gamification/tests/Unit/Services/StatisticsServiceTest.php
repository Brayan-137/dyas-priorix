<?php

namespace Tests\Unit\Services;

use App\Models\DailySummary;
use App\Services\Statistics\StatisticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class StatisticsServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_record_activity_completion_creates_daily_summary(): void
    {
        Carbon::setTestNow('2026-05-22 08:00:00');

        $summary = (new StatisticsService())->recordActivityCompletion(201, 3001);

        $this->assertSame(201, $summary->user_id);
        $this->assertSame(1, $summary->completed_count);
        $this->assertSame(1, $summary->streak_day);

        $this->assertDatabaseHas('daily_summaries', [
            'user_id' => 201,
            'completed_count' => 1,
        ]);
        $this->assertSame('2026-05-22', $summary->date->toDateString());
    }

    public function test_record_activity_completion_continues_streak_from_yesterday(): void
    {
        Carbon::setTestNow('2026-05-22 08:00:00');

        DailySummary::create([
            'user_id' => 202,
            'date' => Carbon::parse('2026-05-21'),
            'completed_count' => 2,
            'pending_count' => 0,
            'streak_day' => 5,
        ]);

        $summary = (new StatisticsService())->recordActivityCompletion(202, 3002);

        $this->assertSame(6, $summary->streak_day);
    }

    public function test_weekly_stats_only_include_last_seven_days_for_user(): void
    {
        Carbon::setTestNow('2026-05-22 08:00:00');

        DailySummary::create([
            'user_id' => 203,
            'date' => '2026-05-15',
            'completed_count' => 99,
            'pending_count' => 0,
            'streak_day' => 1,
        ]);

        DailySummary::create([
            'user_id' => 203,
            'date' => '2026-05-20',
            'completed_count' => 3,
            'pending_count' => 0,
            'streak_day' => 2,
        ]);

        DailySummary::create([
            'user_id' => 203,
            'date' => '2026-05-22',
            'completed_count' => 4,
            'pending_count' => 0,
            'streak_day' => 3,
        ]);

        DailySummary::create([
            'user_id' => 999,
            'date' => '2026-05-22',
            'completed_count' => 100,
            'pending_count' => 0,
            'streak_day' => 1,
        ]);

        $stats = (new StatisticsService())->getWeeklyStats(203);

        $this->assertSame(7, $stats['total_completed']);
        $this->assertSame(3, $stats['current_streak']);
        $this->assertCount(2, $stats['days']);
    }
}
