<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GamificationController;
use App\Http\Controllers\StatisticsController;

// These routes now handle auth in controllers via the AuthorizeInternalServiceOrJwt trait
Route::get('gamification/pet',                    [GamificationController::class, 'getPetStatus']);
Route::post('gamification/update-experience',     [GamificationController::class, 'updateExperience']);
Route::get('statistics/weekly',                   [StatisticsController::class, 'weekly']);
Route::post('statistics/record-activity',         [StatisticsController::class, 'recordActivity']);