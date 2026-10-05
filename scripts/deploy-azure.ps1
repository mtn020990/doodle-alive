<#
.SYNOPSIS
  Deploys Doodle Alive to Azure.
    backend   -> Azure Container Apps (image built in the cloud by Azure Container Registry, no local Docker)
                 with an Azure Files share mounted at /data (outputs + model cache survive restarts)
    character -> Meta AnimatedDrawings service (character-service/), a second container app that only
                 the backend can reach. Set CHARACTER_ANIMATOR=animated_drawings_api in backend/.env to use it.
    frontend  -> Azure Storage static website, pointed at the backend URL from frontend/.env

.EXAMPLE
  az login
  .\scripts\deploy-azure.ps1 -Part backend     # prints the backend URL
  # put that URL in frontend/.env as API_BASE_URL=...
  .\scripts\deploy-azure.ps1 -Part frontend    # prints the frontend URL to open on phones
  .\scripts\deploy-azure.ps1 -Part character   # first build takes a while; then redeploy -Part backend

  Re-run any part any time to redeploy. Settings and keys come from backend/.env.
#>
param(
    [ValidateSet('all', 'backend', 'character', 'frontend')]
    [string]$Part = 'all',
    # Same subscription and region as ai-handwriting-assessment-platform (Visual Studio Enterprise - MPN).
    [string]$Subscription = '6c8d3139-4aaf-4b7e-84ff-e7484aa869e3',
    [string]$ResourceGroup = 'rg-doodle-alive',
    [string]$Location = 'southeastasia',
    [string]$Prefix = 'doodlealive'
)

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$env:PYTHONIOENCODING = 'utf-8'

$appName = 'doodle-alive-api'
$characterAppName = 'doodle-alive-character'
$envName = 'doodle-alive-env'
$shareName = 'doodle-data'
# Paths on this laptop make no sense in the container; DATA_DIR is set by the Dockerfile.
$skipKeys = @('DATA_DIR', 'AD_REPO_DIR', 'AD_PYTHON', 'CORS_ORIGINS')

function Invoke-Az {
    $out = & az @args
    if ($LASTEXITCODE -ne 0) { throw "az $($args -join ' ') failed (exit $LASTEXITCODE)" }
    $out
}

function Test-Az {
    & az @args *> $null
    $LASTEXITCODE -eq 0
}

function Read-DotEnv([string]$path) {
    $map = [ordered]@{}
    if (Test-Path $path) {
        foreach ($line in Get-Content $path) {
            if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
                $map[$Matches[1]] = ($Matches[2].Trim() -replace '^"(.*)"$', '$1' -replace "^'(.*)'$", '$1')
            }
        }
    }
    $map
}

# Globally unique names for the registry and storage account, stable per subscription.
if (-not (Test-Az account show)) { throw 'Not logged in. Run: az login' }
if (-not (Test-Az account set --subscription $Subscription)) {
    throw "Subscription $Subscription is not available to the logged-in account. Run: az login (with the account that owns it)"
}
$subId = Invoke-Az account show --query id -o tsv
Write-Host "== Subscription: $(Invoke-Az account show --query name -o tsv) ($subId)"
$suffix = ($subId -replace '-', '').Substring(0, 6)
$acrName = "$Prefix$suffix"
$storageName = "$Prefix$suffix"

