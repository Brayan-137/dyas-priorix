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

    public function completeActivity(int $activityId, int $userId): array
    {
        $activity = $this->getActivity($activityId, $userId);

        $activity->markAsCompleted();

        $gamificationResult = $this->notifyGamification($userId, 'activity_completed', [
            'activity_id' => $activity->id,
            'title' => $activity->title,
            'type' => $activity->type,
        ]);
        $statisticsResult = $this->notifyStatistics($userId, $activity);

        return [
            'activity' => $activity,
            'gamification' => $gamificationResult,
            'statistics' => $statisticsResult,
        ];
    }

    private function notifyGamification(int $userId, string $event, array $payload = []): array
    {
        try {
            return $this->httpClient->post('priorix-gamification/api/gamification/event', [
                'user_id' => $userId,
                'event' => $event,
                'payload' => $payload,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to notify gamification: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function notifyStatistics(int $userId, Activity $activity): array
    {
        try {
            return $this->httpClient->post('priorix-gamification/api/statistics/event', [
                'user_id' => $userId,
                'activity_id' => $activity->id,
                'event' => 'activity_completed',
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to notify statistics: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }
}