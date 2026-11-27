# Faz o backup do banco do webBudget.
# Roda o pg_dump DENTRO do container do Postgres em execução e depois copia o arquivo .sql para o host.
#
# Uso: ./backup.ps1 [--full|--data-only] [nome-do-container]
#   --data-only (padrão): grava só os dados das tabelas. É o caso comum dos backups de rotina, já que o
#     Liquibase cria e migra o schema na próxima subida. Um dump só de dados é restaurado num banco já migrado.
#   --full: grava schema e dados, para um backup completo de recuperação de desastre.
#   O container tem como padrão webbudget-postgres, o nome que o compose.yaml e o build-from-source/compose.yaml
#   dão ao Postgres. Informe outro nome se o Postgres roda sob outro container (ou sem Compose: o script só
#   precisa do container em execução).
#   DB_NAME e DB_USER (padrão webbudget e sa_webbudget) vêm do ambiente.
# Saída: backups/webbudget-backup-AAAAMMDD-HHMMSS.sql
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments = @()
)
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$mode = '--data-only'
$container = 'webbudget-postgres'

foreach ($arg in $Arguments) {
    switch ($arg) {
        '--full'      { $mode = '--full' }
        '--data-only' { $mode = '--data-only' }
        default       { $container = $arg }
    }
}

$dbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'webbudget' }
$dbUser = if ($env:DB_USER) { $env:DB_USER } else { 'sa_webbudget' }

$timestamp     = Get-Date -Format 'yyyyMMdd-HHmmss'
$filename      = "webbudget-backup-$timestamp.sql"
$containerPath = "/tmp/$filename"

New-Item -ItemType Directory -Force -Path backups | Out-Null

$pgDumpArgs = @()
if ($mode -eq '--data-only') { $pgDumpArgs += '--data-only' }

Write-Host "==> Gravando o banco '$dbName' dentro do container '$container' ($mode)..."
docker exec $container pg_dump -U $dbUser -d $dbName @pgDumpArgs -f $containerPath
if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou" }

Write-Host "==> Copiando o backup para o host..."
docker cp "${container}:$containerPath" "backups/$filename"
if ($LASTEXITCODE -ne 0) { throw "docker cp falhou" }

Write-Host "==> Apagando o arquivo temporário dentro do container..."
docker exec $container rm -f $containerPath | Out-Null

Write-Host ""
Write-Host "Backup salvo em: backups/$filename"
