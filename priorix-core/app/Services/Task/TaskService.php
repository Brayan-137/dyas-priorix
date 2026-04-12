<?php

namespace App\Services\Task;

use App\Models\Task;
use App\Models\Activity;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Collection;

class TaskService
{
    private ResilientHttpClient $httpClient;

    public function __construct(ResilientHttpClient $httpClient)
    {
        $this->httpClient = $httpClient;
    }

    /**
     * Get tasks for a user with optional filters
     */
    public function getTasksByUser(int $userId, array $filters = []): Collection
    {
        $query = Task::whereHas('activity', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->with('activity');

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['date'])) {
            $query->whereDate('scheduled_at', $filters['date']);
        }

        if (isset($filters['activity_id'])) {
            $query->where('activity_id', $filters['activity_id']);
        }

        return $query->orderBy('scheduled_at')->get();
    }

    /**
     * Get a specific task for a user
     */
    public function getTask(int $taskId, int $userId): Task
    {
        return Task::where('id', $taskId)
            ->whereHas('activity', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->with('activity')
            ->firstOrFail();
    }

    /**
     * Complete a task
     */
    public function completeTask(int $taskId, int $userId): array
    {
        $task = $this->getTask($taskId, $userId);

        if ($task->status === 'completed') {
            return ['error' => 'Task is already completed'];
        }

        $task->update(['status' => 'completed']);

        // Notify gamification service
        $gamificationResult = $this->notifyGamification($userId, $task);

        return [
            'task' => $task->load('activity'),
            'gamification' => $gamificationResult,
        ];
    }

    /**
     * Update task details
     */
    public function updateTask(int $taskId, int $userId, array $data): Task
    {
        $task = $this->getTask($taskId, $userId);

        $task->update($data);

        return $task->load('activity');
    }

    /**
     * Delete a task
     */
    public function deleteTask(int $taskId, int $userId): void
    {
        $task = $this->getTask($taskId, $userId);
        $task->delete();
    }

    /**
     * Get tasks for a specific date range
     */
    public function getTasksByDateRange(int $userId, string $startDate, string $endDate): Collection
    {
        return Task::whereHas('activity', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })
        ->whereBetween('scheduled_at', [$startDate, $endDate])
        ->with('activity')
        ->orderBy('scheduled_at')
        ->get();
    }

    /**
     * Get pending tasks for today
     */
    public function getTodayPendingTasks(int $userId): Collection
    {
        return Task::whereHas('activity', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })
        ->where('status', 'pending')
        ->whereDate('scheduled_at', today())
        ->with('activity')
        ->orderBy('scheduled_at')
        ->get();
    }

    private function notifyGamification(int $userId, Task $task): array
    {
        try {
            $url = rtrim(config('resilience.services.gamification'), '/');
            return $this->httpClient->post(
                "{$url}/update-experience",
                [
                    'user_id' => $userId,
                    'type' => 'task_completed',
                    'xp_reward' => 5, // Fixed XP for task completion
                ],
                userId: $userId
            );
        } catch (\Exception $e) {
            Log::warning('Failed to notify gamification: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }
}