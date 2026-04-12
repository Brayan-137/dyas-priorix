<?php

namespace App\Services\Planner;

use App\Models\Activity;
use Carbon\Carbon;

class PriorityScorer
{
    public function scoreActivities($activities): array
    {
        return $activities->map(function ($activity) {
            $priorityMap = ['baja' => 1, 'media' => 2, 'alta' => 3];
            $score = $priorityMap[$activity->priority] * 100;

            if ($activity->deadline) {
                $deadline = Carbon::parse($activity->deadline);
                $daysUntilDeadline = now()->diffInDays($deadline, false);
                $score += max(0, 30 - $daysUntilDeadline);
            }

            if ($activity->repeats_weekly) {
                $score += 5;
            }

            $score += min(20, (int) ($activity->estimated_minutes / 30));

            return array_merge($activity->toArray(), ['score' => $score]);
        })->toArray();
    }
}