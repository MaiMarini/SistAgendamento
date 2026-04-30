# Status da Migração — FastAPI → Laravel

Última atualização: 2026-04-29

## Resumo

| Fase | Conteúdo | Status |
|---|---|---|
| 1 | Fundação: schema MySQL + configs + bootstrap | ✅ Concluída |
| 2 | Auth (registro/login/JWT/reset/convite) | ⏳ Próxima |
| 3 | Companies + Specialties | ⏳ |
| 4 | Professionals (incl. availability/time-blocks/slots) | ⏳ |
| 5 | Clients (incl. observações + documentos) | ⏳ |
| 6 | Appointments + Reminders cron | ⏳ |
| 7 | Deploy HostGator (cPanel/SSL/cron) | ⏳ |

---

## ✅ Fase 1 — Fundação (concluída)

### Entregue

```
SistAgendamentos-php/
├── README.md                              # Setup local com Laragon
├── composer.json                          # Laravel 11 + Sanctum + UUID
├── .env.example                           # Defaults para dev e produção
├── .gitignore
├── database/
│   ├── migrations/
│   │   ├── 0001_01_01_000000_create_users_table.php          # users + sessions + reset tokens
│   │   ├── 0001_01_01_000001_create_cache_table.php
│   │   ├── 0001_01_01_000002_create_jobs_table.php
│   │   ├── 2024_01_01_000000_create_personal_access_tokens_table.php  # Sanctum
│   │   ├── 2026_04_29_000001_create_licenses_table.php
│   │   ├── 2026_04_29_000002_create_companies_table.php
│   │   ├── 2026_04_29_000003_create_specialties_table.php
│   │   ├── 2026_04_29_000004_create_professionals_table.php
│   │   ├── 2026_04_29_000005_create_professional_specialty_table.php
│   │   ├── 2026_04_29_000006_create_company_availabilities_table.php
│   │   ├── 2026_04_29_000007_create_company_time_blocks_table.php
│   │   ├── 2026_04_29_000008_create_availabilities_table.php
│   │   ├── 2026_04_29_000009_create_time_blocks_table.php
│   │   ├── 2026_04_29_000010_create_clients_table.php
│   │   ├── 2026_04_29_000011_create_client_observations_table.php
│   │   ├── 2026_04_29_000012_create_appointments_table.php
│   │   └── 2026_04_29_000013_create_client_documents_table.php
│   ├── seeders/LicenseSeeder.php
│   └── sql/initial_schema.sql            # Backup em SQL puro (importável via phpMyAdmin)
└── docs/MIGRATION_STATUS.md              # este arquivo
```

### Schema MySQL — total 17 tabelas

**Auth/Infra (Laravel padrão):**
- `users` — autenticação central (UUID, user_type discriminator, FK 1:1 com companies/professionals)
- `password_reset_tokens` — tokens de reset
- `sessions` — sessões web (não usadas pelo mobile, mas Laravel cria)
- `cache`, `cache_locks` — cache driver=database
- `jobs`, `job_batches`, `failed_jobs` — queue driver=database
- `personal_access_tokens` — Sanctum

**Domínio:**
- `licenses` — códigos de registro de empresa
- `companies` — perfil empresa
- `specialties` — especialidades por empresa
- `professionals` — profissionais (soft-delete duplo: active + status)
- `professional_specialty` — pivot N:N
- `company_availabilities` — horários comerciais
- `company_time_blocks` — bloqueios da empresa
- `availabilities` — horários do profissional
- `time_blocks` — bloqueios do profissional
- `clients` — clientes (com guardião)
- `client_observations` — observações manuais
- `appointments` — agendamentos (com snapshot do cliente)
- `client_documents` — documentos anexados a clientes

### Decisões arquiteturais da Fase 1

