import {
  listBooks,
  getBook,
  putBook,
  deleteBook,
  listProgress,
  getProgress,
  putProgress,
  getAsset,
  putAsset
} from './reader-db.js?cache=cloud-sync-1';

import {
  READING_FONT_ASSET_ID
} from './reader-font.js?cache=cloud-sync-1';

const CONFIG_KEY = 'kaoru.archive-reader.cloud';
const VAULT_ROOT = 'reader-vault';
const VAULT_PATH = `${VAULT_ROOT}/vault.json`;
const STATE_PATH = `${VAULT_ROOT}/state.enc`;
const PROGRESS_PATH = `${VAULT_ROOT}/progress.enc`;
const FONT_PATH = `${VAULT_ROOT}/assets/reading-font.enc`;
const KDF_ITERATIONS = 250000;
const CHECK_TEXT = 'KAORU_ARCHIVE_READER_VAULT_V1';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let cloud = null;
let listener = () => {};
let syncPromise = null;
let syncTimer = 0;

function emit(type, message, extra = {}) {
  try {
    listener({
      type,
      message,
      connected: Boolean(cloud),
      ...extra
    });
  } catch (_) {}
}

export function setCloudStatusListener(fn) {
  listener = typeof fn === 'function' ? fn : () => {};
}

export function isCloudUnlocked() {
  return Boolean(cloud);
}

export function getSavedCloudConfig() {
  try {
    const value = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');

    if (!value || !value.owner || !value.repo) return null;
    return value;
  } catch (_) {
    return null;
  }
}

export function lockCloud() {
  cloud = null;
  clearTimeout(syncTimer);
  syncTimer = 0;
  emit('locked', 'Nube bloqueada. Tus archivos locales siguen disponibles.');
}

export function forgetCloudConfig() {
  lockCloud();

  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch (_) {}
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function utf8ToBase64(value) {
  return bytesToBase64(encoder.encode(String(value || '')));
}

function base64ToUtf8(value) {
  return decoder.decode(base64ToBytes(value));
}

async function deriveKeys(password, saltB64, iterations) {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltB64),
      iterations,
      hash: 'SHA-256'
    },
    material,
    512
  );

  const bytes = new Uint8Array(bits);

  const aes = await crypto.subtle.importKey(
    'raw',
    bytes.slice(0, 32),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  const hmac = await crypto.subtle.importKey(
    'raw',
    bytes.slice(32, 64),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return { aes, hmac };
}

async function encryptBytes(bytes, aes) {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    aes,
    bytes
  );

  return {
    v: 1,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted))
  };
}

async function decryptBytes(envelope, aes) {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(envelope.iv)
    },
    aes,
    base64ToBytes(envelope.data)
  );

  return new Uint8Array(decrypted);
}

async function compress(bytes) {
  if (!('CompressionStream' in window)) {
    return {
      compression: 'none',
      bytes
    };
  }

  const stream = new CompressionStream('gzip');
  const response = new Response(
    new Blob([bytes]).stream().pipeThrough(stream)
  );

  return {
    compression: 'gzip',
    bytes: new Uint8Array(await response.arrayBuffer())
  };
}

async function decompress(bytes, compression) {
  if (compression !== 'gzip') return bytes;

  if (!('DecompressionStream' in window)) {
    throw new Error('Este navegador no puede descomprimir la biblioteca cifrada.');
  }

  const stream = new DecompressionStream('gzip');
  const response = new Response(
    new Blob([bytes]).stream().pipeThrough(stream)
  );

  return new Uint8Array(await response.arrayBuffer());
}

async function encryptJson(value, aes) {
  const packed = await compress(
    encoder.encode(JSON.stringify(value))
  );

  const envelope = await encryptBytes(packed.bytes, aes);

  return JSON.stringify({
    ...envelope,
    kind: 'json',
    compression: packed.compression
  });
}

async function decryptJson(text, aes) {
  const envelope = JSON.parse(text);
  const bytes = await decryptBytes(envelope, aes);
  const unpacked = await decompress(bytes, envelope.compression);

  return JSON.parse(decoder.decode(unpacked));
}

