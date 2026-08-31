import * as pdfjsLib from './vendor/pdfjs/pdf.min.mjs';

import {
  getAsset,
  putAsset,
  getProgress,
  putProgress
} from './reader-db.js?cache=pdf-reader-1';

import {
  isCloudUnlocked,
  scheduleCloudSync
} from './reader-cloud.js?cache=cloud-sync-pdf-2';

const PDF_ASSET_PREFIX = 'pdf:';
const WORKER_URL = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
const CMAP_URL = new URL('./vendor/pdfjs/cmaps/', import.meta.url).href;

pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;

const elements = {
  pdfView: document.getElementById('pdfView'),
  pages: document.getElementById('pdfPages'),
  handle: document.getElementById('pdfControlHandle'),
  controls: document.getElementById('pdfControls'),
  controlsClose: document.getElementById('pdfControlsClose'),
  pageInput: document.getElementById('pdfPageInput'),
  pageTotal: document.getElementById('pdfPageTotal'),
  searchForm: document.getElementById('pdfSearchForm'),
  searchInput: document.getElementById('pdfSearchInput'),
  searchPrev: document.getElementById('pdfSearchPrev'),
  searchNext: document.getElementById('pdfSearchNext'),
  searchCount: document.getElementById('pdfSearchCount'),
  searchClear: document.getElementById('pdfSearchClear'),
  searchStatus: document.getElementById('pdfSearchStatus'),
  libraryBtn: document.getElementById('pdfLibraryBtn'),
  passwordDialog: document.getElementById('pdfPasswordDialog'),
  passwordTitle: document.getElementById('pdfPasswordTitle'),
  passwordMessage: document.getElementById('pdfPasswordMessage'),
  passwordForm: document.getElementById('pdfPasswordForm'),
  passwordInput: document.getElementById('pdfPasswordInput'),
  passwordCancel: document.getElementById('pdfPasswordCancel')
};

let pdfDocument = null;
let currentBook = null;
let currentPage = 1;
let pageRecords = new Map();
let textIndexes = new Map();
let renderObserver = null;
let saveTimer = 0;
let scrollFrame = 0;
let controlsTimer = 0;
let searchGeneration = 0;
let searchQuery = '';
let searchResults = [];
let activeSearchIndex = -1;
let sessionWriter = null;
let passwordRequest = null;
const passwordCache = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function pdfOptions(bytes) {
  return {
    data: bytes,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    useWorkerFetch: true,
    isEvalSupported: false
  };
}


function passwordReasonIsIncorrect(reason) {
  return (
    reason === pdfjsLib.PasswordResponses?.INCORRECT_PASSWORD ||
    Number(reason) === 2
  );
}

function closePasswordDialog(value = null) {
  if (!passwordRequest) return;

  const request = passwordRequest;
  passwordRequest = null;

  if (elements.passwordDialog) {
    elements.passwordDialog.hidden = true;
    elements.passwordDialog.setAttribute('aria-hidden', 'true');
  }

  if (elements.passwordInput) {
    elements.passwordInput.value = '';
  }

  request.resolve(value);
}

function requestPdfPassword({ title = 'PDF protegido', incorrect = false } = {}) {
  if (!elements.passwordDialog || !elements.passwordInput) {
    return Promise.resolve(
      window.prompt(
        incorrect
          ? 'Contraseña incorrecta. Intenta otra vez:'
          : 'Este PDF está protegido. Escribe la contraseña:'
      )
    );
  }

  if (passwordRequest) {
    passwordRequest.resolve(null);
    passwordRequest = null;
  }

  if (elements.passwordTitle) {
    elements.passwordTitle.textContent = title || 'PDF protegido';
  }

  if (elements.passwordMessage) {
    elements.passwordMessage.textContent = incorrect
      ? 'La contraseña no es correcta. Intenta nuevamente.'
      : 'Este PDF está cifrado. Escribe su contraseña para abrirlo.';
  }

  elements.passwordInput.value = '';
  elements.passwordDialog.hidden = false;
  elements.passwordDialog.setAttribute('aria-hidden', 'false');

  return new Promise((resolve) => {
    passwordRequest = { resolve };

    requestAnimationFrame(() => {
      elements.passwordInput?.focus({ preventScroll: true });
    });
  });
}

