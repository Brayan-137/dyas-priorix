<?php
return [
    'enabled' => env('TRACING_ENABLED', true),
    'jaeger_endpoint' => env('JAEGER_ENDPOINT', 'http://jaeger:4318/v1/traces'),
];