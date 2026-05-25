<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenExpiredException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use Symfony\Component\HttpFoundation\Response;

class UnifiedAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->hasHeader('X-Internal-Service')) {
            return $this->handleInternalAuth($request, $next);
        }

        return $this->handleJwtAuth($request, $next);
    }

    private function handleInternalAuth(Request $request, Closure $next): Response
    {
        $internalService = $request->header('X-Internal-Service');
        $internalSecret  = $request->header('X-Internal-Service-Secret');
        $configSecret    = config('services.internal.secret');

        $secretValid  = $configSecret && hash_equals($configSecret, (string) $internalSecret);
        $serviceValid = $internalService === 'priorix-core';

        if (!$secretValid || !$serviceValid) {
            return response()->json(['error' => 'Acceso interno no autorizado'], 403);
        }

        $userId = (int) $request->header('X-Internal-User-Id');

        if ($userId <= 0) {
            return response()->json(['error' => 'X-Internal-User-Id inválido o ausente'], 400);
        }

        $request->attributes->set('resolved_user_id', $userId);
        $request->attributes->set('auth_source', 'internal');

        return $next($request);
    }

    private function handleJwtAuth(Request $request, Closure $next): Response
    {
        try {
            // getPayload() solo verifica la firma y extrae los claims
            $payload = JWTAuth::parseToken()->getPayload();
        } catch (TokenExpiredException) {
            return response()->json([
                'error' => 'Token expirado',
                'code'  => 'TOKEN_EXPIRED',
            ], 401);
        } catch (TokenInvalidException) {
            return response()->json(['error' => 'Token inválido'], 401);
        } catch (JWTException) {
            return response()->json(['error' => 'Token ausente'], 401);
        }

        $userId = (int) $payload->get('sub');

        if ($userId <= 0) {
            return response()->json(['error' => 'Token sin usuario válido'], 401);
        }

        $request->attributes->set('resolved_user_id', $userId);
        $request->attributes->set('auth_source', 'jwt');

        return $next($request);
    }
}