function createPdfLoadingTask(bytes, { bookId = '', title = '' } = {}) {
  const options = pdfOptions(bytes.slice());
  const cachedPassword = bookId ? passwordCache.get(bookId) : '';

  if (cachedPassword) {
    options.password = cachedPassword;
  }

  const task = pdfjsLib.getDocument(options);
  let suppliedPassword = cachedPassword || '';
  let passwordCancelled = false;

  task.onPassword = (updatePassword, reason) => {
    requestPdfPassword({
      title: title || 'PDF protegido',
      incorrect: passwordReasonIsIncorrect(reason)
    }).then((password) => {
      if (password == null) {
        passwordCancelled = true;

        try {
          task.destroy();
        } catch (_) {}

        return;
      }

      suppliedPassword = String(password);

      if (bookId) {
        passwordCache.set(bookId, suppliedPassword);
      }

      updatePassword(suppliedPassword);
    });
  };

  return {
    task,
    getSuppliedPassword: () => suppliedPassword,
    wasCancelled: () => passwordCancelled
  };
}

function cleanFileTitle(name) {
  return String(name || 'Documento PDF')
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Documento PDF';
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', bytes)
  );

  return Array.from(digest)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function metadataValue(metadata, key) {
  try {
    const value = metadata?.get?.(key);
    return typeof value === 'string' ? value.trim() : '';
  } catch (_) {
    return '';
  }
}

export function isPdfBook(book) {
  return String(book?.format || '').toLowerCase() === 'pdf';
}

export function pdfProgressPercent(book, progress) {
  if (!isPdfBook(book) || !progress) return 0;

  const count = Math.max(1, Number(book.pageCount) || 1);
  const pageIndex = clamp(
    progress.pdfPageIndex ?? progress.pageIndex ?? 0,
    0,
    count - 1
  );
  const ratio = clamp(progress.pdfPageRatio ?? progress.pageRatio ?? 0, 0, 1);

  return Math.round(((pageIndex + ratio) / count) * 100);
}

export function pdfProgressText(book, progress) {
  if (!progress) return 'Sin empezar';

  const count = Math.max(1, Number(book.pageCount) || 1);
  const page = clamp(
    Number(progress.pdfPageIndex ?? progress.pageIndex ?? 0) + 1,
    1,
    count
  );

  return `Página ${page} de ${count} · ${pdfProgressPercent(book, progress)}%`;
}

