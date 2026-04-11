<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailySummary extends Model
{
    protected $fillable = [
        'user_id', 'date', 'completed_count',
        'pending_count', 'streak_day',
    ];

    protected $casts = [
        'date' => 'date',
    ];
}