# Publish only the committed promotional website to GitHub Pages.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
try {
    $changes = git status --porcelain -- promo-site
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the website.' }
    if ($changes) { throw 'Commit the promo-site changes before publishing.' }
    $siteCommit = git subtree split --prefix=promo-site HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Unable to prepare the website.' }
    git push origin "${siteCommit}:gh-pages"
    if ($LASTEXITCODE -ne 0) { throw 'Website push failed.' }
    Write-Host 'Website: https://doublep987.github.io/tutel-hub/'
} finally {
    Pop-Location
}
