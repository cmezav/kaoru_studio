$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$BadgeDir = Join-Path $Root "desktop\badges"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host " KAORU STUDIO - REFRESH BADGES" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host ""

if (-not (Test-Path $BadgeDir)) {
    New-Item -ItemType Directory -Path $BadgeDir -Force | Out-Null
}

Add-Type -AssemblyName System.Drawing

function New-KaoruBadge([string]$Label, [string]$FileName) {
    # 256x256 para que al reducirse se vea más nítido
    $bmp = New-Object System.Drawing.Bitmap 256,256
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    # Colores más parecidos al estilo "To Do"
    $fillColor = [System.Drawing.Color]::FromArgb(232,223,255)
    $borderColor = [System.Drawing.Color]::FromArgb(140,255,255,255)
    $textColor = [System.Drawing.Color]::FromArgb(38,28,52)

    $fillBrush = New-Object System.Drawing.SolidBrush $fillColor
    $borderPen = New-Object System.Drawing.Pen $borderColor, 10
    $textBrush = New-Object System.Drawing.SolidBrush $textColor

    # Círculo más grande, con menos margen
    $g.FillEllipse($fillBrush, 8, 8, 240, 240)
    $g.DrawEllipse($borderPen, 8, 8, 240, 240)

    if ($Label.Length -eq 1) {
        $fontSize = 150
    }
    elseif ($Label.Length -eq 2) {
        $fontSize = 124
    }
    else {
        $fontSize = 86
    }

    $font = New-Object System.Drawing.Font "Segoe UI", $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    # Ligeramente más arriba/centrado visualmente
    $rect = New-Object System.Drawing.RectangleF 0, -6, 256, 256
    $g.DrawString($Label, $font, $textBrush, $rect, $format)

    $outPath = Join-Path $BadgeDir $FileName
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $format.Dispose()
    $font.Dispose()
    $textBrush.Dispose()
    $borderPen.Dispose()
    $fillBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

# Limpiar badges anteriores
Get-ChildItem $BadgeDir -Filter *.png -ErrorAction SilentlyContinue | Remove-Item -Force

1..99 | ForEach-Object {
    New-KaoruBadge "$_" "$_.png"
}

New-KaoruBadge "99+" "99plus.png"

Write-Host "[OK] Badges regenerados correctamente." -ForegroundColor Green
Write-Host "Prueba ahora con:" -ForegroundColor Cyan
Write-Host "  npm.cmd start"
Write-Host ""