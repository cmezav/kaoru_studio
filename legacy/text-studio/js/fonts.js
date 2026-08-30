/* ============================================================
   FONTS.JS — Sistema de importación y biblioteca de fuentes
   Responsabilidad única: leer, validar, parsear y persistir fuentes.
   No sabe nada de texto, render ni UI de paneles (eso vive en otros módulos).
   ============================================================ */

const FONT_DB_NAME = 'text_studio_fonts_db';
const FONT_STORE = 'fonts';
const FONT_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2'];

/* Firmas binarias reales de cada formato (los primeros bytes del archivo).
   Se usan para NO depender solo de la extensión, tal como pide el spec. */
const SIGNATURES = {
  ttf: [[0x00, 0x01, 0x00, 0x00], [0x74, 0x72, 0x75, 0x65] /* 'true' */],
  otf: [[0x4F, 0x54, 0x54, 0x4F] /* 'OTTO' */],
  ttc: [[0x74, 0x74, 0x63, 0x66] /* 'ttcf' */],
  woff: [[0x77, 0x4F, 0x46, 0x46] /* 'wOFF' */],
  woff2: [[0x77, 0x4F, 0x46, 0x32] /* 'wOF2' */],
};

const IGNORED_NAME_PATTERNS = [
  /readme/i, /license/i, /licence/i, /copying/i, /\.txt$/i,
  /\.html?$/i, /\.pdf$/i, /\.docx?$/i, /\.png$/i, /\.jpe?g$/i,
  /\.gif$/i, /\.webp$/i, /\.ai$/i, /\.eps$/i, /\.ds_store$/i,
  /^__macosx/i, /fontforge/i, /\.md$/i,
];

function bytesMatch(bytes, signature) {
  return signature.every((b, i) => bytes[i] === b);
}

/** Inspecciona los primeros bytes de un ArrayBuffer y devuelve el formato real, o null. */
function detectFontFormat(arrayBuffer) {
  const head = new Uint8Array(arrayBuffer.slice(0, 4));
  for (const [format, sigs] of Object.entries(SIGNATURES)) {
    if (sigs.some((sig) => bytesMatch(head, sig))) {
      return format === 'ttc' ? 'ttf' : format; // tratamos ttc como ttf a efectos de parsing best-effort
    }
  }
  return null;
}

function looksLikeIgnorable(path) {
  return IGNORED_NAME_PATTERNS.some((re) => re.test(path));
}

function extensionOf(path) {
  const m = /\.([a-z0-9]+)$/i.exec(path);
  return m ? m[1].toLowerCase() : '';
}

/* ---------------- IndexedDB: biblioteca local de fuentes ---------------- */

function openFontDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FONT_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FONT_STORE)) {
        db.createObjectStore(FONT_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(record) {
  const db = await openFontDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, 'readwrite');
    tx.objectStore(FONT_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll() {
  const db = await openFontDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, 'readonly');
    const req = tx.objectStore(FONT_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(id) {
  const db = await openFontDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, 'readwrite');
    tx.objectStore(FONT_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function uid() {
  return 'f_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/* ---------------- Núcleo: parseo + registro de una fuente cruda ---------------- */

/**
 * Toma un ArrayBuffer + nombre de archivo, valida que sea una fuente real,
 * la parsea con opentype.js (para path/metrics) y la registra como FontFace
 * (para que el navegador la use en <canvas> con fillText / CSS).
 * Devuelve un objeto FontEntry o lanza si no es una fuente válida/soportada.
 */
async function ingestFontBuffer(arrayBuffer, fileName) {
  const format = detectFontFormat(arrayBuffer) || extensionOf(fileName);
  if (!FONT_EXTENSIONS.includes(format)) {
    throw new Error(`"${fileName}" no parece ser un archivo de fuente válido.`);
  }

  let otFont = null;
  try {
    otFont = opentype.parse(arrayBuffer);
  } catch (e) {
    if (format === 'woff2') {
      throw new Error(
        `"${fileName}" es WOFF2. El motor de vectorización (opentype.js) no puede leer WOFF2 sin un decodificador Brotli adicional. Convierte a TTF/OTF/WOFF para usar todas las funciones, o continúa: se intentará cargar solo para vista previa de texto.`
      );
    }
    throw new Error(`No se pudo parsear "${fileName}": ${e.message}`);
  }

  const family =
    (otFont.names.preferredFamily && otFont.names.preferredFamily.en) ||
    (otFont.names.fontFamily && otFont.names.fontFamily.en) ||
    fileName.replace(/\.[^.]+$/, '');
  const subfamily =
    (otFont.names.preferredSubfamily && otFont.names.preferredSubfamily.en) ||
    (otFont.names.fontSubfamily && otFont.names.fontSubfamily.en) ||
    'Regular';

  const cssFamilyName = `ts-${family}-${subfamily}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Registrar como FontFace para que funcione con canvas fillText / medidas nativas.
  const fontFace = new FontFace(cssFamilyName, arrayBuffer);
  await fontFace.load();
  document.fonts.add(fontFace);

  return {
    id: uid(),
    fileName,
    family,
    subfamily,
    cssFamilyName,
    format,
    unitsPerEm: otFont.unitsPerEm,
    createdAt: Date.now(),
    buffer: arrayBuffer, // se guarda para persistir en IndexedDB
    otFont, // instancia en memoria (no se serializa)
  };
}

/* ---------------- Manejo de ZIP recursivo ---------------- */

/**
 * Recorre un .zip completo (cualquier profundidad de carpetas), detecta
 * qué entradas son fuentes reales (por firma binaria, no solo extensión)
 * e ignora README/licencias/imágenes/etc.
 * Devuelve [{ path, arrayBuffer, guessedFormat }]
 */
async function scanZipForFonts(zipArrayBuffer) {
  const zip = await JSZip.loadAsync(zipArrayBuffer);
  const candidates = [];

  const entries = Object.values(zip.files).filter((f) => !f.dir);
  for (const entry of entries) {
    if (looksLikeIgnorable(entry.name)) continue;
    const ext = extensionOf(entry.name);
    // Solo molestamos en leer bytes de archivos que "podrían" ser fuentes:
    // por extensión conocida, o sin extensión reconocible (podría ser fuente rara).
    const worthChecking = FONT_EXTENSIONS.includes(ext) || ext === '';
    if (!worthChecking) continue;

    try {
      const buf = await entry.async('arraybuffer');
      if (buf.byteLength < 12) continue; // demasiado pequeño para ser una fuente
      const format = detectFontFormat(buf);
      if (!format) continue; // la firma no corresponde a ninguna fuente conocida
      candidates.push({ path: entry.name, arrayBuffer: buf, guessedFormat: format });
    } catch (e) {
      // Entrada corrupta o encriptada: se ignora silenciosamente, no rompe el resto del ZIP.
      console.warn('No se pudo leer entrada del ZIP:', entry.name, e);
    }
  }
  return candidates;
}

/* ---------------- API pública del módulo ---------------- */

const FontLibrary = {
  /** Fuentes cargadas en memoria esta sesión (incluye otFont utilizable). */
  loaded: [],

  async init() {
    const stored = await dbGetAll();
    for (const rec of stored) {
      try {
        const entry = await ingestFontBuffer(rec.buffer, rec.fileName);
        entry.id = rec.id; // conservar el id persistido
        this.loaded.push(entry);
      } catch (e) {
        console.warn('Fuente guardada ya no es válida, se omite:', rec.fileName, e);
      }
    }
    return this.loaded;
  },

  /** Importa un único archivo de fuente (File) y lo persiste. */
  async importFile(file) {
    const buf = await file.arrayBuffer();
    const entry = await ingestFontBuffer(buf, file.name);
    this.loaded.push(entry);
    await dbPut({ id: entry.id, fileName: entry.fileName, buffer: entry.buffer, createdAt: entry.createdAt });
    return entry;
  },

  /** Importa bytes de fuente incluidos en un archivo de proyecto portable. */
  async importBuffer(arrayBuffer, fileName, preferredId) {
    const existing = this.loaded.find((f) =>
      (preferredId && f.id === preferredId) || (f.fileName === fileName && f.buffer?.byteLength === arrayBuffer.byteLength)
    );
    if (existing) return existing;
    const entry = await ingestFontBuffer(arrayBuffer, fileName);
    if (preferredId && !this.loaded.some((f) => f.id === preferredId)) entry.id = preferredId;
    this.loaded.push(entry);
    await dbPut({ id: entry.id, fileName: entry.fileName, buffer: entry.buffer, createdAt: entry.createdAt });
    return entry;
  },

  /** Importa un .zip: devuelve { imported: FontEntry[], skipped: string[], errors: {path,message}[] } */
  async importZip(file) {
    const buf = await file.arrayBuffer();
    const candidates = await scanZipForFonts(buf);
    const imported = [];
    const errors = [];
    for (const c of candidates) {
      try {
        const entry = await ingestFontBuffer(c.arrayBuffer, c.path.split('/').pop());
        this.loaded.push(entry);
        await dbPut({ id: entry.id, fileName: entry.fileName, buffer: entry.buffer, createdAt: entry.createdAt });
        imported.push(entry);
      } catch (e) {
        errors.push({ path: c.path, message: e.message });
      }
    }
    return { imported, errors, totalFound: candidates.length };
  },

  async remove(id) {
    this.loaded = this.loaded.filter((f) => f.id !== id);
    await dbDelete(id);
  },

  getById(id) {
    return this.loaded.find((f) => f.id === id) || null;
  },
};

window.FontLibrary = FontLibrary;
