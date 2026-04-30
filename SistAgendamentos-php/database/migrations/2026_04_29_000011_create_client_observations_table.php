<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Observações manuais do cliente (histórico).
 *
 * No GET /clients/{id}/observations, observações manuais são mescladas com
 * appointment.notes (source='appointment'). Hard-delete (não há flag active).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_observations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->text('content');
            $table->timestamps();

            $table->index(['client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_observations');
    }
};
