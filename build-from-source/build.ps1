# Constrói as duas imagens Docker do webBudget a partir do código-fonte:
#   - server: imagem Spring Boot por Cloud Native Buildpacks (via Gradle)
#   - client: SPA Vue servida pelo nginx (via docker build)
#
# Uso: ./build-from-source/build.ps1 (ou: cd build-from-source; ./build.ps1)
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$envVars = @{}
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)\s*$') {
            $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }
}

$serverTag = if ($envVars.ContainsKey('SERVER_IMAGE_TAG')) { $envVars['SERVER_IMAGE_TAG'] } else { 'latest' }
$clientTag = if ($envVars.ContainsKey('CLIENT_IMAGE_TAG')) { $envVars['CLIENT_IMAGE_TAG'] } else { 'latest' }
$webPort   = if ($envVars.ContainsKey('WEB_PORT'))         { $envVars['WEB_PORT'] }         else { '8080' }

Write-Host "==> Construindo a imagem do server (Gradle bootBuildImage) -> webbudget/server:$serverTag"
Push-Location ..\server
try {
    & .\gradlew.bat bootBuildImage "--imageName=webbudget/server:$serverTag"
    if ($LASTEXITCODE -ne 0) { throw "gradle bootBuildImage falhou" }
}
finally { Pop-Location }

Write-Host "==> Construindo a imagem do client (docker build) -> webbudget/client:$clientTag"
docker build -t "webbudget/client:$clientTag" ..\client
if ($LASTEXITCODE -ne 0) { throw "docker build falhou" }

Write-Host ""
Write-Host "Pronto. Imagens:"
Write-Host "  webbudget/server:$serverTag"
Write-Host "  webbudget/client:$clientTag"
Write-Host ""
Write-Host "Próximo passo: docker compose up -d   (a partir desta pasta, build-from-source/; depois abra http://localhost:$webPort)"
