<?php

namespace App\Http\Controllers;

use App\Services\Planner\PlannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlannerController extends Controller
{
    public function __construct(private PlannerService $plannerService) {}

    /**
     * Generate a weekly plan for the authenticated user.
     */
    public function generateWeeklyPlan(Request $request): JsonResponse
    {
        $userId = auth('api')->id();

        try {
            $plan = $this->plannerService->generateWeeklyPlan($userId);
            return response()->json([
                'success' => true,
                'message' => 'Weekly plan generated successfully',
                'data' => $plan
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate plan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reschedule an activity to a new date/time.
     */
    public function rescheduleActivity(Request $request, int $activityId): JsonResponse
    {
        $data = $request->validate([
            'new_date_time' => 'required|date',
        ]);

        try {
            $success = $this->plannerService->rescheduleActivity($activityId, $data['new_date_time']);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Activity rescheduled successfully' : 'Could not fully reschedule activity'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reschedule activity: ' . $e->getMessage()
            ], 500);
        }
    }
}