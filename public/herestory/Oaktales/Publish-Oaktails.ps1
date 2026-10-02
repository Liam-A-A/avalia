# Copies the approved Oaktails demo page into a local clone of the avalia repo as public\oaktails, commits it, then prints the push command and stops (you push).
param(
    [string]$RepoClone = 'D:\repos\avalia',
    [string]$Source    = 'D:\_A\_review\Oaktails_Landing_Demo_2026-10-02-1803'
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath (Join-Path $RepoClone '.git'))) { throw "Not a git clone: $RepoClone (pass -RepoClone with the real path)." }
if (-not (Test-Path -LiteralPath (Join-Path $Source 'index.html'))) { throw "index.html not found in: $Source" }

Push-Location $RepoClone
try {
    git pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw "git pull failed. Fix the clone first, nothing was copied." }

    $dest = Join-Path $RepoClone 'public\oaktails'
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item -LiteralPath (Join-Path $Source 'index.html') -Destination $dest -Force
    Copy-Item -LiteralPath (Join-Path $Source 'fonts') -Destination $dest -Recurse -Force

    git add -- public/oaktails

    # Safety check: refuse to commit anything outside public/oaktails
    $outside = git diff --cached --name-only | Where-Object { $_ -notlike 'public/oaktails/*' }
    if ($outside) { git reset | Out-Null; throw "Other files were staged, aborting: $($outside -join ', ')" }

    git commit -m "Add Oaktails demo landing page at /oaktails" -m "Static page and self-hosted fonts only. No existing files changed.`n`nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`nClaude-Session: https://claude.ai/code/session_01JAjkgZRVea1zfxmvvsbdew"
    if ($LASTEXITCODE -ne 0) { throw "git commit did not complete (nothing to commit?)." }
}
finally { Pop-Location }

Write-Host ""
Write-Host "Committed. To publish, run:" -ForegroundColor Green
Write-Host "  git -C `"$RepoClone`" push origin main"
Write-Host "Then check https://avalia.ie/oaktails/ in about a minute."
