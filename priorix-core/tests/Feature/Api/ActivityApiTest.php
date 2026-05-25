<?php

namespace Tests\Feature\Api;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class ActivityApiTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Test User',
            'email' => 'user_' . uniqid() . '@example.com',
            'password' => Hash::make('password'),
        ], $overrides));
    }

    private function createActivity(User $user, array $overrides = []): Activity
    {
        return Activity::create(array_merge([
            'user_id' => $user->id,
            'title' => 'Actividad de prueba',
            'type' => 'study',
            'description' => 'Actividad generada para pruebas',
            'estimated_minutes' => 60,
            'max_session_minutes' => 30,
            'max_sessions' => 2,
            'priority' => 'media',
            'label' => 'test',
            'is_fixed' => false,
            'repeats_weekly' => false,
            'deadline' => now()->addDays(3),
            'status' => 'pending',
        ], $overrides));
    }

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
        $user = $this->createUser();

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
        $user = $this->createUser();
        $otherUser = $this->createUser();

        $this->createActivity($user, ['title' => 'Visible']);
        $this->createActivity($otherUser, ['title' => 'Hidden']);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/activities');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['title' => 'Visible'])
            ->assertJsonMissing(['title' => 'Hidden']);
    }

    public function test_authenticated_user_can_show_update_and_delete_activity(): void
    {
        $user = $this->createUser();
        $activity = $this->createActivity($user, ['title' => 'Original']);

        $this->withHeaders($this->authHeaders($user))
            ->getJson("/api/activities/{$activity->id}")
            ->assertOk()
            ->assertJsonPath('title', 'Original');

        $this->withHeaders($this->authHeaders($user))
            ->putJson("/api/activities/{$activity->id}", ['title' => 'Actualizada'])
            ->assertOk()
            ->assertJsonPath('title', 'Actualizada');

        $this->withHeaders($this->authHeaders($user))
            ->deleteJson("/api/activities/{$activity->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('activities', ['id' => $activity->id]);
    }

    public function test_authenticated_user_can_complete_activity(): void
    {
        Http::fake([
            '*' => Http::response(['ok' => true], 200),
        ]);

        $user = $this->createUser();
        $activity = $this->createActivity($user, ['priority' => 'alta']);

        $response = $this->withHeaders($this->authHeaders($user))
            ->postJson("/api/activities/{$activity->id}/complete");

        $response->assertOk()
            ->assertJsonStructure(['activity', 'gamification', 'statistics'])
            ->assertJsonPath('activity.status', 'completed');

        $this->assertDatabaseHas('activities', [
            'id' => $activity->id,
            'status' => 'completed',
        ]);
    }
}
