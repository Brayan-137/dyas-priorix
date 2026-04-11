<?php

namespace App\Services\Statistics;

use App\Models\DailySummary;
use Illuminate\Support\Carbon;

class StatisticsService
{
    public function recordActivityCompletion(int $userId, int $activityId): DailySummary
    {
        $today = Carbon::today()->toDateString();

        $summary = DailySummary::firstOrCreate(
            ['user_id' => $userId, 'date' => $today],
            ['completed_count' => 0, 'pending_count' => 0, 'streak_day' => 1]
        );

        $summary->increment('completed_count');
        $this->updateStreak($userId, $summary);

        return $summary->fresh();
    }

    public function getWeeklyStats(int $userId): array
    {
        $lastSevenDays = DailySummary::where('user_id', $userId)
            ->where('date', '>=', Carbon::today()->subDays(6)->toDateString())
            ->orderBy('date')
            ->get();

        return [
            'days'            => $lastSevenDays,
            'total_completed' => $lastSevenDays->sum('completed_count'),
            'current_streak'  => $lastSevenDays->last()?->streak_day ?? 0,
        ];
    }

    private function updateStreak(int $userId, DailySummary $today): void
    {
        $yesterday = DailySummary::where('user_id', $userId)
            ->where('date', Carbon::yesterday()->toDateString())
            ->first();

        $today->streak_day = ($yesterday && $yesterday->completed_count > 0)
            ? $yesterday->streak_day + 1
            : 1;

        $today->save();
    }
}