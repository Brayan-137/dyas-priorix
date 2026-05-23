<?php

namespace Tests\Autonomous;

use App\Http\Controllers\GamificationController;
use App\Services\Gamification\GamificationService;
use Illuminate\Http\Request;
use Mockery;
use Tests\TestCase;

class GamificationControllerMockeryTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function internalRequest(string $method, string $uri, array $payload = [], int $userId = 77): Request
    {
        $request = Request::create($uri, $method, $payload);
        $request->headers->set('X-Internal-Service', 'priorix-core');
        $request->headers->set('X-Internal-Service-Secret', 'test-internal-secret');
        $request->headers->set('X-Internal-User-Id', (string) $userId);

        return $request;
    }

    public function test_get_pet_status_uses_gamification_service_mock(): void
    {
        $service = Mockery::mock(GamificationService::class);
        $service->shouldReceive('getPetStatus')
            ->once()
            ->with(77)
            ->andReturn([
                'name' => 'Priorín',
                'level' => 3,
                'experience' => 25,
                'next_level_xp' => 300,
            ]);

        $response = (new GamificationController($service))
            ->getPetStatus($this->internalRequest('GET', '/api/gamification/pet'));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(3, $response->getData(true)['level']);
    }

    public function test_update_experience_uses_gamification_service_mock(): void
    {
        $service = Mockery::mock(GamificationService::class);
        $service->shouldReceive('updateExperience')
            ->once()
            ->with(88, 'task_completed', 40)
            ->andReturn([
                'pet' => ['level' => 2, 'experience' => 10],
                'leveled_up' => true,
                'xp_added' => 40,
            ]);

        $response = (new GamificationController($service))
            ->updateExperience($this->internalRequest('POST', '/api/gamification/update-experience', [
                'type' => 'task_completed',
                'xp_reward' => 40,
            ], 88));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($response->getData(true)['leveled_up']);
    }
}
