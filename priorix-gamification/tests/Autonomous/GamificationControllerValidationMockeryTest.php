<?php

namespace Tests\Autonomous;

use App\Http\Controllers\GamificationController;
use App\Services\Gamification\GamificationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\TestCase;

class GamificationControllerValidationMockeryTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function internalRequest(string $method, string $uri, array $payload = [], int $userId = 15): Request
    {
        $request = Request::create($uri, $method, $payload);
        $request->headers->set('X-Internal-Service', 'priorix-core');
        $request->headers->set('X-Internal-Service-Secret', 'test-internal-secret');
        $request->headers->set('X-Internal-User-Id', (string) $userId);
        $request->attributes->set('resolved_user_id', $userId);

        return $request;
    }

    public function test_update_experience_does_not_call_service_when_payload_is_invalid(): void
    {
        $service = Mockery::mock(GamificationService::class);
        $service->shouldNotReceive('updateExperience');

        $this->expectException(ValidationException::class);

        (new GamificationController($service))->updateExperience(
            $this->internalRequest('POST', '/api/gamification/update-experience', [
                'type' => 'task_completed',
                // xp_reward se omite intencionalmente para probar validación autónoma
            ])
        );
    }
}
