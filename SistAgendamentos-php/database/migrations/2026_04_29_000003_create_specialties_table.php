<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Especialidades da empresa.
 *
 * Cada empresa cadastra suas próprias especialidades; profissionais são
 * associados via tabela pivot professional_specialty.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('specialties', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('name');
            $table->text('info')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->unique(['company_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('specialties');
    }
};
