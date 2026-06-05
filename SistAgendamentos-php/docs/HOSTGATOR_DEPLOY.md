# Deploy na HostGator — Plano M

Guia passo-a-passo para subir o backend Laravel no Plano M da HostGator
com subdomínio api.kallme.com.br.

---

## ⚡ Estrutura atual no servidor (atualizado 2026-06)

> Esta seção reflete como o ambiente **realmente está hoje**. As seções a partir
> de "Pré-requisitos" são o guia de primeira instalação (referência histórica).

**Layout no servidor (usuário cPanel `mairam62`):**

```
/home4/mairam62/sist-clean/                  ← clone do monorepo (o .git fica AQUI)
├── .git/
├── SistAgendamentos-php/                     ← app Laravel
│   ├── public/                               ← DOCUMENT ROOT do subdomínio
│   ├── .env                                  ← config de produção (não versionado)
│   └── vendor/
├── scheduling-app/   (não servido)
└── SistAgendamentos/ (Python legado, não servido)
```

- **Document Root** de `api.kallme.com.br` → `/home4/mairam62/sist-clean/SistAgendamentos-php/public`
- **Fonte da verdade** = o clone em `~/sist-clean`. Nada é copiado pra fora dele.
- O antigo `~/api.kallme.com.br` (app duplicado na raiz + `.git` quebrado) foi removido.

## 🚀 Deploy (fluxo atual)

Endpoint protegido por segredo: `POST /api/deploy` (roda `git pull` +
`php artisan optimize:clear`). Variáveis no `.env`:

```env
DEPLOY_SECRET=<segredo longo e aleatório>      # gere com: openssl rand -hex 32
DEPLOY_BRANCH=master
DEPLOY_REPO_PATH=/home4/mairam62/sist-clean    # raiz do .git (monorepo)
```

### Forma recomendada: `deploy.sh`

Na **raiz do repositório** há um `deploy.sh` que faz `git push` + aciona o
endpoint. Configuração local (uma vez só):

```bash
cp deploy.config.example deploy.config
# edite deploy.config e preencha DEPLOY_SECRET (mesmo valor do .env do servidor)
```

O dia a dia passa a ser:

```bash
git commit -am "minha mudança"
bash deploy.sh
```

> `deploy.config` é **gitignored** (nunca versiona o segredo); `deploy.sh` e
> `deploy.config.example` são versionados.

### Mecanismo por baixo (disparo manual)

```bash
curl -s -X POST https://api.kallme.com.br/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"secret":"SEU_SECRET"}'
```

Esperado: `{"ok":true,"log":[...]}`.

> ⚠️ **ModSecurity:** o WAF da HostGator fica **ligado**. O formato acima passa.
> **NÃO** use `-A "Mozilla/5.0"` nem `Accept: application/json` — esse formato é
> bloqueado com "Not Acceptable / Mod_Security". Mande o segredo no **corpo JSON**
> com o User-Agent padrão do curl.

**Deploy automático (opcional):** webhook do GitHub (repositório → Settings →
Webhooks) com Payload URL `https://api.kallme.com.br/api/deploy?secret=SEU_SECRET`,
content type `application/json`, evento apenas `push`.

### Autenticação do git (push)

O remote usa **HTTPS sem token embutido**; o `push` autentica pelo **Git
Credential Manager** (login no navegador na primeira vez). **Não** coloque
tokens (`ghp_…`) na URL do remote — eles vazam no `.git/config` e em logs.

**Fluxo de trabalho:** editar → `bash deploy.sh` (push + deploy) → no ar.

---

## Pré-requisitos

- Domínio `kallme.com.br` apontando para a HostGator (DNS configurado)
- Acesso ao cPanel da HostGator
- Projeto testado localmente (Fases 1-6 validadas)

---

## 1. Criar subdomínio no cPanel

1. cPanel → **Subdomínios**
2. Subdomínio: `api`
3. Domínio: `kallme.com.br`
4. Raiz do documento: `/home/CPANELUSER/api.kallme.com.br`
5. Clicar em **Criar**

> **Importante:** NÃO apontar para `public/`. O `.htaccess` na raiz já redireciona.

---

## 2. Criar banco MySQL

1. cPanel → **Bancos de Dados MySQL**
2. Criar banco: `sistagendamentos`
   (cPanel prefixa: ficará `CPANELUSER_sistagendamentos`)
3. Criar usuário: `sistadmin` com senha forte
   (ficará `CPANELUSER_sistadmin`)
4. **Adicionar usuário ao banco** com TODOS os privilégios

---

## 3. Criar email para SMTP

1. cPanel → **Contas de E-mail**
2. Criar: `naoresponda@kallme.com.br` com senha forte
3. Anotar a senha (usada no `.env`)

---

## 4. Subir os arquivos

### Opção A: Via Git (recomendado)

Se o cPanel tem **Git Version Control**:

1. cPanel → **Git Version Control** → **Criar**
2. URL do repositório: `https://github.com/SEU_USER/SistAgendamentos-docs.git`
3. Caminho: `/home/CPANELUSER/api.kallme.com.br`
4. Após clonar, acessar via **Terminal SSH** (se disponível) ou usar deploy hook

### Opção B: Via FTP

1. Conectar via FileZilla ou similar:
   - Host: `ftp.kallme.com.br`
   - Usuário/senha: do cPanel
   - Porta: 21
