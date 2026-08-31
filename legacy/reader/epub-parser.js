const decoder = new TextDecoder('utf-8');

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

function dirname(path) {
  const clean = normalizePath(path);
  const index = clean.lastIndexOf('/');
  return index >= 0 ? clean.slice(0, index + 1) : '';
}

function resolvePath(baseFile, href) {
  const cleanHref = String(href || '').split('#')[0].split('?')[0];

  if (!cleanHref) return normalizePath(baseFile);
  if (cleanHref.startsWith('/')) return normalizePath(cleanHref.slice(1));

  return normalizePath(dirname(baseFile) + cleanHref);
}

function xml(text) {
  return new DOMParser().parseFromString(text, 'application/xml');
}

function html(text) {
  return new DOMParser().parseFromString(text, 'text/html');
}

function localElements(root, localName) {
  return Array.from(root.getElementsByTagNameNS('*', localName));
}

function textOf(root, localName) {
  const node = localElements(root, localName)[0];
  return node ? String(node.textContent || '').trim() : '';
}

function decodeName(bytes) {
  return decoder.decode(bytes);
}

class ZipArchive {
  constructor(buffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
    this.entries = new Map();
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
      throw new Error('El EPUB no contiene un directorio ZIP válido.');
    }

    const total = view.getUint16(eocd + 10, true);
    let cursor = view.getUint32(eocd + 16, true);

    for (let index = 0; index < total; index += 1) {
      if (view.getUint32(cursor, true) !== 0x02014b50) {
        throw new Error('El directorio del EPUB está dañado.');
      }

      const method = view.getUint16(cursor + 10, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const uncompressedSize = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const nameBytes = this.bytes.slice(cursor + 46, cursor + 46 + nameLength);
      const name = normalizePath(decodeName(nameBytes));

      this.entries.set(name, {
        name,
        method,
        compressedSize,
        uncompressedSize,
        localOffset
      });

      cursor += 46 + nameLength + extraLength + commentLength;
    }
  }

  has(path) {
    return this.entries.has(normalizePath(path));
  }

  async bytesFor(path) {
    const key = normalizePath(path);
    const entry = this.entries.get(key);

    if (!entry) {
      throw new Error(`Falta un archivo requerido dentro del EPUB: ${key}`);
    }

    const offset = entry.localOffset;

    if (this.view.getUint32(offset, true) !== 0x04034b50) {
      throw new Error(`La entrada ${key} del EPUB no es válida.`);
    }

    const nameLength = this.view.getUint16(offset + 26, true);
    const extraLength = this.view.getUint16(offset + 28, true);
    const dataStart = offset + 30 + nameLength + extraLength;
    const compressed = this.bytes.slice(
      dataStart,
      dataStart + entry.compressedSize
    );

    if (entry.method === 0) {
      return compressed;
    }

    if (entry.method !== 8) {
      throw new Error(`Compresión EPUB no compatible (${entry.method}).`);
    }

    if (!('DecompressionStream' in window)) {
      throw new Error('Este navegador es demasiado antiguo para abrir EPUB offline.');
    }

    let stream;

    try {
      stream = new DecompressionStream('deflate-raw');
    } catch (_) {
      throw new Error('Tu navegador no permite descomprimir este EPUB. Actualiza Chrome/Brave.');
    }

    const response = new Response(
      new Blob([compressed]).stream().pipeThrough(stream)
    );

    return new Uint8Array(await response.arrayBuffer());
  }

  async text(path) {
    return decoder.decode(await this.bytesFor(path));
  }
}

const ALLOWED = new Set([
  'p','br','strong','b','em','i','u','s','del','blockquote',
  'hr','h1','h2','h3','h4','h5','h6','ul','ol','li','dl','dt',
  'dd','a','span','div','sup','sub','code','pre'
]);

const DROP = new Set([
  'script','style','link','meta','iframe','object','embed','form',
  'input','button','select','textarea','svg','canvas','img','video',
  'audio','source'
]);

function safeHref(value) {
  const href = String(value || '').trim();

  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:/i.test(href)) return href;
  return '';
}

