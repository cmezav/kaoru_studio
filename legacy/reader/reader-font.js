import {
  getAsset,
  putAsset
} from './reader-db.js?cache=cloud-sync-1';

export const READING_FONT_ASSET_ID = 'reading-font';

const decoder = new TextDecoder('utf-8');
let activeFace = null;

function normalizePath(path) {
  const out = [];

  String(path || '')
    .replace(/\\/g, '/')
    .split('/')
    .forEach((part) => {
      if (!part || part === '.') return;
      if (part === '..') out.pop();
      else out.push(part);
    });

  return out.join('/');
}

class ZipArchive {
  constructor(buffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
    this.entries = [];
    this.readDirectory();
  }

  readDirectory() {
    const view = this.view;
    const length = view.byteLength;
    const min = Math.max(0, length - 65557);
    let eocd = -1;

    for (let offset = length - 22; offset >= min; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50) {
        eocd = offset;
        break;
      }
    }

    if (eocd < 0) {
      throw new Error('El ZIP de la fuente no es válido.');
    }

    const total = view.getUint16(eocd + 10, true);
    let cursor = view.getUint32(eocd + 16, true);

    for (let index = 0; index < total; index += 1) {
      if (view.getUint32(cursor, true) !== 0x02014b50) {
        throw new Error('El ZIP de la fuente está dañado.');
      }

      const method = view.getUint16(cursor + 10, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const nameBytes = this.bytes.slice(cursor + 46, cursor + 46 + nameLength);
      const name = normalizePath(decoder.decode(nameBytes));

      this.entries.push({
        name,
        method,
        compressedSize,
        localOffset
      });

      cursor += 46 + nameLength + extraLength + commentLength;
    }
  }

  async bytesFor(entry) {
    const offset = entry.localOffset;

    if (this.view.getUint32(offset, true) !== 0x04034b50) {
      throw new Error('No se pudo extraer la fuente del ZIP.');
    }

    const nameLength = this.view.getUint16(offset + 26, true);
    const extraLength = this.view.getUint16(offset + 28, true);
    const dataStart = offset + 30 + nameLength + extraLength;
    const compressed = this.bytes.slice(
      dataStart,
      dataStart + entry.compressedSize
    );

    if (entry.method === 0) return compressed;

    if (entry.method !== 8 || !('DecompressionStream' in window)) {
      throw new Error('Tu navegador no puede extraer este ZIP de fuente.');
    }

    const stream = new DecompressionStream('deflate-raw');
    const response = new Response(
      new Blob([compressed]).stream().pipeThrough(stream)
    );

    return new Uint8Array(await response.arrayBuffer());
  }
}

function bytesToBuffer(bytes) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  );
}

async function sourceFromFile(file) {
  const lower = String(file.name || '').toLowerCase();

  if (lower.endsWith('.ttf') || lower.endsWith('.otf')) {
    return {
      name: file.name,
      mime: lower.endsWith('.otf') ? 'font/otf' : 'font/ttf',
      bytes: new Uint8Array(await file.arrayBuffer())
    };
  }

  if (!lower.endsWith('.zip')) {
    throw new Error('Selecciona lucida-sans.zip, un TTF o un OTF.');
  }

  const zip = new ZipArchive(await file.arrayBuffer());

  const priorities = [
    'l_10646.ttf',
    'LSANS.TTF'
  ];

  let selected = null;

  for (const wanted of priorities) {
    selected = zip.entries.find((entry) =>
      entry.name.toLowerCase().endsWith(wanted.toLowerCase())
    );

    if (selected) break;
  }

  if (!selected) {
    selected = zip.entries.find((entry) =>
      /\.(ttf|otf)$/i.test(entry.name)
    );
  }

  if (!selected) {
    throw new Error('El ZIP no contiene una fuente TTF/OTF.');
  }

  const bytes = await zip.bytesFor(selected);
  const isOtf = /\.otf$/i.test(selected.name);

  return {
    name: selected.name.split('/').pop() || selected.name,
    mime: isOtf ? 'font/otf' : 'font/ttf',
    bytes
  };
}

export async function applyReadingFontAsset(asset) {
  if (!asset?.bytes) return false;

  const bytes = asset.bytes instanceof ArrayBuffer
    ? asset.bytes
    : asset.bytes.buffer;

  const blob = new Blob([bytes], {
    type: asset.mime || 'font/ttf'
  });

  const url = URL.createObjectURL(blob);

  try {
    const face = new FontFace(
      'KaoruReaderLucida',
      `url("${url}")`,
      {
        style: 'normal',
        weight: '400',
        display: 'swap'
      }
    );

    await face.load();

    if (activeFace) {
      try {
        document.fonts.delete(activeFace);
      } catch (_) {}
    }

    document.fonts.add(face);
    activeFace = face;

    document.documentElement.style.setProperty(
      '--reading-font',
      '"KaoruReaderLucida","Lucida Sans Unicode","Lucida Sans",Arial,Helvetica,sans-serif'
    );

    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadSavedReadingFont() {
  const asset = await getAsset(READING_FONT_ASSET_ID);

  if (!asset) return null;

  await applyReadingFontAsset(asset);
  return asset;
}

export async function importReadingFont(file) {
  const source = await sourceFromFile(file);

  const asset = {
    id: READING_FONT_ASSET_ID,
    name: source.name,
    mime: source.mime,
    bytes: bytesToBuffer(source.bytes),
    updatedAt: Date.now()
  };

  await putAsset(asset);
  await applyReadingFontAsset(asset);

  return asset;
}
