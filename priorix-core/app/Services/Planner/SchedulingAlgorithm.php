<?php

namespace App\Services\Planner;

use App\Models\Task;
use Carbon\Carbon;

class SchedulingAlgorithm
{
    public function generatePlan(array $scoredActivities, array $availableSlots): array
    {
        $plan = ['tasks' => []];

        usort($availableSlots, fn($a, $b) => $a['start'] <=> $b['start']);
        usort($scoredActivities, fn($a, $b) => $b['score'] <=> $a['score']);

        foreach ($scoredActivities as $activity) {
            if ($activity['is_fixed']) {
                continue;
            }

            $remainingMinutes = max(0, (int) $activity['estimated_minutes']);
            if ($remainingMinutes === 0) {
                continue;
            }

            $existingTaskCount = Task::where('activity_id', $activity['id'])->count();
            $maxSessions = $activity['max_sessions'] ?? PHP_INT_MAX;
            $sessionsLeft = max(0, $maxSessions - $existingTaskCount);
            if ($sessionsLeft === 0) {
                continue;
            }

            foreach ($availableSlots as $index => $slot) {
                if ($remainingMinutes <= 0 || $sessionsLeft <= 0) {
                    break;
                }

                if (!$this->slotFitsActivity($slot, $activity, $remainingMinutes)) {
                    continue;
                }

                $sessionDuration = $this->resolveSessionDuration($activity, $slot['duration'], $remainingMinutes);

                $plan['tasks'][] = [
                    'activity_id' => $activity['id'],
                    'scheduled_at' => $slot['start'],
                    'duration' => $sessionDuration,
                ];

                $remainingMinutes -= $sessionDuration;
                $sessionsLeft--;

                $availableSlots[$index] = $this->consumeSlot($slot, $sessionDuration);
                if ($availableSlots[$index]['duration'] <= 0) {
                    array_splice($availableSlots, $index, 1);
                }
            }
        }

        return $plan;
    }

    private function resolveSessionDuration(array $activity, int $slotDuration, int $remainingMinutes): int
    {
        return min($activity['max_session_minutes'], $slotDuration, $remainingMinutes);
    }

    private function consumeSlot(array $slot, int $minutes): array
    {
        $start = Carbon::parse($slot['start'])->addMinutes($minutes);

        return [
            'start' => $start,
            'duration' => $slot['duration'] - $minutes,
        ];
    }

    private function slotFitsActivity(array $slot, array $activity, int $remainingMinutes): bool
    {
        if ($activity['is_fixed']) {
            return false;
        }

        if ($remainingMinutes <= 0) {
            return false;
        }

        $minimumDuration = min($activity['max_session_minutes'], $remainingMinutes);
        if ($slot['duration'] < $minimumDuration) {
            return false;
        }

        if ($activity['deadline'] && Carbon::parse($slot['start'])->gte(Carbon::parse($activity['deadline']))) {
            return false;
        }

        return true;
    }
}