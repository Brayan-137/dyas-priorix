<?php

namespace App\Services\Planner;

use App\Models\Activity;
use App\Models\Task;
use App\Models\User;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;

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
        
        // Update activity or tasks
        // ... logic to reschedule
        
        return true;
    }
    
    public function getActivity(int $activityId, int $userId): Activity
    {
        return Activity::where('id', $activityId)
            ->where('user_id', $userId)
            ->firstOrFail();
    }

    public function updateActivity(int $activityId, int $userId, array $data): Activity
    {
        $activity = $this->getActivity($activityId, $userId);
        $activity->update($data);

        return $activity;
    }

    public function deleteActivity(int $activityId, int $userId): void
    {
        $this->getActivity($activityId, $userId)->delete();
    }

    public function completeActivity(int $activityId, int $userId): array
    {
        $activity = $this->getActivity($activityId, $userId);

        $activity->markAsCompleted();

        $gamificationResult = $this->notifyGamification($userId, $activity);
        $this->notifyStatistics($userId, $activity);

        return [
            'activity'     => $activity,
            'gamification' => $gamificationResult,
        ];
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