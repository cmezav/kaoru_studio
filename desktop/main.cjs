'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, dialog, ipcMain, nativeImage, Tray, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const { createStaticServer, DEFAULT_PORT } = require('./static-server.cjs');

const APP_ID = 'com.cmezav.kaorustudio';
const STARTUP_ARG = '--kaoru-startup';
const DESKTOP_BUILD = () => app.getVersion();

let mainWindow = null;
let staticServer = null;
let quitting = false;
let updateCheckStarted = false;
let tray = null;

function setPendingTaskbarBadge(value) {
  if (process.platform !== 'win32') return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const count = Math.max(0, Math.floor(Number(value) || 0));

  if (count === 0) {
    mainWindow.setOverlayIcon(
      null,
      'Sin tareas vencidas ni pendientes para hoy'
    );
    return;
  }

  const fileName = count > 99
    ? '99plus.png'
    : String(count) + '.png';

  const badgePath = path.join(__dirname, 'badges', fileName);
  const image = nativeImage.createFromPath(badgePath);

  if (image.isEmpty()) {
    console.warn('[Kaoru Pending Badge] No se pudo cargar:', badgePath);
    return;
  }

  const overlay = image.resize({
    width: 16,
    height: 16,
    quality: 'best'
  });

  const description = count === 1
    ? '1 tarea pendiente para hoy o vencida'
    : String(count) + ' tareas pendientes para hoy o vencidas';

  mainWindow.setOverlayIcon(overlay, description);
}

ipcMain.on('kaoru:set-pending-badge', (event, count) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (event.sender !== mainWindow.webContents) return;

  setPendingTaskbarBadge(count);
});

function startupOptions() {
  return {
    path: process.execPath,
    args: [STARTUP_ARG]
  };
}

function startupSupported() {
  return process.platform === 'win32' && app.isPackaged;
}

function isStartupEnabled() {
  if (!startupSupported()) return false;

  try {
    const options = startupOptions();
    const settings = app.getLoginItemSettings(options);
    return Boolean(
      settings.openAtLogin ||
      settings.executableWillLaunchAtLogin
    );
  } catch (error) {
    console.error('[Kaoru Startup] No se pudo leer la configuracion:', error);
    return false;
  }
}

function setStartupEnabled(enabled) {
  if (!startupSupported()) return;

  try {
    const options = startupOptions();

    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      path: options.path,
      args: options.args,
      enabled: Boolean(enabled),
      name: 'Kaoru Studio'
    });
  } catch (error) {
    console.error('[Kaoru Startup] No se pudo cambiar la configuracion:', error);
  }
}

function configureStartupDefaultOnce() {
  if (!startupSupported()) return;

  const marker = path.join(
    app.getPath('userData'),
    '.kaoru-startup-configured-v1'
  );

  if (fs.existsSync(marker)) return;

  setStartupEnabled(true);

  try {
    fs.writeFileSync(
      marker,
      new Date().toISOString(),
      'utf8'
    );
  } catch (error) {
    console.error('[Kaoru Startup] No se pudo guardar la marca:', error);
  }
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function ensureTray(rootDir) {
  if (tray && !tray.isDestroyed()) return;

  const trayImage = nativeImage
    .createFromPath(path.join(rootDir, 'logo.png'))
    .resize({ width: 16, height: 16, quality: 'best' });

  tray = new Tray(trayImage);
  tray.setToolTip('Kaoru Studio');

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Abrir Kaoru Studio',
        click: () => showMainWindow()
      },
      {
        label: 'Abrir Kaoru al iniciar Windows',
        type: 'checkbox',
        checked: isStartupEnabled(),
        enabled: startupSupported(),
        click: (menuItem) => {
          setStartupEnabled(menuItem.checked);
        }
      },
      { type: 'separator' },
      {
        label: 'Salir completamente',
        click: () => {
          quitting = true;
          app.quit();
        }
      }
    ])
  );

  tray.on('click', () => {
    showMainWindow();
  });

  tray.on('double-click', () => {
    showMainWindow();
  });
}

