<?php

namespace Tests\Unit\Services;

use App\Models\Pet;
use App\Services\Gamification\GamificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class GamificationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_pet_status_creates_default_pet(): void
    {
        Cache::flush();

        $status = (new GamificationService())->getPetStatus(101);

        $this->assertSame('Priorín', $status['name']);
        $this->assertSame(1, $status['level']);
        $this->assertSame(0, $status['experience']);
        $this->assertSame(100, $status['next_level_xp']);

        $this->assertDatabaseHas('pets', [
            'user_id' => 101,
            'level' => 1,
            'experience' => 0,
        ]);
    }

    public function test_update_experience_adds_xp_without_level_up(): void
    {
        Cache::flush();

        $result = (new GamificationService())->updateExperience(102, 'task_completed', 50);

        $this->assertFalse($result['leveled_up']);
        $this->assertSame(50, $result['xp_added']);
        $this->assertSame(1, $result['pet']->level);
        $this->assertSame(50, $result['pet']->experience);
    }

    public function test_update_experience_levels_up_when_threshold_is_reached(): void
    {
        Cache::flush();

        Pet::create([
            'user_id' => 103,
            'name' => 'Priorín',
            'level' => 1,
            'experience' => 90,
        ]);

        $result = (new GamificationService())->updateExperience(103, 'task_completed', 25);

        $this->assertTrue($result['leveled_up']);
        $this->assertSame(2, $result['pet']->level);
        $this->assertSame(15, $result['pet']->experience);
    }
}
