<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    protected $fillable = [
        'user_id', 'title', 'type', 'description',
        'estimated_minutes', 'max_session_minutes', 'max_sessions',
        'priority', 'label', 'is_fixed', 'repeats_weekly',
        'deadline', 'status',
    ];

    protected $casts = [
        'deadline'       => 'datetime',
        'is_fixed'       => 'boolean',
        'repeats_weekly' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function focusSessions(): HasMany
    {
        return $this->hasMany(FocusSession::class);
    }

    public function markAsCompleted(): void
    {
        $this->update(['status' => 'completed']);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}