async function encryptedToken(token, aes) {
  return encryptBytes(encoder.encode(token), aes);
}

async function decryptedToken(envelope, aes) {
  return decoder.decode(await decryptBytes(envelope, aes));
}

function safePart(value, label) {
  const clean = String(value || '').trim();

  if (!/^[A-Za-z0-9_.-]+$/.test(clean)) {
    throw new Error(`${label} no es válido.`);
  }

  return clean;
}

function encodeRepoPath(path) {
  return String(path || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

class GitHubClient {
  constructor(owner, repo, token, branch = '') {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.branch = branch;
    this.base =
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  }

  headers(extra = {}) {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...extra
    };
  }

  async request(url, options = {}, allow404 = false) {
    const response = await fetch(url, {
      ...options,
      headers: this.headers(options.headers || {})
    });

    if (allow404 && response.status === 404) return null;

    if (!response.ok) {
      let detail = '';

      try {
        const body = await response.json();
        detail = body?.message ? ` ${body.message}` : '';
      } catch (_) {}

      if (response.status === 401 || response.status === 403) {
        throw new Error(`GitHub rechazó el acceso.${detail} Revisa el token y sus permisos.`);
      }

      if (response.status === 404) {
        throw new Error('No se encontró el repositorio privado o el token no tiene acceso.');
      }

      throw new Error(`GitHub respondió ${response.status}.${detail}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async repoInfo() {
    return this.request(this.base);
  }

  async getFile(path) {
    const ref = this.branch
      ? `?ref=${encodeURIComponent(this.branch)}`
      : '';

    const data = await this.request(
      `${this.base}/contents/${encodeRepoPath(path)}${ref}`,
      {},
      true
    );

    if (!data) return null;

    if (Array.isArray(data)) {
      throw new Error(`Se esperaba un archivo en ${path}.`);
    }

    let content = data.content || '';

    if ((!content || data.encoding === 'none') && data.sha) {
      const blob = await this.request(
        `${this.base}/git/blobs/${encodeURIComponent(data.sha)}`
      );

      content = blob?.content || '';
    }

    return {
      path: data.path,
      sha: data.sha,
      text: base64ToUtf8(content)
    };
  }

  async listDir(path) {
    const ref = this.branch
      ? `?ref=${encodeURIComponent(this.branch)}`
      : '';

    const data = await this.request(
      `${this.base}/contents/${encodeRepoPath(path)}${ref}`,
      {},
      true
    );

    if (!data) return [];
    return Array.isArray(data) ? data : [];
  }

  async putFile(path, text, message, sha = '') {
    const body = {
      message,
      content: utf8ToBase64(text),
      branch: this.branch
    };

    if (sha) body.sha = sha;

    return this.request(
      `${this.base}/contents/${encodeRepoPath(path)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );
  }

  async deleteFile(path, sha, message) {
    if (!sha) return;

    return this.request(
      `${this.base}/contents/${encodeRepoPath(path)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          sha,
          branch: this.branch
        })
      }
    );
  }
}

async function bookPath(bookId) {
  const signed = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      cloud.keys.hmac,
      encoder.encode(bookId)
    )
  );

  const hex = Array.from(signed)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

  return `${VAULT_ROOT}/books/${hex}.enc`;
}

function cleanBookForCloud(book) {
  return {
    ...book,
    lastOpenedAt: 0
  };
}

function bookUpdatedAt(book) {
  return Number(
    book?.contentUpdatedAt ||
    book?.importedAt ||
    0
  );
}

async function loadVault(client, password, savedSalt = '') {
  let remote = await client.getFile(VAULT_PATH);

  if (!remote) {
    const salt = bytesToBase64(randomBytes(16));
    const keys = await deriveKeys(password, salt, KDF_ITERATIONS);
    const check = await encryptBytes(encoder.encode(CHECK_TEXT), keys.aes);

    const vault = {
      version: 1,
      kdf: 'PBKDF2-SHA256',
      iterations: KDF_ITERATIONS,
      salt,
      check
    };

    await client.putFile(
      VAULT_PATH,
      JSON.stringify(vault, null, 2),
      'init: crear Kaoru Reader vault'
    );

    return {
      vault,
      keys
    };
  }

  const vault = JSON.parse(remote.text);

  if (
    !vault?.salt ||
    !vault?.iterations ||
    !vault?.check
  ) {
    throw new Error('El vault de Reader no es válido.');
  }

  if (savedSalt && savedSalt !== vault.salt) {
    throw new Error('La configuración local no corresponde a este vault.');
  }

  const keys = await deriveKeys(
    password,
    vault.salt,
    Number(vault.iterations)
  );

  let checkText = '';

  try {
    checkText = decoder.decode(
      await decryptBytes(vault.check, keys.aes)
    );
  } catch (_) {
    throw new Error('La clave de biblioteca es incorrecta.');
  }

  if (checkText !== CHECK_TEXT) {
    throw new Error('La clave de biblioteca es incorrecta.');
  }

  return {
    vault,
    keys
  };
}

function saveEncryptedConfig({
  owner,
  repo,
  branch,
  vault,
  tokenEnvelope
}) {
  try {
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({
        version: 1,
        owner,
        repo,
        branch,
        salt: vault.salt,
        iterations: vault.iterations,
        token: tokenEnvelope,
        updatedAt: Date.now()
      })
    );
  } catch (_) {}
}

export async function connectCloud({
  owner,
  repo,
  token,
  password
}) {
  if (!navigator.onLine) {
    throw new Error('Necesitas conexión para configurar la nube por primera vez.');
  }

  owner = safePart(owner, 'El usuario');
  repo = safePart(repo, 'El repositorio');
  token = String(token || '').trim();
  password = String(password || '');

  if (!token) {
    throw new Error('Ingresa el fine-grained token de GitHub.');
  }

  if (password.length < 8) {
    throw new Error('La clave de biblioteca debe tener al menos 8 caracteres.');
  }

  emit('working', 'Conectando con GitHub…');

  const client = new GitHubClient(owner, repo, token);
  const info = await client.repoInfo();

  if (!info.private) {
    throw new Error('Por seguridad, Reader solo acepta un repositorio PRIVADO para la nube.');
  }

  if (!info.default_branch) {
    throw new Error('El repositorio está vacío. Créalo con un README para inicializar su rama principal.');
  }

  client.branch = info.default_branch;

  const { vault, keys } = await loadVault(
    client,
    password
  );

  const tokenEnvelope = await encryptedToken(
    token,
    keys.aes
  );

  cloud = {
    owner,
    repo,
    branch: client.branch,
    client,
    vault,
    keys
  };

  saveEncryptedConfig({
    owner,
    repo,
    branch: client.branch,
    vault,
    tokenEnvelope
  });

  emit(
    'connected',
    `Conectado a ${owner}/${repo}.`,
    {
      owner,
      repo
    }
  );

  return {
    owner,
    repo,
    branch: client.branch
  };
}

export async function unlockSavedCloud(password) {
  const saved = getSavedCloudConfig();

  if (!saved) {
    throw new Error('No hay una conexión guardada en este dispositivo.');
  }

  if (!navigator.onLine) {
    throw new Error('Conéctate a Internet para desbloquear la nube.');
  }

  password = String(password || '');

  if (password.length < 8) {
    throw new Error('Ingresa tu clave de biblioteca.');
  }

  emit('working', 'Desbloqueando nube…');

  const keys = await deriveKeys(
    password,
    saved.salt,
    Number(saved.iterations || KDF_ITERATIONS)
  );

  let token = '';

  try {
    token = await decryptedToken(
      saved.token,
      keys.aes
    );
  } catch (_) {
    throw new Error('La clave de biblioteca es incorrecta.');
  }

  const client = new GitHubClient(
    saved.owner,
    saved.repo,
    token,
    saved.branch || ''
  );

  const info = await client.repoInfo();

  if (!info.private) {
    throw new Error('El repositorio de Reader dejó de ser privado. Sincronización bloqueada.');
  }

  if (!info.default_branch) {
    throw new Error('El repositorio de Reader está vacío. Inicialízalo con un README.');
  }

  client.branch = info.default_branch;

  const vaultResult = await loadVault(
    client,
    password,
    saved.salt
  );

  cloud = {
    owner: saved.owner,
    repo: saved.repo,
    branch: client.branch,
    client,
    vault: vaultResult.vault,
    keys: vaultResult.keys
  };

  emit(
    'connected',
    `Nube desbloqueada: ${saved.owner}/${saved.repo}.`,
    {
      owner: saved.owner,
      repo: saved.repo
    }
  );

  return {
    owner: saved.owner,
    repo: saved.repo,
    branch: client.branch
  };
}

async function readEncryptedJson(path, fallback) {
  const file = await cloud.client.getFile(path);

  if (!file) {
    return {
      value: fallback,
      sha: ''
    };
  }

  return {
    value: await decryptJson(file.text, cloud.keys.aes),
    sha: file.sha
  };
}

async function writeEncryptedJson(path, value, message, sha = '') {
  const text = await encryptJson(
    value,
    cloud.keys.aes
  );

  return cloud.client.putFile(
    path,
    text,
    message,
    sha
  );
}

async function loadState() {
  const result = await readEncryptedJson(
    STATE_PATH,
    {
      version: 1,
      deleted: {}
    }
  );

  if (!result.value.deleted) {
    result.value.deleted = {};
  }

  return result;
}

async function syncStateAndDeletions() {
  const stateRemote = await loadState();
  const state = stateRemote.value;
  let changed = false;
  const books = await listBooks();
  const progress = await listProgress();

  for (const [bookId, deletedAtRaw] of Object.entries(state.deleted || {})) {
    const deletedAt = Number(deletedAtRaw || 0);
    const local = books.find((book) => book.id === bookId);

    if (
      local &&
      bookUpdatedAt(local) <= deletedAt
    ) {
      await deleteBook(bookId);
    }

    const path = await bookPath(bookId);
    const remoteBookFile = await cloud.client.getFile(path);

    if (remoteBookFile) {
      await cloud.client.deleteFile(
        path,
        remoteBookFile.sha,
        `reader: eliminar ${bookId}`
      );
    }
  }

  return {
    state,
    stateSha: stateRemote.sha,
    changed
  };
}

async function syncBooks(state) {
  const remoteFiles = await cloud.client.listDir(
    `${VAULT_ROOT}/books`
  );

  const remoteMap = new Map();

  for (const item of remoteFiles) {
    if (
      item.type !== 'file' ||
      !String(item.name || '').endsWith('.enc')
    ) {
      continue;
    }

    const file = await cloud.client.getFile(item.path);

    if (!file) continue;

    try {
      const payload = await decryptJson(
        file.text,
        cloud.keys.aes
      );

      if (payload?.kind === 'book' && payload.book?.id) {
        remoteMap.set(payload.book.id, {
          book: payload.book,
          path: item.path,
          sha: file.sha
        });
      }
    } catch (_) {
      throw new Error('Hay una historia cifrada que no puede abrirse con esta clave.');
    }
  }

  let localBooks = await listBooks();
  const localMap = new Map(
    localBooks.map((book) => [book.id, book])
  );

  let pulled = 0;
  let pushed = 0;

  for (const [bookId, remote] of remoteMap.entries()) {
    const deletedAt = Number(state.deleted?.[bookId] || 0);

    if (
      deletedAt &&
      bookUpdatedAt(remote.book) <= deletedAt
    ) {
      continue;
    }

    const local = localMap.get(bookId);

    if (!local) {
      await putBook({
        ...remote.book,
        lastOpenedAt: 0
      });
      localMap.set(bookId, remote.book);
      pulled += 1;
      continue;
    }

    if (
      bookUpdatedAt(remote.book) >
      bookUpdatedAt(local)
    ) {
      await putBook({
        ...remote.book,
        lastOpenedAt: local.lastOpenedAt || 0
      });
      localMap.set(bookId, remote.book);
      pulled += 1;
    }
  }

  localBooks = await listBooks();

  for (const local of localBooks) {
    const deletedAt = Number(state.deleted?.[local.id] || 0);

    if (
      deletedAt &&
      bookUpdatedAt(local) <= deletedAt
    ) {
      continue;
    }

    if (
      deletedAt &&
      bookUpdatedAt(local) > deletedAt
    ) {
      delete state.deleted[local.id];
    }

    const remote = remoteMap.get(local.id);

    if (
      remote &&
      bookUpdatedAt(remote.book) >= bookUpdatedAt(local)
    ) {
      continue;
    }

    const path = remote?.path || await bookPath(local.id);

    await writeEncryptedJson(
      path,
      {
        version: 1,
        kind: 'book',
        book: cleanBookForCloud(local)
      },
      remote
        ? `reader: actualizar ${local.title}`
        : `reader: guardar ${local.title}`,
      remote?.sha || ''
    );

    pushed += 1;
  }

  return {
    pulled,
    pushed
  };
}

async function syncProgress(state) {
  const remote = await readEncryptedJson(
    PROGRESS_PATH,
    {
      version: 1,
      items: {}
    }
  );

  const remoteItems = remote.value.items || {};
  const localItems = await listProgress();
  const merged = { ...remoteItems };
  let changedRemote = !remote.sha;
  let pulled = 0;

  for (const local of localItems) {
    if (state.deleted?.[local.bookId]) {
      if (merged[local.bookId]) {
        delete merged[local.bookId];
        changedRemote = true;
      }
      continue;
    }

    const current = merged[local.bookId];

    if (
      !current ||
      Number(local.updatedAt || 0) >
      Number(current.updatedAt || 0)
    ) {
      merged[local.bookId] = local;
      changedRemote = true;
    }
  }

  for (const [bookId, remoteProgress] of Object.entries(merged)) {
    if (state.deleted?.[bookId]) {
      delete merged[bookId];
      changedRemote = true;
      continue;
    }

    const local = await getProgress(bookId);

    if (
      !local ||
      Number(remoteProgress.updatedAt || 0) >
      Number(local.updatedAt || 0)
    ) {
      await putProgress(remoteProgress);
      pulled += 1;
    }
  }

  if (changedRemote) {
    await writeEncryptedJson(
      PROGRESS_PATH,
      {
        version: 1,
        items: merged,
        updatedAt: Date.now()
      },
      'reader: sincronizar progreso',
      remote.sha
    );
  }

  return {
    pulled,
    pushed: changedRemote ? 1 : 0
  };
}

function assetToPayload(asset) {
  const bytes = asset.bytes instanceof ArrayBuffer
    ? new Uint8Array(asset.bytes)
    : new Uint8Array(asset.bytes?.buffer || asset.bytes || []);

  return {
    version: 1,
    kind: 'asset',
    id: asset.id,
    name: asset.name,
    mime: asset.mime,
    updatedAt: asset.updatedAt,
    data: bytesToBase64(bytes)
  };
}

function payloadToAsset(payload) {
  const bytes = base64ToBytes(payload.data || '');

  return {
    id: payload.id,
    name: payload.name,
    mime: payload.mime,
    updatedAt: Number(payload.updatedAt || 0),
    bytes: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    )
  };
}

async function syncFont() {
  const local = await getAsset(
    READING_FONT_ASSET_ID
  );

  const remoteFile = await cloud.client.getFile(
    FONT_PATH
  );

  let remoteAsset = null;

  if (remoteFile) {
    const payload = await decryptJson(
      remoteFile.text,
      cloud.keys.aes
    );

    if (
      payload?.kind === 'asset' &&
      payload.id === READING_FONT_ASSET_ID
    ) {
      remoteAsset = payloadToAsset(payload);
    }
  }

  if (
    remoteAsset &&
    (
      !local ||
      Number(remoteAsset.updatedAt || 0) >
      Number(local.updatedAt || 0)
    )
  ) {
    await putAsset(remoteAsset);

    return {
      changed: true,
      direction: 'pulled'
    };
  }

  if (
    local &&
    (
      !remoteAsset ||
      Number(local.updatedAt || 0) >
      Number(remoteAsset.updatedAt || 0)
    )
  ) {
    await writeEncryptedJson(
      FONT_PATH,
      assetToPayload(local),
      'reader: sincronizar tipografia',
      remoteFile?.sha || ''
    );

    return {
      changed: false,
      direction: 'pushed'
    };
  }

  return {
    changed: false,
    direction: 'none'
  };
}

async function saveStateIfNeeded(state, stateSha, beforeJson) {
  const afterJson = JSON.stringify(state);

  if (afterJson === beforeJson) return;

  await writeEncryptedJson(
    STATE_PATH,
    {
      version: 1,
      deleted: state.deleted || {},
      updatedAt: Date.now()
    },
    'reader: sincronizar estado',
    stateSha
  );
}

export async function syncCloud() {
  if (!cloud) {
    throw new Error('Desbloquea la nube primero.');
  }

  if (!navigator.onLine) {
    emit('offline', 'Sin conexión. Los cambios quedaron guardados localmente.');
    return {
      offline: true
    };
  }

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    emit('working', 'Sincronizando biblioteca…');

    const stateResult = await syncStateAndDeletions();
    const state = stateResult.state;
    const stateBefore = JSON.stringify(state);

    const books = await syncBooks(state);
    const progress = await syncProgress(state);
    const font = await syncFont();

    await saveStateIfNeeded(
      state,
      stateResult.stateSha,
      stateBefore
    );

    const summary = [
      books.pulled ? `${books.pulled} obra(s) descargada(s)` : '',
      books.pushed ? `${books.pushed} obra(s) subida(s)` : '',
      progress.pulled ? 'progreso actualizado' : '',
      font.direction === 'pulled' ? 'fuente descargada' : '',
      font.direction === 'pushed' ? 'fuente subida' : ''
    ].filter(Boolean).join(' · ');

    emit(
      'synced',
      summary
        ? `Sincronizado: ${summary}.`
        : 'Todo está sincronizado.',
      {
        fontChanged: font.changed
      }
    );

    return {
      books,
      progress,
      font
    };
  })();

  try {
    return await syncPromise;
  } finally {
    syncPromise = null;
  }
}

export function scheduleCloudSync(delay = 120000) {
  if (!cloud || !navigator.onLine) return;

  if (syncTimer) return;

  syncTimer = setTimeout(async () => {
    syncTimer = 0;

    try {
      await syncCloud();
    } catch (error) {
      emit(
        'error',
        error?.message || 'No se pudo sincronizar.'
      );
    }
  }, Math.max(1000, Number(delay) || 120000));
}

export async function deleteBookEverywhere(bookId) {
  if (!cloud) {
    throw new Error('Desbloquea la nube para eliminar la obra de todos tus dispositivos.');
  }

  const stateRemote = await loadState();
  const state = stateRemote.value;

  state.deleted[bookId] = Date.now();

  const path = await bookPath(bookId);
  const remoteBook = await cloud.client.getFile(path);

  if (remoteBook) {
    await cloud.client.deleteFile(
      path,
      remoteBook.sha,
      `reader: eliminar ${bookId}`
    );
  }

  const remoteProgress = await readEncryptedJson(
    PROGRESS_PATH,
    {
      version: 1,
      items: {}
    }
  );

  if (remoteProgress.value.items?.[bookId]) {
    delete remoteProgress.value.items[bookId];

    await writeEncryptedJson(
      PROGRESS_PATH,
      remoteProgress.value,
      `reader: eliminar progreso ${bookId}`,
      remoteProgress.sha
    );
  }

  await writeEncryptedJson(
    STATE_PATH,
    {
      version: 1,
      deleted: state.deleted,
      updatedAt: Date.now()
    },
    `reader: registrar eliminacion ${bookId}`,
    stateRemote.sha
  );

  await deleteBook(bookId);

  emit(
    'synced',
    'Obra eliminada de la nube y de este dispositivo.'
  );
}
