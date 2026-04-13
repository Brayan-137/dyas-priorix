<?php

namespace App\Services\Task;

use App\Models\Task;
use App\Models\Activity;
use App\Infrastructure\Http\ResilientHttpClient;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Collection;
use App\Infrastructure\Observability\TracingService;

class TaskService
{
    public function __construct(
        private ResilientHttpClient $httpClient,
        private TracingService $tracing,
    ) {}

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
        return $this->tracing->trace('task.complete', function () use ($taskId, $userId) {

            $task = $this->tracing->trace('task.fetch', fn() =>
                $this->getTask($taskId, $userId)
            , ['task.id' => $taskId]);

            if ($task->status === 'completed') {
                return ['error' => 'Task is already completed'];
            }

            $this->tracing->trace('task.mark_completed', fn() =>
                $task->update(['status' => 'completed'])
            , ['task.duration' => $task->duration_minutes]);

            $gamificationResult = $this->tracing->trace('gamification.update_experience', fn() =>
                $this->notifyGamification($userId, $task)
            , ['xp.reward' => 5]);

            return ['task' => $task->load('activity'), 'gamification' => $gamificationResult];

        }, ['task.id' => $taskId, 'user.id' => $userId]);
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