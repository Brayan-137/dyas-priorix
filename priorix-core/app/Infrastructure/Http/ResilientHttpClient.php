<?php

namespace App\Infrastructure\Http;

use App\Infrastructure\Resilience\CircuitBreaker;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ResilientHttpClient
{
    private int $timeout;
    private array $breakers = [];

    public function __construct()
    {
        $this->timeout = config('resilience.circuit_breaker.timeout', 5);
    }

    public function post(string $url, array $data = [], ?callable $fallback = null): array
    {
        $breaker = $this->getBreaker($this->extractServiceName($url));

        $action = function () use ($url, $data) {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'X-Internal-Service' => 'priorix-core',
                    'Accept'             => 'application/json',
                ])
                ->post($url, $data);

            if ($response->failed()) {
                throw new \RuntimeException(
                    "HTTP {$response->status()} from {$url}"
                );
            }

            return $response->json();
        };

        $defaultFallback = $fallback ?? function () use ($url) {
            Log::warning("Using fallback for {$url}");
            return ['status' => 'fallback', 'service_unavailable' => true];
        };

        return $breaker->call($action, $defaultFallback);
    }

    public function get(string $url, array $query = [], ?callable $fallback = null): array
    {
        $breaker = $this->getBreaker($this->extractServiceName($url));

        $action = function () use ($url, $query) {
            $response = Http::timeout($this->timeout)
                ->withHeaders(['Accept' => 'application/json'])
                ->get($url, $query);

            if ($response->failed()) {
                throw new \RuntimeException("HTTP {$response->status()} from {$url}");
            }

            return $response->json();
        };

        $defaultFallback = $fallback ?? fn() => [];

        return $breaker->call($action, $defaultFallback);
    }

    public function getAllBreakersStatus(): array
    {
        return array_map(
            fn(CircuitBreaker $b) => $b->getStatus(),
            $this->breakers
        );
    }

    private function getBreaker(string $name): CircuitBreaker
    {
        if (!isset($this->breakers[$name])) {
            $this->breakers[$name] = new CircuitBreaker($name);
        }
        return $this->breakers[$name];
    }

    private function extractServiceName(string $url): string
    {
        $path     = parse_url($url, PHP_URL_PATH);
        $segments = explode('/', trim($path, '/'));
        $idx      = array_search('api', $segments);
        return $segments[$idx + 1] ?? 'unknown';
    }
}