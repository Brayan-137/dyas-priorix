<?php

namespace Tests\Autonomous;

use App\Infrastructure\Http\ResilientHttpClient;
use App\Infrastructure\Observability\TracingService;
use App\Models\Activity;
use App\Models\Task;
use App\Models\User;
use App\Services\Task\TaskService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

    public function test_complete_task_notifies_gamification_using_mockery(): void
    {
        config(['resilience.services.gamification' => 'http://priorix-gamification/api']);

        $user = User::factory()->create();
        $activity = Activity::factory()->create(['user_id' => $user->id]);
        $task = Task::factory()->create([
            'activity_id' => $activity->id,
            'status' => 'pending',
        ]);

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
