<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bloqueios de horário da empresa.
 *
 * Dois modos:
 *   - is_recurring=true  → recurring_start_time + recurring_end_time (todos os dias)
 *   - is_recurring=false → starts_at + ends_at (período específico)
 *
 * A validação dos campos por modo é feita na camada de aplicação (request),
 * não no banco — replicando a regra do TimeBlockRequest do Pydantic.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_time_blocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->boolean('is_recurring')->default(false);
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->time('recurring_start_time')->nullable();
            $table->time('recurring_end_time')->nullable();
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'is_recurring']);
            $table->index(['company_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_time_blocks');
    }
};
