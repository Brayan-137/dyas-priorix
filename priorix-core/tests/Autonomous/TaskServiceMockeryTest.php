<?php

namespace Tests\Autonomous;

use App\Infrastructure\Http\ResilientHttpClient;
use App\Infrastructure\Observability\TracingService;
use App\Models\Activity;
use App\Models\Task;
use App\Models\User;
use App\Services\Task\TaskService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Mockery;
use Tests\TestCase;

class TaskServiceMockeryTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

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

    public function test_complete_task_notifies_gamification_using_mockery(): void
    {
        config(['resilience.services.gamification' => 'http://priorix-gamification/api']);

        $user = $this->createUser();
        $activity = $this->createActivity($user);
        $task = $this->createTask($activity, ['status' => 'pending']);

        $httpClient = Mockery::mock(ResilientHttpClient::class);
        $httpClient->shouldReceive('post')
            ->once()
            ->with(
                'http://priorix-gamification/api/update-experience',
                [
                    'user_id' => $user->id,
                    'type' => 'task_completed',
                    'xp_reward' => 5,
                ],
                null,
                null,
                $user->id
            )
            ->andReturn(['xp' => 5, 'status' => 'updated']);

        $tracing = Mockery::mock(TracingService::class);
        $tracing->shouldReceive('trace')
            ->andReturnUsing(fn(string $name, callable $callback, array $attributes = []) => $callback());

        $result = (new TaskService($httpClient, $tracing))->completeTask($task->id, $user->id);

        $this->assertSame('completed', $result['task']->status);
        $this->assertSame(['xp' => 5, 'status' => 'updated'], $result['gamification']);
        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'status' => 'completed',
        ]);
    }
}