function Initialize-Shared {
    # A provider that is not registered makes create calls fail with a misleading "SubscriptionNotFound".
    Write-Host '== Resource providers (first run takes a few minutes)'
    foreach ($ns in 'Microsoft.Storage', 'Microsoft.App', 'Microsoft.OperationalInsights', 'Microsoft.ContainerRegistry') {
        # Only when needed: re-registering on every run is slow and sometimes fails transiently.
        if ((Invoke-Az provider show -n $ns --query registrationState -o tsv) -ne 'Registered') {
            Invoke-Az provider register -n $ns --wait -o none
        }
    }

    Write-Host "== Resource group $ResourceGroup ($Location)"
    Invoke-Az group create -n $ResourceGroup -l $Location -o none
    if (-not (Test-Az storage account show -n $storageName -g $ResourceGroup)) {
        Write-Host "== Storage account $storageName"
        Invoke-Az storage account create -n $storageName -g $ResourceGroup -l $Location `
            --sku Standard_LRS --kind StorageV2 --allow-blob-public-access false -o none
    }
}

function Get-StorageKey { Invoke-Az storage account keys list -n $storageName -g $ResourceGroup --query '[0].value' -o tsv }

function Get-FrontendUrl { (Invoke-Az storage account show -n $storageName -g $ResourceGroup --query primaryEndpoints.web -o tsv).TrimEnd('/') }

# Registry, file share and Container Apps environment, shared by both container apps.
function Initialize-ContainerPlatform {
    # Install only when missing: upgrading on every run downloads from PyPI, which can be very slow.
    if (-not (Test-Az extension show --name containerapp)) {
        Write-Host '== Azure CLI containerapp extension'
        Invoke-Az extension add --name containerapp --only-show-errors -o none
    }

    if (-not (Test-Az acr show -n $acrName -g $ResourceGroup)) {
        Write-Host "== Container registry $acrName"
        Invoke-Az acr create -n $acrName -g $ResourceGroup -l $Location --sku Basic --admin-enabled true -o none
    }
    if (-not (Test-Az storage share-rm show -g $ResourceGroup --storage-account $storageName -n $shareName)) {
        Invoke-Az storage share-rm create -g $ResourceGroup --storage-account $storageName -n $shareName --quota 100 -o none
    }
    if (-not (Test-Az containerapp env show -n $envName -g $ResourceGroup)) {
        Write-Host "== Container Apps environment $envName"
        Invoke-Az containerapp env create -n $envName -g $ResourceGroup -l $Location -o none
    }
    Invoke-Az containerapp env storage set -n $envName -g $ResourceGroup --storage-name data `
        --azure-file-account-name $storageName --azure-file-account-key (Get-StorageKey) `
        --azure-file-share-name $shareName --access-mode ReadWrite -o none
    $script:envId = Invoke-Az containerapp env show -n $envName -g $ResourceGroup --query id -o tsv
    $script:acrUser = Invoke-Az acr credential show -n $acrName --query username -o tsv
    $script:acrPass = Invoke-Az acr credential show -n $acrName --query 'passwords[0].value' -o tsv
}

# Builds <contextDir>/Dockerfile in Azure and returns the full image name.
function Invoke-ImageBuild([string]$repository, [string]$contextDir, [int]$timeoutSeconds = 3600) {
    $tag = Get-Date -Format 'yyyyMMddHHmmss'
    $image = "$acrName.azurecr.io/${repository}:$tag"
    Write-Host "== Building $image in Azure"
    # No live log: streaming it crashes the CLI on Windows code pages (pip's Unicode progress bars).
    # -f is resolved from the current folder, so build from the context folder wherever the script is started.
    Push-Location $contextDir
    try {
        $runId = Invoke-Az acr build -r $acrName -g $ResourceGroup -t "${repository}:$tag" -f Dockerfile . `
            --no-logs --timeout $timeoutSeconds --query runId -o tsv
    } finally {
        Pop-Location
    }
    do {
        Start-Sleep -Seconds 15
        $buildState = Invoke-Az acr task show-run -r $acrName --run-id $runId --query status -o tsv
        Write-Host "   build $runId : $buildState"
    } while ($buildState -in 'Queued', 'Started', 'Running')
    if ($buildState -ne 'Succeeded') {
        throw "Image build $runId ended as '$buildState'. Log: az acr task logs -r $acrName --run-id $runId --no-format > build.log"
    }
    $image
}

# Creates or updates a container app (one replica, always on) and waits until it is provisioned.
function Set-ContainerApp([string]$name, [string]$image, [hashtable]$ingress, [hashtable]$resources,
                          [array]$envList, [array]$secrets, [bool]$mountData) {
    $container = @{ name = 'main'; image = $image; resources = $resources; env = $envList }
    $template = @{ containers = @($container); scale = @{ minReplicas = 1; maxReplicas = 1 } }
    if ($mountData) {
        $container.volumeMounts = @(@{ volumeName = 'data'; mountPath = '/data' })
        $template.volumes = @(@{ name = 'data'; storageType = 'AzureFile'; storageName = 'data' })
    }
    $body = @{
        location   = $Location
        properties = @{
            managedEnvironmentId = $script:envId
            configuration        = @{
                ingress    = $ingress
                registries = @(@{ server = "$acrName.azurecr.io"; username = $script:acrUser; passwordSecretRef = 'acr-password' })
                secrets    = @(@{ name = 'acr-password'; value = $script:acrPass }) + $secrets
            }
            template             = $template
        }
    } | ConvertTo-Json -Depth 20

    # PUT straight to the stable ARM API: `az containerapp create/update --yaml` sends a preview
    # api-version that the service rejects ("could not be converted to System.Boolean").
    $url = "https://management.azure.com/subscriptions/$subId/resourceGroups/$ResourceGroup" +
        "/providers/Microsoft.App/containerApps/${name}?api-version=2024-03-01"
    $bodyPath = Join-Path $env:TEMP "$name-$(Get-Date -Format 'yyyyMMddHHmmss').json"
    try {
        [IO.File]::WriteAllText($bodyPath, $body)
        Write-Host "== Deploying container app $name"
        Invoke-Az rest --method put --url $url --body "@$bodyPath" -o none
    } finally {
        Remove-Item $bodyPath -ErrorAction SilentlyContinue   # it contains secrets
    }
    do {
        Start-Sleep -Seconds 10
        $state = Invoke-Az containerapp show -n $name -g $ResourceGroup --query properties.provisioningState -o tsv
        Write-Host "   provisioning: $state"
    } while ($state -eq 'InProgress')
    if ($state -ne 'Succeeded') { throw "Container app $name provisioning ended as '$state'. Check: az containerapp revision list -n $name -g $ResourceGroup -o table" }
}

