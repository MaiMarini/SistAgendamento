<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pivot N:N entre profissionais e especialidades.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professional_specialty', function (Blueprint $table) {
            $table->foreignUuid('professional_id')->constrained('professionals')->cascadeOnDelete();
            $table->foreignUuid('specialty_id')->constrained('specialties')->cascadeOnDelete();

            $table->primary(['professional_id', 'specialty_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('professional_specialty');
    }
};
