param(
  [int]$Port = 3300,
  [string]$Username = "test",
  [string]$Password = "20260428"
)

$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

function Set-EnvLine {
  param(
    [string[]]$Lines,
    [string]$Key,
    [string]$Value
  )

  $nextLine = "$Key=$Value"
  $matched = $false
  $nextLines = foreach ($line in $Lines) {
    if ($line -match "^\s*$([regex]::Escape($Key))=") {
      $matched = $true
      $nextLine
    } else {
      $line
    }
  }

  if (-not $matched) {
    $nextLines += $nextLine
  }

  return $nextLines
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm was not found. Install Node.js first, then run this script again."
}

$envPath = Join-Path $PSScriptRoot ".env.local"
$envLines = if (Test-Path -LiteralPath $envPath) {
  @(Get-Content -LiteralPath $envPath)
} else {
  @()
}

$usersLine = $envLines | Where-Object { $_ -match "^\s*CS201_PORTAL_USERS=" } | Select-Object -First 1
$usersValue = if ($usersLine) { $usersLine -replace "^\s*CS201_PORTAL_USERS=", "" } else { "" }
$newUser = "$Username`:$Password"

if ([string]::IsNullOrWhiteSpace($usersValue)) {
  $usersValue = $newUser
} elseif ($usersValue -notmatch "(^|,)$([regex]::Escape($Username))\:") {
  $usersValue = "$usersValue,$newUser"
}

$secretLine = $envLines | Where-Object { $_ -match "^\s*CS201_PORTAL_SESSION_SECRET=" } | Select-Object -First 1
$secretValue = if ($secretLine) { $secretLine -replace "^\s*CS201_PORTAL_SESSION_SECRET=", "" } else { "" }
if ([string]::IsNullOrWhiteSpace($secretValue)) {
  $secretBytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
  $secretValue = [Convert]::ToBase64String($secretBytes)
}

$envLines = Set-EnvLine -Lines $envLines -Key "CS201_PORTAL_USERS" -Value $usersValue
$envLines = Set-EnvLine -Lines $envLines -Key "CS201_PORTAL_SESSION_SECRET" -Value $secretValue
Set-Content -LiteralPath $envPath -Value $envLines -Encoding UTF8

if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "node_modules"))) {
  Write-Host "Installing dependencies..."
  npm install
}

$localUrl = "http://127.0.0.1:$Port"
$hostName = (Get-NetIPConfiguration |
  Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
  Select-Object -ExpandProperty IPv4Address |
  Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "CS201 portal is starting..."
Write-Host "Login username: $Username"
Write-Host "Login password: $Password"
Write-Host "Local URL: $localUrl"
if ($hostName) {
  Write-Host "LAN URL: http://$hostName`:$Port"
}
Write-Host ""

npm run dev -- --hostname 0.0.0.0 --port $Port