export async function parsePdfFile(file) {
  if (!file) {
    throw new Error('Selecciona un PDF.');
  }

  const name = String(file.name || 'documento.pdf');
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (
    bytes.length < 5 ||
    String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-'
  ) {
    throw new Error('El archivo seleccionado no parece ser un PDF válido.');
  }

  let task = null;
  let documentProxy = null;
  let loading = null;

  try {
    loading = createPdfLoadingTask(bytes, {
      title: cleanFileTitle(name)
    });
    task = loading.task;
    documentProxy = await task.promise;

    let metadataResult = null;

    try {
      metadataResult = await documentProxy.getMetadata();
    } catch (_) {}

    const info = metadataResult?.info || {};
    const metadata = metadataResult?.metadata;
    const title = String(
      info.Title ||
      metadataValue(metadata, 'dc:title') ||
      cleanFileTitle(name)
    ).trim();
    const author = String(
      info.Author ||
      metadataValue(metadata, 'dc:creator') ||
      ''
    ).trim();

    const fingerprint = String(
      documentProxy.fingerprints?.[0] ||
      await sha256Hex(bytes)
    ).replace(/[^A-Za-z0-9_-]/g, '');

    const now = Date.now();
    const id = `pdf-${fingerprint || await sha256Hex(bytes)}`;

    if (loading.getSuppliedPassword()) {
      passwordCache.set(id, loading.getSuppliedPassword());
    }

    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    );

    await putAsset({
      id: `${PDF_ASSET_PREFIX}${id}`,
      name,
      mime: 'application/pdf',
      updatedAt: now,
      size: bytes.byteLength,
      bytes: buffer
    });

    return {
      id,
      format: 'pdf',
      title: title || cleanFileTitle(name),
      author,
      fileName: name,
      mime: 'application/pdf',
      pageCount: Number(documentProxy.numPages) || 1,
      size: bytes.byteLength,
      importedAt: now,
      contentUpdatedAt: now,
      lastOpenedAt: 0
    };
  } catch (error) {
    if (loading?.wasCancelled?.()) {
      throw new Error('Apertura del PDF cancelada.');
    }

    if (error?.name === 'PasswordException') {
      throw new Error('No se pudo desbloquear este PDF con la contraseña indicada.');
    }

    throw new Error(
      error?.message ||
      'No se pudo abrir este PDF.'
    );
  } finally {
    try {
      await documentProxy?.destroy?.();
    } catch (_) {}
    try {
      await task?.destroy?.();
    } catch (_) {}
  }
}

function setControlsPage(page) {
  if (!currentBook) return;

  currentPage = clamp(
    Math.round(Number(page) || 1),
    1,
    Math.max(1, Number(currentBook.pageCount) || 1)
  );

  if (elements.pageInput) {
    elements.pageInput.value = String(currentPage);
    elements.pageInput.max = String(currentBook.pageCount || 1);
  }

  if (elements.pageTotal) {
    elements.pageTotal.textContent = `/ ${currentBook.pageCount || 1}`;
  }
}

function controlsHaveFocus() {
  return Boolean(
    elements.controls &&
    document.activeElement &&
    elements.controls.contains(document.activeElement)
  );
}

function hideControls(force = false) {
  clearTimeout(controlsTimer);
  controlsTimer = 0;

  if (!force && controlsHaveFocus()) return;

  elements.controls?.classList.remove('is-visible');
  elements.controls?.setAttribute('aria-hidden', 'true');
  elements.handle?.classList.add('is-faint');
}

function scheduleControlsHide() {
  clearTimeout(controlsTimer);

  controlsTimer = window.setTimeout(() => {
    hideControls(false);
  }, 2800);
}

function showControls({ focusPage = false } = {}) {
  if (!currentBook) return;

  elements.controls?.classList.add('is-visible');
  elements.controls?.setAttribute('aria-hidden', 'false');
  elements.handle?.classList.remove('is-faint');
  setControlsPage(currentPage);

  if (focusPage && elements.pageInput) {
    window.setTimeout(() => {
      elements.pageInput.focus({ preventScroll: true });
      elements.pageInput.select();
    }, 0);
  }

  scheduleControlsHide();
}

function pageElement(pageNumber) {
  return pageRecords.get(pageNumber)?.element || null;
}

function currentPageRatio() {
  const record = pageRecords.get(currentPage);
  const element = record?.element;

  if (!element) return 0;

  const rect = element.getBoundingClientRect();
  const readingLine = window.innerHeight * 0.22;
  const inside = readingLine - rect.top;

  return clamp(inside / Math.max(1, rect.height), 0, 1);
}

export async function savePdfPosition(immediate = false) {
  if (!currentBook || !pdfDocument) return;

  const perform = async () => {
    try {
      await putProgress({
        bookId: currentBook.id,
        pdfPageIndex: Math.max(0, currentPage - 1),
        pdfPageRatio: currentPageRatio(),
        ratio: pdfProgressPercent(
          currentBook,
          {
            pdfPageIndex: currentPage - 1,
            pdfPageRatio: currentPageRatio()
          }
        ) / 100,
        updatedAt: Date.now()
      });

      sessionWriter?.({
        view: 'pdf',
        bookId: currentBook.id,
        pageIndex: Math.max(0, currentPage - 1)
      });

      if (isCloudUnlocked()) {
        scheduleCloudSync(120000);
      }
    } catch (_) {}
  };

  clearTimeout(saveTimer);

  if (immediate) {
    await perform();
  } else {
    saveTimer = window.setTimeout(perform, 320);
  }
}

