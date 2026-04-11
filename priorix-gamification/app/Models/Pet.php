<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pet extends Model
{
    protected $fillable = [
        'user_id', 'name', 'level', 'experience',
    ];

    // Sin relación con User — vive en otra base de datos
}