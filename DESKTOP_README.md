# Kaoru Studio Desktop — Windows

Esta capa convierte el Kaoru Studio actual en una aplicación de Windows sin reescribir los Studios.

## Qué conserva

- `index.html`, `app/dist`, `legacy` y `vendor` se sirven sin modificar.
- Archive Reader mantiene HTTP local para Service Worker, Cache Storage, IndexedDB y blobs.
- Task Studio y Archive Reader conservan el código actual de Kaoru Cloud/Supabase.
- El servidor solo escucha en `127.0.0.1`.
- Se usa un puerto fijo (`48761`) para que el origen de almacenamiento local sea estable entre aperturas.
- Solo se permite una instancia a la vez.

## Crear el instalador en Windows

1. Copia estos archivos en la raíz del repositorio `kaoru_studio`.
2. Instala Node.js LTS si aún no lo tienes.
3. Ejecuta `BUILD_WINDOWS.ps1` desde PowerShell.
4. El instalador queda en `dist-desktop/Kaoru-Studio-Setup-2026.9.19.exe`.

También puedes usar:

```powershell
npm install --no-audit --no-fund
npm run dist:win
```

## GitHub Actions

El archivo `.github/workflows/build-windows.yml` permite compilar el mismo `.exe` en `windows-latest` y publicarlo como artifact del workflow.

## Nota sobre Windows SmartScreen

El instalador inicial no está firmado con un certificado Authenticode. Windows puede mostrar “Editor desconocido” o SmartScreen aunque el archivo sea el que acabas de compilar. La firma de código se puede añadir más adelante sin cambiar la arquitectura de la app.