2. Navegar até `/home/CPANELUSER/api.kallme.com.br/`
3. Subir **TODOS** os arquivos do `SistAgendamentos-php/` **incluindo `vendor/`**
   (a HostGator compartilhada nem sempre tem Composer via SSH)

### Opção C: Via SSH + Git (melhor se SSH disponível)

```bash
# Solicitar SSH no cPanel ou suporte HostGator (Plano M geralmente tem)
ssh CPANELUSER@kallme.com.br

cd /home/CPANELUSER/api.kallme.com.br
git clone https://github.com/SEU_USER/SistAgendamentos-docs.git .
# ou se o repo tem subpasta:
# copiar apenas SistAgendamentos-php/ para a raiz

composer install --no-dev --optimize-autoloader
```

---

## 5. Configurar .env de produção

```bash
# Via SSH:
cd /home/CPANELUSER/api.kallme.com.br
cp .env.production .env
php artisan key:generate
```

Editar `.env` e preencher:
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` (do passo 2)
- `MAIL_PASSWORD` (do passo 3)

Se não tiver SSH, editar via **cPanel → Gerenciador de Arquivos**:
1. Navegar até `/home/CPANELUSER/api.kallme.com.br/`
2. Copiar `.env.production` → `.env`
3. Editar `.env` preenchendo as senhas

---

## 6. Rodar migrations

### Com SSH:
```bash
cd /home/CPANELUSER/api.kallme.com.br
php artisan migrate --force
php artisan db:seed --class=LicenseSeeder --force
```

### Sem SSH (via phpMyAdmin):
1. cPanel → **phpMyAdmin**
2. Selecionar o banco `CPANELUSER_sistagendamentos`
3. Aba **Importar** → selecionar `database/sql/initial_schema.sql`
4. Clicar em **Executar**
5. Para licenças, rodar na aba SQL:
```sql
INSERT INTO licenses (id, code, used, created_at, updated_at) VALUES
(UUID(), 'PROD-001', 0, NOW(), NOW()),
(UUID(), 'PROD-002', 0, NOW(), NOW()),
(UUID(), 'PROD-003', 0, NOW(), NOW());
```

---

## 7. Configurar permissões de pastas

### Via SSH:
```bash
cd /home/CPANELUSER/api.kallme.com.br
chmod -R 775 storage bootstrap/cache
```

### Via cPanel:
1. Gerenciador de Arquivos → `api.kallme.com.br/storage/`
2. Selecionar a pasta → Permissões → `775` (recursivo)
3. Repetir para `bootstrap/cache/`

---

## 8. Ativar SSL (HTTPS)

1. cPanel → **SSL/TLS** ou **Let's Encrypt**
2. Selecionar `api.kallme.com.br`
3. Instalar certificado gratuito Let's Encrypt
4. Aguardar propagação (~5 minutos)

---

## 9. Configurar cron job (lembretes)

1. cPanel → **Trabalhos Cron (Cron Jobs)**
2. Frequência: **Uma vez por hora** (`0 * * * *`)
3. Comando:
```
cd /home/CPANELUSER/api.kallme.com.br && /usr/local/bin/php artisan reminders:process >> /dev/null 2>&1
```

> **Nota:** O caminho do PHP pode variar. Para descobrir:
> cPanel → Terminal → `which php` (geralmente `/usr/local/bin/php` ou `/usr/bin/php`)

---

## 10. Testar

```bash
# Health check
curl https://api.kallme.com.br/api/health
# Deve retornar: {"status":"ok"}

# Registro
curl -X POST https://api.kallme.com.br/api/companies/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Minha Empresa","cnpj":"11222333000181","email":"admin@empresa.com","password":"senha123","license_code":"PROD-001"}'
```

---

## Troubleshooting

### Erro 500
- Verificar `storage/logs/laravel.log` via Gerenciador de Arquivos
- Causas comuns: permissões de `storage/`, `.env` mal configurado, migrations não rodadas

### Erro 403 Forbidden
- `.htaccess` pode estar sendo ignorado. Verificar se `mod_rewrite` está ativo:
  cPanel → Selecionar Versão PHP → Verificar módulos

### CORS bloqueando requisições
- Verificar `CORS_ALLOWED_ORIGINS` no `.env`
- O app RN precisa apontar para `https://api.kallme.com.br` (não `http://`)

### Email não envia
- Verificar credenciais SMTP no `.env`
- Testar no tinker:
  ```
  php artisan tinker
  >>> Mail::raw('Teste', fn($m) => $m->to('seu@email.com')->subject('Teste'));
  ```

### Token Sanctum não funciona
- Verificar se `SANCTUM_STATEFUL_DOMAINS` inclui o domínio do frontend
- Verificar se o header `Authorization: Bearer TOKEN` está sendo passado

### Versão do PHP
- HostGator Plano M: verificar versão no cPanel → **Selecionar Versão PHP**
- Mínimo necessário: PHP 8.2
- Selecionar 8.2 ou 8.3 se disponível

---

## Manutenção

### Atualizar código
```bash
# Via SSH:
cd /home/CPANELUSER/api.kallme.com.br
git pull origin master
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:clear
php artisan route:clear
```

### Gerar novas licenças
```bash
php artisan tinker
>>> \DB::table('licenses')->insert(['id' => \Str::uuid(), 'code' => 'PROD-'.strtoupper(\Str::random(8)), 'used' => false, 'created_at' => now(), 'updated_at' => now()])
```

### Ver logs
```bash
tail -50 storage/logs/laravel.log
```

### Cache (se performance ficar lenta)
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```