function updateCurrentPageFromViewport() {
  if (!currentBook || !pdfDocument) return;

  const pointX = Math.min(
    window.innerWidth - 10,
    Math.max(10, window.innerWidth * 0.5)
  );
  const pointY = Math.min(
    window.innerHeight - 10,
    Math.max(10, window.innerHeight * 0.28)
  );
  const hit = document.elementFromPoint(pointX, pointY);
  const page = hit?.closest?.('.pdf-page');

  if (page?.dataset?.page) {
    setControlsPage(Number(page.dataset.page));
    return;
  }

  let best = currentPage;
  let bestDistance = Infinity;

  for (const [pageNumber, record] of pageRecords.entries()) {
    const rect = record.element.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

    const distance = Math.abs(
      (rect.top + rect.bottom) / 2 - window.innerHeight / 2
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      best = pageNumber;
    }
  }

  setControlsPage(best);
}

function onScroll() {
  hideControls(true);

  if (scrollFrame) return;

  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    updateCurrentPageFromViewport();
    savePdfPosition(false);
  });
}

function placeholderAspect(viewport) {
  const width = Math.max(1, Number(viewport?.width) || 612);
  const height = Math.max(1, Number(viewport?.height) || 792);
  return `${width} / ${height}`;
}

async function renderPage(pageNumber) {
  const record = pageRecords.get(pageNumber);

  if (!record || record.rendered || record.rendering || !pdfDocument) {
    return;
  }

  record.rendering = true;
  record.element.classList.add('is-rendering');

  try {
    const page = await pdfDocument.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const screenWidth = Math.max(280, document.documentElement.clientWidth || window.innerWidth || 360);
    const cssWidth = Math.min(920, Math.max(260, screenWidth - 12));
    const scale = cssWidth / Math.max(1, baseViewport.width);
    const cssViewport = page.getViewport({ scale });
    const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const renderViewport = page.getViewport({ scale: scale * pixelRatio });

    record.element.style.aspectRatio = placeholderAspect(cssViewport);
    record.element.style.width = `${Math.round(cssViewport.width)}px`;
    record.element.style.minHeight = `${Math.round(cssViewport.height)}px`;

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page-canvas';
    canvas.width = Math.ceil(renderViewport.width);
    canvas.height = Math.ceil(renderViewport.height);
    canvas.style.width = `${Math.ceil(cssViewport.width)}px`;
    canvas.style.height = `${Math.ceil(cssViewport.height)}px`;

    const context = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });

    if (!context) {
      throw new Error('No se pudo crear el lienzo del PDF.');
    }

    await page.render({
      canvasContext: context,
      viewport: renderViewport,
      background: 'rgb(255,255,255)'
    }).promise;

    const textContent = await page.getTextContent();
    const textLayer = document.createElement('div');
    textLayer.className = 'textLayer pdf-text-layer';
    textLayer.style.width = `${cssViewport.width}px`;
    textLayer.style.height = `${cssViewport.height}px`;
    textLayer.style.setProperty('--scale-factor', String(cssViewport.scale));
    textLayer.style.setProperty('--total-scale-factor', String(cssViewport.scale));

    try {
      const layer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: textLayer,
        viewport: cssViewport
      });

      await layer.render();
    } catch (error) {
      console.warn('Text layer PDF', error);
    }

    record.element.replaceChildren(canvas, textLayer);
    record.canvas = canvas;
    record.textLayer = textLayer;
    record.textContent = textContent;
    record.rendered = true;
    record.rendering = false;
    record.element.classList.remove('is-rendering');

    buildPageTextIndex(pageNumber, textContent, textLayer);
    applyPageHighlights(pageNumber);

    try {
      page.cleanup();
    } catch (_) {}
  } catch (error) {
    record.rendering = false;
    record.element.classList.remove('is-rendering');
    record.element.classList.add('has-error');
    record.element.textContent = 'No se pudo renderizar esta página.';
    console.error(error);
  }
}

