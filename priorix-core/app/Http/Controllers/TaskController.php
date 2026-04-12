<?php

namespace App\Http\Controllers;

use App\Services\Task\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(private readonly TaskService $taskService) {}

    /**
     * Get all tasks for the authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['status', 'date', 'activity_id']);
        $tasks = $this->taskService->getTasksByUser(auth('api')->id(), $filters);

        return response()->json($tasks);
    }

    /**
     * Get a specific task
     */
    public function show(int $id): JsonResponse
    {
        $task = $this->taskService->getTask($id, auth('api')->id());

        return response()->json($task);
    }

    /**
     * Complete a task
     */
    public function complete(int $id): JsonResponse
    {
        $result = $this->taskService->completeTask($id, auth('api')->id());

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 400);
        }

        return response()->json($result);
    }

    /**
     * Update task details
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'duration_minutes' => 'sometimes|integer|min:1',
            'scheduled_at' => 'sometimes|date',
            'status' => 'sometimes|string|in:pending,completed,cancelled',
        ]);

        $task = $this->taskService->updateTask($id, auth('api')->id(), $data);

        return response()->json($task);
    }

    /**
     * Delete a task
     */
    public function destroy(int $id): JsonResponse
    {
        $this->taskService->deleteTask($id, auth('api')->id());

        return response()->json(null, 204);
    }

    /**
     * Get tasks for a date range
     */
    public function getByDateRange(Request $request): JsonResponse
    {
        $data = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $tasks = $this->taskService->getTasksByDateRange(
            auth('api')->id(),
            $data['start_date'],
            $data['end_date']
        );

        return response()->json($tasks);
    }

    /**
     * Get pending tasks for today
     */
    public function getTodayPending(): JsonResponse
    {
        $tasks = $this->taskService->getTodayPendingTasks(auth('api')->id());

        return response()->json($tasks);
    }
}