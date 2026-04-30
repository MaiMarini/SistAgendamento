<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agendamentos.
 *
 * Campos do cliente são DENORMALIZADOS (client_name/email/phone/cpf):
 * preserva os dados como estavam no momento do agendamento e funciona como
 * fallback quando client_id é NULL (legado). Quando o cliente é atualizado,
 * a aplicação propaga as mudanças para todos os appointments dele.
 *
 * Auto-complete: na listagem, status 'scheduled'/'confirmed' com ends_at < now()
 * são automaticamente migrados para 'completed' (controller-side).
 *
 * reminder_sent: flag usado pelo cron de lembretes para evitar duplicatas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignUuid('professional_id')->constrained('professionals')->cascadeOnDelete();
            $table->foreignUuid('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->uuid('service_id')->nullable();

            // Snapshot do cliente no momento do agendamento
            $table->string('client_name');
            $table->string('client_email')->nullable();
            $table->string('client_phone', 30)->nullable();
            $table->string('client_cpf', 11)->nullable();

            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->enum('status', ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'])
                  ->default('scheduled');
            $table->text('notes')->nullable();

            $table->boolean('reminder_sent')->default(false);

            $table->timestamps();

            $table->index(['company_id', 'starts_at']);
            $table->index(['professional_id', 'starts_at']);
            $table->index(['client_id', 'starts_at']);
            $table->index(['company_id', 'status', 'reminder_sent', 'starts_at'], 'appointments_reminder_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
