<?php

namespace App\Services\Planner;

use App\Models\Activity;

class PriorityScorer
{
    public function scoreActivities($activities): array
    {
        return $activities->map(function ($activity) {
            $score = 0;
            
            // Base priority
            $priorityMap = ['baja' => 1, 'media' => 2, 'alta' => 3];
            $score += $priorityMap[$activity->priority] * 10;
            
            // Deadline proximity (closer = higher score)
            if ($activity->deadline) {
                $daysUntilDeadline = now()->diffInDays($activity->deadline, false);
                $score += max(0, 10 - $daysUntilDeadline); // Bonus for urgency
            }
            
            return array_merge($activity->toArray(), ['score' => $score]);
        })->toArray();
    }
}