1. **UUID como PK em todas as tabelas de domínio** (preserva os IDs que vinham do Supabase Auth e facilita merge futuro de dados).
2. **users.id == companies.id** e **users.id == professionals.id** via FK 1:1, replicando o invariante do projeto Python original.
3. **Soft-delete duplo em `professionals`**: `active` (boolean) + `status` (enum). Idêntico ao Python.
4. **Soft-delete simples em `clients`**: apenas `active=false`.
5. **Hard-delete em `client_observations`**: idêntico ao comportamento atual.
6. **Snapshot denormalizado em `appointments`**: `client_name/email/phone/cpf` copiados do cliente (sync via aplicação no update do cliente).
7. **Storage local em vez de Supabase Storage**: caminho `storage/app/client-documents/{company_id}/{client_id}/{uuid}.{ext}` no filesystem do servidor.
8. **CACHE/QUEUE/SESSION em `database`** por padrão: HostGator Plano M não tem Redis. Funciona out-of-the-box.

### Como verificar (depois de instalar Laragon)

```bash
cd /d/Trabalhos/SistAgendamentos-docs/SistAgendamentos-php
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed --class=LicenseSeeder

# Verificar tabelas
php artisan db:show
# Deve listar 17 tabelas

# Listar licenças de teste geradas
php artisan tinker
>>> \DB::table('licenses')->where('used', false)->pluck('code')
```

---

## ⏳ Fase 2 — Auth (próxima)

**Entregáveis previstos:**

- `app/Models/User.php` (com Sanctum + UUID)
- `app/Models/Company.php` (model Eloquent básico)
- `app/Models/Professional.php` (model Eloquent básico)
- `app/Models/License.php`
- `app/Http/Controllers/Api/AuthController.php`
  - `POST /api/auth/login` (email + password → token Sanctum)
  - `POST /api/auth/logout`
  - `POST /api/companies/register` (com validação de licença + criação de user + company)
  - `POST /api/auth/forgot-password` (gera token + envia email)
  - `POST /api/auth/reset-password` (valida token + atualiza senha)
  - `POST /api/professionals/me/activate` (transição pending → active após primeiro login)
- `app/Mail/PasswordResetMail.php`
- `app/Mail/RegistrationConfirmationMail.php`
- `app/Mail/ProfessionalInviteMail.php`
- `routes/api.php` — rotas auth + middleware Sanctum
- `config/auth.php`, `config/sanctum.php`, `config/cors.php`, `config/services.php` — overrides

**Mudanças vs. Python original:**

- Magic link de convite → token aleatório próprio (gerado pelo Laravel) com expiração configurável via env. O profissional recebe URL `{FRONTEND_URL}/accept-invite?token=...`, troca pelo password, e é ativado.
- Reset de senha → mesmo esquema de tabela `password_reset_tokens` que o Laravel cria nativamente (já está na migration).
- JWT (Supabase) → token Sanctum (Bearer). O frontend continua mandando `Authorization: Bearer ...`, então o app RN só precisa trocar a URL base.

---

## Notas para o desenvolvedor

### O que NÃO foi feito na Fase 1 (intencionalmente)

- **Models Eloquent** — vão na Fase 2 junto com auth.
- **Controllers** — todas as Fases 2-6.
- **Mailables** — Fases 2 e 6.
- **Cron de lembretes** — Fase 6 (rota + comando artisan + entrada no `app/Console/Kernel.php`).
- **Configurações de mail/cors com domínios reais** — Fase 7 (deploy).
- **Bootstrap do Laravel** (public/index.php, app/Http/Kernel.php, etc.) — virá quando rodar `composer create-project laravel/laravel` conforme README.md.

### Por que não criei os arquivos de bootstrap manualmente

Laravel 11 muda o esqueleto do projeto a cada release menor. Em vez de copiar manualmente o esqueleto desta versão (que pode ficar desatualizado), o README pede para rodar `composer create-project laravel/laravel` — assim você sempre pega a versão oficial e atual do esqueleto.

Os arquivos deste repo ficam por cima desse esqueleto sem conflito (composer.json é o único a ser substituído, e contém tudo do Laravel padrão + Sanctum + ramsey/uuid).

### Convenções

- Migrations seguem o padrão Laravel: `YYYY_MM_DD_NNNNNN_descrição.php`.
- Nomes de tabelas em snake_case plural (`companies`, `professionals`, `appointments`).
- Pivot table em singular sem ordem alfabética estrita (`professional_specialty`, mantendo a leitura natural).
- UUIDs como `CHAR(36)` no MySQL (formato canônico com hyphens).
- `timestamps()` adiciona `created_at` + `updated_at` (TIMESTAMP, nullable, padrão Laravel).
