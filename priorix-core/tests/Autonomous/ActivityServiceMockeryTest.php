<?php

namespace Tests\Autonomous;

use App\Infrastructure\Http\ResilientHttpClient;
use App\Infrastructure\Observability\TracingService;
use App\Models\Activity;
use App\Models\User;
use App\Services\Activity\ActivityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Mockery;
use Tests\TestCase;

class ActivityServiceMockeryTest extends TestCase
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
            'name' => 'Autonomous User',
            'email' => 'autonomous_' . uniqid() . '@priorix.test',
            'password' => Hash::make('password123'),
        ], $overrides));
    }

    private function createActivity(User $user, array $overrides = []): Activity
    {
        return Activity::create(array_merge([
            'user_id' => $user->id,
            'title' => 'Actividad autónoma',
            'type' => 'study',
            'description' => 'Actividad creada para prueba autónoma',
            'estimated_minutes' => 120,
            'max_session_minutes' => 40,
            'max_sessions' => 3,
            'priority' => 'alta',
            'label' => 'testing',
            'is_fixed' => false,
            'repeats_weekly' => false,
            'deadline' => now()->addDays(5),
            'status' => 'pending',
        ], $overrides));
    }

    public function test_complete_activity_notifies_gamification_and_statistics_using_mocks(): void
    {
        config([
            'resilience.services.gamification' => 'http://priorix-gamification/api/gamification',
            'resilience.services.statistics' => 'http://priorix-gamification/api/statistics',
        ]);

        $user = $this->createUser();
        $activity = $this->createActivity($user);

        $httpClient = Mockery::mock(ResilientHttpClient::class);

        $httpClient->shouldReceive('post')
            ->once()
            ->with(
                'http://priorix-gamification/api/gamification/update-experience',
                [
                    'user_id' => $user->id,
                    'type' => 'activity_completed',
                    'xp_reward' => 42,
                ],
                null,
                null,
                $user->id
            )
            ->andReturn([
                'pet' => ['level' => 1, 'experience' => 42],
                'leveled_up' => false,
                'xp_added' => 42,
            ]);

        $httpClient->shouldReceive('post')
            ->once()
            ->with(
                'http://priorix-gamification/api/statistics/record-activity',
                [
                    'user_id' => $user->id,
                    'activity_id' => $activity->id,
                ],
                null,
                null,
                $user->id
            )
            ->andReturn([
                'user_id' => $user->id,
                'completed_count' => 1,
                'streak_day' => 1,
            ]);

        $tracing = Mockery::mock(TracingService::class);
        $tracing->shouldReceive('trace')
            ->andReturnUsing(fn (string $name, callable $callback, array $attributes = []) => $callback());

        $result = (new ActivityService($httpClient, $tracing))
            ->completeActivity($activity->id, $user->id);

        $this->assertSame('completed', $result['activity']->status);
        $this->assertSame(42, $result['gamification']['xp_added']);
        $this->assertSame(1, $result['statistics']['completed_count']);

        $this->assertDatabaseHas('activities', [
            'id' => $activity->id,
            'status' => 'completed',
        ]);
    }
}
