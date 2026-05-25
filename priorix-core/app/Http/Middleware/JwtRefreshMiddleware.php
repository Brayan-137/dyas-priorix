<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Exceptions\TokenInvalidException;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;
use Symfony\Component\HttpFoundation\Response;

class JwtRefreshMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            // Solo verifica estructura — permite tokens expirados
            JWTAuth::parseToken()->getPayload();
        } catch (TokenInvalidException) {
            return response()->json([
                'error' => 'Token inválido',
            ], 401);
        } catch (JWTException) {
            return response()->json([
                'error' => 'Token ausente',
            ], 401);
        }

        return $next($request);
    }
}