# SistAgendamentos

Plataforma B2B de agendamentos profissionais. Empresas gerenciam profissionais, clientes e agendamentos; profissionais acessam sua agenda e disponibilidade.

> **Migração de backend (2026):** o backend foi **reescrito de FastAPI + Supabase para Laravel 11 + MySQL** para hospedagem na HostGator (domínio `kallme.com.br`). O backend atual é o diretório [`SistAgendamentos-php/`](SistAgendamentos-php/). O backend Python legado ([`SistAgendamentos/`](SistAgendamentos/)) está em processo de aposentadoria e é mantido apenas para referência. O app React Native foi preservado, trocando apenas a camada de autenticação de Supabase Auth para Laravel Sanctum.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estrutura de Pastas](#estrutura-de-pastas)
5. [Banco de Dados](#banco-de-dados)
6. [Configuração do Ambiente](#configuração-do-ambiente)
7. [Rodando o Projeto](#rodando-o-projeto)
8. [API — Referência Completa](#api--referência-completa)
9. [Frontend — Telas e Navegação](#frontend--telas-e-navegação)
10. [Autenticação e Perfis de Usuário](#autenticação-e-perfis-de-usuário)
11. [Fluxos Principais](#fluxos-principais)
12. [Emails Transacionais](#emails-transacionais)
13. [Decisões Arquiteturais](#decisões-arquiteturais)

---

## Visão Geral

| | |
|---|---|
| **Nome** | SistAgendamentos |
| **Tipo** | Plataforma B2B de agendamentos |
| **Usuários** | Empresas (gestores) e Profissionais |
| **Backend** | Laravel 11 + Sanctum + MySQL |
| **Frontend** | React Native + Expo (web e mobile) |
| **Hospedagem** | HostGator (cPanel) — domínio `kallme.com.br` |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React Native / Expo)                         │
│  scheduling-app/                                        │
│  ┌────────────────────┐  ┌────────────────────────────┐ │
│  │  CompanyNavigator  │  │  ProfessionalNavigator     │ │
│  │  (5 telas)         │  │  (4 telas)                 │ │
│  └────────────────────┘  └────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────┘
                  │ HTTP (REST) + Bearer token (Sanctum)
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (Laravel 11)                                   │
│  SistAgendamentos-php/                                  │
│  ┌──────────┐ ┌─────────────┐ ┌────────┐ ┌──────────┐   │
│  │ api.php  │ │ Controllers │ │ Models │ │ Services │   │
│  │ (rotas)  │ │ (HTTP)      │ │Eloquent│ │(negócio) │   │
│  └──────────┘ └─────────────┘ └────────┘ └──────────┘   │
│  ┌──────────┐ ┌─────────────┐ ┌────────────────────┐    │
│  │ Requests │ │ Mail        │ │ Sanctum (auth)     │    │
│  │(validação)│ │(transacional)│ │ tokens             │    │
│  └──────────┘ └─────────────┘ └────────────────────┘    │
└─────────────────┬───────────────────────────────────────┘
                  │ Eloquent ORM
                  ▼
┌─────────────────────────────────────────────────────────┐
│  MySQL (HostGator)                                      │
│  + filesystem local (storage/app) para documentos       │
│  + filas/cache/sessão em tabelas do banco                │
└─────────────────────────────────────────────────────────┘
```

### Camadas do Backend

| Caminho | Responsabilidade |
|---------|-----------------|
| `routes/api.php` | Definição de todas as rotas da API (prefixo `/api`) |
| `app/Http/Controllers/Api/` | Controllers HTTP (lógica de cada endpoint) |
| `app/Http/Requests/` | Form Requests (validação de entrada) |
| `app/Models/` | Models Eloquent (13 entidades, todas com `HasUuids`) |
| `app/Services/AvailabilityService.php` | Cálculo de slots disponíveis e disponibilidade mensal |
| `app/Mail/` | Mailables transacionais (enviados via fila) |
| `app/Rules/Cnpj.php` | Regra de validação de CNPJ |
| `config/` | Configuração (database, auth, mail, sanctum, cors, etc.) |
| `database/migrations/` | Schema do banco (19 migrations) |

---

## Stack Tecnológico

### Backend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| PHP | ^8.2 | Linguagem |
| Laravel | ^11.0 | Framework HTTP |
| Laravel Sanctum | ^4.0 | Autenticação por token de API |
| Laravel Tinker | ^2.9 | REPL / debug |
| ramsey/uuid | ^4.7 | Geração de UUIDs |
| MySQL | 5.7+/8.x | Banco de dados |
| PHPUnit | ^11.0 | Testes |
| Laravel Pint | ^1.13 | Code style |

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React Native | 0.83.2 | Framework mobile |
| Expo | 55.x | Build e dev tools |
| React | 19.2 | Biblioteca de UI |
| TypeScript | 5.9.x | Linguagem |
| React Navigation | 7.x | Navegação (Drawer + Stack) |
| NativeWind / Tailwind | 4.x / 3.4 | Estilos |
| FullCalendar | 6.1.x | Calendário (web) |
| AsyncStorage | 2.x | Persistência local do token |

> **Nota:** `@supabase/supabase-js` ainda consta no `package.json` por resíduo da migração, mas **não é mais utilizado** — a autenticação agora é feita inteiramente via Laravel Sanctum (ver [`src/lib/auth.ts`](scheduling-app/src/lib/auth.ts)).

### Cloud / Infraestrutura
| Serviço | Uso |
|---------|-----|
| HostGator (cPanel) | Hospedagem do backend Laravel + MySQL |
| SMTP HostGator | E-mails transacionais (`naoresponda@kallme.com.br`) |
| Filesystem local | Armazenamento de documentos de clientes (`storage/app`) |

---

## Estrutura de Pastas

```
SistAgendamentos-docs/
├── SistAgendamentos-php/            # Backend atual — Laravel 11
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/     # AuthController, CompanyController, etc.
│   │   │   └── Requests/            # Form Requests (validação)
│   │   ├── Models/                  # 13 models Eloquent
│   │   ├── Mail/                    # 5 Mailables transacionais
│   │   ├── Services/                # AvailabilityService
│   │   └── Rules/                   # Cnpj
│   ├── database/migrations/         # 19 migrations
│   ├── routes/
│   │   ├── api.php                  # Todas as rotas da API
│   │   └── web.php                  # Download de documento (URL assinada)
│   ├── resources/views/emails/      # Templates Blade dos e-mails
│   ├── config/                      # Configuração Laravel
│   ├── storage/app/client-documents/ # Documentos enviados
│   ├── .env.example
│   └── composer.json
│
├── SistAgendamentos/                # Backend legado (FastAPI) — referência
│
└── scheduling-app/                  # Frontend React Native / Expo
    ├── package.json
    ├── app.json                     # Config Expo
    ├── tailwind.config.js
    └── src/
        ├── lib/
        │   ├── config.ts            # API_URL (https://api.kallme.com.br/api)
        │   ├── auth.ts              # Auth via Laravel Sanctum (token Bearer)
        │   ├── UserContext.tsx      # Context de papel do usuário
        │   ├── appointmentUtils.ts  # Utilitários de agendamento
        │   ├── scheduleConstants.ts # Constantes de agenda
        │   ├── masks.ts             # Máscaras de input (CPF, CNPJ, telefone, CEP)
        │   ├── avatar.ts            # Geração de avatares
        │   └── useResponsiveWeb.ts  # Hook de responsividade web (CSS injection)
        ├── hooks/
        │   ├── useConfirm.tsx
        │   ├── useBookingModal.ts
        │   └── useAppointmentDetailModal.ts
        ├── navigation/
        │   ├── index.tsx            # Roteador raiz (auth → app)
        │   ├── CompanyNavigator.tsx # Drawer da empresa (5 telas)
        │   ├── ProfessionalNavigator.tsx  # Drawer do profissional (4 telas)
        │   └── Sidebar.tsx
        └── screens/
            ├── auth/
            │   ├── LoginScreen.tsx (.web.tsx)
            │   └── SetPasswordScreen.tsx (.web.tsx)
            └── app/
                ├── HomeScreen.tsx (.web.tsx)
                ├── AppointmentsScreen.tsx (.web.tsx)
                ├── ProfessionalsScreen.tsx (.web.tsx)
                ├── ClientsScreen.tsx (.web.tsx)
                ├── SettingsScreen.tsx (.web.tsx)
                ├── MyProfileScreen.web.tsx
                ├── AppointmentDetailModal.web.tsx
                ├── BookingModal.web.tsx
                ├── DateInputWithPicker.web.tsx
                └── SimpleDatePicker.web.tsx
```

> **Convenção `.web.tsx`:** O Metro bundler resolve automaticamente arquivos `.web.tsx` para a plataforma web. Cada tela com comportamento diferente em mobile tem uma variante `.web.tsx`.

---

## Banco de Dados

MySQL gerenciado via cPanel (HostGator). Todas as entidades de domínio usam **UUID** como chave primária (trait `HasUuids`). Cache, filas (`jobs`) e sessões também residem em tabelas do banco (não há Redis na HostGator).

### Modelo de Autenticação (Laravel)

A tabela `users` é o centro da autenticação. Empresas e profissionais são **perfis 1:1** cujo `id` é igual ao `id` do respectivo usuário:

- **Empresa:** `users.id == companies.id`
- **Profissional:** `professionals.id == users.id` e `users.company_id` aponta para a empresa

O helper `User::effectiveCompanyId()` retorna o `company_id` correto independente do tipo de usuário.

### Tabelas

#### `users`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `email` | string unique | E-mail de login |
| `password` | string | Hash da senha |
| `user_type` | enum | `company` / `professional` |
| `company_id` | UUID FK? | Empresa do usuário (preenchido para profissionais) |
| `invite_token` | string(64) unique? | Token de convite de profissional |
| `invite_token_expires_at` | timestamp? | Expiração do convite |

> Tabelas auxiliares do Laravel: `personal_access_tokens` (Sanctum), `password_reset_tokens`, `sessions`, `cache`, `jobs`.

#### `companies`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | = `users.id` |
| `name` | string | Nome da empresa |
| `cnpj` | string(14) unique | CNPJ (só dígitos) |
| `phone` | string | Telefone |
| `contact_email` | string | E-mail de contato |
| `cep` / `street` / `address_number` / `complement` / `neighborhood` / `city` / `state` | string | Endereço |
| `reminder_hours_before` | int | Antecedência do lembrete (horas) |
| `active` | boolean | Conta ativa |
| `timestamps` | | |

#### `professionals`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | = `users.id` |
| `company_id` | UUID FK | Empresa proprietária |
| `name` | string | Nome completo |
| `email` | string | E-mail (único por empresa) |
| `cpf` | string(11)? | CPF (único por empresa, só dígitos) |
| `phone` | string | Telefone |
| `photo_url` | string | URL da foto |
| `color` | string | Cor no calendário (`#RRGGBB`) |
| `default_duration_minutes` | int | Duração padrão de atendimento (60) |
| `active` | boolean | Profissional ativo |
| `status` | enum | `pending` / `active` / `inactive` / `deleted` |
| `timestamps` | | |

#### `specialties`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `name` | string | Nome da especialidade (único por empresa) |
| `info` | text | Descrição adicional |

#### `professional_specialty` (pivot N:N)
| Coluna | Tipo |
|--------|------|
| `professional_id` | UUID FK |
| `specialty_id` | UUID FK |

#### `availabilities` / `company_availabilities`
Disponibilidade semanal do profissional (e horário de funcionamento da empresa).
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `professional_id` / `company_id` | UUID FK | Dono da disponibilidade |
| `day_of_week` | int | 0=Segunda … 6=Domingo |
| `start_time` / `end_time` | time | Início e fim do expediente |
| `active` | boolean | |

#### `time_blocks` / `company_time_blocks`
Bloqueios de agenda (do profissional e da empresa).
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `professional_id` / `company_id` | UUID FK | |
| `is_recurring` | boolean | Bloqueio recorrente diário |
| `starts_at` / `ends_at` | timestamp | Período (one-time) |
| `recurring_start_time` / `recurring_end_time` | time | Faixa diária (recorrente) |
| `reason` | string | Motivo |

#### `clients`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `name` | string | Nome |
| `birth_date` | date | Data de nascimento |
| `is_minor` | boolean | Menor de idade |
| `cpf` / `cep` / `street` / `neighborhood` / `city` / `state` / `address_number` / `complement` | string | Dados e endereço |
| `phone` / `phone_is_whatsapp` / `email` | | Contato |
| `guardian_*` | string | Dados do responsável (quando menor) |
| `notifications_enabled` | boolean | Notificações ativas |
| `notification_channel` | enum | `email` / `whatsapp` |
| `is_provisional` | boolean | Cliente provisório (criado no agendamento) |
| `active` | boolean | Soft-delete |

> `Client::notificationEmail()` retorna `guardian_email` se `is_minor`, caso contrário `email`.

#### `client_observations`
Observações manuais sobre o cliente. (No frontend, são mescladas com as notas dos agendamentos.)
| Coluna | Tipo |
|--------|------|
| `id` | UUID PK |
| `client_id` / `company_id` | UUID FK |
| `content` | text |

#### `client_documents`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `client_id` / `company_id` | UUID FK | |
| `observation_id` / `appointment_id` | UUID FK? | Vínculo opcional |
| `file_name` | string | Nome original |
| `file_type` | string | MIME type |
| `storage_path` | string | Caminho em `storage/app/client-documents/...` |
| `file_size_bytes` | int | |

#### `appointments`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `company_id` / `professional_id` | UUID FK | |
| `client_id` | UUID FK? | Cliente cadastrado (opcional) |
| `service_id` | UUID? | Reservado (não há tabela `services` no schema atual) |
| `client_name` / `client_email` / `client_phone` / `client_cpf` | string | Dados denormalizados do cliente |
| `starts_at` / `ends_at` | timestamp | `ends_at` calculado a partir da duração |
| `status` | enum | `scheduled` / `confirmed` / `completed` / `cancelled` / `no_show` |
| `notes` | text | Observações |
| `reminder_sent` | boolean | Flag de deduplicação de lembrete |

#### `licenses`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `code` | string unique | Código de licença (validação case-insensitive) |
| `used` | boolean | Se já foi utilizado |
| `used_by` | UUID? | Empresa que utilizou |
| `used_at` | timestamp? | |

### Armazenamento de Arquivos

Documentos de clientes são gravados no **filesystem local** em `storage/app/client-documents/{company_id}/{client_id}/{uuid}.{ext}` (upload máximo de 10 MB). O download é feito por **URL assinada** com validade de 1 hora.

---

## Configuração do Ambiente

### Backend — `.env`

Copie `SistAgendamentos-php/.env.example` para `.env` e ajuste:

```env
APP_NAME="SistAgendamentos"
APP_ENV=production
APP_KEY=                      # gerar com: php artisan key:generate
APP_DEBUG=false
APP_URL=https://api.kallme.com.br
APP_TIMEZONE=America/Sao_Paulo
APP_LOCALE=pt_BR

# URL do frontend — usada nos links de e-mail (reset, convite)
FRONTEND_URL=https://app.kallme.com.br

# Expiração dos links (horas)
INVITE_LINK_EXPIRATION_HOURS=24
PASSWORD_RESET_EXPIRATION_HOURS=1

# Banco de dados (MySQL — cPanel HostGator)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sistagendamentos
DB_USERNAME=<usuario>
DB_PASSWORD=<senha>

# Cache / fila / sessão em banco (sem Redis na HostGator)
CACHE_STORE=database
QUEUE_CONNECTION=database
SESSION_DRIVER=database

# Sanctum — domínios autorizados
SANCTUM_STATEFUL_DOMAINS=kallme.com.br,app.kallme.com.br,api.kallme.com.br

# CORS — origens autorizadas a chamar a API
CORS_ALLOWED_ORIGINS="https://app.kallme.com.br"

# Email (SMTP HostGator — criar a conta no cPanel primeiro)
MAIL_MAILER=smtp
MAIL_HOST=mail.kallme.com.br
MAIL_PORT=465
MAIL_ENCRYPTION=ssl
MAIL_USERNAME=naoresponda@kallme.com.br
MAIL_PASSWORD=<senha do e-mail no cPanel>
MAIL_FROM_ADDRESS="naoresponda@kallme.com.br"
MAIL_FROM_NAME="Sistema de Agendamentos"
```

> Em desenvolvimento local, use `MAIL_MAILER=log` (e-mails são gravados em `storage/logs/laravel.log`) ou um serviço como Mailtrap/MailHog.

### Frontend — `src/lib/config.ts`

```ts
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.kallme.com.br/api';
```

Defina `EXPO_PUBLIC_API_URL` (ex.: `http://localhost:8000/api`) para apontar a um backend local.

---

## Rodando o Projeto

### Backend (Laravel)

```bash
cd SistAgendamentos-php

# Instalar dependências
composer install

# Configurar ambiente
cp .env.example .env
php artisan key:generate

# Rodar migrations (cria o schema no MySQL)
php artisan migrate

# Subir o servidor de desenvolvimento
php artisan serve            # http://localhost:8000

# Processar a fila (e-mails são enfileirados)
php artisan queue:work
```

A API fica disponível em `http://localhost:8000/api`.

> **Filas:** os e-mails implementam `ShouldQueue` e são processados pela fila `database`. Em produção, configure um worker (`php artisan queue:work`) ou processe via cron com `php artisan queue:work --stop-when-empty`.

> **Lembretes:** configure um cron job no cPanel para chamar `POST /api/companies/me/reminders/process` periodicamente (ver [Fluxos Principais](#fluxos-principais)).

> **Deploy:** o backend em produção é atualizado com `bash deploy.sh` na raiz do repositório (faz `git push` + aciona `POST /api/deploy`, que roda `git pull` + `optimize:clear` no servidor). Detalhes, estrutura no servidor e configuração em [SistAgendamentos-php/docs/HOSTGATOR_DEPLOY.md](SistAgendamentos-php/docs/HOSTGATOR_DEPLOY.md).

### Frontend

```bash
cd scheduling-app

# Instalar dependências
npm install

# Rodar (web)
npx expo start --web         # http://localhost:8081

# Rodar (mobile)
npx expo run:android
npx expo run:ios             # apenas macOS
```

> **Expo Go e SDK 55:** o Expo Go público não é compatível com Expo SDK 55. Para dispositivo físico use `expo run:android` / `expo run:ios` (gera um build de desenvolvimento), ou rode `--web` e use as DevTools do navegador para simular telas mobile.

---

## API — Referência Completa

Base: `/api`. Todas as rotas protegidas exigem o header:

```
Authorization: Bearer <token-sanctum>
```

### Health Check

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | ❌ | Verifica se a API está online — `{ "status": "ok" }` |

### Autenticação — `/auth`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/login` | ❌ | Login por e-mail/senha → retorna token + `user_type` + `company_id` |
| POST | `/auth/forgot-password` | ❌ | Gera token de reset e envia e-mail (sempre 204) |
| POST | `/auth/reset-password` | ❌ | Redefine senha via token (validade 1h) |
| POST | `/auth/accept-invite` | ❌ | Profissional define senha e ativa conta via token de convite |
| POST | `/auth/logout` | ✅ | Revoga o token atual |
| GET | `/auth/me` | ✅ | Retorna o usuário autenticado + perfil (empresa ou profissional) |

#### `POST /auth/login`
```json
{ "email": "contato@empresa.com", "password": "senha123" }
```
Verifica a senha e o status ativo, revoga tokens antigos (um token por usuário) e retorna um novo token.

#### `POST /auth/forgot-password`
```json
{ "email": "contato@empresa.com" }
```
Gera token de reset (armazenado com hash em `password_reset_tokens`), envia e-mail e **sempre retorna 204** (evita enumeração de e-mails).

### Empresas — `/companies`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/companies/register` | ❌ | Registra nova empresa (requer código de licença) |
| GET | `/companies/me` | ✅ Empresa | Perfil da empresa autenticada |
| PATCH | `/companies/me` | ✅ Empresa | Atualiza dados da empresa |
| GET | `/companies/me/availability` | ✅ Empresa | Lista horários de funcionamento |
| PUT | `/companies/me/availability` | ✅ Empresa | Substitui todos os horários de funcionamento |
| GET | `/companies/me/time-blocks` | ✅ Empresa | Lista períodos de fechamento |
| POST | `/companies/me/time-blocks` | ✅ Empresa | Cria período de fechamento |
| DELETE | `/companies/me/time-blocks/{blockId}` | ✅ Empresa | Remove período de fechamento |
| POST | `/companies/me/reminders/process` | ✅ Empresa | Processa e envia lembretes pendentes (cron) |

#### `POST /companies/register`
```json
{
  "name": "Nome da Empresa",
  "cnpj": "12345678000190",
  "phone": "(67) 99999-9999",
  "email": "contato@empresa.com",
  "password": "senha123",
  "license_code": "ABC-XYZ-123"
}
```
**Fluxo:** valida o código de licença → cria `user` (`user_type=company`) → cria perfil `company` (id = user.id) → marca a licença como usada → envia e-mail de boas-vindas → retorna token. Tudo em uma transação com rollback.

### Profissionais — `/professionals`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/professionals` | ✅ Empresa | Cria profissional e envia convite |
| GET | `/professionals` | ✅ Empresa | Lista profissionais (não deletados) |
| GET | `/professionals/all-time-blocks` | ✅ Empresa | Bloqueios de todos os profissionais |
| GET | `/professionals/{id}` | ✅ | Busca profissional por ID |
| PATCH | `/professionals/{id}` | ✅ Empresa | Atualiza profissional |
| DELETE | `/professionals/{id}` | ✅ Empresa | Soft-delete (status=deleted) |
| POST | `/professionals/{id}/resend-invite` | ✅ Empresa | Reenvia convite (só se `pending`) |
| POST | `/professionals/me/activate` | ✅ Profissional | Ativa a própria conta (pending → active) |
| GET | `/professionals/me/availability` | ✅ Profissional | Própria disponibilidade |
| PUT | `/professionals/me/availability` | ✅ Profissional | Salva própria disponibilidade |
| GET / POST / DELETE | `/professionals/me/time-blocks[/{blockId}]` | ✅ Profissional | Gerencia próprios bloqueios |
| GET | `/professionals/{id}/availability` | ✅ Empresa | Disponibilidade de um profissional |
| PUT | `/professionals/{id}/availability` | ✅ Empresa | Salva disponibilidade de um profissional |
| GET / POST / DELETE | `/professionals/{id}/time-blocks[/{blockId}]` | ✅ Empresa | Gerencia bloqueios de um profissional |
| GET | `/professionals/{id}/available-slots?date=YYYY-MM-DD` | ✅ | Horários disponíveis em uma data |
| GET | `/professionals/{id}/month-availability?year=&month=` | ✅ | Status de disponibilidade por dia do mês |

#### `POST /professionals`
```json
{
  "name": "Ana Lima",
  "email": "ana@empresa.com",
  "cpf": "123.456.789-00",
  "phone": "(67) 98888-8888",
  "specialty_ids": ["esp-uuid-1"],
  "color": "#8e7f7e",
  "default_duration_minutes": 60
}
```
**Fluxo:** cria `user` + perfil `professional` (`status=pending`, `active=false`), gera `invite_token` (validade 24h), limpa eventuais registros deletados com o mesmo e-mail/CPF, e envia e-mail de convite.

#### `GET /professionals/{id}/available-slots?date=YYYY-MM-DD`
Calcula slots considerando disponibilidade semanal + bloqueios (one-time e recorrentes, do profissional **e** da empresa) + agendamentos existentes. Pula horários no passado se a data for hoje.
**Resposta:** `["08:00", "08:30", "09:00", ...]`

#### `GET /professionals/{id}/month-availability?year=YYYY&month=MM`
**Resposta:** `{ "2026-06-01": "past", "2026-06-02": "available", "2026-06-03": "fully_booked", "2026-06-04": "day_off", ... }`

### Clientes — `/clients`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/clients?search=...` | ✅ | Busca por nome/CPF (limite 30) |
| POST | `/clients` | ✅ | Cria cliente |
| PATCH | `/clients/{id}` | ✅ | Atualiza cliente (sincroniza dados denormalizados nos agendamentos) |
| DELETE | `/clients/{id}` | ✅ | Soft-delete (active=false) |
| GET | `/clients/{id}/appointments` | ✅ | Histórico de agendamentos |
| GET | `/clients/{id}/observations` | ✅ | Observações manuais + notas de agendamentos (mescladas) |
| POST / PATCH / DELETE | `/clients/{id}/observations[/{obsId}]` | ✅ | Gerencia observações manuais |
| GET | `/clients/{id}/documents` | ✅ | Lista documentos |
| POST | `/clients/{id}/documents/upload` | ✅ | Upload de documento (máx. 10 MB) |
| GET | `/clients/{id}/documents/{docId}/url` | ✅ | Gera URL assinada (validade 1h) |
| DELETE | `/clients/{id}/documents/{docId}` | ✅ | Remove documento (arquivo + registro) |

### Agendamentos — `/appointments`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/appointments?date_from=&date_to=&status=` | ✅ | Lista agendamentos (auto-conclui vencidos) |
| POST | `/appointments` | ✅ | Cria agendamento (`ends_at` calculado) |
| PATCH | `/appointments/{id}` | ✅ | Atualiza status/horário/notas |
| DELETE | `/appointments/{id}/notes` | ✅ | Limpa as notas do agendamento |

> Profissionais recebem apenas os próprios agendamentos; empresas recebem todos. Ao listar, agendamentos `scheduled`/`confirmed` com `ends_at` no passado são automaticamente marcados como `completed`.

**Ciclo de vida do status:**
```
scheduled → confirmed → completed
                      → no_show
any       → cancelled
```

### Especialidades — `/specialties`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/specialties` | ✅ Empresa | Lista especialidades da empresa |
| POST | `/specialties` | ✅ Empresa | Cria especialidade |
| DELETE | `/specialties/{id}` | ✅ Empresa | Remove especialidade |

### Web (não-API)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/` | ❌ | Status OK |
| GET | `/documents/{docId}/download` | URL assinada | Download do arquivo do documento |

---

## Frontend — Telas e Navegação

### Fluxo de Navegação

```
App inicia
│
├── URL tem ?type=invite ou ?token=...&email=... (recovery)?
│   └── SetPasswordScreen (definir/redefinir senha)
│
├── Token Sanctum válido no AsyncStorage?
│   ├── user_type = 'company'      → CompanyNavigator
│   └── user_type = 'professional' → ProfessionalNavigator
│
└── Não autenticado → LoginScreen
```

### CompanyNavigator (Empresa)

| Tela | Arquivos | Descrição |
|------|----------|-----------|
| Calendário | `HomeScreen.tsx` / `.web.tsx` | Calendário FullCalendar (web) ou lista (mobile) de agendamentos |
| Agendamentos | `AppointmentsScreen.tsx` / `.web.tsx` | Lista e gestão de agendamentos com filtros |
| Profissionais | `ProfessionalsScreen.tsx` / `.web.tsx` | Cadastro, edição, convite e agenda de profissionais |
| Clientes | `ClientsScreen.tsx` / `.web.tsx` | Cadastro, histórico, documentos e observações |
| Configurações | `SettingsScreen.tsx` / `.web.tsx` | Empresa, especialidades e expediente |

### ProfessionalNavigator (Profissional)

| Tela | Descrição |
|------|-----------|
| Calendário | Agenda pessoal |
| Agendamentos | Próprios agendamentos |
| Clientes | Clientes atendidos |
| Meu Perfil | Dados pessoais, disponibilidade e bloqueios |

### Detalhe das Telas (Empresa)

- **HomeScreen** — Web: FullCalendar (mês/semana/dia), eventos coloridos por profissional, modal de detalhe ao clicar no evento, modal de novo agendamento ao clicar no dia. Mobile: lista do dia com navegação por data.
- **AppointmentsScreen** — Lista com filtros por status/data e busca por cliente; permite alterar status, editar horário e notas. Web inclui criação de agendamento.
- **ProfessionalsScreen** — Web: grid de cards, modais de criação/edição e de agenda (disponibilidade semanal + bloqueios), reenvio de convite.
- **ClientsScreen** — Listagem com busca, painel de detalhe (dados, histórico, documentos, observações). Suporte a menores com dados do responsável. Upload de documentos.
- **SettingsScreen (3 abas)** — *Empresa* (cadastro com auto-preenchimento via ViaCEP), *Especialidades* e *Expediente* (horários por dia + bloqueios da empresa).

---

## Autenticação e Perfis de Usuário

### Tecnologia
- **Laravel Sanctum** — autenticação por token de API (Bearer).
- Token armazenado no **AsyncStorage** (chave `@auth_token`) + cache em memória; dados do usuário em `@auth_user`. Ver [`src/lib/auth.ts`](scheduling-app/src/lib/auth.ts).
- No login, tokens antigos do usuário são revogados (um token ativo por usuário).

### Resposta de Login
```json
{
  "token": "<plain-text-token>",
  "user_type": "company" | "professional",
  "company_id": "uuid-da-empresa"
}
```

`company_id` é resolvido no backend via `User::effectiveCompanyId()` (empresa: `user.id`; profissional: `user.company_id`).

### Estado no Frontend
`UserContext.tsx` mantém `userType`, `userId` e `companyId` em contexto global; `onAuthStateChange` notifica as telas após login/logout. O token é restaurado do AsyncStorage no boot do app.

---

## Fluxos Principais

### 1. Registro de Empresa
```
1. Frontend → POST /companies/register (com license_code)
2. Backend valida o código de licença (case-insensitive, não usado)
3. Cria user (user_type=company) + perfil company (id = user.id)
4. Marca a licença como usada
5. Envia e-mail de boas-vindas (fila)
6. Retorna token de acesso
```

### 2. Convite de Profissional
```
1. Empresa → POST /professionals
2. Cria user + perfil professional (status=pending, active=false)
3. Gera invite_token (validade 24h) e limpa registros deletados com mesmo e-mail/CPF
4. Envia e-mail com link: FRONTEND_URL?type=invite&token=XXX

--- Profissional clica no link ---

5. App detecta type=invite → exibe SetPasswordScreen
6. POST /auth/accept-invite (token + nova senha)
7. Backend define a senha, limpa o token e transiciona pending → active
8. Retorna token → profissional já entra autenticado
```

### 3. Agendamento
```
1. Empresa/Profissional → POST /appointments
2. Backend calcula ends_at = starts_at + duration_minutes
3. Denormaliza dados do cliente (de client_id ou dos campos enviados)
4. Se o cliente tem notificações ativas → envia e-mail de confirmação (fila)
5. Retorna o agendamento criado
```

### 4. Lembrete Automático (cron)
```
1. Cron (cPanel) → POST /companies/me/reminders/process
2. Para cada empresa com reminder_hours_before > 0:
   - busca agendamentos scheduled em [agora + N h, agora + N h + 1 h] com reminder_sent=false
   - marca reminder_sent=true (deduplicação)
   - envia e-mail de lembrete (fila)
```

### 5. Deleção de Profissional
```
1. Empresa → DELETE /professionals/{id} (bloqueado se houver agendamentos pendentes)
2. status=deleted, active=false
3. email → "deleted_{uuid}@placeholder.invalid", cpf → null (libera para reutilização)
4. Histórico de agendamentos preservado
```

---

## Emails Transacionais

Todos os e-mails implementam `ShouldQueue` e são enviados de forma assíncrona via fila `database`. Templates em `resources/views/emails/`. Datas formatadas em pt-BR (ex.: "segunda-feira, 15 de junho de 2026 às 14:30"), timezone `America/Sao_Paulo`.

| Mailable | Gatilho | Destinatário |
|----------|---------|--------------|
| `RegistrationConfirmationMail` | `POST /companies/register` | Empresa |
| `PasswordResetMail` | `POST /auth/forgot-password` | Empresa/Profissional |
| `ProfessionalInviteMail` | `POST /professionals` e `/resend-invite` | Profissional |
| `AppointmentNotificationMail` | `POST /appointments` | Cliente |
| `AppointmentReminderMail` | `POST /companies/me/reminders/process` | Cliente |

### Configuração SMTP (HostGator)
1. No cPanel, crie a conta de e-mail (ex.: `naoresponda@kallme.com.br`).
2. Configure `MAIL_*` no `.env` (host `mail.kallme.com.br`, porta 465, SSL).
3. Garanta que um worker de fila esteja processando (`php artisan queue:work`).

---

## Decisões Arquiteturais

### Migração FastAPI/Supabase → Laravel/MySQL
Para hospedagem na HostGator (que oferece PHP + MySQL via cPanel, sem suporte conveniente a Python/Supabase), o backend foi reescrito em Laravel 11 preservando contratos de API, regras de negócio e estrutura de dados. O app React Native permaneceu praticamente intocado.

### Perfis 1:1 com `users`
Empresa e profissional são perfis cujo `id` coincide com o `id` do usuário. Isso simplifica joins e garante uma identidade única por login. `user_type` e `company_id` ficam na tabela `users`, evitando queries extras para descobrir o papel do usuário.

### Autenticação por Token (Sanctum)
Tokens de API (não cookies de sessão) atendem bem um cliente Expo (web + mobile). Um token ativo por usuário; o login revoga os anteriores.

### Soft-Delete
Profissionais (`status=deleted`) e clientes (`active=false`) deletados preservam o histórico. E-mail e CPF de profissionais são limpos para permitir reutilização.

### Sistema de Licenças
Empresas só se cadastram com um código de licença válido e não utilizado — impede registros não autorizados sem expor a plataforma publicamente.

### Cálculo de Slots no Backend (`AvailabilityService`)
Horários disponíveis são calculados dinamicamente combinando: disponibilidade semanal, bloqueios one-time e recorrentes (do profissional e da empresa) e agendamentos existentes. `getMonthAvailability()` retorna o status de cada dia (`past`/`day_off`/`available`/`fully_booked`) em poucas queries para montar a grade do mês.

### Auto-conclusão de Agendamentos
Ao listar, agendamentos `scheduled`/`confirmed` cujo `ends_at` já passou são marcados como `completed` — sem necessidade de cron dedicado.

### Filas, Cache e Sessão em Banco
Como a HostGator não oferece Redis convenientemente, `QUEUE_CONNECTION`, `CACHE_STORE` e `SESSION_DRIVER` usam o driver `database`.

### Documentos em Filesystem Local
Arquivos de clientes são gravados em `storage/app` (não em storage de objetos). O acesso é feito por URL assinada com validade de 1 hora.

### Plataforma Web (`.web.tsx`)
O Metro bundler resolve `.web.tsx` para web. Telas com dependências exclusivas de web (FullCalendar, pickers) têm variantes separadas; arquivos `.tsx` sem sufixo são usados em iOS/Android.

### Responsividade Web via CSS Injection
Como `StyleSheet.create` não suporta `@media`, o hook `useResponsiveWeb` injeta uma tag `<style>` no `document.head` com regras que atuam sobre atributos `data-*` (gerados via prop `dataSet` do React Native Web) para adaptar layout em telas pequenas.