function sanitizeNode(node, outputDocument) {
  if (node.nodeType === Node.TEXT_NODE) {
    return outputDocument.createTextNode(node.nodeValue || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tag = node.tagName.toLowerCase();

  if (DROP.has(tag)) return null;

  if (!ALLOWED.has(tag)) {
    const fragment = outputDocument.createDocumentFragment();

    Array.from(node.childNodes).forEach((child) => {
      const safe = sanitizeNode(child, outputDocument);
      if (safe) fragment.appendChild(safe);
    });

    return fragment;
  }

  const element = outputDocument.createElement(tag);

  if (tag === 'a') {
    const href = safeHref(node.getAttribute('href'));

    if (href) {
      element.setAttribute('href', href);
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    }
  }

  Array.from(node.childNodes).forEach((child) => {
    const safe = sanitizeNode(child, outputDocument);
    if (safe) element.appendChild(safe);
  });

  return element;
}

function sanitizeBody(xhtml) {
  const input = html(xhtml);
  const output = document.implementation.createHTMLDocument('');
  const container = output.createElement('div');

  Array.from(input.body ? input.body.childNodes : []).forEach((node) => {
    const safe = sanitizeNode(node, output);
    if (safe) container.appendChild(safe);
  });

  return container.innerHTML;
}

function parseNcx(ncxText, ncxPath) {
  const doc = xml(ncxText);
  const navPoints = localElements(doc, 'navPoint');

  return navPoints.map((point) => {
    const labelNode = localElements(point, 'navLabel')[0];
    const contentNode = localElements(point, 'content')[0];

    return {
      title: labelNode ? String(labelNode.textContent || '').trim() : 'Chapter',
      path: contentNode
        ? resolvePath(ncxPath, contentNode.getAttribute('src') || '')
        : ''
    };
  }).filter((item) => item.path);
}

function parseNavDocument(navText, navPath) {
  const doc = html(navText);
  const links = Array.from(doc.querySelectorAll('nav a[href]'));

  return links.map((link) => ({
    title: String(link.textContent || '').trim() || 'Chapter',
    path: resolvePath(navPath, link.getAttribute('href') || '')
  })).filter((item) => item.path);
}

async function stableId(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function extractAo3Url(texts) {
  for (const text of texts) {
    const match = String(text || '').match(
      /https:\/\/archiveofourown\.org\/works\/(\d+)/i
    );

    if (match) {
      return {
        url: `https://archiveofourown.org/works/${match[1]}`,
        workId: match[1]
      };
    }
  }

  return { url: '', workId: '' };
}

function storyChapterCount(chapters) {
  const chapterLike = chapters.filter((item) =>
    /^chapter\b/i.test(item.title || '')
  );

  return chapterLike.length || chapters.length;
}

export async function parseEpub(file) {
  if (!file) throw new Error('Selecciona un EPUB.');

  const archive = new ZipArchive(await file.arrayBuffer());

  if (!archive.has('META-INF/container.xml')) {
    throw new Error('Este archivo no parece ser un EPUB estándar.');
  }

  const container = xml(await archive.text('META-INF/container.xml'));
  const rootfile = localElements(container, 'rootfile')[0];
  const opfPath = normalizePath(rootfile?.getAttribute('full-path') || '');

  if (!opfPath || !archive.has(opfPath)) {
    throw new Error('No se encontró el paquete principal del EPUB.');
  }

  const opfText = await archive.text(opfPath);
  const opf = xml(opfText);
  const title = textOf(opf, 'title') || file.name.replace(/\.epub$/i, '');
  const author = textOf(opf, 'creator') || 'Unknown author';
  const language = textOf(opf, 'language') || '';
  const identifier = textOf(opf, 'identifier') || '';
  const publisher = textOf(opf, 'publisher') || '';
  const subjects = localElements(opf, 'subject')
    .map((node) => String(node.textContent || '').trim())
    .filter(Boolean);

  const manifest = new Map();

  localElements(opf, 'item').forEach((item) => {
    const id = item.getAttribute('id') || '';
    const href = item.getAttribute('href') || '';

    if (!id || !href) return;

    manifest.set(id, {
      id,
      path: resolvePath(opfPath, href),
      mediaType: item.getAttribute('media-type') || '',
      properties: item.getAttribute('properties') || ''
    });
  });

  const spine = localElements(opf, 'spine')[0];
  const spineItems = spine
    ? localElements(spine, 'itemref')
        .map((item) => manifest.get(item.getAttribute('idref') || ''))
        .filter(Boolean)
    : [];

  let toc = [];

  const tocId = spine?.getAttribute('toc') || '';
  const ncxItem = tocId ? manifest.get(tocId) : null;

  if (ncxItem && archive.has(ncxItem.path)) {
    toc = parseNcx(await archive.text(ncxItem.path), ncxItem.path);
  }

  if (!toc.length) {
    const navItem = Array.from(manifest.values()).find((item) =>
      String(item.properties || '').split(/\s+/).includes('nav')
    );

    if (navItem && archive.has(navItem.path)) {
      toc = parseNavDocument(await archive.text(navItem.path), navItem.path);
    }
  }

  if (!toc.length) {
    toc = spineItems
      .filter((item) => /xhtml|html/i.test(item.mediaType || ''))
      .map((item, index) => ({
        title: `Chapter ${index + 1}`,
        path: item.path
      }));
  }

  const unique = [];
  const seen = new Set();

  toc.forEach((item) => {
    const path = normalizePath(item.path);

    if (!path || seen.has(path) || !archive.has(path)) return;
    seen.add(path);
    unique.push({ ...item, path });
  });

  if (!unique.length) {
    throw new Error('El EPUB no contiene capítulos legibles.');
  }

  const rawTexts = [];
  const chapters = [];

  for (const item of unique) {
    const text = await archive.text(item.path);
    rawTexts.push(text);

    chapters.push({
      title: item.title || `Chapter ${chapters.length + 1}`,
      path: item.path,
      html: sanitizeBody(text)
    });
  }

  const ao3 = extractAo3Url(rawTexts);
  const idSeed = ao3.workId
    ? `ao3-work-${ao3.workId}`
    : `${title}|${author}|${identifier}|${file.size}`;

  return {
    id: ao3.workId ? `ao3-${ao3.workId}` : `epub-${await stableId(idSeed)}`,
    title,
    author,
    language,
    identifier,
    publisher,
    subjects,
    ao3Url: ao3.url,
    ao3WorkId: ao3.workId,
    chapters,
    storyChapterCount: storyChapterCount(chapters),
    importedAt: Date.now(),
    lastOpenedAt: 0,
    sourceFileName: file.name
  };
}
