<?php

namespace App\Http\Controllers;

use App\Services\Statistics\StatisticsService;
use App\Http\Traits\AuthorizeInternalServiceOrJwt;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StatisticsController extends Controller
{
    use AuthorizeInternalServiceOrJwt;
    
    public function __construct(private readonly StatisticsService $statisticsService) {}

    public function weekly(Request $request): JsonResponse
    {
        $userId = $this->authorizeRequest($request);
        
        $stats = $this->statisticsService->getWeeklyStats($userId);

        return response()->json($stats);
    }

    public function recordActivity(Request $request): JsonResponse
    {
        $userId = $this->authorizeRequest($request);
        
        $data = $request->validate([
            'activity_id' => 'required|integer|min:1',
            'user_id' => 'sometimes|integer|min:1',
        ]);

        $summary = $this->statisticsService->recordActivityCompletion(
            $userId,
            $data['activity_id']
        );

        return response()->json($summary);
    }
}
