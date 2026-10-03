param(
    [Parameter(Mandatory = $true)]
    [string]$PublishedExe,

    [Parameter(Mandatory = $true)]
    [string]$OutputMsix,

    [string]$IdentityName = "CREAPD.OBSBridge.Dev",
    [string]$Publisher = "CN=CREAPD Development, OID.2.25.311729368913984317654407730594956997722=1",
    [string]$PublisherDisplayName = "CREAPD"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$template = Join-Path $PSScriptRoot "Package.appxmanifest.template"
$stage = Join-Path $root "msix-staging"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "Assets") | Out-Null

Copy-Item $PublishedExe (Join-Path $stage "CREAPDBridge.exe") -Force

$manifest = Get-Content $template -Raw
$manifest = $manifest.Replace("__IDENTITY_NAME__", $IdentityName)
$manifest = $manifest.Replace("__PUBLISHER__", $Publisher)
$manifest = $manifest.Replace("__PUBLISHER_DISPLAY_NAME__", $PublisherDisplayName)
Set-Content -Path (Join-Path $stage "AppxManifest.xml") -Value $manifest -Encoding UTF8

Add-Type -AssemblyName System.Drawing

function New-CreapdAsset {
    param(
        [string]$Path,
        [int]$Width,
        [int]$Height,
        [bool]$Wide = $false
    )

    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $background = [System.Drawing.Color]::FromArgb(255, 10, 11, 16)
    $accent = [System.Drawing.Color]::FromArgb(255, 236, 72, 153)
    $text = [System.Drawing.Color]::White

    $graphics.Clear($background)

    $barWidth = [Math]::Max(4, [int]($Width * 0.06))
    $barBrush = New-Object System.Drawing.SolidBrush($accent)
    $graphics.FillRectangle($barBrush, 0, 0, $barWidth, $Height)

    $label = if ($Wide) { "CREAPD OBS" } else { "C" }
    $fontSize = if ($Wide) { [Math]::Max(18, [int]($Height * 0.26)) } else { [Math]::Max(16, [int]($Height * 0.46)) }
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = New-Object System.Drawing.SolidBrush($text)

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rect = New-Object System.Drawing.RectangleF($barWidth, 0, ($Width - $barWidth), $Height)
    $graphics.DrawString($label, $font, $brush, $rect, $format)

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

    $format.Dispose()
    $brush.Dispose()
    $font.Dispose()
    $barBrush.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

$assets = Join-Path $stage "Assets"
New-CreapdAsset -Path (Join-Path $assets "StoreLogo.png") -Width 50 -Height 50
New-CreapdAsset -Path (Join-Path $assets "Square44x44Logo.png") -Width 44 -Height 44
New-CreapdAsset -Path (Join-Path $assets "Square150x150Logo.png") -Width 150 -Height 150
New-CreapdAsset -Path (Join-Path $assets "Square310x310Logo.png") -Width 310 -Height 310
New-CreapdAsset -Path (Join-Path $assets "Wide310x150Logo.png") -Width 310 -Height 150 -Wide $true

$programFilesX86 = [Environment]::GetFolderPath([Environment+SpecialFolder]::ProgramFilesX86)
$makeAppx = Get-ChildItem (Join-Path $programFilesX86 "Windows Kits\10\bin\*\x64\makeappx.exe") -ErrorAction Stop |
    Sort-Object FullName -Descending |
    Select-Object -First 1

if (-not $makeAppx) {
    throw "MakeAppx.exe was not found on this Windows runner."
}

$outputDir = Split-Path -Parent $OutputMsix
if ($outputDir -and -not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

if (Test-Path $OutputMsix) { Remove-Item $OutputMsix -Force }

Write-Host "Packaging CREAPD OBS Bridge"
Write-Host "Identity: $IdentityName"
Write-Host "Publisher: $Publisher"
Write-Host "Output: $OutputMsix"

& $makeAppx.FullName pack /d $stage /p $OutputMsix /o
if ($LASTEXITCODE -ne 0) {
    throw "MakeAppx failed with exit code $LASTEXITCODE."
}

Get-Item $OutputMsix | Format-List FullName, Length, LastWriteTime
