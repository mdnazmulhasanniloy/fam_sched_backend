param(
    [string]$ImageName = "nazmulhasn/any_day_app_backend",
    [string]$Tag = "latest",
    [switch]$SkipPush,
    [switch]$NoCache
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot
try {
    $FullImage = "$ImageName:$Tag"

    Write-Host "Building Docker image: $FullImage"
    $buildArgs = @("build", ".", "-t", $FullImage)
    if ($NoCache) {
        $buildArgs += "--no-cache"
    }

    & docker @buildArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed for $FullImage"
    }

    if (-not $SkipPush) {
        Write-Host "Pushing Docker image: $FullImage"
        & docker push $FullImage
        if ($LASTEXITCODE -ne 0) {
            throw "Docker push failed for $FullImage"
        }
    }
    else {
        Write-Host "Skipping push because -SkipPush was used."
    }

    Write-Host "Done. Image: $FullImage"
}
finally {
    Pop-Location
}
