<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Documentos anexados a um cliente.
 *
 * No backend Python, os arquivos viviam no Supabase Storage
 * (bucket "client-documents", path "{company_id}/{client_id}/{uuid}.{ext}").
 * Na migração HostGator, vão para o filesystem local (storage/app/client-documents/...)
 * acessado via URL assinada com token efêmero.
 *
 * Vinculação:
 *   - observation_id: documento anexado a uma observação manual
 *   - appointment_id: documento anexado a um agendamento
 *   - ambos NULL: documento avulso vinculado só ao cliente
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignUuid('observation_id')->nullable()->constrained('client_observations')->nullOnDelete();
            $table->foreignUuid('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->string('file_name');
            $table->string('file_type', 100);
            $table->string('storage_path', 1024);
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->timestamps();

            $table->index(['client_id', 'created_at']);
            $table->index('observation_id');
            $table->index('appointment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_documents');
    }
};