function buildPageTextIndex(pageNumber, textContent, textLayer = null) {
  const existing = textIndexes.get(pageNumber);

  if (existing && (!textLayer || existing.textLayer === textLayer)) {
    return existing;
  }

  const sourceItems = Array.from(textContent?.items || [])
    .filter((item) => typeof item?.str === 'string');
  const itemRanges = [];
  let text = '';

  sourceItems.forEach((item, itemIndex) => {
    const str = String(item.str || '');

    if (text.length && !/\s$/.test(text)) {
      text += ' ';
    }

    const start = text.length;
    text += str;
    const end = text.length;

    itemRanges.push({
      itemIndex,
      start,
      end,
      text: str
    });
  });

  const spans = textLayer
    ? Array.from(textLayer.querySelectorAll('span'))
    : [];
  let spanCursor = 0;

  itemRanges.forEach((range) => {
    while (
      spanCursor < spans.length &&
      spans[spanCursor].textContent === ''
    ) {
      spanCursor += 1;
    }

    range.span = spans[spanCursor] || null;
    spanCursor += 1;
  });

  const index = {
    text,
    lower: text.toLocaleLowerCase(),
    itemRanges,
    textLayer
  };

  textIndexes.set(pageNumber, index);
  return index;
}

async function getPageTextIndex(pageNumber) {
  const cached = textIndexes.get(pageNumber);
  if (cached) return cached;

  if (!pdfDocument) {
    return {
      text: '',
      lower: '',
      itemRanges: [],
      textLayer: null
    };
  }

  const page = await pdfDocument.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const result = buildPageTextIndex(pageNumber, textContent, null);

  try {
    page.cleanup();
  } catch (_) {}

  return result;
}

function pageResults(pageNumber) {
  return searchResults.filter((result) => result.pageNumber === pageNumber);
}

function restoreItemSpan(range) {
  if (!range.span) return;
  range.span.replaceChildren(document.createTextNode(range.text));
}

function applyPageHighlights(pageNumber) {
  const index = textIndexes.get(pageNumber);

  if (!index?.itemRanges?.length || !index.textLayer) return;

  const results = pageResults(pageNumber);

  for (const range of index.itemRanges) {
    restoreItemSpan(range);

    if (!range.span || !results.length || range.start === range.end) {
      continue;
    }

    const overlaps = [];

    results.forEach((result) => {
      const start = Math.max(range.start, result.start);
      const end = Math.min(range.end, result.end);

      if (start < end) {
        overlaps.push({
          start: start - range.start,
          end: end - range.start,
          resultIndex: result.resultIndex
        });
      }
    });

    if (!overlaps.length) continue;

    overlaps.sort((a, b) => a.start - b.start);
    range.span.replaceChildren();

    let cursor = 0;

    overlaps.forEach((hit) => {
      if (hit.start > cursor) {
        range.span.append(
          document.createTextNode(range.text.slice(cursor, hit.start))
        );
      }

      const mark = document.createElement('mark');
      mark.className = 'pdf-search-hit';
      mark.dataset.searchResult = String(hit.resultIndex);
      mark.textContent = range.text.slice(hit.start, hit.end);

      if (hit.resultIndex === activeSearchIndex) {
        mark.classList.add('is-active');
      }

      range.span.append(mark);
      cursor = Math.max(cursor, hit.end);
    });

    if (cursor < range.text.length) {
      range.span.append(
        document.createTextNode(range.text.slice(cursor))
      );
    }
  }
}

