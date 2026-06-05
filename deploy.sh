#!/usr/bin/env bash
#
# Deploy do SistAgendamentos (backend Laravel na HostGator).
# Faz push dos commits locais e aciona o endpoint que roda git pull +
# limpeza de cache no servidor. NÃO sobe arquivos — o git cuida disso.
#
# Uso:  bash deploy.sh
#
# O segredo NÃO fica neste arquivo (que é versionado): vem de deploy.config
# (gitignored) ou da variável de ambiente DEPLOY_SECRET.

set -euo pipefail

DEPLOY_URL="https://api.kallme.com.br/api/deploy"
BRANCH="master"

# Carrega o segredo de deploy.config, se existir.
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$DIR/deploy.config" ]] && source "$DIR/deploy.config"
: "${DEPLOY_SECRET:?Defina DEPLOY_SECRET em deploy.config (copie de deploy.config.example)}"

echo "🚀 Deploy para kallme.com.br..."

# 1) Envia os commits locais para o GitHub.
echo "→ git push origin $BRANCH"
git push origin "$BRANCH"

# 2) Aciona o git pull + optimize:clear no servidor.
#    Formato JSON no corpo, sem -A "Mozilla/..." nem Accept (passam no ModSecurity).
echo "→ acionando deploy no servidor..."
RESP=$(curl -s -X POST "$DEPLOY_URL" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"$DEPLOY_SECRET\"}")

# 3) Resultado.
if echo "$RESP" | grep -q '"ok":true'; then
  echo "✅ Deploy concluído!"
else
  echo "❌ Falhou. Resposta do servidor:"
  echo "$RESP"
  exit 1
fi
