<?php

namespace App\Services\Planner;

use App\Models\Activity;
use App\Models\Task;
use App\Models\User;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use App\Infrastructure\Observability\TracingService;

class PlannerService
{
    public function __construct(
        private ResilientHttpClient $httpClient,
        private SchedulingAlgorithm $algorithm,
        private AvailabilityManager $availability,
        private PriorityScorer $scorer,
        private TracingService $tracing,
    ) {}

    /**
     * Generate a weekly plan for the user.
     */
    public function generateWeeklyPlan(int $userId): array
    {
        return $this->tracing->trace('planner.generate_weekly_plan', function () use ($userId) {

            $activities = $this->tracing->trace('planner.fetch_activities', function () use ($userId) {
                User::findOrFail($userId);
                return Activity::where('user_id', $userId)->where('status', 'pending')->get();
            }, ['user.id' => $userId]);

            $this->tracing->trace('planner.clear_pending_tasks', fn() =>
                $this->clearPendingTasksForActivities($activities->pluck('id')->toArray())
            , ['activities.count' => $activities->count()]);

            $scoredActivities = $this->tracing->trace('planner.score_activities', fn() =>
                $this->scorer->scoreActivities($activities)
            , ['activities.count' => $activities->count()]);

            $availableSlots = $this->tracing->trace('planner.get_available_slots', fn() =>
                $this->availability->getAvailableSlots($userId, now(), now()->addDays(7))
            , ['user.id' => $userId]);

            $plan = $this->tracing->trace('planner.run_algorithm', fn() =>
                $this->algorithm->generatePlan($scoredActivities, $availableSlots)
            , ['slots.count' => count($availableSlots)]);

            if (!empty($plan['tasks'])) {
                $this->tracing->trace('planner.create_tasks', fn() =>
                    $this->createTasksFromPlan($plan, $userId)
                , ['tasks.count' => count($plan['tasks'])]);
            }

            $this->tracing->trace('gamification.notify_plan_generated', fn() =>
                $this->notifyGamification($userId, 'plan_generated')
            , ['user.id' => $userId]);

            return $plan;

        }, ['user.id' => $userId]);
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
            $url = rtrim(config('resilience.services.gamification'), '/');
            $this->httpClient->post(
                "{$url}/update-experience",
                [
                    'user_id' => $userId,
                    'type' => $event,
                    'xp_reward' => 0,
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify gamification: ' . $e->getMessage());
        }
    }
}