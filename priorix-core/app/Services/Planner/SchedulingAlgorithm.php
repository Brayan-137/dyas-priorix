<?php

namespace App\Services\Planner;

use Carbon\Carbon;

class SchedulingAlgorithm
{
    public function generatePlan(array $scoredActivities, array $availableSlots): array
    {
        $plan = ['tasks' => []];
        
        // Sort by priority score
        usort($scoredActivities, fn($a, $b) => $b['score'] <=> $a['score']);
        
        foreach ($scoredActivities as $activity) {
            $slots = $this->findSuitableSlots($activity, $availableSlots);
            
            foreach ($slots as $slot) {
                $plan['tasks'][] = [
                    'activity_id' => $activity['id'],
                    'scheduled_at' => $slot['start'],
                    'duration' => min($activity['max_session_minutes'], $slot['duration']),
                ];
                
                // Remove used slot from available
                $availableSlots = array_filter($availableSlots, fn($s) => $s !== $slot);
            }
        }
        
        return $plan;
    }
    
    private function findSuitableSlots(array $activity, array $slots): array
    {
        // Filter slots that fit the activity's constraints
        // E.g., respect deadlines, fixed activities, etc.
        return array_filter($slots, fn($slot) => $this->slotFitsActivity($slot, $activity));
    }
    
    private function slotFitsActivity(array $slot, array $activity): bool
    {
        // Activity must not be fixed
        if ($activity['is_fixed']) {
            return false;
        }
        
        // Slot must be long enough for at least one session
        if ($slot['duration'] < $activity['max_session_minutes']) {
            return false;
        }
        
        // If deadline exists, slot must start before deadline
        if ($activity['deadline'] && Carbon::parse($slot['start'])->gte(Carbon::parse($activity['deadline']))) {
            return false;
        }
        
        // Check max_sessions: count existing tasks for this activity
        $existingTasksCount = \App\Models\Task::where('activity_id', $activity['id'])->count();
        if ($activity['max_sessions'] && $existingTasksCount >= $activity['max_sessions']) {
            return false;
        }
        
        // For repeating activities, ensure not scheduling on wrong days (but for now, assume ok)
        
        return true;
    }
}