# Kaoru Studio — Auto Update

## Cómo funciona

- Puedes seguir editando y haciendo `git push` normalmente.
- Los commits normales NO actualizan la aplicación instalada.
- Una actualización se publica únicamente cuando creas un tag `v...`.
- GitHub Actions construye el instalador NSIS, `latest.yml` y los publica en GitHub Releases.
- Kaoru Studio consulta GitHub al iniciar y cada 4 horas.
- Cuando termina de descargar una versión nueva, permite reiniciar e instalarla o dejarla para el cierre.

## Primera instalación

Genera/instala la primera versión normalmente:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
npm.cmd install
npm.cmd run dist:win
```

## Publicar una actualización

Ejemplo: pasar de 2026.9.19 a 2026.9.20.

1. Termina y prueba tus cambios.
2. Cambia `"version"` en `package.json` a `2026.9.20`.
3. Haz commit y push.
4. Crea y sube el tag.

```powershell
git add .
git commit -m "release: Kaoru Studio 2026.9.20"
git push origin main

git tag v2026.9.20
git push origin v2026.9.20
```

El tag ejecuta `.github/workflows/build-windows.yml`.

No publiques el Release como draft: electron-updater no detecta drafts.

## Importante

Mientras Kaoru Studio siga sin certificado Authenticode, la configuración desactiva la verificación de firma de actualización en Windows (`verifyUpdateCodeSignature: false`). El instalador y `latest.yml` siguen siendo publicados juntos por GitHub Releases. Cuando se firme la aplicación, vuelve a habilitar la verificación.
