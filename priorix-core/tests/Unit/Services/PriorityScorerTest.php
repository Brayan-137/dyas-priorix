<?php

namespace Tests\Unit\Services;

use App\Models\Activity;
use App\Services\Planner\PriorityScorer;
use Illuminate\Support\Collection;
use Tests\TestCase;

class PriorityScorerTest extends TestCase
{
    public function test_scores_activity_using_priority_deadline_repetition_and_duration(): void
    {
        $activity = new Activity([
            'title' => 'Preparar parcial',
            'priority' => 'alta',
            'deadline' => now()->addDays(5),
            'repeats_weekly' => true,
            'estimated_minutes' => 120,
        ]);

        $result = (new PriorityScorer())->scoreActivities(new Collection([$activity]));

        $this->assertCount(1, $result);
        $this->assertSame('Preparar parcial', $result[0]['title']);
        $this->assertGreaterThan(300, $result[0]['score']);
    }

    public function test_low_priority_activity_receives_lower_score_than_high_priority(): void
    {
        $scorer = new PriorityScorer();

        $high = new Activity([
            'priority' => 'alta',
            'estimated_minutes' => 30,
            'repeats_weekly' => false,
        ]);

        $low = new Activity([
            'priority' => 'baja',
            'estimated_minutes' => 30,
            'repeats_weekly' => false,
        ]);

        $scores = $scorer->scoreActivities(new Collection([$high, $low]));

        $this->assertGreaterThan($scores[1]['score'], $scores[0]['score']);
    }
}
