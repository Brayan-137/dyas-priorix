<?php

namespace Tests\Unit\Services;

use App\Models\Activity;
use App\Models\Task;
use App\Models\User;
use App\Services\Planner\AvailabilityManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AvailabilityManagerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_free_slots_around_fixed_tasks(): void
    {
        Carbon::setTestNow('2026-05-25 08:00:00');

        $user = User::create([
            'name' => 'Planner User',
            'email' => 'planner_' . uniqid() . '@example.com',
            'password' => Hash::make('password'),
        ]);

        $activity = Activity::create([
            'user_id' => $user->id,
            'title' => 'Clase fija',
            'type' => 'class',
            'description' => 'Bloque fijo',
            'estimated_minutes' => 60,
            'max_session_minutes' => 60,
            'max_sessions' => 1,
            'priority' => 'alta',
            'label' => 'university',
            'is_fixed' => true,
            'repeats_weekly' => false,
            'deadline' => now()->addWeek(),
            'status' => 'pending',
        ]);

        Task::create([
            'activity_id' => $activity->id,
            'title' => 'Sesión fija',
            'duration_minutes' => 60,
            'scheduled_at' => now()->setTime(10, 0),
            'status' => 'pending',
        ]);

        $manager = new AvailabilityManager();
        $slots = $manager->getAvailableSlots(
            $user->id,
            now()->startOfDay(),
            now()->endOfDay()
        );

        $this->assertNotEmpty($slots);
        $this->assertArrayHasKey('start', $slots[0]);
        $this->assertArrayHasKey('duration', $slots[0]);
        $this->assertGreaterThan(0, $slots[0]['duration']);

        Carbon::setTestNow();
    }
}
