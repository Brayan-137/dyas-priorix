<?php

namespace App\Services\Planner;

use App\Models\Activity;
use App\Models\Task;
use App\Models\User;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PlannerService
{
    private ResilientHttpClient $httpClient;
    private SchedulingAlgorithm $algorithm;
    private AvailabilityManager $availability;
    private PriorityScorer $scorer;

    public function __construct(
        ResilientHttpClient $httpClient,
        SchedulingAlgorithm $algorithm,
        AvailabilityManager $availability,
        PriorityScorer $scorer
    ) {
        $this->httpClient = $httpClient;
        $this->algorithm = $algorithm;
        $this->availability = $availability;
        $this->scorer = $scorer;
    }

    /**
     * Generate a weekly plan for the user.
     */
    public function generateWeeklyPlan(int $userId): array
    {
        $user = User::findOrFail($userId);
        $activities = Activity::where('user_id', $userId)
            ->where('status', 'pending')
            ->get();

        // Score priorities
        $scoredActivities = $this->scorer->scoreActivities($activities);

        // Get available slots (e.g., next 7 days, 9-5 work hours)
        $availableSlots = $this->availability->getAvailableSlots($userId, now(), now()->addDays(7));

        // Generate plan
        $plan = $this->algorithm->generatePlan($scoredActivities, $availableSlots);

        // Create Task records
        $this->createTasksFromPlan($plan, $userId);

        // Notify gamification service (with fallback)
        $this->notifyGamification($userId, 'plan_generated');

        return $plan;
    }

    /**
     * Reschedule a single activity.
     */
    public function rescheduleActivity(int $activityId, string $newDateTime): bool
    {
        $activity = Activity::findOrFail($activityId);
        $newStart = Carbon::parse($newDateTime);
        
        // Get existing tasks
        $existingTasks = Task::where('activity_id', $activityId)->get();
        
        // Calculate remaining time needed
        $completedMinutes = $existingTasks->sum('duration_minutes');
        $remainingMinutes = $activity->estimated_minutes - $completedMinutes;
        
        if ($remainingMinutes <= 0) {
            return true; // Already completed
        }
        
        // Get available slots starting from newDateTime
        $availableSlots = $this->availability->getAvailableSlots($activity->user_id, $newStart, $newStart->copy()->addDays(7));
        $availableSlots = array_filter($availableSlots, fn($slot) => $slot['start'] >= $newStart);
        
        // Schedule remaining sessions
        $scheduled = 0;
        $maxSessions = $activity->max_sessions ?? PHP_INT_MAX;
        
        foreach ($availableSlots as $slot) {
            if ($scheduled >= $maxSessions || $remainingMinutes <= 0) {
                break;
            }
            
            $sessionDuration = min($activity->max_session_minutes, $slot['duration'], $remainingMinutes);
            
            Task::create([
                'activity_id' => $activityId,
                'scheduled_at' => $slot['start'],
                'duration_minutes' => $sessionDuration,
            ]);
            
            $remainingMinutes -= $sessionDuration;
            $scheduled++;
        }
        
        return $remainingMinutes <= 0;
    }

    private function createTasksFromPlan(array $plan, int $userId): void
    {
        foreach ($plan['tasks'] as $taskData) {
            Task::create([
                'activity_id' => $taskData['activity_id'],
                'scheduled_at' => $taskData['scheduled_at'],
                'duration_minutes' => $taskData['duration'],
                // ... other fields
            ]);
        }
    }

    private function notifyGamification(int $userId, string $event): void
    {
        try {
            $this->httpClient->post('priorix-gamification/api/gamification/event', [
                'user_id' => $userId,
                'event' => $event,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to notify gamification: ' . $e->getMessage());
        }
    }
}