<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            $request->header('X-Internal-Service') === 'priorix-core' &&
            $request->header('X-Internal-Service-Secret') === env('INTERNAL_SERVICE_SECRET')
        ) {
            $internalUserId = (int) $request->header('X-Internal-User-Id');
            if ($internalUserId > 0) {
                $request->attributes->set('internal_user_id', $internalUserId);
            }

            return $next($request);
        }

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