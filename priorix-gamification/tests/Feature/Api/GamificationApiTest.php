<?php

namespace Tests\Feature\Api;

use App\Models\Pet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class GamificationApiTest extends TestCase
{
    use RefreshDatabase;

    private function internalHeaders(int $userId = 1): array
    {
        return [
            'X-Internal-Service' => 'priorix-core',
            'X-Internal-Service-Secret' => 'test-internal-secret',
            'X-Internal-User-Id' => (string) $userId,
        ];
    }

    public function test_internal_service_can_get_default_pet_status(): void
    {
        Cache::flush();

        $response = $this->withHeaders($this->internalHeaders(10))
            ->getJson('/api/gamification/pet');

        $response->assertOk()
            ->assertJson([
                'name' => 'Priorín',
                'level' => 1,
                'experience' => 0,
                'next_level_xp' => 100,
            ]);

        $this->assertDatabaseHas('pets', [
            'user_id' => 10,
            'name' => 'Priorín',
            'level' => 1,
            'experience' => 0,
        ]);
    }

    public function test_internal_service_can_update_experience_and_level_up_pet(): void
    {
        Cache::flush();

        Pet::create([
            'user_id' => 15,
            'name' => 'Priorín',
            'level' => 1,
            'experience' => 90,
        ]);

        $response = $this->withHeaders($this->internalHeaders(15))
            ->postJson('/api/gamification/update-experience', [
                'type' => 'task_completed',
                'xp_reward' => 20,
            ]);

        $response->assertOk()
            ->assertJson([
                'leveled_up' => true,
                'xp_added' => 20,
            ])
            ->assertJsonPath('pet.level', 2)
            ->assertJsonPath('pet.experience', 10);

        $this->assertDatabaseHas('pets', [
            'user_id' => 15,
            'level' => 2,
            'experience' => 10,
        ]);
    }

    public function test_update_experience_validates_required_payload(): void
    {
        $response = $this->withHeaders($this->internalHeaders(20))
            ->postJson('/api/gamification/update-experience', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type', 'xp_reward']);
    }
}
