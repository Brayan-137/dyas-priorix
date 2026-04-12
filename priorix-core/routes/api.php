<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\PlannerController;

// Rutas públicas
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// Rutas protegidas
Route::middleware('jwt.auth')->group(function () {

    Route::prefix('auth')->group(function () {
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::post('logout',  [AuthController::class, 'logout']);
        Route::get('me',       [AuthController::class, 'me']);
    });

    Route::apiResource('activities', ActivityController::class);
    Route::post('activities/{id}/complete', [ActivityController::class, 'complete']);

    Route::apiResource('tasks', TaskController::class);
    Route::post('tasks/{id}/complete', [TaskController::class, 'complete']);
    Route::get('tasks/date-range', [TaskController::class, 'getByDateRange']);
    Route::get('tasks/today/pending', [TaskController::class, 'getTodayPending']);

    Route::prefix('planner')->group(function () {
        Route::post('generate-weekly', [PlannerController::class, 'generateWeeklyPlan']);
        Route::post('reschedule-activity/{activityId}', [PlannerController::class, 'rescheduleActivity']);
    });
});