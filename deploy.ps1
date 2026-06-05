# deploy.ps1
# -----------
# Deploy do SistAgendamentos pelo PowerShell (Windows).
# Faz git push (autentica pelo Git Credential Manager) e dispara o endpoint
# que roda git pull + optimize:clear no servidor.
#
# Uso:  .\deploy.ps1
#
# O segredo vem de deploy.config (gitignored), o mesmo arquivo do deploy.sh.
# Motivo de existir alem do .sh: no Windows o `bash` costuma ser o WSL (sem
# Git Credential Manager) e o PowerShell 5.1 estraga aspas de JSON passado a
# executaveis nativos. Este script resolve os dois problemas.

$ErrorActionPreference = "Stop"

$DeployUrl = "https://api.kallme.com.br/api/deploy"
$Branch    = "master"

# --- Carrega o segredo de deploy.config -------------------------------------
$configPath = Join-Path $PSScriptRoot "deploy.config"
if (-not (Test-Path $configPath)) {
    Write-Host "deploy.config nao encontrado. Copie de deploy.config.example e preencha o DEPLOY_SECRET." -ForegroundColor Red
    exit 1
}
$match = Select-String -Path $configPath -Pattern '^\s*DEPLOY_SECRET\s*=\s*(\S+)' | Select-Object -First 1
$secret = if ($match) { $match.Matches.Groups[1].Value.Trim() } else { "" }
if (-not $secret) {
    Write-Host "DEPLOY_SECRET vazio ou ausente em deploy.config." -ForegroundColor Red
    exit 1
}

Write-Host "Deploy para kallme.com.br..." -ForegroundColor Cyan

# --- 1) Envia os commits locais (GCM cuida da autenticacao) -----------------
Write-Host "-> git push origin $Branch"
git push origin $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "git push falhou." -ForegroundColor Red
    exit 1
}

# --- 2) Dispara o deploy no servidor ----------------------------------------
# JSON via arquivo temporario (ASCII, sem BOM) para evitar o bug de aspas do
# PS 5.1 ao passar corpo a executaveis nativos. Usa curl.exe (nao o alias).
Write-Host "-> acionando deploy no servidor..."
$body = @{ secret = $secret } | ConvertTo-Json -Compress
$tmp  = New-TemporaryFile
$body | Out-File -Encoding ascii -NoNewline $tmp.FullName
$resp = curl.exe -s -X POST $DeployUrl -H "Content-Type: application/json" -d "@$($tmp.FullName)"
Remove-Item $tmp.FullName

# --- 3) Resultado -----------------------------------------------------------
if ($resp -match '"ok"\s*:\s*true') {
    Write-Host "Deploy concluido!" -ForegroundColor Green
} else {
    Write-Host "Falhou. Resposta do servidor:" -ForegroundColor Red
    Write-Host $resp
    exit 1
}
