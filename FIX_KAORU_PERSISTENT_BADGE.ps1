$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Preload = Join-Path $Root "desktop\preload.cjs"

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host " KAORU STUDIO - BADGE GLOBAL PERSISTENTE" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host ""

if (-not (Test-Path $Preload)) {
    Write-Host "ERROR: No encuentro desktop\preload.cjs." -ForegroundColor Red
    exit 1
}

$Branch = (git -C $Root branch --show-current).Trim()
if ($Branch -eq "main") {
    Write-Host "ERROR: Estas en main." -ForegroundColor Red
    Write-Host "Crea primero una rama:" -ForegroundColor Yellow
    Write-Host "  git switch -c feat/persistent-taskbar-badge" -ForegroundColor Cyan
    exit 1
}

Write-Host "[OK] Rama: $Branch" -ForegroundColor Green

$Backup = "$Preload.global-badge.bak"
Copy-Item $Preload $Backup -Force

try {
@'
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const TASK_DB_NAME = 'kaoru_task_studio_db';
const TASK_STORE = 'tasks';
const BADGE_CACHE_KEY = 'kaoruTaskAttentionCount';

function normalizeCount(value) {
  const count = Math.floor(Number(value) || 0);
  return Math.max(0, count);
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function countAttentionTasks(tasks) {
  const limit = endOfToday();

  return (Array.isArray(tasks) ? tasks : []).filter((task) => {
    if (!task || task.completed || !task.dueAt) return false;

    const due = new Date(task.dueAt).getTime();

    return Number.isFinite(due) && due <= limit;
  }).length;
}

function readCachedCount() {
  try {
    return normalizeCount(localStorage.getItem(BADGE_CACHE_KEY));
  } catch (_) {
    return 0;
  }
}

function saveCachedCount(count) {
  try {
    localStorage.setItem(
      BADGE_CACHE_KEY,
      String(normalizeCount(count))
    );
  } catch (_) {}
}

function sendBadge(count) {
  const normalized = normalizeCount(count);
  saveCachedCount(normalized);
  ipcRenderer.send('kaoru:set-pending-badge', normalized);
}

async function taskDatabaseExists() {
  try {
    if (typeof indexedDB.databases !== 'function') {
      return null;
    }

    const databases = await indexedDB.databases();

    return databases.some((database) => (
      database && database.name === TASK_DB_NAME
    ));
  } catch (_) {
    return null;
  }
}

async function readTasksFromDatabase() {
  const exists = await taskDatabaseExists();

  // Importante: no abrimos una DB inexistente, porque eso crearia
  // kaoru_task_studio_db sin sus object stores.
  if (exists === false) return [];

  // En Chromium moderno databases() existe. Si no estuviera disponible,
  // conservamos el ultimo contador conocido sin crear una DB accidental.
  if (exists === null) return null;

  return new Promise((resolve) => {
    let request;

    try {
      request = indexedDB.open(TASK_DB_NAME);
    } catch (_) {
      resolve(null);
      return;
    }

    request.onerror = () => resolve(null);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(TASK_STORE)) {
        db.close();
        resolve([]);
        return;
      }

      let transaction;

      try {
        transaction = db.transaction(TASK_STORE, 'readonly');
      } catch (_) {
        db.close();
        resolve(null);
        return;
      }

      const getAll = transaction.objectStore(TASK_STORE).getAll();

      getAll.onerror = () => {
        db.close();
        resolve(null);
      };

      getAll.onsuccess = () => {
        const tasks = getAll.result || [];
        db.close();
        resolve(tasks);
      };
    };
  });
}

async function refreshBadgeFromDatabase() {
  try {
    const tasks = await readTasksFromDatabase();

    if (tasks === null) {
      sendBadge(readCachedCount());
      return;
    }

    sendBadge(countAttentionTasks(tasks));
  } catch (_) {
    sendBadge(readCachedCount());
  }
}

// Task Studio sigue enviando el valor en tiempo real cuando esta abierto.
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;

  const data = event.data || {};

  if (data.type !== 'kaoru:task-count') return;
  if (!Object.prototype.hasOwnProperty.call(data, 'attentionCount')) return;

  sendBadge(data.attentionCount);
});

// Al abrir Kaoru, calcula el badge aunque Task Studio nunca se abra.
window.addEventListener('DOMContentLoaded', () => {
  refreshBadgeFromDatabase();
});

// Si vuelves a Kaoru tras editar/sincronizar datos, vuelve a comprobar.
window.addEventListener('focus', () => {
  refreshBadgeFromDatabase();
});

// Mantiene correcto el contador si cambia el dia con Kaoru abierta.
setInterval(() => {
  refreshBadgeFromDatabase();
}, 60 * 1000);

contextBridge.exposeInMainWorld('kaoruDesktop', {
  setPendingBadge(count) {
    sendBadge(count);
  },

  refreshPendingBadge() {
    refreshBadgeFromDatabase();
  }
});
'@ | Set-Content $Preload -Encoding UTF8

    node --check $Preload

    if ($LASTEXITCODE -ne 0) {
        throw "desktop\preload.cjs no paso la verificacion de sintaxis."
    }

    Write-Host ""
    Write-Host "[OK] Badge global persistente instalado." -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora el contador:" -ForegroundColor Cyan
    Write-Host "  - aparece al abrir Kaoru"
    Write-Host "  - no necesita abrir Task Studio"
    Write-Host "  - permanece al cambiar de modulo"
    Write-Host "  - se recalcula al enfocar Kaoru"
    Write-Host "  - se recalcula cada minuto"
    Write-Host ""
    Write-Host "Prueba con:" -ForegroundColor Yellow
    Write-Host "  npm.cmd start" -ForegroundColor White
    Write-Host ""

    Remove-Item $Backup -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Restaurando preload anterior..." -ForegroundColor Yellow
    Copy-Item $Backup $Preload -Force
    exit 1
}
