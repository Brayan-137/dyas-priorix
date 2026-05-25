<?php

namespace Tests\Unit\Infrastructure;

use App\Infrastructure\Resilience\CircuitBreaker;
use Tests\TestCase;

class CircuitBreakerTest extends TestCase
{
    public function test_executes_action_when_circuit_is_closed(): void
    {
        config(['resilience.circuit_breaker.failure_threshold' => 3]);

        $breaker = new CircuitBreaker('test-closed');

        $result = $breaker->call(
            fn () => 'success',
            fn () => 'fallback'
        );

        $this->assertSame('success', $result);
        $this->assertSame('CLOSED', $breaker->getStatus()['state']);
    }

    public function test_uses_fallback_after_failures_reach_threshold(): void
    {
        config([
            'resilience.circuit_breaker.failure_threshold' => 2,
            'resilience.circuit_breaker.recovery_time' => 30,
        ]);

        $breaker = new CircuitBreaker('test-open');

        $action = fn () => throw new \RuntimeException('service down');

        $breaker->call($action, fn () => 'fallback-1');
        $breaker->call($action, fn () => 'fallback-2');

        $result = $breaker->call(fn () => 'should-not-run', fn () => 'fallback-open');

        $this->assertSame('fallback-open', $result);
        $this->assertSame('OPEN', $breaker->getStatus()['state']);
    }

    public function test_get_status_returns_service_metadata(): void
    {
        $breaker = new CircuitBreaker('gamification');

        $status = $breaker->getStatus();

        $this->assertSame('gamification', $status['service']);
        $this->assertArrayHasKey('state', $status);
        $this->assertArrayHasKey('failure_count', $status);
    }
}
