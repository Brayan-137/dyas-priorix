<?php

namespace App\Infrastructure\Resilience;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class CircuitBreaker
{
    private const CLOSED    = 'CLOSED';
    private const OPEN      = 'OPEN';
    private const HALF_OPEN = 'HALF_OPEN';

    private int $failureThreshold;
    private int $recoveryTime;

    public function __construct(private readonly string $serviceName)
    {
        $this->failureThreshold = config('resilience.circuit_breaker.failure_threshold', 3);
        $this->recoveryTime     = config('resilience.circuit_breaker.recovery_time', 30);
    }

    public function call(callable $action, callable $fallback): mixed
    {
        $state = $this->getState();

        Log::info("CircuitBreaker [{$this->serviceName}]: state={$state}");

        if ($state === self::OPEN)      return $fallback();
        if ($state === self::HALF_OPEN) return $this->executeHalfOpen($action, $fallback);

        return $this->executeNormal($action, $fallback);
    }

    private function executeNormal(callable $action, callable $fallback): mixed
    {
        try {
            $result = $action();
            $this->recordSuccess();
            return $result;
        } catch (\Exception $e) {
            $this->recordFailure();

            if ($this->getFailureCount() >= $this->failureThreshold) {
                $this->openCircuit();
                Log::critical("CircuitBreaker [{$this->serviceName}]: OPENED after {$this->failureThreshold} failures");
            }

            return $fallback();
        }
    }

    private function executeHalfOpen(callable $action, callable $fallback): mixed
    {
        try {
            $result = $action();
            $this->closeCircuit();
            Log::info("CircuitBreaker [{$this->serviceName}]: CLOSED (recovered)");
            return $result;
        } catch (\Exception $e) {
            $this->openCircuit();
            Log::warning("CircuitBreaker [{$this->serviceName}]: REOPENED after failed probe");
            return $fallback();
        }
    }

    private function getState(): string
    {
        $state = Redis::get($this->stateKey());

        if ($state === self::OPEN) {
            $openedAt = (int) Redis::get($this->openedAtKey());
            if (time() - $openedAt >= $this->recoveryTime) {
                $this->setHalfOpen();
                return self::HALF_OPEN;
            }
        }

        return $state ?? self::CLOSED;
    }

    private function recordFailure(): void
    {
        Redis::incr($this->failureKey());
        Redis::expire($this->failureKey(), $this->recoveryTime * 2);
    }

    private function recordSuccess(): void
    {
        Redis::del($this->failureKey());
    }

    private function getFailureCount(): int
    {
        return (int) Redis::get($this->failureKey());
    }

    private function openCircuit(): void
    {
        Redis::set($this->stateKey(), self::OPEN);
        Redis::set($this->openedAtKey(), time());
        Redis::del($this->failureKey());
    }

    private function closeCircuit(): void
    {
        Redis::del($this->stateKey());
        Redis::del($this->openedAtKey());
        Redis::del($this->failureKey());
    }

    private function setHalfOpen(): void
    {
        Redis::set($this->stateKey(), self::HALF_OPEN);
    }

    public function getStatus(): array
    {
        return [
            'service'       => $this->serviceName,
            'state'         => $this->getState(),
            'failure_count' => $this->getFailureCount(),
            'opened_at'     => Redis::get($this->openedAtKey()),
        ];
    }

    private function stateKey(): string    { return "cb:{$this->serviceName}:state"; }
    private function openedAtKey(): string { return "cb:{$this->serviceName}:opened_at"; }
    private function failureKey(): string  { return "cb:{$this->serviceName}:failures"; }
}