<?php

namespace App\Http\Controllers;

use App\Services\Statistics\StatisticsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StatisticsController extends Controller
{
    public function __construct(private readonly StatisticsService $statisticsService) {}

    public function weekly(): JsonResponse
    {
        $stats = $this->statisticsService->getWeeklyStats(auth('api')->id());

        return response()->json($stats);
    }

    public function recordActivity(Request $request): JsonResponse
    {
        $data = $request->validate([
            'activity_id' => 'required|integer|min:1',
        ]);

        $summary = $this->statisticsService->recordActivityCompletion(
            auth('api')->id(),
            $data['activity_id']
        );

        return response()->json($summary);
    }
}
