<?php

namespace App\Http\Traits;

use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

trait AuthorizeInternalServiceOrJwt
{
    protected function authorizeRequest(Request $request): ?int
    {
        // Try internal service auth first
        if ($this->tryInternalServiceAuth($request, $userId)) {
            return $userId;
        }
        
        // Fall back to JWT auth
        return auth('api')->id();
    }
    
    protected function tryInternalServiceAuth(Request $request, ?int &$userId): bool
    {
        $internalService = $request->header('X-Internal-Service');
        $internalSecret = $request->header('X-Internal-Service-Secret');
        $configSecret = env('INTERNAL_SERVICE_SECRET');
        
        if (
            $internalService === 'priorix-core' &&
            $internalSecret === $configSecret &&
            $internalSecret !== null
        ) {
            $userId = (int) $request->header('X-Internal-User-Id');
            return $userId > 0;
        }
        
        return false;
    }
}
