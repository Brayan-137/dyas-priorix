<?php

namespace Tests\Unit\Services;

use App\Models\Task;
use App\Services\Planner\SchedulingAlgorithm;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchedulingAlgorithmTest extends TestCase
{
    use RefreshDatabase;

    public function test_generates_task_inside_available_slot(): void
    {
        $activities = [[
            'id' => 1,
            'score' => 300,
            'is_fixed' => false,
            'estimated_minutes' => 60,
            'max_session_minutes' => 30,
            'max_sessions' => 2,
            'deadline' => now()->addDays(2),
        ]];

        $slots = [[
            'start' => now()->addHour(),
            'duration' => 90,
        ]];

        $plan = (new SchedulingAlgorithm())->generatePlan($activities, $slots);

        $this->assertCount(2, $plan['tasks']);
        $this->assertSame(1, $plan['tasks'][0]['activity_id']);
        $this->assertSame(30, $plan['tasks'][0]['duration']);
    }

    public function test_does_not_schedule_fixed_activities(): void
    {
        $activities = [[
            'id' => 1,
            'score' => 300,
            'is_fixed' => true,
            'estimated_minutes' => 60,
            'max_session_minutes' => 30,
            'max_sessions' => 2,
            'deadline' => now()->addDays(2),
        ]];

        $plan = (new SchedulingAlgorithm())->generatePlan($activities, [[
            'start' => now()->addHour(),
            'duration' => 90,
        ]]);

        $this->assertSame([], $plan['tasks']);
    }
}
