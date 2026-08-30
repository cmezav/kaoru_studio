param(
    [string]$Repo = "."
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

function Read-Utf8([string]$Path) {
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8([string]$Path, [string]$Text) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8NoBom)
}

function Patch-File {
    param(
        [string]$RelativePath,
        [scriptblock]$Transform
    )

    $full = Join-Path $Repo $RelativePath
    if (-not (Test-Path -LiteralPath $full)) {
        Write-Host "[SKIP] Missing: $RelativePath" -ForegroundColor Yellow
        return
    }

    $before = Read-Utf8 $full
    $after = & $Transform $before

    if ($after -eq $before) {
        Write-Host "[OK] Already correct or no change needed: $RelativePath" -ForegroundColor DarkYellow
    } else {
        Write-Utf8 $full $after
        Write-Host "[OK] Patched: $RelativePath" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Kaoru Studio - integrate Image Studio into main shell" -ForegroundColor Cyan
Write-Host "Repo: $((Resolve-Path $Repo).Path)"
Write-Host ""

# 1) Runtime build used by root index.html
Patch-File "app\dist\app.js" {
    param($t)
    $t = $t -replace [regex]::Escape("src: './legacy/image-launcher/index.html?embed=1'"), "src: './legacy/image-studio/index.html?embed=1'"
    $t = $t -replace [regex]::Escape("src: './image-studio-standalone/index.html?embed=1'"), "src: './legacy/image-studio/index.html?embed=1'"
    return $t
}

# 2) TS source, just to keep source and dist synchronized
Patch-File "app\src\app.tsx" {
    param($t)
    $t = $t -replace [regex]::Escape("src:'./legacy/image-launcher/index.html?embed=1'"), "src:'./legacy/image-studio/index.html?embed=1'"
    $t = $t -replace [regex]::Escape("src:'./image-studio-standalone/index.html?embed=1'"), "src:'./legacy/image-studio/index.html?embed=1'"
    return $t
}

# 3) Shared navigation: Alt+3 and internal links
Patch-File "legacy\shared\studioBridge.js" {
    param($t)
    $t = $t -replace "image:\s*'image-launcher'", "image: 'image-studio'"
    return $t
}

# 4) Gallery JS: image records open in the integrated studio, not a new tab
Patch-File "legacy\gallery\js\main.js" {
    param($t)

    # Replace special standalone studioUrl with normal shared navigation.
    $t = [regex]::Replace(
        $t,
        "function\s+studioUrl\(name\)\s*\{\s*if\s*\(name==='image'\)\s*return\s+new\s+URL\([^}]+?;\s*return\s+window\.StudioBridge\.studioUrl\(name\)\s*\}",
        "function studioUrl(name){return window.StudioBridge.studioUrl(name)}"
    )

    # Replace special image window.open branch with same-tab navigation.
    $t = [regex]::Replace(
        $t,
        "async\s+function\s+openRecord\(record\)\s*\{\s*window\.StudioGallery\.setLaunchIntent\(record\.id,record\.studio\);\s*const\s+url=studioUrl\(record\.studio\);\s*if\s*\(record\.studio==='image'\)\s*\{\s*window\.open\(url,'_blank','noopener'\);\s*return\s*\}\s*location\.href=url\s*\}",
        "async function openRecord(record){window.StudioGallery.setLaunchIntent(record.id,record.studio);location.href=studioUrl(record.studio)}"
    )

    return $t
}

# 5) Gallery visible links: ANY old standalone/launcher Image URL -> integrated Image Studio
Patch-File "legacy\gallery\index.html" {
    param($t)

    $t = $t.Replace("../../image-studio-standalone/index.html", "../image-studio/index.html")
    $t = $t.Replace("../image-launcher/index.html", "../image-studio/index.html")
    $t = $t.Replace("../image-studio-standalone/index.html", "../image-studio/index.html")

    # Title cleanup without depending on accented/non-ASCII text.
    $t = $t.Replace("Image Studio standalone", "Image Studio")

    # Cache bust shared scripts used by gallery.
    $t = [regex]::Replace($t, "studioBridge\.js\?v=[0-9.]+", "studioBridge.js?v=14.3")
    $t = [regex]::Replace($t, "studioGallery\.js\?v=[0-9.]+", "studioGallery.js?v=14.3")
    $t = [regex]::Replace($t, "\./js/main\.js\?v=[0-9.]+", "./js/main.js?v=14.3")

    return $t
}

# 6) Root shell cache bust so browser/GitHub Pages does not keep old app.js
Patch-File "index.html" {
    param($t)
    $t = [regex]::Replace($t, "app/dist/app\.css\?v=[0-9.]+", "app/dist/app.css?v=14.3")
    $t = [regex]::Replace($t, "vendor/react\.production\.min\.js\?v=[0-9.]+", "vendor/react.production.min.js?v=14.3")
    $t = [regex]::Replace($t, "vendor/react-dom\.production\.min\.js\?v=[0-9.]+", "vendor/react-dom.production.min.js?v=14.3")
    $t = [regex]::Replace($t, "app/dist/app\.js\?v=[0-9.]+", "app/dist/app.js?v=14.3")
    return $t
}

Write-Host ""
Write-Host "Verification..." -ForegroundColor Cyan

$checks = @(
    @{ Path = "app\dist\app.js"; Good = "legacy/image-studio/index.html?embed=1"; Bad = "image-launcher/index.html?embed=1" },
    @{ Path = "legacy\shared\studioBridge.js"; Good = "image-studio"; Bad = "image-launcher" },
    @{ Path = "legacy\gallery\index.html"; Good = "../image-studio/index.html"; Bad = "image-studio-standalone/index.html" }
)

$failed = $false
foreach ($c in $checks) {
    $full = Join-Path $Repo $c.Path
    if (-not (Test-Path $full)) { continue }
    $txt = Read-Utf8 $full
    if ($txt.Contains($c.Good) -and -not $txt.Contains($c.Bad)) {
        Write-Host "[PASS] $($c.Path)" -ForegroundColor Green
    } else {
        Write-Host "[CHECK] $($c.Path) still contains an old Image route." -ForegroundColor Red
        $failed = $true
    }
}

Write-Host ""
if ($failed) {
    Write-Host "Some old route remains. Run:" -ForegroundColor Yellow
    Write-Host "  git grep -n -E 'image-launcher|image-studio-standalone'"
} else {
    Write-Host "Image Studio is now integrated into Kaoru Studio." -ForegroundColor Green
    Write-Host ""
    Write-Host "Review:"
    Write-Host "  git diff"
    Write-Host ""
    Write-Host "Then commit:"
    Write-Host "  git add app/dist/app.js app/src/app.tsx legacy/shared/studioBridge.js legacy/gallery/js/main.js legacy/gallery/index.html index.html"
    Write-Host '  git commit -m "Integrate Image Studio into Kaoru Studio"'
    Write-Host "  git push origin main"
}
