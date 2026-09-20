'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 48761;

const ROOT_FILES = new Set([
  'index.html',
  'logo.png',
  'icono-kaoru.png',
  'kaoru-notification-icon.png',
  'kaoru-notification-badge.png',
  'reader-sw.js',
  'reader-cache-reset.html'
]);

const ROOT_DIRS = new Set(['app', 'legacy', 'vendor']);

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.pdf', 'application/pdf'],
  ['.epub', 'application/epub+zip'],
  ['.glb', 'model/gltf-binary'],
  ['.gltf', 'model/gltf+json'],
  ['.fbx', 'application/octet-stream'],
  ['.bin', 'application/octet-stream'],
  ['.bcmap', 'application/octet-stream'],
  ['.wasm', 'application/wasm']
]);

function mimeType(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}

function cacheHeaders() {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

function writeText(res, statusCode, message, extraHeaders = {}) {
  const body = Buffer.from(String(message), 'utf8');
  res.writeHead(statusCode, {
    ...cacheHeaders(),
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    ...extraHeaders
  });
  res.end(body);
}

function isAllowedRelativePath(relativePath) {
  if (ROOT_FILES.has(relativePath)) return true;
  const first = relativePath.split(path.sep)[0];
  return ROOT_DIRS.has(first);
}

function resolveRequestPath(rootDir, rawUrl, origin) {
  let url;
  try {
    url = new URL(rawUrl || '/', origin);
  } catch {
    return null;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  let relativePath = decoded.replace(/^[/\\]+/, '');
  if (!relativePath) relativePath = 'index.html';
  if (relativePath.endsWith('/') || relativePath.endsWith('\\')) {
    relativePath += 'index.html';
  }

  const normalized = path.normalize(relativePath);
  if (
    normalized === '..' ||
    normalized.startsWith(`..${path.sep}`) ||
    path.isAbsolute(normalized) ||
    !isAllowedRelativePath(normalized)
  ) {
    return null;
  }

  const root = path.resolve(rootDir);
  const fullPath = path.resolve(root, normalized);
  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) return null;

  return fullPath;
}

function parseByteRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(header).trim());
  if (!match) return { invalid: true };

  let start = match[1] === '' ? null : Number(match[1]);
  let end = match[2] === '' ? null : Number(match[2]);

  if (start === null && end === null) return { invalid: true };

  if (start === null) {
    if (!Number.isInteger(end) || end <= 0) return { invalid: true };
    const suffixLength = Math.min(end, size);
    start = size - suffixLength;
    end = size - 1;
  } else {
    if (!Number.isInteger(start) || start < 0 || start >= size) return { invalid: true };
    if (end === null || end >= size) end = size - 1;
    if (!Number.isInteger(end) || end < start) return { invalid: true };
  }

  return { start, end };
}

function streamFile(req, res, filePath, stat) {
  const baseHeaders = {
    ...cacheHeaders(),
    'Content-Type': mimeType(filePath),
    'Accept-Ranges': 'bytes'
  };

  const range = parseByteRange(req.headers.range, stat.size);
  if (range?.invalid) {
    res.writeHead(416, {
      ...baseHeaders,
      'Content-Range': `bytes */${stat.size}`
    });
    return res.end();
  }

  if (range) {
    const contentLength = range.end - range.start + 1;
    res.writeHead(206, {
      ...baseHeaders,
      'Content-Range': `bytes ${range.start}-${range.end}/${stat.size}`,
      'Content-Length': contentLength
    });
    if (req.method === 'HEAD') return res.end();

    const stream = fs.createReadStream(filePath, { start: range.start, end: range.end });
    stream.on('error', () => {
      if (!res.headersSent) writeText(res, 500, 'Kaoru Studio: error al leer el archivo.');
      else res.destroy();
    });
    stream.pipe(res);
    return;
  }

  res.writeHead(200, {
    ...baseHeaders,
    'Content-Length': stat.size
  });
  if (req.method === 'HEAD') return res.end();

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) writeText(res, 500, 'Kaoru Studio: error al leer el archivo.');
    else res.destroy();
  });
  stream.pipe(res);
}

function createStaticServer({ rootDir, host = DEFAULT_HOST, port = DEFAULT_PORT } = {}) {
  if (!rootDir) throw new Error('rootDir es obligatorio.');
  const origin = `http://${host}:${port}`;

  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return writeText(res, 405, 'Método no permitido.', { Allow: 'GET, HEAD' });
    }

    const filePath = resolveRequestPath(rootDir, req.url, origin);
    if (!filePath) return writeText(res, 404, 'Archivo no encontrado.');

    fs.stat(filePath, (error, stat) => {
      if (error || !stat.isFile()) return writeText(res, 404, 'Archivo no encontrado.');
      streamFile(req, res, filePath, stat);
    });
  });

  server.keepAliveTimeout = 5_000;
  server.headersTimeout = 10_000;

  return {
    server,
    origin,
    start() {
      return new Promise((resolve, reject) => {
        const onError = (error) => {
          server.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve({ host, port, origin });
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, host);
      });
    },
    close() {
      return new Promise((resolve) => {
        if (!server.listening) return resolve();
        server.close(() => resolve());
      });
    }
  };
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  createStaticServer,
  mimeType,
  parseByteRange,
  resolveRequestPath
};
