<?php

namespace App\Http\Controllers;

use App\Services\Gamification\GamificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GamificationController extends Controller
{
    public function __construct(private readonly GamificationService $gamificationService) {}

    public function getPetStatus(): JsonResponse
    {
        $status = $this->gamificationService->getPetStatus(auth('api')->id());

        return response()->json($status);
    }

    public function updateExperience(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|string|max:100',
            'xp_reward' => 'required|integer|min:0',
        ]);

        $result = $this->gamificationService->updateExperience(
            auth('api')->id(),
            $data['type'],
            $data['xp_reward']
        );

        return response()->json($result);
    }
}