function applyAllRenderedHighlights() {
  for (const pageNumber of pageRecords.keys()) {
    if (pageRecords.get(pageNumber)?.rendered) {
      applyPageHighlights(pageNumber);
    }
  }
}

function updateSearchControls() {
  const count = searchResults.length;
  const current = count && activeSearchIndex >= 0
    ? activeSearchIndex + 1
    : 0;

  if (elements.searchCount) {
    elements.searchCount.textContent = `${current} / ${count}`;
  }

  if (elements.searchPrev) {
    elements.searchPrev.disabled = count === 0;
  }

  if (elements.searchNext) {
    elements.searchNext.disabled = count === 0;
  }

  if (elements.searchClear) {
    elements.searchClear.disabled = !searchQuery;
  }
}

async function jumpToPage(pageNumber, ratio = 0) {
  if (!currentBook) return;

  const page = clamp(
    Math.round(Number(pageNumber) || 1),
    1,
    Math.max(1, Number(currentBook.pageCount) || 1)
  );

  await renderPage(page);

  const element = pageElement(page);
  if (!element) return;

  setControlsPage(page);

  requestAnimationFrame(() => {
    const target = Math.max(
      0,
      element.offsetTop +
      clamp(ratio, 0, 1) * element.offsetHeight -
      window.innerHeight * 0.22
    );

    window.scrollTo({
      top: target,
      behavior: 'auto'
    });
  });
}

async function goToSearchResult(index) {
  if (!searchResults.length) return;

  const previous = activeSearchIndex;
  activeSearchIndex = (
    (Number(index) || 0) % searchResults.length +
    searchResults.length
  ) % searchResults.length;

  const result = searchResults[activeSearchIndex];

  if (previous >= 0 && searchResults[previous]) {
    applyPageHighlights(searchResults[previous].pageNumber);
  }

  await renderPage(result.pageNumber);
  applyPageHighlights(result.pageNumber);
  updateSearchControls();

  const record = pageRecords.get(result.pageNumber);
  const mark = record?.textLayer?.querySelector(
    `[data-search-result="${activeSearchIndex}"]`
  );

  if (mark) {
    mark.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'smooth'
    });
  } else {
    await jumpToPage(result.pageNumber, 0.25);
  }

  setControlsPage(result.pageNumber);
  showControls();
}

