<?php

namespace App\Services\Gamification;

use App\Models\Pet;
use Illuminate\Support\Facades\Cache;

class GamificationService
{
    public function updateExperience(int $userId, string $type, int $xp): array
    {
        $pet = Pet::firstOrCreate(
            ['user_id' => $userId],
            ['name' => 'Priorín', 'level' => 1, 'experience' => 0]
        );

        $pet->experience += $xp;

        $leveledUp  = false;
        $xpForNext  = $pet->level * 100;

        if ($pet->experience >= $xpForNext) {
            $pet->level++;
            $pet->experience -= $xpForNext;
            $leveledUp = true;
        }

        $pet->save();
        Cache::forget("pet_status_{$userId}");

        return [
            'pet'        => $pet->fresh(),
            'leveled_up' => $leveledUp,
            'xp_added'   => $xp,
        ];
    }

    public function getPetStatus(int $userId): array
    {
        return Cache::remember("pet_status_{$userId}", 300, function () use ($userId) {
            $pet = Pet::firstOrCreate(
                ['user_id' => $userId],
                ['name' => 'Priorín', 'level' => 1, 'experience' => 0]
            );

            return [
                'name'        => $pet->name,
                'level'       => $pet->level,
                'experience'  => $pet->experience,
                'next_level_xp' => $pet->level * 100,
            ];
        });
    }
}