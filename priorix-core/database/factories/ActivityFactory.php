<?php

namespace Database\Factories;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Activity>
 */
class ActivityFactory extends Factory
{
    protected $model = Activity::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'type' => fake()->randomElement(['study', 'work', 'personal']),
            'description' => fake()->sentence(),
            'estimated_minutes' => fake()->numberBetween(30, 180),
            'max_session_minutes' => fake()->numberBetween(25, 60),
            'max_sessions' => fake()->numberBetween(1, 5),
            'priority' => fake()->randomElement(['alta', 'media', 'baja']),
            'label' => fake()->randomElement(['university', 'project', 'health']),
            'is_fixed' => false,
            'repeats_weekly' => false,
            'deadline' => now()->addDays(7),
            'status' => 'pending',
        ];
    }
}
