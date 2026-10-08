# Starts Doodle Alive on port 8000, reachable from phones on the same Wi-Fi.
# First run creates backend/.venv, installs dependencies, and builds the frontend.
# Pass -Build to rebuild the frontend after changing it.
param([switch]$Build)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..'
$frontend = Join-Path $root 'frontend'
$backend = Join-Path $root 'backend'

if ($Build -or -not (Test-Path (Join-Path $frontend 'dist\index.html'))) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw 'Node.js (npm) is required to build the frontend: https://nodejs.org'
    }
    Push-Location $frontend
    try {
        # Install when missing, or when package-lock.json changed since the last install.
        $installed = 'node_modules/.package-lock.json'
        if (-not (Test-Path $installed) -or (Get-Item 'package-lock.json').LastWriteTime -gt (Get-Item $installed).LastWriteTime) {
            npm ci; if ($LASTEXITCODE) { throw 'npm ci failed' }
        }
        npm run build; if ($LASTEXITCODE) { throw 'Frontend build failed' }
    } finally { Pop-Location }
}

Set-Location $backend
if (-not (Test-Path '.venv')) {
    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
}
if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1).IPAddress
Write-Host "Laptop: http://localhost:8000"
Write-Host "Phone : http://${ip}:8000   (same Wi-Fi; allow Python through the firewall if asked)"

.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
