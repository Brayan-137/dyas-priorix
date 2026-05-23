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

    public function recordActivity(Request $request)
{
    $validated = $request->validate([
        'activity_id' => 'required|integer',
    ]);

    $userId = (int) $request->header('X-Internal-User-Id');

    $summary = $this->statisticsService->recordActivityCompletion(
        $userId,
        $validated['activity_id']
    );

    return response()->json($summary);
}
}
