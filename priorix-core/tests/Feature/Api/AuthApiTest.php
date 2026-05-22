<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_from_api(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Yuly Priorix',
            'email' => 'yuly.priorix@example.com',
            'password' => 'secret123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'expires_in',
                'user' => ['id', 'name', 'email'],
            ])
            ->assertJsonPath('token_type', 'bearer')
            ->assertJsonPath('user.email', 'yuly.priorix@example.com');

        $this->assertDatabaseHas('users', [
            'email' => 'yuly.priorix@example.com',
        ]);
    }

    public function test_register_validates_required_fields(): void
    {
        $response = $this->postJson('/api/auth/register', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'student@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'student@example.com',
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['access_token', 'token_type', 'expires_in', 'user'])
            ->assertJsonPath('token_type', 'bearer');
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'student@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'student@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertUnauthorized()
            ->assertJson(['error' => 'Credenciales inválidas']);
    }
}
