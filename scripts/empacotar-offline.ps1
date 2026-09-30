# Monta a versão offline (portátil) do auto-RDO:
#
#   offline-dist/auto-RDO-offline/
#     Iniciar RDO.bat       <- o usuário só clica aqui
#     node/node.exe         <- Node embutido: não precisa instalar nada
#     backend/              <- API + servidor local (só dependências de produção)
#     frontend/dist/        <- build com VITE_MODO=offline
#
# e o zip correspondente, pronto para copiar para outro computador.
# Uso (na raiz do repositório):  powershell -ExecutionPolicy Bypass -File scripts\empacotar-offline.ps1
#
# Não altera nada do build online: o frontend offline é gerado direto na pasta do pacote.

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$saida = Join-Path $raiz 'offline-dist'
$pacote = Join-Path $saida 'auto-RDO-offline'
$zip = Join-Path $saida 'auto-RDO-offline.zip'

function Executar([string]$pasta, [string]$comando) {
    Push-Location $pasta
    try {
        cmd /c $comando
        if ($LASTEXITCODE -ne 0) { throw "Falhou ($LASTEXITCODE): $comando em $pasta" }
    } finally {
        Pop-Location
    }
}

Write-Host '==> Limpando pacote anterior'
if (Test-Path $pacote) { Remove-Item -Recurse -Force $pacote }
if (Test-Path $zip) { Remove-Item -Force $zip }
New-Item -ItemType Directory -Force $pacote | Out-Null

Write-Host '==> Frontend: build offline'
$distOffline = Join-Path $pacote 'frontend\dist'
Executar (Join-Path $raiz 'frontend') "npm run build:offline -- --outDir `"$distOffline`" --emptyOutDir"

Write-Host '==> Backend: copiando código (sem testes, .env e node_modules)'
$backendPacote = Join-Path $pacote 'backend'
robocopy (Join-Path $raiz 'backend') $backendPacote /E /NFL /NDL /NJH /NJS /NP `
    /XD node_modules test test-results `
    /XF .env .env.* test-*.js | Out-Null
# robocopy: códigos abaixo de 8 significam sucesso
if ($LASTEXITCODE -ge 8) { throw "robocopy falhou ($LASTEXITCODE)" }

Write-Host '==> Backend: instalando só dependências de produção'
Executar $backendPacote 'npm ci --omit=dev --no-audit --no-fund'

Write-Host '==> Copiando o Node desta máquina'
$node = (Get-Command node).Source
New-Item -ItemType Directory -Force (Join-Path $pacote 'node') | Out-Null
Copy-Item $node (Join-Path $pacote 'node\node.exe')

Write-Host '==> Criando o atalho de inicialização'
# ASCII puro: o cmd.exe não lê .bat em UTF-8 de forma confiável
$bat = @'
@echo off
title auto-RDO (offline)
cd /d "%~dp0"
"%~dp0node\node.exe" backend\servidorLocal.js --abrir
if errorlevel 1 pause
'@
Set-Content -Path (Join-Path $pacote 'Iniciar RDO.bat') -Value $bat -Encoding ASCII

$leiaMe = @'
auto-RDO - versao offline
=========================

1. Clique duas vezes em "Iniciar RDO.bat".
2. O navegador abre em http://127.0.0.1:3717
3. Mantenha a janela preta aberta enquanto usa o app. Feche-a para encerrar.

Onde ficam os relatorios
- No navegador DESTE computador (IndexedDB). Nao sincronizam com a versao online.
- Limpar os dados de navegacao, trocar de navegador ou usar janela anonima
  faz os relatorios "sumirem". Use sempre o mesmo navegador.

O que nao funciona offline
- Geracao de e-mail com IA (depende do Gemini, na nuvem).
'@
Set-Content -Path (Join-Path $pacote 'LEIA-ME.txt') -Value $leiaMe -Encoding ASCII

Write-Host '==> Compactando'
Compress-Archive -Path $pacote -DestinationPath $zip

Write-Host ''
Write-Host "Pronto: $zip"
