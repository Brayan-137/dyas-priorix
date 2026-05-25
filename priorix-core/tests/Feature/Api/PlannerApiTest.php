<?php

namespace Tests\Feature\Api;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class PlannerApiTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(): User
    {
        return User::create([
            'name' => 'Planner User',
            'email' => 'planner_' . uniqid() . '@example.com',
            'password' => Hash::make('password'),
        ]);
    }

    private function authHeaders(User $user): array
    {
        return ['Authorization' => 'Bearer ' . JWTAuth::fromUser($user)];
    }

    public function test_generate_weekly_plan_requires_authentication(): void
    {
        $this->postJson('/api/planner/generate-weekly')->assertUnauthorized();
    }

    public function test_authenticated_user_can_generate_weekly_plan(): void
    {
        Http::fake([
            '*' => Http::response(['ok' => true], 200),
        ]);

        $user = $this->createUser();

        Activity::create([
            'user_id' => $user->id,
            'title' => 'Proyecto final',
            'type' => 'study',
            'description' => 'Entrega',
            'estimated_minutes' => 120,
            'max_session_minutes' => 40,
            'max_sessions' => 3,
            'priority' => 'alta',
            'label' => 'university',
            'is_fixed' => false,
            'repeats_weekly' => false,
            'deadline' => now()->addWeek(),
            'status' => 'pending',
        ]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->postJson('/api/planner/generate-weekly');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['message', 'data']);
    }

    public function test_reschedule_activity_validates_datetime(): void
    {
        $user = $this->createUser();

        $activity = Activity::create([
            'user_id' => $user->id,
            'title' => 'Mover actividad',
            'type' => 'study',
            'description' => 'Test',
            'estimated_minutes' => 60,
            'max_session_minutes' => 30,
            'max_sessions' => 2,
            'priority' => 'media',
            'label' => 'test',
            'is_fixed' => false,
            'repeats_weekly' => false,
            'deadline' => now()->addDays(5),
            'status' => 'pending',
        ]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->postJson("/api/planner/reschedule-activity/{$activity->id}", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['new_date_time']);
    }
}
