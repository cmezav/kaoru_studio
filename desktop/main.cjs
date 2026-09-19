'use strict';

const path = require('node:path');
const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { createStaticServer, DEFAULT_PORT } = require('./static-server.cjs');

const APP_ID = 'com.cmezav.kaorustudio';
const DESKTOP_BUILD = '2026.09.19-desktop.1';

let mainWindow = null;
let staticServer = null;
let quitting = false;
let updateCheckStarted = false;

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
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

function createWindow(origin, rootDir) {
  mainWindow = new BrowserWindow({
    title: 'Kaoru Studio',
    width: 1520,
    height: 950,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#111111',
    icon: path.join(rootDir, 'icono-kaoru.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const url = `${origin}/?desktop=1&build=${encodeURIComponent(DESKTOP_BUILD)}#silhouette`;
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
  await boot();
  configureAutoUpdates();
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
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
