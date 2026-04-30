<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Horários comerciais da empresa por dia da semana.
 *
 * day_of_week: 0=Mon ... 6=Sun (mesma convenção do código Python original).
 * Bulk replace via PUT /companies/me/availability — DELETE all + INSERT new.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_availabilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['company_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_availabilities');
    }
};