async function searchPdf(query) {
  if (!pdfDocument || !currentBook) return;

  const normalized = String(query || '')
    .replace(/\s+/g, ' ')
    .trim();
  const generation = ++searchGeneration;

  searchQuery = normalized;
  searchResults = [];
  activeSearchIndex = -1;
  updateSearchControls();
  applyAllRenderedHighlights();

  if (!normalized) {
    if (elements.searchStatus) {
      elements.searchStatus.textContent = '';
    }
    return;
  }

  if (elements.searchStatus) {
    elements.searchStatus.textContent = 'Buscando en el PDF…';
  }

  const needle = normalized.toLocaleLowerCase();
  let searchableCharacters = 0;

  for (let pageNumber = 1; pageNumber <= currentBook.pageCount; pageNumber += 1) {
    if (generation !== searchGeneration) return;

    const index = await getPageTextIndex(pageNumber);
    searchableCharacters += index.text.trim().length;
    let cursor = 0;

    while (cursor <= index.lower.length - needle.length) {
      const found = index.lower.indexOf(needle, cursor);
      if (found < 0) break;

      searchResults.push({
        pageNumber,
        start: found,
        end: found + needle.length,
        resultIndex: searchResults.length
      });

      cursor = found + Math.max(1, needle.length);
    }

    if (pageNumber % 12 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  if (generation !== searchGeneration) return;

  applyAllRenderedHighlights();

  if (!searchResults.length) {
    if (elements.searchStatus) {
      elements.searchStatus.textContent = searchableCharacters
        ? 'No se encontraron coincidencias.'
        : 'Este PDF no tiene texto buscable. Puede ser un escaneo o estar compuesto por imágenes.';
    }

    updateSearchControls();
    return;
  }

  if (elements.searchStatus) {
    elements.searchStatus.textContent =
      `${searchResults.length} coincidencia(s) resaltada(s).`;
  }

  await goToSearchResult(0);
}

function clearSearch() {
  searchGeneration += 1;
  searchQuery = '';
  searchResults = [];
  activeSearchIndex = -1;

  if (elements.searchInput) {
    elements.searchInput.value = '';
  }

  if (elements.searchStatus) {
    elements.searchStatus.textContent = '';
  }

  applyAllRenderedHighlights();
  updateSearchControls();
  showControls();
}

function createPlaceholders(pageCount, firstViewport) {
  pageRecords.clear();
  textIndexes.clear();
  elements.pages?.replaceChildren();

  const fragment = document.createDocumentFragment();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const element = document.createElement('section');
    element.className = 'pdf-page';
    element.dataset.page = String(pageNumber);
    element.setAttribute('aria-label', `Página ${pageNumber}`);
    element.style.aspectRatio = placeholderAspect(firstViewport);

    const loader = document.createElement('div');
    loader.className = 'pdf-page-loader';
    loader.setAttribute('aria-hidden', 'true');
    element.append(loader);

    pageRecords.set(pageNumber, {
      element,
      rendered: false,
      rendering: false,
      canvas: null,
      textLayer: null,
      textContent: null
    });

    fragment.append(element);
  }

  elements.pages?.append(fragment);
}

function setupRenderObserver() {
  renderObserver?.disconnect();

  renderObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const pageNumber = Number(entry.target.dataset.page || 0);
      if (!pageNumber) return;

      renderPage(pageNumber);

      if (pageNumber > 1) renderPage(pageNumber - 1);
      if (currentBook && pageNumber < currentBook.pageCount) {
        renderPage(pageNumber + 1);
      }
    });
  }, {
    root: null,
    rootMargin: '700px 0px',
    threshold: 0.01
  });

  for (const record of pageRecords.values()) {
    renderObserver.observe(record.element);
  }
}

export async function openPdfDocument(book, options = {}) {
  if (!isPdfBook(book)) return false;

  await closePdfDocument({ preserveView: true });

  const asset = await getAsset(`${PDF_ASSET_PREFIX}${book.id}`);

  if (!asset?.bytes) {
    throw new Error('El PDF no está guardado en este dispositivo. Sincroniza la nube o vuelve a importarlo.');
  }

  currentBook = book;
  sessionWriter = typeof options.onSession === 'function'
    ? options.onSession
    : null;

  const bytes = asset.bytes instanceof ArrayBuffer
    ? new Uint8Array(asset.bytes)
    : new Uint8Array(asset.bytes?.buffer || asset.bytes || []);

  const loading = createPdfLoadingTask(bytes, {
    bookId: book.id,
    title: book.title || book.fileName || 'PDF protegido'
  });
  const task = loading.task;

  try {
    pdfDocument = await task.promise;
  } catch (error) {
    if (loading.wasCancelled()) {
      throw new Error('Apertura del PDF cancelada.');
    }

    if (error?.name === 'PasswordException') {
      throw new Error('No se pudo desbloquear este PDF con la contraseña indicada.');
    }

    throw error;
  }

  currentBook.pageCount = Number(pdfDocument.numPages) || Number(book.pageCount) || 1;

  const firstPage = await pdfDocument.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 1 });
  try { firstPage.cleanup(); } catch (_) {}

  createPlaceholders(currentBook.pageCount, firstViewport);
  setupRenderObserver();

  if (elements.pdfView) {
    elements.pdfView.hidden = false;
  }

  if (elements.pageTotal) {
    elements.pageTotal.textContent = `/ ${currentBook.pageCount}`;
  }

  if (elements.pageInput) {
    elements.pageInput.max = String(currentBook.pageCount);
  }

  clearSearch();
  hideControls(true);

  window.addEventListener('scroll', onScroll, { passive: true });

  const progress = options.restore
    ? await getProgress(currentBook.id)
    : null;
  const page = options.restore
    ? clamp(Number(progress?.pdfPageIndex || 0) + 1, 1, currentBook.pageCount)
    : 1;
  const ratio = options.restore
    ? clamp(progress?.pdfPageRatio || 0, 0, 1)
    : 0;

  setControlsPage(page);
  await jumpToPage(page, ratio);

  sessionWriter?.({
    view: 'pdf',
    bookId: currentBook.id,
    pageIndex: page - 1
  });

  if (!options.restore) {
    await savePdfPosition(true);
  }

  return true;
}

