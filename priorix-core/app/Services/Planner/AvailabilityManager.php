<?php

namespace App\Services\Planner;

use App\Models\Activity;
use Carbon\Carbon;

class AvailabilityManager
{
    public function getAvailableSlots(int $userId, Carbon $start, Carbon $end): array
    {
        // Work hours: 6 AM - 9 PM
        $slots = [];
        $current = $start->copy();
        
        while ($current < $end) {
            $workStart = $current->copy()->setTime(6, 0);
            $workEnd = $current->copy()->setTime(21, 0);
            
            // Get fixed tasks for the day
            $fixedTasks = \App\Models\Task::whereHas('activity', function ($query) use ($userId) {
                $query->where('user_id', $userId)->where('is_fixed', true);
            })
            ->whereDate('scheduled_at', $current->toDateString())
            ->orderBy('scheduled_at')
            ->get();
            
            // Calculate free slots between fixed tasks
            $slots = array_merge($slots, $this->calculateFreeSlots($workStart, $workEnd, $fixedTasks));
            
            $current->addDay();
        }
        
        return $slots;
    }
    
    private function calculateFreeSlots(Carbon $start, Carbon $end, $fixedTasks): array
    {
        $slots = [];
        $currentStart = $start->copy();
        
        // Sort tasks by scheduled_at
        $fixedTasks = $fixedTasks->sortBy('scheduled_at');
        
        foreach ($fixedTasks as $task) {
            $taskStart = Carbon::parse($task->scheduled_at);
            $taskEnd = $taskStart->copy()->addMinutes($task->duration_minutes);
            
            // If there's free time before the task
            if ($currentStart < $taskStart) {
                $duration = $currentStart->diffInMinutes($taskStart);
                if ($duration > 0) {
                    $slots[] = [
                        'start' => $currentStart->copy(),
                        'duration' => $duration,
                    ];
                }
            }
            
            // Move current start to after the task
            $currentStart = $taskEnd->copy();
        }
        
        // Add remaining time after last task
        if ($currentStart < $end) {
            $duration = $currentStart->diffInMinutes($end);
            if ($duration > 0) {
                $slots[] = [
                    'start' => $currentStart->copy(),
                    'duration' => $duration,
                ];
            }
        }
        
        return $slots;
    }
}