<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GamificationController;
use App\Http\Controllers\StatisticsController;

Route::middleware(['unified.auth', 'throttle:60,1'])->group(function () {
    Route::get('gamification/pet',                [GamificationController::class, 'getPetStatus']);
    Route::post('gamification/update-experience', [GamificationController::class, 'updateExperience']);
    Route::get('statistics/weekly',               [StatisticsController::class, 'weekly']);
    Route::post('statistics/record-activity',     [StatisticsController::class, 'recordActivity']);
});