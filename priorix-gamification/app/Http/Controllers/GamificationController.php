<?php

namespace App\Http\Controllers;

use App\Services\Gamification\GamificationService;
use App\Http\Traits\AuthorizeInternalServiceOrJwt;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GamificationController extends Controller
{
    use AuthorizeInternalServiceOrJwt;
    
    public function __construct(private readonly GamificationService $gamificationService) {}

    public function getPetStatus(Request $request): JsonResponse
    {
        $userId = $this->authorizeRequest($request);
        
        $status = $this->gamificationService->getPetStatus($userId);

        return response()->json($status);
    }

    public function updateExperience(Request $request): JsonResponse
    {
        $userId = $this->authorizeRequest($request);
        
        $data = $request->validate([
            'type' => 'required|string|max:100',
            'xp_reward' => 'required|integer|min:0',
            'user_id' => 'sometimes|integer|min:1',
        ]);

        $result = $this->gamificationService->updateExperience(
            $userId,
            $data['type'],
            $data['xp_reward']
        );

        return response()->json($result);
    }
}
