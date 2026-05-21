<?php

namespace App\Http\Traits;

use Illuminate\Http\Request;

trait ResolvesAuthenticatedUser
{
    protected function resolveUserId(Request $request): int
    {
        $userId = $request->attributes->get('resolved_user_id');

        if (!$userId) {
            // Falla ruidosamente — indica que falta el middleware en la ruta
            throw new \LogicException(
                'resolved_user_id no encontrado. ¿Falta unified.auth en esta ruta?'
            );
        }

        return $userId;
    }

    protected function authSource(Request $request): string
    {
        return $request->attributes->get('auth_source', 'unknown');
    }
}