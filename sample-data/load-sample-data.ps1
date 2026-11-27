# Carrega o cadastro inicial (centros de custo e classificações) no banco do webBudget.
#
# Pré-requisitos: o Postgres do server/compose.yaml precisa estar no ar e o server precisa ter
# terminado as migrações do Liquibase e criado o admin (admin@webbudget.com.br). Este script NÃO é
# idempotente: rodar de novo falha no nome das classificações e, como a carga é uma transação só, não grava nada.
#
# Uso: ./load-sample-data.ps1 [--container NOME] [--db NOME] [--user NOME]
#   --container (padrão webbudget-postgres): nome do container do Postgres, o mesmo do server/compose.yaml.
#   --db (padrão webbudget): banco que recebe os dados.
#   --user (padrão sa_webbudget): usuário do Postgres.
#   Todos os parâmetros são opcionais e em qualquer ordem; sobrescreva só o que precisar.
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments = @()
)
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$container = 'webbudget-postgres'
$dbName = 'webbudget'
$dbUser = 'sa_webbudget'

for ($i = 0; $i -lt $Arguments.Count; $i++) {
    switch ($Arguments[$i]) {
        '--container' { $i++; $container = $Arguments[$i] }
        '--db'        { $i++; $dbName = $Arguments[$i] }
        '--user'      { $i++; $dbUser = $Arguments[$i] }
        default       { throw "Argumento desconhecido: $($Arguments[$i])" }
    }
}

$sqlFile = 'sample-data.sql'

if (-not (Test-Path $sqlFile)) {
    Write-Error "$sqlFile não encontrado."
    exit 1
}

# Guarda: o admin precisa existir (o server o cria na primeira subida, depois das migrações).
Write-Host "==> Verificando se o server já migrou (admin presente)..."
$hasUser = (docker exec $container `
    psql -U $dbUser -d $dbName -tAc `
    "SELECT 1 FROM administration.users WHERE email = 'admin@webbudget.com.br'" 2>$null | Out-String).Trim()

if ($hasUser -ne '1') {
    Write-Error "admin@webbudget.com.br não encontrado. Suba o server e espere as migrações terminarem antes de carregar os dados."
    exit 1
}

Write-Host "==> Carregando o cadastro inicial (NÃO é idempotente)..."
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content $sqlFile -Raw -Encoding UTF8 | docker exec -i $container psql -U $dbUser -d $dbName -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Falha ao carregar com o psql" }

Write-Host ""
Write-Host "Cadastro inicial carregado."
