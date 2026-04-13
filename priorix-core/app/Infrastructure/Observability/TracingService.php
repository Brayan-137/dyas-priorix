<?php
namespace App\Infrastructure\Observability;

use OpenTelemetry\API\Trace\SpanInterface;
use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SemConventions\TraceAttributes;

class TracingService
{
    private TracerInterface $tracer;

    public function __construct()
    {
        $transport = (new OtlpHttpTransportFactory())->create(
            config('tracing.jaeger_endpoint', 'http://jaeger:4318/v1/traces'),
            'application/x-protobuf'
        );

        $exporter = new SpanExporter($transport);

        $provider = new TracerProvider(
            new SimpleSpanProcessor($exporter),
            null,
            ResourceInfo::create(Attributes::create([
                'service.name' => 'priorix-core',
            ]))
        );

        $this->tracer = $provider->getTracer('priorix-core');
    }

    public function startSpan(string $name): SpanInterface
    {
        return $this->tracer->spanBuilder($name)->startSpan();
    }

    public function trace(string $name, callable $callback, array $attributes = []): mixed
  {
      $span  = $this->startSpan($name);
      $scope = $span->activate();

      foreach ($attributes as $key => $value) {
          $span->setAttribute($key, $value);
      }

      try {
          $result = $callback($span);
          $span->setStatus(\OpenTelemetry\API\Trace\StatusCode::STATUS_OK);
          return $result;
      } catch (\Throwable $e) {
          $span->recordException($e);
          $span->setStatus(\OpenTelemetry\API\Trace\StatusCode::STATUS_ERROR, $e->getMessage());
          throw $e;
      } finally {
          $scope->detach();
          $span->end();
      }
  }
}   