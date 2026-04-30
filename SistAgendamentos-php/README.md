# SistAgendamentos — Backend PHP (Laravel 11)

Backend reescrito em PHP/Laravel para hospedagem na HostGator (Plano M).
Substitui o backend FastAPI/Python+Supabase original, mantendo o app React Native intocado.

## Stack

- **PHP 8.3** (mínimo 8.2)
- **Laravel 11**
- **MySQL 8** (incluído no Plano M)
- **Sanctum** — tokens de autenticação para o app mobile
- **SMTP** — envio de emails via servidor da HostGator

## Status da migração

Ver [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md).

| Fase | Conteúdo | Status |
|---|---|---|
| 1 | Fundação: schema MySQL, configs, env | ✅ |
| 2 | Auth (registro/login/JWT/reset/convite) | ⏳ |
| 3 | Companies + Specialties | ⏳ |
| 4 | Professionals | ⏳ |
| 5 | Clients + observações + documentos | ⏳ |
| 6 | Appointments + reminders | ⏳ |
| 7 | Deploy HostGator (cPanel, .htaccess, cron, SSL) | ⏳ |

## Setup local (Windows + Laragon)

### 1. Instalar o Laragon

Baixar em https://laragon.org/download/ (versão Full) e instalar com defaults.
O Laragon traz: PHP 8.3, MySQL/MariaDB, Apache, Composer, Node.js.

Após instalar, abrir o Laragon e clicar em **Start All**.

### 2. Criar o projeto Laravel base

Abrir o terminal do Laragon (Menu → Terminal) e rodar:

```bash
cd /d/Trabalhos/SistAgendamentos-docs
composer create-project laravel/laravel SistAgendamentos-php-temp
```

Isso baixa o esqueleto oficial do Laravel 11 numa pasta temporária.

### 3. Mesclar com os arquivos customizados deste projeto

A pasta `SistAgendamentos-php/` (este diretório) já contém:
- `composer.json` customizado (com Sanctum + outras deps)
- `database/migrations/*.php` (todas as migrations do projeto)
- `database/sql/initial_schema.sql` (backup em SQL puro)
- `.env.example`
- `database/seeders/LicenseSeeder.php`

Copiar o conteúdo da pasta temporária para esta:

```bash
# do Bash do Laragon
cp -rn /d/Trabalhos/SistAgendamentos-docs/SistAgendamentos-php-temp/* /d/Trabalhos/SistAgendamentos-docs/SistAgendamentos-php/
# A flag -n garante que arquivos existentes (nossos) NÃO sejam sobrescritos
rm -rf /d/Trabalhos/SistAgendamentos-docs/SistAgendamentos-php-temp
```

### 4. Instalar dependências e configurar

```bash
cd /d/Trabalhos/SistAgendamentos-docs/SistAgendamentos-php
composer install
cp .env.example .env
php artisan key:generate
```

### 5. Criar o banco MySQL

No Laragon: **Menu → MySQL → Create database** → nome: `sistagendamentos`

Editar `.env` para apontar para esse banco:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sistagendamentos
DB_USERNAME=root
DB_PASSWORD=
```

### 6. Rodar migrations e seeders

```bash
php artisan migrate
php artisan db:seed --class=LicenseSeeder
```

### 7. Rodar o servidor de dev

```bash
php artisan serve
```

A API estará em `http://localhost:8000`.

### 8. Testar

```bash
curl http://localhost:8000/api/health
# {"status":"ok"}
```

## Estrutura

```
SistAgendamentos-php/
├── app/
│   ├── Http/Controllers/Api/   # AuthController, CompanyController, etc.
│   ├── Models/                  # Eloquent models
│   ├── Mail/                    # Mailables (5 templates)
│   └── Services/                # LicenseService, AvailabilityService, etc.
├── database/
│   ├── migrations/              # Schema MySQL
│   ├── seeders/                 # Seeders (licenças de teste)
│   └── sql/                     # Dumps SQL alternativos
├── docs/                        # Docs internas da migração
├── routes/api.php               # Rotas da API
├── storage/app/client-documents/ # Substituto do Supabase Storage
└── .env.example                 # Template de configuração
```

## Deploy na HostGator

Ver [docs/HOSTGATOR_DEPLOY.md](docs/HOSTGATOR_DEPLOY.md) (criado na Fase 7).
