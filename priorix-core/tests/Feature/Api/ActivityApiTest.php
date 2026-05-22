<?php

namespace Tests\Feature\Api;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class ActivityApiTest extends TestCase
{
    use RefreshDatabase;

    private function authHeaders(User $user): array
    {
        return ['Authorization' => 'Bearer ' . JWTAuth::fromUser($user)];
    }

    public function test_activity_list_requires_authentication(): void
    {
        $this->getJson('/api/activities')->assertUnauthorized();
    }

    public function test_authenticated_user_can_create_activity(): void
    {
        $user = User::factory()->create();

        $payload = [
            'title' => 'Estudiar arquitectura de software',
            'type' => 'study',
            'description' => 'Repasar microservicios',
            'estimated_minutes' => 120,
            'max_session_minutes' => 40,
            'max_sessions' => 3,
            'priority' => 'alta',
            'label' => 'university',
            'is_fixed' => false,
            'repeats_weekly' => false,
            'deadline' => now()->addWeek()->toISOString(),
            'status' => 'pending',
        ];

        $response = $this->withHeaders($this->authHeaders($user))
            ->postJson('/api/activities', $payload);

        $response->assertCreated()
            ->assertJsonPath('title', 'Estudiar arquitectura de software')
            ->assertJsonPath('priority', 'alta');

        $this->assertDatabaseHas('activities', [
            'user_id' => $user->id,
            'title' => 'Estudiar arquitectura de software',
        ]);
    }

    public function test_user_only_lists_own_activities(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        Activity::factory()->create(['user_id' => $user->id, 'title' => 'Visible']);
        Activity::factory()->create(['user_id' => $otherUser->id, 'title' => 'Hidden']);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/activities');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['title' => 'Visible'])
            ->assertJsonMissing(['title' => 'Hidden']);
    }
}
