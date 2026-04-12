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

        $activityIds = $activities->pluck('id')->toArray();
        $this->clearPendingTasksForActivities($activityIds);

        $scoredActivities = $this->scorer->scoreActivities($activities);
        $availableSlots = $this->availability->getAvailableSlots($userId, now(), now()->addDays(7));

        $plan = $this->algorithm->generatePlan($scoredActivities, $availableSlots);

        if (!empty($plan['tasks'])) {
            $this->createTasksFromPlan($plan, $userId);
        }

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

        $completedMinutes = Task::where('activity_id', $activityId)
            ->where('status', 'completed')
            ->sum('duration_minutes');

        $remainingMinutes = max(0, $activity->estimated_minutes - $completedMinutes);
        if ($remainingMinutes <= 0) {
            return true;
        }

        Task::where('activity_id', $activityId)
            ->where('status', 'pending')
            ->delete();

        $availableSlots = $this->availability->getAvailableSlots($activity->user_id, $newStart, $newStart->copy()->addDays(7));
        $availableSlots = array_filter($availableSlots, fn($slot) => $slot['start'] >= $newStart);

        $maxSessions = $activity->max_sessions ?? PHP_INT_MAX;
        $scheduled = 0;

        foreach ($availableSlots as $slot) {
            if ($scheduled >= $maxSessions || $remainingMinutes <= 0) {
                break;
            }

            $sessionDuration = min($activity->max_session_minutes, $slot['duration'], $remainingMinutes);
            if ($sessionDuration <= 0) {
                continue;
            }

            Task::create([
                'activity_id' => $activityId,
                'title' => $activity->title,
                'scheduled_at' => $slot['start'],
                'duration_minutes' => $sessionDuration,
            ]);

            $remainingMinutes -= $sessionDuration;
            $scheduled++;
        }

        return $remainingMinutes <= 0;
    }

    private function clearPendingTasksForActivities(array $activityIds): void
    {
        Task::whereIn('activity_id', $activityIds)
            ->where('status', 'pending')
            ->delete();
    }

    private function createTasksFromPlan(array $plan, int $userId): void
    {
        foreach ($plan['tasks'] as $taskData) {
            $activity = Activity::find($taskData['activity_id']);

            Task::create([
                'activity_id' => $taskData['activity_id'],
                'title' => $activity ? $activity->title : 'Planned task',
                'scheduled_at' => $taskData['scheduled_at'],
                'duration_minutes' => $taskData['duration'],
                'status' => 'pending',
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