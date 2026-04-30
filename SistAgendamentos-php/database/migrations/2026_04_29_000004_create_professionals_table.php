<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Perfil do profissional.
 *
 * id é igual ao id do usuário em `users` (1:1). Soft-delete duplo:
 *   - `active` (boolean) — flag rápido de operacionalidade
 *   - `status` (enum) — máquina de estados: pending → active/inactive/deleted
 *
 * Ao soft-delete, email vira "deleted_{uuid}@placeholder.invalid" e cpf vira
 * NULL para liberar reuso desses valores em novos cadastros.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professionals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('cpf', 11)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('photo_url', 1024)->nullable();
            $table->string('color', 16)->nullable();
            $table->unsignedSmallInteger('default_duration_minutes')->default(60);
            $table->boolean('active')->default(false);
            $table->enum('status', ['pending', 'active', 'inactive', 'deleted'])->default('pending');
            $table->timestamps();

            $table->foreign('id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['company_id', 'status']);
            $table->unique(['company_id', 'email']);
            $table->unique(['company_id', 'cpf']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('professionals');
    }
};
