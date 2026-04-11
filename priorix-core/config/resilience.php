<?php

return [
    'circuit_breaker' => [
        'failure_threshold' => env('CB_FAILURE_THRESHOLD', 3),
        'recovery_time'     => env('CB_RECOVERY_TIME', 30),
        'timeout'           => env('CB_TIMEOUT', 5),
    ],

    'services' => [
        'gamification' => env('GAMIFICATION_SERVICE_URL', 'http://gamification/api/gamification'),
        'statistics'   => env('STATISTICS_SERVICE_URL', 'http://gamification/api/statistics'),
    ],
];
