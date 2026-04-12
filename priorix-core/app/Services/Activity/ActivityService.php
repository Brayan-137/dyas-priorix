<?php

namespace App\Services\Activity;

use App\Models\Activity;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;

class ActivityService
{
    private ResilientHttpClient $httpClient;

    public function __construct(ResilientHttpClient $httpClient)
    {
        $this->httpClient = $httpClient;
    }

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

    public function completeActivity(int $activityId, int $userId, ?string $token = null): array
    {
        $activity = $this->getActivity($activityId, $userId);

        $activity->markAsCompleted();

        $xpReward = $this->calculateXpReward($activity);
        $gamificationResult = $this->notifyGamification($userId, $activity, $xpReward, $token);
        $statisticsResult = $this->notifyStatistics($userId, $activity, $token);

        return [
            'activity' => $activity,
            'gamification' => $gamificationResult,
            'statistics' => $statisticsResult,
        ];
    }

    private function notifyGamification(int $userId, Activity $activity, int $xpReward, ?string $token = null): array
    {
        try {
            $url = rtrim(config('resilience.services.gamification'), '/');
            return $this->httpClient->post(
                "{$url}/update-experience",
                [
                    'type' => 'activity_completed',
                    'xp_reward' => $xpReward,
                ],
                $token
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify gamification: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function notifyStatistics(int $userId, Activity $activity, ?string $token = null): array
    {
        try {
            $url = rtrim(config('resilience.services.statistics'), '/');
            return $this->httpClient->post(
                "{$url}/record-activity",
                ['activity_id' => $activity->id],
                $token
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