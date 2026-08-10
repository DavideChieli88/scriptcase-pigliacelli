$ErrorActionPreference = "Stop"

$commonPaths = @(
    "$env:ProgramFiles\OpenSCAD\openscad.exe",
    "${env:ProgramFiles(x86)}\OpenSCAD\openscad.exe"
)
$openScad = $commonPaths |
    Where-Object { $_ -and (Test-Path $_ -PathType Leaf) } |
    Select-Object -First 1

# Alcune installazioni winget non aggiungono subito OpenSCAD al PATH.
if (-not $openScad) {
    $wingetPackages = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (Test-Path $wingetPackages) {
        $openScad = Get-ChildItem `
            -Path (Join-Path $wingetPackages "OpenSCAD.OpenSCAD_*") `
            -Filter "openscad.exe" `
            -File `
            -Recurse `
            -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty FullName -First 1
    }
}

if (-not $openScad) {
    $command = Get-Command openscad -ErrorAction SilentlyContinue
    if ($command -and $command.Source -notlike "*\Microsoft\WindowsApps\*") {
        $openScad = $command.Source
    }
}

if (-not $openScad) {
    throw "Eseguibile OpenSCAD non trovato. Chiudi e riapri PowerShell dopo l'installazione oppure reinstalla OpenSCAD."
}

Write-Host "Uso OpenSCAD: $openScad"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputDir = Join-Path $root "STL"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$parts = [ordered]@{
    "01_wall.scad"       = "fortress_wall.stl"
    "02_gate_wall.scad"  = "fortress_gate_wall.stl"
    "03_gate_doors.scad" = "fortress_gate_doors.stl"
    "04_tower.scad"      = "fortress_tower.stl"
    "05_connector.scad"  = "fortress_connector.stl"
}

foreach ($source in $parts.Keys) {
    $inputPath = Join-Path $root $source
    $outputPath = Join-Path $outputDir $parts[$source]
    Write-Host "Esporto $source -> $($parts[$source])"
    $arguments = @("-o", "`"$outputPath`"", "`"$inputPath`"")
    $process = Start-Process `
        -FilePath $openScad `
        -ArgumentList $arguments `
        -Wait `
        -PassThru `
        -NoNewWindow
    if ($process.ExitCode -ne 0) {
        throw "Esportazione fallita per $source (codice $($process.ExitCode))."
    }
}

Write-Host "STL creati in: $outputDir"
