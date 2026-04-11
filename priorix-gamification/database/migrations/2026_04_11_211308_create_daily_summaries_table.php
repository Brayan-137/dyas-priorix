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
        Schema::create('daily_summaries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id'); // sin constrained()
            $table->index('user_id');
            $table->date('date');
            $table->integer('completed_count')->default(0);
            $table->integer('pending_count')->default(0);
            $table->integer('streak_day')->default(1);
            $table->unique(['user_id', 'date']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_summaries');
    }
};
