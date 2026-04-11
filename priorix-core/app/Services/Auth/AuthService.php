<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $token = JWTAuth::fromUser($user);

        return $this->buildTokenResponse($token, $user);
    }

    public function login(string $email, string $password): array
    {
        $credentials = ['email' => $email, 'password' => $password];

        if (!$token = auth('api')->attempt($credentials)) {
            throw new \RuntimeException('Credenciales inválidas', 401);
        }

        return $this->buildTokenResponse($token, auth('api')->user());
    }

    public function refresh(): array
    {
        $token = auth('api')->refresh();
        return $this->buildTokenResponse($token, auth('api')->user());
    }

    public function logout(): void
    {
        auth('api')->logout();
    }

    public function me(): User
    {
        return auth('api')->user();
    }

    private function buildTokenResponse(string $token, User $user): array
    {
        return [
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => config('jwt.ttl') * 60,
            'user'         => $user,
        ];
    }
}