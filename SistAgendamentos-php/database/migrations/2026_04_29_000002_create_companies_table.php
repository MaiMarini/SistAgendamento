<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Perfil da empresa.
 *
 * id é igual ao id do usuário em `users` (1:1). FK garante que toda empresa
 * tenha credenciais de login. `active` é o flag de operacionalidade.
 *
 * Endereço, contact_email e reminder_hours_before são editáveis pelo dono
 * via PATCH /companies/me.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('cnpj', 14)->unique();
            $table->string('phone', 30)->nullable();
            $table->string('contact_email')->nullable();
            $table->string('cep', 8)->nullable();
            $table->string('street')->nullable();
            $table->string('address_number', 20)->nullable();
            $table->string('complement')->nullable();
            $table->string('neighborhood')->nullable();
            $table->string('city')->nullable();
            $table->string('state', 2)->nullable();
            $table->unsignedSmallInteger('reminder_hours_before')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->foreign('id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