function configureAutoUpdates() {
  if (!app.isPackaged || updateCheckStarted) return;
  updateCheckStarted = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('error', (error) => {
    console.error('[Kaoru Update]', error);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualización de Kaoru Studio',
      message: `Kaoru Studio ${info.version} ya está lista.`,
      detail: 'Puedes reiniciar ahora para instalarla o continuar trabajando. Si continúas, se instalará al cerrar la aplicación.',
      buttons: ['Reiniciar e instalar', 'Después'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });

    if (result.response === 0) {
      quitting = true;
      autoUpdater.quitAndInstall(false, true);
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error('[Kaoru Update] No se pudo comprobar actualizaciones:', error);
    });
  }, 5000);

  // Si Kaoru queda abierto muchas horas, vuelve a consultar cada 4 horas.
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error('[Kaoru Update] No se pudo comprobar actualizaciones:', error);
    });
  }, 4 * 60 * 60 * 1000);
}

app.setAppUserModelId(APP_ID);

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    showMainWindow();
  });
}

function createWindow(origin, rootDir) {
  ensureTray(rootDir);
  mainWindow = new BrowserWindow({
    title: 'Kaoru Studio',
    width: 1520,
    height: 950,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#111111',
    icon: path.join(rootDir, 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (process.argv.includes(STARTUP_ARG)) {
      // Mostrar inactivo y minimizar para conservar el boton de taskbar
      // y permitir que aparezca el badge sin robar foco al iniciar Windows.
      mainWindow.showInactive();
      mainWindow.minimize();
      return;
    }

    mainWindow.show();
  });

  // Windows esta terminando la sesion: respetar apagado/reinicio/logoff.
  mainWindow.on('query-session-end', () => {
    quitting = true;
  });

  mainWindow.on('session-end', () => {
    quitting = true;
  });

  // [Kaoru] Cerrar -> minimizar.
  // Mantener la ventana viva permite conservar el overlay de Windows.
  mainWindow.on('close', (event) => {
    if (quitting) return;

    event.preventDefault();
    mainWindow.minimize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const url = `${origin}/?desktop=1&build=${encodeURIComponent(DESKTOP_BUILD())}#silhouette`;
  mainWindow.loadURL(url).catch(async (error) => {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Kaoru Studio',
      message: 'No se pudo abrir Kaoru Studio.',
      detail: error?.stack || String(error)
    });
    app.quit();
  });
}

async function boot() {
  const rootDir = app.getAppPath();
  staticServer = createStaticServer({ rootDir });

  try {
    const { origin } = await staticServer.start();
    createWindow(origin, rootDir);
  } catch (error) {
    const portInUse = error?.code === 'EADDRINUSE';
    await dialog.showMessageBox({
      type: 'error',
      title: 'Kaoru Studio',
      message: portInUse
        ? `Kaoru Studio no puede iniciar porque el puerto local ${DEFAULT_PORT} ya está en uso.`
        : 'Kaoru Studio no pudo iniciar su servidor local.',
      detail: portInUse
        ? 'Cierra otra instancia de Kaoru Studio o la aplicación que esté usando ese puerto y vuelve a abrirlo. El puerto se mantiene fijo para conservar tus datos locales entre sesiones.'
        : (error?.stack || String(error))
    });
    app.quit();
  }
}

app.whenReady().then(async () => {
  configureStartupDefaultOnce();
  await boot();
  configureAutoUpdates();
});

app.on('activate', () => {
  if (mainWindow) {
    showMainWindow();
    return;
  }
  if (staticServer?.server?.listening) {
    createWindow(staticServer.origin, app.getAppPath());
  }
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', async () => {
  if (quitting) return;
  quitting = true;
  try {
    await staticServer?.close();
  } finally {
    app.quit();
  }
});
