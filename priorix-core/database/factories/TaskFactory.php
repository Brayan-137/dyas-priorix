<?php

namespace Database\Factories;

use App\Models\Activity;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'activity_id' => Activity::factory(),
            'title' => fake()->sentence(3),
            'duration_minutes' => fake()->numberBetween(25, 60),
            'scheduled_at' => now()->addHour(),
            'status' => 'pending',
        ];
    }
}
