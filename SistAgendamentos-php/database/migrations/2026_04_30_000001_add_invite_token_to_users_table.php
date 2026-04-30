<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adiciona colunas de convite à tabela users.
 *
 * Substitui o magic link do Supabase Auth. Quando uma empresa cria um
 * profissional, geramos um invite_token aleatório com expiração.
 * O profissional recebe um email com link contendo esse token, define
 * sua senha, e o token é consumido.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('invite_token', 64)->nullable()->unique()->after('company_id');
            $table->timestamp('invite_token_expires_at')->nullable()->after('invite_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['invite_token', 'invite_token_expires_at']);
        });
    }
};
