<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use Symfony\Component\HttpFoundation\Response;

class InternalServiceAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $internalService = $request->header('X-Internal-Service');
        $internalSecret = $request->header('X-Internal-Service-Secret');
        $configSecret = env('INTERNAL_SERVICE_SECRET');
        
        // Check if internal service request
        if (
            $internalService === 'priorix-core' &&
            $internalSecret === $configSecret &&
            $internalSecret !== null
        ) {
            // Set internal user ID if provided
            if ($request->header('X-Internal-User-Id')) {
                $request->attributes->set('internal_user_id', (int) $request->header('X-Internal-User-Id'));
            }
            
            return $next($request);
        }

        // Fall through to JWT auth
        try {
            JWTAuth::parseToken()->authenticate();
        } catch (TokenExpiredException) {
            return response()->json(['error' => 'Token expirado'], 401);
        } catch (TokenInvalidException) {
            return response()->json(['error' => 'Token inválido'], 401);
        } catch (JWTException) {
            return response()->json(['error' => 'Token ausente'], 401);
        }

        return $next($request);
    }
}
