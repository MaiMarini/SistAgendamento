<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bloqueios de horário do profissional. Estrutura idêntica ao
 * company_time_blocks, mas escopado pelo profissional.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_blocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('professional_id')->constrained('professionals')->cascadeOnDelete();
            $table->boolean('is_recurring')->default(false);
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->time('recurring_start_time')->nullable();
            $table->time('recurring_end_time')->nullable();
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index(['professional_id', 'is_recurring']);
            $table->index(['professional_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_blocks');
    }
};
