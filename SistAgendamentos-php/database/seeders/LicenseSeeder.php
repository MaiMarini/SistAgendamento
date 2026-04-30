<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeder de licenças de teste.
 *
 * Cria N códigos de licença não usados, com prefixo identificável, para que
 * a equipe consiga registrar empresas em ambiente de dev sem precisar
 * gerar licenças manualmente.
 *
 * Em produção (HostGator), licenças reais devem ser criadas via:
 *   - Console (php artisan tinker) chamando este seeder
 *   - Ou rota admin protegida (a definir)
 *   - Ou inserção manual via phpMyAdmin
 *
 * Uso: php artisan db:seed --class=LicenseSeeder
 */
class LicenseSeeder extends Seeder
{
    public function run(): void
    {
        $count = 10;
        $rows = [];

        for ($i = 1; $i <= $count; $i++) {
            $rows[] = [
                'id'         => (string) Str::uuid(),
                'code'       => 'DEV-' . strtoupper(Str::random(8)),
                'used'       => false,
                'used_by'    => null,
                'used_at'    => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('licenses')->insert($rows);

        $this->command->info("Criadas {$count} licenças de desenvolvimento (prefixo DEV-).");
        $this->command->info('Listar: SELECT code FROM licenses WHERE used = 0;');
    }
}
