<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Horários do profissional por dia da semana.
 *
 * day_of_week: 0=Mon ... 6=Sun.
 * Bulk replace via PUT /professionals/{id}/availability.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('availabilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('professional_id')->constrained('professionals')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['professional_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availabilities');
    }
};
