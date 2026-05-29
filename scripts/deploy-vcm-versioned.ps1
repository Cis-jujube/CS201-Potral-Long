param(
  [string]$HostName = "vcm-53362.vm.duke.edu",
  [string]$RemoteUser = "vcm",
  [string]$RemoteRoot = "/opt/cs201-portal",
  [string]$SshKeyPath = "$env:USERPROFILE\.ssh\cs201_vcm_ed25519",
  [string]$ReleaseName = "",
  [switch]$SkipLocalValidation
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
if (-not $ReleaseName) {
  $ReleaseName = "$timestamp-v2"
}

$archiveName = "cs201-portal-$ReleaseName.tar.gz"
$archivePath = Join-Path ([System.IO.Path]::GetTempPath()) $archiveName
$remoteArchive = "/tmp/$archiveName"
$releaseDir = "$RemoteRoot/releases/$ReleaseName"
$remote = "$RemoteUser@$HostName"
$sshArgs = @()
if ($SshKeyPath -and (Test-Path -LiteralPath $SshKeyPath)) {
  $sshArgs = @("-i", $SshKeyPath)
}

function Assert-LastExitCode {
  param([string]$Step)

  if ($LASTEXITCODE -ne 0) {
    throw "$Step failed with exit code $LASTEXITCODE."
  }
}

if (-not $SkipLocalValidation) {
  Push-Location $projectRoot
  try {
    npm run lint
    npm run test
    npm run build
  } finally {
    Pop-Location
  }
}

if (Test-Path $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

Push-Location $projectRoot
try {
  $dirty = git status --porcelain
  if ($dirty) {
    throw "Commit or stash local changes before running this deployment script. It packages HEAD with git archive."
  }

  git archive --format=tar.gz --output=$archivePath HEAD
  Assert-LastExitCode "Create deployment archive"
} finally {
  Pop-Location
}

$prepareCommand = @(
  "set -euo pipefail",
  "mkdir -p '$RemoteRoot/releases' '$RemoteRoot/shared'",
  "if [ ! -f '$RemoteRoot/shared/.env.local' ] && [ -f '$RemoteRoot/app/.env.local' ]; then cp '$RemoteRoot/app/.env.local' '$RemoteRoot/shared/.env.local'; fi",
  "rm -rf '$releaseDir'",
  "mkdir -p '$releaseDir'"
) -join "; "
& ssh @sshArgs $remote "bash" "-lc" $prepareCommand
Assert-LastExitCode "Prepare remote release directory"

& scp @sshArgs $archivePath "${remote}:$remoteArchive"
Assert-LastExitCode "Upload deployment archive"

$activateCommand = @(
  "set -euo pipefail",
  "tar --no-same-owner --no-same-permissions -xzf '$remoteArchive' -C '$releaseDir'",
  "rm -f '$remoteArchive'",
  "ln -sfn '$RemoteRoot/shared/.env.local' '$releaseDir/.env.local'",
  "if [ -e '$RemoteRoot/app/public/course-materials' ] && [ ! -e '$releaseDir/public/course-materials' ]; then mkdir -p '$releaseDir/public'; cp -a '$RemoteRoot/app/public/course-materials' '$releaseDir/public/course-materials'; fi",
  "if [ -e '$RemoteRoot/app/public/reflection-templates' ] && [ ! -e '$releaseDir/public/reflection-templates' ]; then mkdir -p '$releaseDir/public'; cp -a '$RemoteRoot/app/public/reflection-templates' '$releaseDir/public/reflection-templates'; fi",
  "if [ -e '$RemoteRoot/app/data/admin-overrides' ] && [ ! -e '$releaseDir/data/admin-overrides' ]; then mkdir -p '$releaseDir/data'; cp -a '$RemoteRoot/app/data/admin-overrides' '$releaseDir/data/admin-overrides'; fi",
  "cd '$releaseDir'",
  "npm ci",
  "npm run build",
  "ln -sfn '$releaseDir' '$RemoteRoot/current'",
  "sudo mkdir -p /etc/systemd/system/cs201-portal.service.d",
  "printf '[Service]\nWorkingDirectory=$RemoteRoot/current\n' | sudo tee /etc/systemd/system/cs201-portal.service.d/versioned-release.conf >/dev/null",
  "sudo systemctl daemon-reload",
  "sudo systemctl restart cs201-portal.service",
  "systemctl is-active cs201-portal.service",
  "readlink -f '$RemoteRoot/current'",
  "curl -I http://127.0.0.1:3300/login"
) -join "; "
& ssh @sshArgs $remote "bash" "-lc" $activateCommand
Assert-LastExitCode "Activate remote release"

Remove-Item -LiteralPath $archivePath -Force
