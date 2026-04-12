<?php

namespace App\Services\Activity;

use App\Models\Activity;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;

class ActivityService
{
    public function __construct(
        private readonly ResilientHttpClient $httpClient
    ) {}

    public function createActivity(array $data, int $userId): Activity
    {
        return Activity::create(array_merge($data, ['user_id' => $userId]));
    }

    public function getActivitiesByUser(int $userId): \Illuminate\Database\Eloquent\Collection
    {
        return Activity::where('user_id', $userId)
            ->orderBy('deadline')
            ->get();
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

    private function notifyGamification(int $userId, Activity $activity): array
    {
        try {
            return $this->httpClient->post(
                config('resilience.services.gamification') . '/update-experience',
                [
                    'user_id'     => $userId,
                    'activity_id' => $activity->id,
                    'type'        => 'task_completed',
                    'xp_reward'   => $this->calculateXpReward($activity),
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Gamification service unavailable', [
                'user_id' => $userId,
                'error'   => $e->getMessage(),
            ]);
            return ['status' => 'gamification_unavailable', 'xp_awarded' => 0];
        }
    }

    private function notifyStatistics(int $userId, Activity $activity): void
    {
        try {
            $this->httpClient->post(
                config('resilience.services.statistics') . '/record-activity',
                [
                    'user_id'      => $userId,
                    'activity_id'  => $activity->id,
                    'type'         => $activity->type,
                    'completed_at' => now()->toIso8601String(),
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Statistics service unavailable', [
                'user_id' => $userId,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    private function calculateXpReward(Activity $activity): int
    {
        return match($activity->priority) {
            'alta'  => 50,
            'media' => 30,
            'baja'  => 15,
            default => 10,
        };
    }
}