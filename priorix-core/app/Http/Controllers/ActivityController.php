<?php

namespace App\Http\Controllers;

use App\Services\Activity\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    public function __construct(private readonly ActivityService $activityService) {}

    public function index(Request $request): JsonResponse
    {
        $activities = $this->activityService->getActivitiesByUser(auth('api')->id());

        return response()->json($activities);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateActivity($request);

        $activity = $this->activityService->createActivity($data, auth('api')->id());

        return response()->json($activity, 201);
    }

    public function show(int $id): JsonResponse
    {
        $activity = $this->activityService->getActivity($id, auth('api')->id());

        return response()->json($activity);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $this->validateActivity($request, true);

        $activity = $this->activityService->updateActivity($id, auth('api')->id(), $data);

        return response()->json($activity);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->activityService->deleteActivity($id, auth('api')->id());

        return response()->json(null, 204);
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $result = $this->activityService->completeActivity($id, auth('api')->id());

        return response()->json($result);
    }

    private function validateActivity(Request $request, bool $isUpdate = false): array
    {
        $rules = [
            'title' => $isUpdate ? 'sometimes|string|max:255' : 'required|string|max:255',
            'type' => $isUpdate ? 'sometimes|string|max:100' : 'required|string|max:100',
            'description' => 'sometimes|nullable|string',
            'estimated_minutes' => 'sometimes|nullable|integer|min:0',
            'max_session_minutes' => 'sometimes|nullable|integer|min:0',
            'max_sessions' => 'sometimes|nullable|integer|min:0',
            'priority' => 'sometimes|nullable|string|in:alta,media,baja',
            'label' => 'sometimes|nullable|string|max:100',
            'is_fixed' => 'sometimes|boolean',
            'repeats_weekly' => 'sometimes|boolean',
            'deadline' => 'sometimes|nullable|date',
            'status' => 'sometimes|nullable|string|max:50',
        ];

        return $request->validate($rules);
    }
}
