# SistAgendamentos — Flor de Liz

Plataforma B2B de agendamentos profissionais. Empresas gerenciam profissionais, clientes e agendamentos; profissionais acessam sua agenda e disponibilidade.

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
| **Nome** | SistAgendamentos / Flor de Liz |
| **Tipo** | Plataforma B2B de agendamentos |
| **Usuários** | Empresas (gestores) e Profissionais |
| **Backend** | FastAPI + Supabase (PostgreSQL + Auth + Storage) |
| **Frontend** | React Native + Expo (web e mobile) |

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
                  │ HTTP (REST)
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                      │
│  SistAgendamentos/                                      │
│  ┌──────────┐ ┌─────────────┐ ┌───────┐ ┌──────────┐  │
│  │ routes.py│ │controllers.p│ │models │ │database.p│  │
│  │ (HTTP)   │ │ (negócio)   │ │(Pydant│ │(Supabase │  │
│  └──────────┘ └─────────────┘ └───────┘ └──────────┘  │
└─────────────────┬───────────────────────────────────────┘
                  │ supabase-py (REST / JWT)
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase                                               │
│  ┌──────────────┐ ┌─────────────┐ ┌─────────────────┐  │
│  │  PostgreSQL  │ │ Auth (JWT)  │ │ Storage (files) │  │
│  └──────────────┘ └─────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Camadas do Backend

| Arquivo | Responsabilidade |
|---------|-----------------|
| `main.py` | Entry point FastAPI, CORS, registro de routers |
| `app/routes.py` | Definição dos endpoints HTTP (validação de entrada via Pydantic) |
| `app/controllers.py` | Lógica de negócio, queries ao Supabase |
| `app/models.py` | Schemas Pydantic (request/response) |
| `app/database.py` | Clientes Supabase, validação JWT via JWKS |
| `app/email.py` | Serviço de e-mail transacional (SMTP / Gmail) |

---

## Stack Tecnológico

### Backend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Python | 3.x | Linguagem |
| FastAPI | 0.135+ | Framework HTTP |
| Uvicorn | — | Servidor ASGI |
| Supabase-py | — | Client PostgreSQL + Auth |
| Pydantic | v2 | Validação de dados |
| fastapi-mail | — | Envio de e-mails |
| PyJWT | — | Validação de tokens JWT |
| python-dotenv | — | Variáveis de ambiente |

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React Native | 0.83.2 | Framework mobile |
| Expo | 55.x | Build e dev tools |
| TypeScript | 5.9.x | Linguagem |
| React Navigation | 7.x | Navegação |
| NativeWind / Tailwind | 4.x | Estilos |
| FullCalendar | 6.1.x | Calendário (web) |
| Supabase JS | 2.98+ | Client auth/db |
| AsyncStorage | 2.x | Persistência local |

### Cloud / Infraestrutura
| Serviço | Uso |
|---------|-----|
| Supabase | PostgreSQL, Auth (JWT), Storage |
| Gmail SMTP | E-mails transacionais |

---

## Estrutura de Pastas

```
SistAgendamentos-docs/
├── SistAgendamentos/                # Backend Python/FastAPI
│   ├── main.py                      # Entry point
│   ├── requirements.txt             # Dependências Python
│   ├── .env                         # Variáveis de ambiente (não versionar)
│   └── app/
│       ├── __init__.py
│       ├── models.py                # Schemas Pydantic
│       ├── database.py              # Clientes Supabase + auth JWT
│       ├── routes.py                # Definição de endpoints HTTP
│       ├── controllers.py           # Lógica de negócio
│       └── email.py                 # Templates e envio de e-mails
│
└── scheduling-app/                  # Frontend React Native / Expo
    ├── package.json
    ├── app.json                     # Config Expo
    └── src/
        ├── lib/
        │   ├── config.ts            # API_URL
        │   ├── supabase.ts          # Client Supabase + cache de token
        │   ├── UserContext.tsx      # Context de autenticação global
        │   ├── appointmentUtils.ts  # Utilitários de agendamento
        │   ├── scheduleConstants.ts # Constantes de agenda
        │   ├── masks.ts             # Máscaras de input (CPF, telefone)
        │   ├── avatar.ts            # Geração de avatares
        │   └── useResponsiveWeb.ts  # Hook de responsividade web (CSS injection)
        ├── hooks/
        │   ├── useConfirm.tsx       # Dialog de confirmação
        │   ├── useBookingModal.ts   # Estado do modal de agendamento
        │   └── useAppointmentDetailModal.ts
        ├── navigation/
        │   ├── index.tsx            # Roteador raiz (auth → app)
        │   ├── CompanyNavigator.tsx # Drawer da empresa (5 telas)
        │   ├── ProfessionalNavigator.tsx  # Drawer do profissional (4 telas)
        │   ├── Sidebar.tsx          # Componente de menu lateral
        │   └── Sidebar.styles.ts
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

### Tabelas

#### `company`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | Gerado pelo Supabase Auth |
| `name` | text | Nome da empresa |
| `cnpj` | text | CNPJ (só dígitos) |
| `phone` | text | Telefone |
| `contact_email` | text | E-mail de contato |
| `cep` | text | CEP |
| `street` | text | Logradouro |
| `address_number` | text | Número |
| `complement` | text | Complemento |
| `neighborhood` | text | Bairro |
| `city` | text | Cidade |
| `state` | text | Estado |
| `active` | boolean | Conta ativa |
| `reminder_hours_before` | int | Horas de antecedência do lembrete |
| `created_at` | timestamptz | |

#### `professional`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | FK → `auth.users(id)` |
| `company_id` | UUID FK | Empresa proprietária |
| `name` | text | Nome completo |
| `email` | text unique | E-mail de login |
| `cpf` | text unique | CPF (só dígitos) |
| `phone` | text | Telefone |
| `photo_url` | text | URL da foto |
| `color` | text | Cor no calendário (`#RRGGBB`) |
| `active` | boolean | Profissional ativo |
| `status` | text | `pending` / `active` / `inactive` / `deleted` |
| `default_duration_minutes` | int | Duração padrão de atendimento |
| `created_at` | timestamptz | |

#### `specialty`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | text PK | |
| `company_id` | UUID FK | |
| `name` | text | Nome da especialidade |
| `info` | text | Descrição adicional |
| `created_at` | timestamptz | |

#### `professional_specialty`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `professional_id` | UUID FK | |
| `specialty_id` | text FK | |

#### `service`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `name` | text | Nome do serviço |
| `description` | text | Descrição |
| `duration_minutes` | int | Duração |
| `price` | numeric | Preço |
| `active` | boolean | |
| `created_at` | timestamptz | |

#### `availability`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `professional_id` | UUID FK | |
| `day_of_week` | int | 0=Segunda … 6=Domingo |
| `start_time` | time | Início do expediente |
| `end_time` | time | Fim do expediente |
| `active` | boolean | |

#### `company_availability`
Mesma estrutura de `availability`, porém com `company_id` no lugar de `professional_id`. Define o horário de funcionamento da empresa.

#### `time_block`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `professional_id` | UUID FK | |
| `is_recurring` | boolean | Bloqueio recorrente diário |
| `starts_at` | timestamptz | Início (one-time) |
| `ends_at` | timestamptz | Fim (one-time) |
| `recurring_start_time` | time | Início (recorrente) |
| `recurring_end_time` | time | Fim (recorrente) |
| `reason` | text | Motivo |
| `created_at` | timestamptz | |

#### `company_time_block`
Mesma estrutura de `time_block`, mas com `company_id`. Define períodos de fechamento da empresa.

#### `appointment`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `professional_id` | UUID FK | |
| `service_id` | UUID FK? | Serviço (opcional) |
| `client_id` | UUID FK? | Cliente cadastrado (opcional) |
| `client_name` | text | Nome do cliente |
| `client_email` | text | E-mail do cliente |
| `client_phone` | text | Telefone do cliente |
| `client_cpf` | text | CPF do cliente |
| `starts_at` | timestamptz | Início |
| `ends_at` | timestamptz | Fim (calculado) |
| `status` | text | `scheduled` / `confirmed` / `completed` / `cancelled` / `no_show` |
| `notes` | text | Observações |
| `created_at` | timestamptz | |

#### `client`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `company_id` | UUID FK | |
| `name` | text | Nome |
| `birth_date` | date | Data de nascimento |
| `is_minor` | boolean | Menor de idade |
| `cpf` | text | CPF |
| `cep` / `street` / ... | text | Endereço |
| `phone` | text | Telefone |
| `phone_is_whatsapp` | boolean | |
| `email` | text | E-mail |
| `guardian_*` | text | Dados do responsável (menores) |
| `notifications_enabled` | boolean | Notificações ativas |
| `notification_channel` | text | `email` / `whatsapp` |
| `is_provisional` | boolean | Cliente provisório (criado no agendamento) |
| `active` | boolean | |
| `created_at` | timestamptz | |

#### `client_document`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `client_id` | UUID FK | |
| `company_id` | UUID FK | |
| `file_name` | text | Nome original |
| `file_type` | text | MIME type |
| `storage_path` | text | Caminho no bucket Supabase Storage |
| `file_size_bytes` | int | |
| `created_at` | timestamptz | |

#### `client_observation`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `client_id` | UUID FK | |
| `company_id` | UUID FK | |
| `content` | text | Texto da observação |
| `source` | text | `manual` / `appointment` |
| `source_label` | text | Nome do profissional (quando `source=appointment`) |
| `created_at` | timestamptz | |

#### `license`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | |
| `code` | text unique | Código de licença |
| `used` | boolean | Se já foi utilizado |
| `used_by` | UUID | ID da empresa que utilizou |
| `used_at` | timestamptz | |

### Storage
| Bucket | Uso |
|--------|-----|
| `client-documents` | Documentos e arquivos dos clientes |

---

## Configuração do Ambiente

### Backend — `.env`

Criar o arquivo `SistAgendamentos/.env`:

```env
# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret>

# E-mail (Gmail)
MAIL_USERNAME=<seu-email>@gmail.com
MAIL_PASSWORD=<app-password-gmail>
MAIL_FROM=<seu-email>@gmail.com
MAIL_FROM_NAME=Flor de Liz
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com

# Frontend
FRONTEND_URL=http://localhost:8081
```

> **Gmail App Password:** Acesse `myaccount.google.com → Segurança → Senhas de app` para gerar uma senha exclusiva para o aplicativo.

### Frontend — `src/lib/config.ts`

```ts
export const API_URL = 'http://localhost:8000';
```

Alterar para a URL de produção quando deployar o backend.

---

## Rodando o Projeto

### Backend

```bash
cd SistAgendamentos

# Criar e ativar ambiente virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Instalar dependências
pip install -r requirements.txt

# Rodar em desenvolvimento (hot-reload)
uvicorn main:app --reload

# Rodar em produção
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

A API estará disponível em `http://localhost:8000`.
Documentação interativa: `http://localhost:8000/docs`

### Frontend

```bash
cd scheduling-app

# Instalar dependências
npm install

# Rodar (web)
npx expo start --web

# Rodar (mobile - Android com emulador/dispositivo)
npx expo run:android

# Rodar (mobile - iOS, apenas macOS)
npx expo run:ios
```

O app web estará disponível em `http://localhost:8081`.

> **Expo Go e SDK 55:** O Expo Go público não é compatível com Expo SDK 55. Para testar em dispositivo físico, use `expo run:android` / `expo run:ios` (gera um build de desenvolvimento) ou use o browser com `--web` e as DevTools do navegador para simular telas mobile.

---

## API — Referência Completa

Todas as rotas autenticadas exigem o header:
```
Authorization: Bearer <supabase-access-token>
```

---

### Health Check

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | ❌ | Verifica se a API está online |

**Resposta:** `{ "status": "ok" }`

---

### Autenticação — `/auth`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/forgot-password` | ❌ | Gera link de recuperação e envia e-mail customizado |

#### `POST /auth/forgot-password`

```json
{ "email": "contato@empresa.com" }
```

**Fluxo interno:**
1. Gera link de recuperação via `supabase_admin.auth.admin.generate_link(type=recovery)`
2. Envia e-mail HTML customizado com o link (fastapi-mail)
3. Sempre retorna `204 No Content`, mesmo que o e-mail não exista (evita enumeração)

> O link redireciona para `FRONTEND_URL` (variável de ambiente, padrão `http://localhost:8081`), onde o app detecta `type=recovery` na URL e exibe a `SetPasswordScreen`.

---

### Empresas — `/companies`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/companies/register` | ❌ | Registra nova empresa |
| GET | `/companies/me` | ✅ Empresa | Perfil da empresa autenticada |
| PATCH | `/companies/me` | ✅ Empresa | Atualiza dados da empresa |
| GET | `/companies/me/availability` | ✅ Empresa | Lista horários de funcionamento |
| PUT | `/companies/me/availability` | ✅ Empresa | Substitui todos os horários de funcionamento |
| GET | `/companies/me/time-blocks` | ✅ Empresa | Lista períodos de fechamento |
| POST | `/companies/me/time-blocks` | ✅ Empresa | Cria período de fechamento |
| DELETE | `/companies/me/time-blocks/{block_id}` | ✅ Empresa | Remove período de fechamento |
| POST | `/companies/me/reminders/process` | ✅ Empresa | Processa e envia lembretes pendentes (cron) |

#### `POST /companies/register`

```json
{
  "name": "Flor de Liz",
  "cnpj": "12345678000190",
  "phone": "(67) 99999-9999",
  "email": "contato@flordeliz.com",
  "password": "senha123",
  "license_code": "ABC-XYZ-123"
}
```

**Fluxo interno:**
1. Valida o código de licença (deve existir e não ter sido usado)
2. Cria usuário no Supabase Auth com `user_type=company`
3. Insere perfil na tabela `company`
4. Marca a licença como usada
5. Envia e-mail de boas-vindas

#### `PUT /companies/me/availability`

```json
{
  "slots": [
    { "day_of_week": 0, "start_time": "08:00", "end_time": "18:00" },
    { "day_of_week": 1, "start_time": "08:00", "end_time": "18:00" }
  ]
}
```

Substitui todos os slots da empresa (0=Segunda … 6=Domingo).

---

### Profissionais — `/professionals`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/professionals/` | ✅ Empresa | Cria profissional e envia convite |
| GET | `/professionals/` | ✅ Empresa | Lista profissionais da empresa |
| GET | `/professionals/all-time-blocks` | ✅ Empresa | Lista bloqueios de todos os profissionais |
| GET | `/professionals/{id}` | ✅ | Busca profissional por ID |
| PATCH | `/professionals/{id}` | ✅ Empresa | Atualiza dados do profissional |
| DELETE | `/professionals/{id}` | ✅ Empresa | Exclui profissional (soft-delete) |
| POST | `/professionals/{id}/resend-invite` | ✅ Empresa | Reenvia e-mail de convite |
| POST | `/professionals/me/activate` | ✅ Profissional | Ativa própria conta após definir senha |
| GET | `/professionals/me/availability` | ✅ Profissional | Busca própria disponibilidade |
| PUT | `/professionals/me/availability` | ✅ Profissional | Salva própria disponibilidade |
| GET | `/professionals/me/time-blocks` | ✅ Profissional | Lista próprios bloqueios |
| POST | `/professionals/me/time-blocks` | ✅ Profissional | Cria próprio bloqueio |
| DELETE | `/professionals/me/time-blocks/{block_id}` | ✅ Profissional | Remove próprio bloqueio |
| GET | `/professionals/{id}/availability` | ✅ Empresa | Disponibilidade de um profissional |
| PUT | `/professionals/{id}/availability` | ✅ Empresa | Salva disponibilidade de um profissional |
| GET | `/professionals/{id}/available-slots` | ✅ | Horários disponíveis em uma data |
| GET | `/professionals/{id}/month-availability` | ✅ | Disponibilidade por dia no mês |

#### `POST /professionals/`

```json
{
  "name": "Ana Lima",
  "email": "ana@flordeliz.com",
  "cpf": "123.456.789-00",
  "phone": "(67) 98888-8888",
  "specialty_ids": ["esp-uuid-1"],
  "color": "#8e7f7e",
  "default_duration_minutes": 60
}
```

**Fluxo interno:**
1. `generate_link(type=invite)` → cria usuário Auth e gera link de convite
2. `update_user_by_id` → garante `user_type=professional` e `company_id` no metadata
3. Limpa registros deletados com o mesmo e-mail/CPF (reutilização)
4. Insere perfil com `active=false, status=pending`
5. Envia e-mail de convite com link para definição de senha

#### `PATCH /professionals/{id}`

```json
{
  "name": "Ana Lima",
  "phone": "(67) 97777-7777",
  "active": true,
  "color": "#c4a882",
  "default_duration_minutes": 45
}
```

> Profissionais com `status=pending` não têm o campo `active` alterado via PATCH. Use o botão "Ativar conta" no frontend para ativar manualmente.

#### `DELETE /professionals/{id}`

Soft-delete: `status=deleted`, `active=false`.
Libera o e-mail e CPF para reutilização (limpa os campos na tabela e substitui o e-mail no Auth).

#### `GET /professionals/{id}/available-slots?date=YYYY-MM-DD`

Retorna horários disponíveis para agendamento considerando:
- Disponibilidade semanal configurada
- Bloqueios (one-time e recorrentes)
- Agendamentos existentes

**Resposta:** `["08:00", "08:30", "09:00", ...]`

#### `GET /professionals/{id}/month-availability?year=YYYY&month=MM`

**Resposta:** `{ "2025-03-01": true, "2025-03-02": false, ... }`

---

### Agendamentos — `/appointments`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/appointments/` | ✅ | Lista agendamentos (com filtros) |
| POST | `/appointments/` | ✅ | Cria agendamento |
| PATCH | `/appointments/{id}` | ✅ | Atualiza status/horário/notas |
| DELETE | `/appointments/{id}/notes` | ✅ | Limpa notas do agendamento |

#### `GET /appointments/?date_from=...&date_to=...&status=...`

Parâmetros opcionais:
- `date_from` — data inicial (YYYY-MM-DD)
- `date_to` — data final (YYYY-MM-DD)
- `status` — filtro por status

Profissionais só recebem seus próprios agendamentos. Empresas recebem todos.

#### `POST /appointments/`

```json
{
  "professional_id": "uuid",
  "client_name": "Maria Silva",
  "client_email": "maria@email.com",
  "client_phone": "(67) 99999-0000",
  "starts_at": "2025-03-20T10:00:00",
  "duration_minutes": 60,
  "notes": "Primeira consulta"
}
```

`ends_at` é calculado automaticamente.
Se o cliente tiver e-mail, um e-mail de confirmação é enviado automaticamente.

#### `PATCH /appointments/{id}`

```json
{
  "status": "confirmed",
  "starts_at": "2025-03-20T11:00:00",
  "duration_minutes": 45,
  "notes": "Reagendado a pedido do cliente"
}
```

**Ciclo de vida do status:**
```
scheduled → confirmed → completed
                      → no_show
any       → cancelled
```

---

### Clientes — `/clients`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/clients/?search=...` | ✅ | Lista clientes (busca por nome/CPF/telefone) |
| POST | `/clients/` | ✅ | Cria cliente |
| PATCH | `/clients/{id}` | ✅ | Atualiza cliente |
| DELETE | `/clients/{id}` | ✅ | Desativa cliente (soft-delete) |
| GET | `/clients/{id}/appointments` | ✅ | Histórico de agendamentos |
| GET | `/clients/{id}/documents` | ✅ | Lista documentos |
| POST | `/clients/{id}/documents/upload` | ✅ | Faz upload de documento |
| GET | `/clients/{id}/documents/{doc_id}/url` | ✅ | Gera URL assinada para download |
| DELETE | `/clients/{id}/documents/{doc_id}` | ✅ | Remove documento |
| GET | `/clients/{id}/observations` | ✅ | Lista observações/histórico |
| POST | `/clients/{id}/observations` | ✅ | Adiciona observação manual |
| PATCH | `/clients/{id}/observations/{obs_id}` | ✅ | Edita observação |
| DELETE | `/clients/{id}/observations/{obs_id}` | ✅ | Remove observação |

---

### Especialidades — `/specialties`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/specialties/` | ✅ Empresa | Lista especialidades da empresa |
| POST | `/specialties/` | ✅ Empresa | Cria especialidade |
| DELETE | `/specialties/{id}` | ✅ Empresa | Remove especialidade |

---

## Frontend — Telas e Navegação

### Fluxo de Navegação

```
App inicia
│
├── URL tem type=invite ou type=recovery?
│   └── SetPasswordScreen (definir/redefinir senha)
│
├── Usuário autenticado?
│   ├── user_type = 'company'   → CompanyNavigator
│   └── user_type = 'professional' → ProfessionalNavigator
│
└── Não autenticado → LoginScreen
```

### CompanyNavigator (Empresa)

| Tela | Arquivos | Descrição |
|------|----------|-----------|
| Calendário | `HomeScreen.tsx` / `.web.tsx` | Calendário FullCalendar (web) ou lista (mobile) com agendamentos |
| Agendamentos | `AppointmentsScreen.tsx` / `.web.tsx` | Lista e gestão de agendamentos com filtros |
| Profissionais | `ProfessionalsScreen.tsx` / `.web.tsx` | Cadastro, edição, convite e gestão de profissionais |
| Clientes | `ClientsScreen.tsx` / `.web.tsx` | Cadastro, histórico, documentos e observações de clientes |
| Configurações | `SettingsScreen.tsx` / `.web.tsx` | Empresa, especialidades e expediente (3 abas) |

### ProfessionalNavigator (Profissional)

| Tela | Rota | Descrição |
|------|------|-----------|
| Calendário | `Calendário` | Calendário pessoal |
| Agendamentos | `Agendamentos` | Seus agendamentos |
| Clientes | `Clientes` | Clientes atendidos |
| Meu Perfil | `Meu Perfil` | Dados pessoais e disponibilidade |

### Telas de Autenticação

| Tela | Descrição |
|------|-----------|
| `LoginScreen` | Formulário de e-mail e senha |
| `SetPasswordScreen` | Criação de senha via link de convite ou recuperação |

### Detalhe das Telas (Empresa)

#### HomeScreen
- **Web:** Calendário FullCalendar (mês/semana/dia), eventos coloridos por profissional, modal de detalhe ao clicar no evento, modal de novo agendamento ao clicar no dia.
- **Mobile:** Lista dos agendamentos do dia com navegação por data.

#### AppointmentsScreen
- **Web e Mobile:** Lista de agendamentos com filtros por status, profissional e data. Permite alterar status, editar horário e ver/editar notas.

#### ProfessionalsScreen
- **Web:** Grid de cards por profissional, modal de criação/edição, modal de agenda (disponibilidade semanal + bloqueios), reenvio de convite.
- **Mobile:** Lista de profissionais com ações equivalentes via telas dedicadas.

#### ClientsScreen
- **Web e Mobile:** Listagem com busca, painel lateral de detalhe (dados, histórico de agendamentos, documentos, observações). Suporte a menores de idade com dados de responsável. Upload de documentos via Supabase Storage.

#### SettingsScreen (3 abas)
- **Empresa:** Dados cadastrais com auto-preenchimento de endereço via ViaCEP.
- **Especialidades:** Listagem e criação de especialidades vinculadas à empresa.
- **Expediente:** Configuração de horários de atendimento por dia da semana e bloqueios de agenda da empresa.

---

## Autenticação e Perfis de Usuário

### Tecnologia
- **Supabase Auth** com JWT (RS256/ES256)
- Token armazenado via `AsyncStorage` (mobile) / `localStorage` (web)
- `detectSessionInUrl: false` — tokens de convite são processados manualmente

### Metadados do JWT
```json
{
  "user_type": "company" | "professional",
  "company_id": "uuid-da-empresa"
}
```

### Dois Clientes Supabase

| Cliente | Chave | Uso |
|---------|-------|-----|
| `supabase` | `anon` | Respeita Row Level Security |
| `supabase_admin` | `service_role` | Bypassa RLS (operações administrativas) |

### Gerenciamento de Token no Frontend

O `UserContext.tsx` mantém um cache em memória (`_currentToken`) atualizado diretamente via `onAuthStateChange`, evitando race conditions com AsyncStorage após login/logout.

```
supabase.auth.onAuthStateChange
    └── setCurrentToken(token)   ← módulo supabase.ts
    └── setCtx({ userType, userId, companyId })  ← UserContext.tsx
```

---

## Fluxos Principais

### 1. Registro de Empresa

```
1. Frontend → POST /companies/register
2. Backend valida código de licença
3. Supabase Auth: cria usuário com user_type=company
4. Insere registro em company
5. Marca licença como usada
6. Envia e-mail de boas-vindas
7. Retorna token de acesso
```

### 2. Convite de Profissional

```
1. Empresa → POST /professionals/
2. Supabase Auth: generate_link(type=invite) → cria usuário + gera link
3. update_user_by_id → garante user_type=professional no JWT
4. Limpa registros deletados com mesmo e-mail/CPF
5. Insere profissional com status=pending, active=false
6. Envia e-mail com link de convite

--- Profissional clica no link ---

7. App detecta type=invite na URL → exibe SetPasswordScreen
8. SetPasswordScreen troca token de convite por sessão (setSession)
9. Profissional define senha → supabase.auth.updateUser({ password })
10. refreshSession() → obtém token fresco
11. POST /professionals/me/activate → status=active, active=true
12. signOut() → profissional redirigido para LoginScreen
```

### 3. Agendamento

```
1. Empresa/Profissional → POST /appointments/
2. Backend cria registro com ends_at calculado
3. Se client_email informado → envia e-mail de confirmação (background)
4. Retorna agendamento completo
```

### 4. Lembrete Automático

```
1. Cron job → POST /companies/me/reminders/process
2. Backend busca agendamentos cujo starts_at está dentro do intervalo:
   agora ≤ starts_at ≤ agora + reminder_hours_before
3. Para cada agendamento com client_email, envia e-mail de lembrete
```

### 5. Deleção de Profissional

```
1. Empresa → DELETE /professionals/{id}
2. professional: status=deleted, active=false, email=placeholder, cpf=null
3. Auth user: email substituído por placeholder (libera e-mail para reutilização)
4. Histórico de agendamentos preservado (linha mantida no banco)
```

---

## Emails Transacionais

Todos os e-mails são enviados como `BackgroundTask` do FastAPI (não bloqueiam a resposta HTTP).

| E-mail | Função | Gatilho | Destinatário |
|--------|--------|---------|--------------|
| Boas-vindas | `send_registration_confirmation` | `POST /companies/register` | Empresa |
| Recuperação de senha | `send_password_reset` | `POST /auth/forgot-password` | Empresa/Profissional |
| Convite de profissional | `send_professional_invite` | `POST /professionals/` e `/resend-invite` | Profissional |
| Confirmação de agendamento | `send_appointment_notification` | `POST /appointments/` | Cliente |
| Lembrete de agendamento | `send_appointment_reminder` | `POST /companies/me/reminders/process` | Cliente |

### Identidade do Remetente

- **Boas-vindas** e **Recuperação de senha**: remetente exibido como "Sistema de Agendamentos"
- **Convite**, **Confirmação** e **Lembrete**: remetente exibido com o nome da empresa (`company_name` passado dinamicamente)

### Configuração SMTP

Utiliza Gmail com App Password. Para configurar:
1. Acesse `myaccount.google.com → Segurança → Verificação em duas etapas` (deve estar ativo)
2. Acesse `myaccount.google.com → Segurança → Senhas de app`
3. Crie uma senha para o aplicativo
4. Use essa senha no campo `MAIL_PASSWORD` do `.env`

---

## Decisões Arquiteturais

### Soft-Delete
Profissionais e clientes deletados têm `status=deleted` / `active=false`. Registros históricos (agendamentos, observações) são preservados. E-mail e CPF são limpos para permitir reutilização.

### Sistema de Licenças
Empresas só podem se cadastrar com um código de licença válido e não utilizado. Impede registros não autorizados sem expor a plataforma publicamente.

### Metadados no JWT
`user_type` e `company_id` ficam no JWT, eliminando uma query ao banco a cada requisição para saber o tipo de usuário e sua empresa.

### Cache de Token em Memória
O frontend mantém o access token em uma variável de módulo (`_currentToken`), atualizada pelo `onAuthStateChange`. Isso evita race conditions com o AsyncStorage após logout/relogin em SPAs.

### Dois Níveis de Acesso Supabase
- **anon key** + RLS: garante que usuários só acessem dados da própria empresa
- **service_role key**: usado pelo backend para operações administrativas que precisam contornar RLS (criação de usuários, gestão de licenças)

### Cálculo de Slots Disponíveis
Os horários disponíveis são calculados dinamicamente no backend combinando:
1. Disponibilidade semanal do profissional
2. Bloqueios one-time (férias, consultas)
3. Bloqueios recorrentes (horário reservado diariamente)
4. Agendamentos já existentes no dia

### Retry em Conexões Supabase
Queries críticas (especialmente `appointments`) usam loop de retry com `time.sleep(0.4)` para tolerar erros transientes de conexão via Cloudflare/PostgREST.

### E-mail de Recuperação de Senha Customizado
O Supabase envia por padrão um e-mail genérico de recuperação. O projeto substitui esse fluxo: o frontend chama `POST /auth/forgot-password`, o backend gera o link via `supabase_admin` e envia um e-mail HTML próprio via fastapi-mail. O e-mail do Supabase para recuperação de senha deve estar desativado no painel Supabase (Auth → Email Templates).

### `sceneStyle` no Drawer Navigator
O React Navigation v7 usa `sceneStyle` (não `sceneContainerStyle`) para estilizar o container de cena no `DrawerNavigator`. Usar `sceneContainerStyle` gera erro de TypeScript.

### Plataforma Web (.web.tsx)
O Metro bundler resolve automaticamente arquivos `.web.tsx` para a plataforma web. Telas com comportamento ou dependências exclusivas de web (FullCalendar, pickers nativos) têm variantes separadas. Arquivos `.tsx` sem o sufixo são usados em iOS/Android.

### Responsividade Web em Mobile
A versão web é acessível em navegadores mobile. A adaptação de layout é feita via **CSS injection**: o hook `useResponsiveWeb` (em `src/lib/useResponsiveWeb.ts`) injeta uma tag `<style>` no `document.head` com regras `@media (max-width: 640px)` que atuam sobre atributos `data-*` nos elementos. Os componentes marcam elementos-chave com `dataSet` (prop do React Native Web que gera atributos `data-*` no HTML):

| `dataSet` | Elemento | Efeito em mobile |
|-----------|----------|-----------------|
| `modal: 'true'` | Modais | Largura 92%, padding reduzido |
| `twoCol: 'true'` | Layouts 2 colunas | Empilha em coluna única |
| `proGrid: 'true'` | Grid de profissionais | Empilha em coluna única |
| `proCard: 'true'` | Card de profissional | Largura 100% |
| `topTitle: 'true'` | Título da home | Fonte menor (22px) |
| `calWrapper: 'true'` | Wrapper do calendário | Padding reduzido |
| `calCard: 'true'` | Card do calendário | Padding reduzido |
| `filterRow: 'true'` | Linha de filtros | Quebra de linha (flex-wrap) |
| `contentPad: 'true'` | Áreas de conteúdo | Padding lateral 16px |

> Esta abordagem é necessária pois `StyleSheet.create` do React Native não suporta `@media` queries nativamente; a injeção direta de CSS é a solução compatível com React Native Web.