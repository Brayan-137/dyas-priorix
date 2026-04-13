<?php

namespace App\Services\Activity;

use App\Models\Activity;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;
use App\Infrastructure\Observability\TracingService;

class ActivityService
{
    public function __construct(
        private ResilientHttpClient $httpClient,
        private TracingService $tracing,
    ) {}

    public function getActivitiesByUser(int $userId)
    {
        return Activity::where('user_id', $userId)->get();
    }

    public function createActivity(array $data, int $userId): Activity
    {
        $data['user_id'] = $userId;

        return Activity::create($data);
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
        return $this->tracing->trace('activity.complete', function () use ($activityId, $userId) {

            $activity = $this->tracing->trace('activity.fetch', fn() =>
                $this->getActivity($activityId, $userId)
            , ['activity.id' => $activityId]);

            $this->tracing->trace('activity.mark_completed', fn() =>
                $activity->markAsCompleted()
            , ['activity.priority' => $activity->priority]);

            $xpReward = $this->calculateXpReward($activity);

            $gamificationResult = $this->tracing->trace('gamification.update_experience', fn() =>
                $this->notifyGamification($userId, $activity, $xpReward)
            , ['xp.reward' => $xpReward]);

            $statisticsResult = $this->tracing->trace('statistics.record_activity', fn() =>
                $this->notifyStatistics($userId, $activity)
            , ['activity.id' => $activity->id]);

            return ['activity' => $activity, 'gamification' => $gamificationResult, 'statistics' => $statisticsResult];

        }, ['activity.id' => $activityId, 'user.id' => $userId]);
    }

    private function notifyGamification(int $userId, Activity $activity, int $xpReward): array
    {
        try {
            $url = rtrim(config('resilience.services.gamification'), '/');
            return $this->httpClient->post(
                "{$url}/update-experience",
                [
                    'user_id' => $userId,
                    'type' => 'activity_completed',
                    'xp_reward' => $xpReward,
                ],
                userId: $userId
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify gamification: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function notifyStatistics(int $userId, Activity $activity): array
    {
        try {
            $url = rtrim(config('resilience.services.statistics'), '/');
            return $this->httpClient->post(
                "{$url}/record-activity",
                [
                    'user_id' => $userId,
                    'activity_id' => $activity->id,
                ],
                userId: $userId
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify statistics: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function calculateXpReward(Activity $activity): int
    {
        $priorityMap = ['baja' => 10, 'media' => 20, 'alta' => 30];
        $baseXp = $priorityMap[$activity->priority] ?? 10;

        $estimatedBonus = min(50, (int) ($activity->estimated_minutes / 10));

        return $baseXp + $estimatedBonus;
    }
}