<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cliente da empresa.
 *
 * Soft-delete via `active=false`. Quando is_minor=true, notificações vão
 * para guardian_email (se notifications_enabled). is_provisional=true marca
 * clientes criados implicitamente ao agendar sem client_id selecionado —
 * esses NUNCA fazem fallback por phone/name (evita cross-contamination).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();

            $table->string('name');
            $table->date('birth_date')->nullable();
            $table->boolean('is_minor')->default(false);
            $table->text('observations')->nullable();

            // Identidade / endereço (adulto)
            $table->string('cpf', 11)->nullable();
            $table->string('cep', 8)->nullable();
            $table->string('street')->nullable();
            $table->string('neighborhood')->nullable();
            $table->string('city')->nullable();
            $table->string('state', 2)->nullable();
            $table->string('address_number', 20)->nullable();
            $table->string('complement')->nullable();
            $table->string('phone', 30)->nullable();
            $table->boolean('phone_is_whatsapp')->default(false);
            $table->string('email')->nullable();

            // Responsável (quando menor)
            $table->string('guardian_name')->nullable();
            $table->date('guardian_birth_date')->nullable();
            $table->string('guardian_cpf', 11)->nullable();
            $table->string('guardian_cep', 8)->nullable();
            $table->string('guardian_street')->nullable();
            $table->string('guardian_neighborhood')->nullable();
            $table->string('guardian_city')->nullable();
            $table->string('guardian_state', 2)->nullable();
            $table->string('guardian_number', 20)->nullable();
            $table->string('guardian_complement')->nullable();
            $table->string('guardian_phone', 30)->nullable();
            $table->boolean('guardian_phone_is_whatsapp')->default(false);
            $table->string('guardian_email')->nullable();

            // Notificações
            $table->boolean('notifications_enabled')->default(true);
            $table->string('notification_channel', 16)->nullable();

            $table->boolean('is_provisional')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['company_id', 'active']);
            $table->index(['company_id', 'phone']);
            $table->index(['company_id', 'name']);
            $table->unique(['company_id', 'cpf']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