export async function closePdfDocument(options = {}) {
  clearTimeout(saveTimer);
  clearTimeout(controlsTimer);
  searchGeneration += 1;

  window.removeEventListener('scroll', onScroll);
  renderObserver?.disconnect();
  renderObserver = null;

  if (scrollFrame) {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  }

  if (pdfDocument) {
    try {
      await pdfDocument.destroy();
    } catch (_) {}
  }

  pdfDocument = null;
  currentBook = null;
  currentPage = 1;
  pageRecords.clear();
  textIndexes.clear();
  searchQuery = '';
  searchResults = [];
  activeSearchIndex = -1;
  sessionWriter = null;

  if (!options.preserveView) {
    elements.pages?.replaceChildren();
    if (elements.pdfView) {
      elements.pdfView.hidden = true;
    }
  }

  hideControls(true);
}

export function isPdfReading() {
  return Boolean(currentBook && pdfDocument);
}

function handlePageInput() {
  const page = clamp(
    Math.round(Number(elements.pageInput?.value) || currentPage),
    1,
    Math.max(1, Number(currentBook?.pageCount) || 1)
  );

  if (elements.pageInput) {
    elements.pageInput.value = String(page);
  }

  jumpToPage(page, 0).then(() => {
    savePdfPosition(true);
    showControls();
  });
}

function initializeEvents() {
  elements.handle?.addEventListener('click', (event) => {
    event.stopPropagation();
    showControls({ focusPage: true });
  });

  elements.pdfView?.addEventListener('click', (event) => {
    if (
      event.target.closest?.('.pdf-controls') ||
      event.target.closest?.('.pdf-control-handle')
    ) {
      return;
    }

    if (elements.controls?.classList.contains('is-visible')) {
      hideControls(true);
    } else {
      showControls();
    }
  });

  elements.controls?.addEventListener('pointerdown', () => {
    clearTimeout(controlsTimer);
  });

  elements.controls?.addEventListener('focusout', () => {
    window.setTimeout(scheduleControlsHide, 50);
  });

  elements.controlsClose?.addEventListener('click', () => {
    hideControls(true);
  });

  elements.pageInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handlePageInput();
      elements.pageInput.blur();
    }
  });

  elements.pageInput?.addEventListener('change', handlePageInput);

  elements.searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    searchPdf(elements.searchInput?.value || '');
  });

  elements.searchPrev?.addEventListener('click', () => {
    goToSearchResult(activeSearchIndex - 1);
  });

  elements.searchNext?.addEventListener('click', () => {
    goToSearchResult(activeSearchIndex + 1);
  });

  elements.searchClear?.addEventListener('click', clearSearch);

  elements.libraryBtn?.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('kaoru:pdf-library-request')
    );
  });

  elements.passwordForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const password = elements.passwordInput?.value ?? '';

    if (!password) {
      if (elements.passwordMessage) {
        elements.passwordMessage.textContent =
          'Escribe la contraseña del PDF.';
      }

      elements.passwordInput?.focus();
      return;
    }

    closePasswordDialog(password);
  });

  elements.passwordCancel?.addEventListener('click', () => {
    closePasswordDialog(null);
  });
}

initializeEvents();
updateSearchControls();
