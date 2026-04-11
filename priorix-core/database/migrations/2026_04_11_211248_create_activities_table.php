<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->string('type'); // tarea, evento, proyecto
            $table->text('description')->nullable();
            $table->integer('estimated_minutes');
            $table->integer('max_session_minutes');
            $table->integer('max_sessions')->nullable();
            $table->string('priority'); // alta, media, baja
            $table->string('label')->nullable();
            $table->boolean('is_fixed')->default(false);
            $table->boolean('repeats_weekly')->default(false);
            $table->timestamp('deadline')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
