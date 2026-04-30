<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Códigos de licença para registro de empresas.
 *
 * Cada código é one-time: validado e marcado como `used` no momento do
 * registro de uma empresa. Comparação é case-insensitive (armazenado em
 * UPPER, query também em UPPER).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 64)->unique();
            $table->boolean('used')->default(false);
            $table->uuid('used_by')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index('used');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licenses');
    }
};
