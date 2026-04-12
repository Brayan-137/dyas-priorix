<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Activity;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TaskControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test getting tasks requires authentication.
     */
    public function test_get_tasks_requires_authentication(): void
    {
        $response = $this->getJson('/api/tasks');

        $response->assertStatus(401);
    }

    /**
     * Test completing a task requires authentication.
     */
    public function test_complete_task_requires_authentication(): void
    {
        $response = $this->postJson('/api/tasks/1/complete');

        $response->assertStatus(401);
    }

    /**
     * Test getting tasks for authenticated user.
     */
    public function test_get_tasks_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        $activity = Activity::factory()->create(['user_id' => $user->id]);
        $task = Task::factory()->create(['activity_id' => $activity->id]);

        $response = $this->actingAs($user, 'api')
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
                        'activity'
                    ]
                ]);
    }

    /**
     * Test completing a task.
     */
    public function test_complete_task(): void
    {
        $user = User::factory()->create();
        $activity = Activity::factory()->create(['user_id' => $user->id]);
        $task = Task::factory()->create([
            'activity_id' => $activity->id,
            'status' => 'pending'
        ]);

        $response = $this->actingAs($user, 'api')
                        ->postJson("/api/tasks/{$task->id}/complete");

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'task' => [
                        'id',
                        'status'
                    ],
                    'gamification'
                ]);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'completed'
        ]);
    }

    /**
     * Test getting today pending tasks.
     */
    public function test_get_today_pending_tasks(): void
    {
        $user = User::factory()->create();
        $activity = Activity::factory()->create(['user_id' => $user->id]);

        // Create a pending task for today
        $task = Task::factory()->create([
            'activity_id' => $activity->id,
            'status' => 'pending',
            'scheduled_at' => now()
        ]);

        // Create a completed task (should not appear)
        Task::factory()->create([
            'activity_id' => $activity->id,
            'status' => 'completed',
            'scheduled_at' => now()
        ]);

        $response = $this->actingAs($user, 'api')
                        ->getJson('/api/tasks/today/pending');

        $response->assertStatus(200)
                ->assertJsonCount(1);
    }

    /**
     * Test filtering tasks by status.
     */
    public function test_filter_tasks_by_status(): void
    {
        $user = User::factory()->create();
        $activity = Activity::factory()->create(['user_id' => $user->id]);

        Task::factory()->create([
            'activity_id' => $activity->id,
            'status' => 'pending'
        ]);

        Task::factory()->create([
            'activity_id' => $activity->id,
            'status' => 'completed'
        ]);

        $response = $this->actingAs($user, 'api')
                        ->getJson('/api/tasks?status=pending');

        $response->assertStatus(200)
                ->assertJsonCount(1);
    }
}