function Publish-Backend {
    Initialize-ContainerPlatform
    $image = Invoke-ImageBuild $appName $root

    # App settings from backend/.env. Keys/tokens become Container Apps secrets, not plain env vars.
    $vars = Read-DotEnv (Join-Path $root 'backend\.env')
    $cors = @(Get-FrontendUrl)
    if ($vars['CORS_ORIGINS']) { $cors += $vars['CORS_ORIGINS'] }
    $secrets = @()
    $envList = @(@{ name = 'CORS_ORIGINS'; value = ($cors -join ',') })
    if (-not $vars['AD_SERVICE_URL'] -and (Test-Az containerapp show -n $characterAppName -g $ResourceGroup)) {
        # Apps in one Container Apps environment reach each other by app name.
        $envList += @{ name = 'AD_SERVICE_URL'; value = "http://$characterAppName" }
    }
    foreach ($key in $vars.Keys) {
        $value = $vars[$key]
        if ($skipKeys -contains $key -or $value -eq '') { continue }
        if ($key -match 'TOKEN|KEY|SECRET|PASSWORD|PIN') {
            $secretName = $key.ToLower().Replace('_', '-')
            $secrets += @{ name = $secretName; value = $value }
            $envList += @{ name = $key; secretRef = $secretName }
        } else {
            $envList += @{ name = $key; value = $value }
        }
    }

    # One replica, always on: jobs live in memory, so they must not be split across or lost to scaling.
    Set-ContainerApp $appName $image @{ external = $true; targetPort = 8000; transport = 'auto' } `
        @{ cpu = 1.0; memory = '2Gi' } $envList $secrets $true

    $fqdn = Invoke-Az containerapp show -n $appName -g $ResourceGroup --query properties.configuration.ingress.fqdn -o tsv
    $backendUrl = "https://$fqdn"
    try {
        $health = Invoke-RestMethod "$backendUrl/api/health" -TimeoutSec 60
        Write-Host "Health: $($health | ConvertTo-Json -Compress)  (the new revision can take a minute to take over)"
    } catch {
        Write-Warning "Health check failed (the container may still be starting): $($_.Exception.Message)"
    }
    Write-Host ''
    Write-Host "Backend URL : $backendUrl" -ForegroundColor Green
    Write-Host "Next        : set API_BASE_URL=$backendUrl in frontend\.env, then run: .\scripts\deploy-azure.ps1 -Part frontend"
    Write-Host "Logs        : az containerapp logs show -n $appName -g $ResourceGroup --follow"
}

function Publish-Character {
    Initialize-ContainerPlatform
    # The ML stack is large; the first build takes a while.
    $image = Invoke-ImageBuild $characterAppName (Join-Path $root 'character-service') 7200

    # Internal ingress: reachable only from apps in the same environment (the backend), not the internet.
    Set-ContainerApp $characterAppName $image @{ external = $false; targetPort = 5000; transport = 'auto' } `
        @{ cpu = 2.0; memory = '4Gi' } @() @() $false

    Write-Host ''
    Write-Host "Character service: http://$characterAppName (internal)" -ForegroundColor Green
    Write-Host "Next             : set CHARACTER_ANIMATOR=animated_drawings_api in backend\.env, then run: .\scripts\deploy-azure.ps1 -Part backend"
    Write-Host "Logs             : az containerapp logs show -n $characterAppName -g $ResourceGroup --follow"
}

function Publish-Frontend {
    $apiBase = (Read-DotEnv (Join-Path $root 'frontend\.env'))['API_BASE_URL']
    if (-not $apiBase) {
        Write-Warning 'Skipping frontend: set API_BASE_URL in frontend\.env (copy frontend\.env.example) to the backend URL.'
        return
    }
    $apiBase = $apiBase.TrimEnd('/')
    $key = Get-StorageKey

    Write-Host "== Static website on $storageName"
    Invoke-Az storage blob service-properties update --account-name $storageName --account-key $key `
        --static-website --index-document index.html -o none

    $stage = Join-Path $env:TEMP "doodle-alive-web-$(Get-Date -Format 'yyyyMMddHHmmss')"
    try {
        New-Item -ItemType Directory -Path $stage | Out-Null
        Get-ChildItem (Join-Path $root 'frontend') -File | Where-Object { $_.Name -notlike '.env*' } |
            Copy-Item -Destination $stage
        $config = "window.DOODLE_CONFIG = { apiBaseUrl: '$($apiBase -replace "'", "\'")' };`n"
        [IO.File]::WriteAllText((Join-Path $stage 'config.js'), $config)

        Invoke-Az storage blob upload-batch --account-name $storageName --account-key $key `
            -s $stage -d '$web' --overwrite --only-show-errors -o none
    } finally {
        Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host ''
    Write-Host "Frontend URL: $(Get-FrontendUrl)" -ForegroundColor Green
    Write-Host "Calls API   : $apiBase"
}

Initialize-Shared
# Character before backend, so the backend picks up AD_SERVICE_URL in the same run.
if ($Part -in 'all', 'character') { Publish-Character }
if ($Part -in 'all', 'backend') { Publish-Backend }
if ($Part -in 'all', 'frontend') { Publish-Frontend }
