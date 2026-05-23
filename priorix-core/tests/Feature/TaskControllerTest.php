<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class TaskControllerTest extends TestCase
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

    private function createTask(Activity $activity, array $overrides = []): Task
    {
        return Task::create(array_merge([
            'activity_id' => $activity->id,
            'title' => 'Tarea de prueba',
            'duration_minutes' => 30,
            'scheduled_at' => now(),
            'status' => 'pending',
        ], $overrides));
    }

    public function test_get_tasks_requires_authentication(): void
    {
        $response = $this->getJson('/api/tasks');

        $response->assertStatus(401);
    }

    public function test_complete_task_requires_authentication(): void
    {
        $response = $this->postJson('/api/tasks/1/complete');

        $response->assertStatus(401);
    }

    public function test_get_tasks_for_authenticated_user(): void
    {
        $user = $this->createUser();
        $activity = $this->createActivity($user);
        $this->createTask($activity);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/tasks');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'activity_id',
                    'title',
                    'duration_minutes',
                    'scheduled_at',
                    'status',
                    'activity',
                ],
            ]);
    }

    public function test_complete_task(): void
    {
        $user = $this->createUser();
        $activity = $this->createActivity($user);
        $task = $this->createTask($activity, ['status' => 'pending']);

        $response = $this->withHeaders($this->authHeaders($user))
            ->postJson("/api/tasks/{$task->id}/complete");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'task' => [
                    'id',
                    'status',
                ],
                'gamification',
            ]);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'completed',
        ]);
    }

    public function test_get_today_pending_tasks(): void
    {
        $user = $this->createUser();
        $activity = $this->createActivity($user);

        $this->createTask($activity, [
            'status' => 'pending',
            'scheduled_at' => now(),
        ]);

        $this->createTask($activity, [
            'status' => 'completed',
            'scheduled_at' => now(),
        ]);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/tasks/today/pending');

        $response->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_filter_tasks_by_status(): void
    {
        $user = $this->createUser();
        $activity = $this->createActivity($user);

        $this->createTask($activity, ['status' => 'pending']);
        $this->createTask($activity, ['status' => 'completed']);

        $response = $this->withHeaders($this->authHeaders($user))
            ->getJson('/api/tasks?status=pending');

        $response->assertStatus(200)
            ->assertJsonCount(1);
    }
}
