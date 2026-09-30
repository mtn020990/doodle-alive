# Starts Doodle Alive on port 8000, reachable from phones on the same Wi-Fi.
# First run creates backend/.venv and installs dependencies.
$ErrorActionPreference = 'Stop'
$backend = Join-Path $PSScriptRoot '..\backend'
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
