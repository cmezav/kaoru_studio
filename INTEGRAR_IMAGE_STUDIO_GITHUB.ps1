param(
    [string]$Repo = "."
)

$ErrorActionPreference = "Stop"

function Replace-Exact {
    param(
        [string]$Path,
        [string]$Old,
        [string]$New
    )

    $full = Join-Path $Repo $Path
    if (-not (Test-Path $full)) {
        throw "No existe: $Path"
    }

    $text = Get-Content -LiteralPath $full -Raw -Encoding UTF8

    if ($text.Contains($Old)) {
        $text = $text.Replace($Old, $New)
        Set-Content -LiteralPath $full -Value $text -Encoding UTF8 -NoNewline
        Write-Host "[OK] $Path" -ForegroundColor Green
        return
    }

    if ($text.Contains($New)) {
        Write-Host "[YA ESTABA] $Path" -ForegroundColor Yellow
        return
    }

    throw "No encontré el texto esperado en $Path. No se modificó ese archivo."
}

Write-Host ""
Write-Host "Kaoru's Studio - Integrar Image Studio nuevamente" -ForegroundColor Cyan
Write-Host "Repo: $(Resolve-Path $Repo)"
Write-Host ""

# 1. El build que realmente carga index.html.
Replace-Exact `
    "app\dist\app.js" `
    "src: './legacy/image-launcher/index.html?embed=1'" `
    "src: './legacy/image-studio/index.html?embed=1'"

# 2. Navegación compartida Alt+3 / botones internos.
Replace-Exact `
    "legacy\shared\studioBridge.js" `
    "const folders = { text: 'text-studio', image: 'image-launcher', gallery: 'gallery' };" `
    "const folders = { text: 'text-studio', image: 'image-studio', gallery: 'gallery' };"

# 3. La galería ya no debe abrir Image Studio standalone.
$galleryJs = Join-Path $Repo "legacy\gallery\js\main.js"
$galleryText = Get-Content -LiteralPath $galleryJs -Raw -Encoding UTF8

$oldGallery = "function studioUrl(name){if(name==='image')return new URL('../../image-studio-standalone/index.html', location.href).href;return window.StudioBridge.studioUrl(name)}`nasync function openRecord(record){window.StudioGallery.setLaunchIntent(record.id,record.studio);const url=studioUrl(record.studio);if(record.studio==='image'){window.open(url,'_blank','noopener');return}location.href=url}"
$newGallery = "function studioUrl(name){return window.StudioBridge.studioUrl(name)}`nasync function openRecord(record){window.StudioGallery.setLaunchIntent(record.id,record.studio);location.href=studioUrl(record.studio)}"

if ($galleryText.Contains($oldGallery)) {
    $galleryText = $galleryText.Replace($oldGallery, $newGallery)
    Set-Content -LiteralPath $galleryJs -Value $galleryText -Encoding UTF8 -NoNewline
    Write-Host "[OK] legacy\gallery\js\main.js" -ForegroundColor Green
} elseif ($galleryText.Contains($newGallery)) {
    Write-Host "[YA ESTABA] legacy\gallery\js\main.js" -ForegroundColor Yellow
} else {
    throw "No encontré el bloque standalone esperado en legacy\gallery\js\main.js"
}

# 4. Enlaces visibles de Galería.
Replace-Exact `
    "legacy\gallery\index.html" `
    'href="../../image-studio-standalone/index.html" title="Image Studio standalone · Alt+3"' `
    'href="../image-studio/index.html" title="Image Studio · Alt+3"'

Replace-Exact `
    "legacy\gallery\index.html" `
    'href="../../image-studio-standalone/index.html"><strong>◫ Nueva imagen</strong>' `
    'href="../image-studio/index.html"><strong>◫ Nueva imagen</strong>'

# 5. Cache-busting del shell para GitHub Pages / navegador.
$indexPath = Join-Path $Repo "index.html"
$indexText = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8
$indexText = $indexText.Replace("Kaoru's Studio · 14.2", "Kaoru's Studio · 14.3")
$indexText = $indexText.Replace("app.css?v=14.2", "app.css?v=14.3")
$indexText = $indexText.Replace("react.production.min.js?v=14.2", "react.production.min.js?v=14.3")
$indexText = $indexText.Replace("react-dom.production.min.js?v=14.2", "react-dom.production.min.js?v=14.3")
$indexText = $indexText.Replace("app.js?v=14.2", "app.js?v=14.3")
Set-Content -LiteralPath $indexPath -Value $indexText -Encoding UTF8 -NoNewline
Write-Host "[OK] index.html (cache v14.3)" -ForegroundColor Green

# 6. Actualizar versiones de scripts de galería para evitar caché.
$galleryHtml = Join-Path $Repo "legacy\gallery\index.html"
$g = Get-Content -LiteralPath $galleryHtml -Raw -Encoding UTF8
$g = $g.Replace("studioBridge.js?v=14.0", "studioBridge.js?v=14.3")
$g = $g.Replace("studioGallery.js?v=14.0", "studioGallery.js?v=14.3")
$g = $g.Replace("./js/main.js?v=14.0", "./js/main.js?v=14.3")
Set-Content -LiteralPath $galleryHtml -Value $g -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "Listo. Image Studio vuelve a usar legacy/image-studio dentro del shell." -ForegroundColor Cyan
Write-Host ""
Write-Host "Archivos modificados:" -ForegroundColor White
Write-Host "  app/dist/app.js"
Write-Host "  legacy/shared/studioBridge.js"
Write-Host "  legacy/gallery/js/main.js"
Write-Host "  legacy/gallery/index.html"
Write-Host "  index.html"
Write-Host ""
Write-Host "app/src/app.tsx NO se toca: en tu GitHub ya estaba correcto." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Revisa con:" -ForegroundColor White
Write-Host "  git diff"
Write-Host ""
Write-Host "Y si todo se ve bien:" -ForegroundColor White
Write-Host '  git add app/dist/app.js legacy/shared/studioBridge.js legacy/gallery/js/main.js legacy/gallery/index.html index.html'
Write-Host '  git commit -m "Integrate Image Studio back into Kaoru Studio"'
Write-Host '  git push origin main'
Write-Host ""
