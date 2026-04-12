<?php

use Illuminate\Support\Facades\Route;

Route::get('/debug-headers', function (Illuminate\Http\Request $request) {
    $internalSecret = $request->header('X-Internal-Service-Secret');
    $configSecret = env('INTERNAL_SERVICE_SECRET');
    $configSecret2 = config('resilience.internal_service_secret');
    
    return response()->json([
        'headers_from_request' => [
            'X-Internal-Service' => $request->header('X-Internal-Service'),
            'X-Internal-Service-Secret' => $internalSecret,
        ],
        'secret_comparison' => [
            'header_value' => $internalSecret,
            'env_value' => $configSecret,
            'config_value' => $configSecret2,
            'env_match' => $internalSecret === $configSecret,
            'config_match' => $internalSecret === $configSecret2,
        ],
        'server_vars' => array_filter(
            $_SERVER,
            fn($key) => strpos($key, 'HTTP_X_INTERNAL') !== false || strpos($key, 'HTTP_HOST') !== false,
            ARRAY_FILTER_USE_KEY
        ),
    ]);
});

// Test route WITH jwt.auth middleware to see if middleware is invoked
Route::middleware('jwt.auth')->get('/debug-auth-test', function (Illuminate\Http\Request $request) {
    return response()->json([
        'message' => 'Successfully passed jwt.auth middleware!',
        'internal_user_id' => $request->attributes->get('internal_user_id'),
        'user_id' => auth('api')->id(),
    ]);
});

