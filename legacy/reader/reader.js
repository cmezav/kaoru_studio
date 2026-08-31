import {
  putBook,
  getBook,
  listBooks,
  deleteBook,
  getProgress,
  putProgress
} from './reader-db.js?cache=pdf-reader-1';

import {
  parseEpub
} from './epub-parser.js?cache=archive-reader';

import {
  isPdfBook,
  pdfProgressPercent,
  pdfProgressText,
  parsePdfFile,
  openPdfDocument,
  closePdfDocument,
  savePdfPosition
} from './pdf-reader.js?cache=pdf-reader-1';
import {
  importReadingFont,
  loadSavedReadingFont
} from './reader-font.js?cache=cloud-sync-1';

import {
  setCloudStatusListener,
  getSavedCloudConfig,
  isCloudUnlocked,
  connectCloud,
  unlockSavedCloud,
  lockCloud,
  syncCloud,
  scheduleCloudSync,
  deleteBookEverywhere
} from './reader-cloud.js?cache=cloud-sync-pdf-2';

const SESSION_KEY = 'kaoru.archive-reader.session';
const READING_PREFS_KEY = 'kaoru.archive-reader.reading-prefs';
const DEFAULT_READING_SIZE = 16;
const ENTRY_MODE = new URLSearchParams(location.search).get('entry');
const READER_HISTORY_KEY = 'kaoruReaderView';

const elements = {
  libraryView: document.getElementById('libraryView'),
  readerView: document.getElementById('readerView'),
  importBtn: document.getElementById('importBtn'),
  epubInput: document.getElementById('epubInput'),
  leaveReaderBtn: document.getElementById('leaveReaderBtn'),
  continueSection: document.getElementById('continueSection'),
  continueCard: document.getElementById('continueCard'),
  libraryList: document.getElementById('libraryList'),
  emptyLibrary: document.getElementById('emptyLibrary'),
  bookCount: document.getElementById('bookCount'),
  libraryStatus: document.getElementById('libraryStatus'),
  readingColumn: document.getElementById('readingColumn'),
  workLine: document.getElementById('workLine'),
  chapterTitle: document.getElementById('chapterTitle'),
  chapterContent: document.getElementById('chapterContent'),
  chapterPosition: document.getElementById('chapterPosition'),
  prevChapterBtn: document.getElementById('prevChapterBtn'),
  nextChapterBtn: document.getElementById('nextChapterBtn'),
  libraryBtn: document.getElementById('libraryBtn'),
  cloudDetails: document.getElementById('cloudDetails'),
  cloudSummary: document.getElementById('cloudSummary'),
  cloudBadge: document.getElementById('cloudBadge'),
  cloudOwner: document.getElementById('cloudOwner'),
  cloudRepo: document.getElementById('cloudRepo'),
  cloudToken: document.getElementById('cloudToken'),
  cloudPassword: document.getElementById('cloudPassword'),
  cloudConnectBtn: document.getElementById('cloudConnectBtn'),
  cloudSyncBtn: document.getElementById('cloudSyncBtn'),
  cloudLockBtn: document.getElementById('cloudLockBtn'),
  cloudStatus: document.getElementById('cloudStatus'),
  fontImportBtn: document.getElementById('fontImportBtn'),
  fontInput: document.getElementById('fontInput'),
  fontSummary: document.getElementById('fontSummary'),
  fontStatus: document.getElementById('fontStatus'),
  readingSummary: document.getElementById('readingSummary'),
  readingSize: document.getElementById('readingSize'),
  readingSizeValue: document.getElementById('readingSizeValue'),
  readingPreview: document.getElementById('readingPreview'),
  immersiveReading: document.getElementById('immersiveReading'),
  immersiveStatus: document.getElementById('immersiveStatus')
};

let currentBook = null;
let currentChapterIndex = 0;
let saveTimer = 0;
let restoreToken = 0;

function clampReadingSize(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_READING_SIZE;
  return Math.max(12, Math.min(23, Math.round(numeric * 2) / 2));
}

function defaultImmersivePreference() {
  try {
    return window.matchMedia('(max-width: 800px)').matches;
  } catch (_) {
    return false;
  }
}

function readReadingPreferences() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(READING_PREFS_KEY) || 'null'
    );

    return {
      fontSize: clampReadingSize(parsed?.fontSize ?? DEFAULT_READING_SIZE),
      immersive:
        typeof parsed?.immersive === 'boolean'
          ? parsed.immersive
          : defaultImmersivePreference()
    };
  } catch (_) {
    return {
      fontSize: DEFAULT_READING_SIZE,
      immersive: defaultImmersivePreference()
    };
  }
}

function writeReadingPreferences(preferences) {
  try {
    localStorage.setItem(
      READING_PREFS_KEY,
      JSON.stringify(preferences)
    );
  } catch (_) {}
}

let readingPreferences = readReadingPreferences();

function refreshReadingPreferencesUi() {
  const size = clampReadingSize(readingPreferences.fontSize);
  readingPreferences.fontSize = size;

  document.documentElement.style.setProperty(
    '--reading-font-size',
    `${size}px`
  );

  if (elements.readingSize) {
    elements.readingSize.value = String(size);
  }

  if (elements.readingSizeValue) {
    elements.readingSizeValue.textContent = `${size}px`;
  }

  if (elements.immersiveReading) {
    elements.immersiveReading.checked = Boolean(
      readingPreferences.immersive
    );
  }

  if (elements.readingSummary) {
    elements.readingSummary.textContent =
      `${size}px · ${readingPreferences.immersive ? 'inmersiva' : 'normal'}`;
  }
}

function saveReadingPreferences() {
  readingPreferences = {
    fontSize: clampReadingSize(readingPreferences.fontSize),
    immersive: Boolean(readingPreferences.immersive)
  };

  writeReadingPreferences(readingPreferences);
  refreshReadingPreferencesUi();
}

function fullscreenDocument() {
  try {
    if (
      window.top &&
      window.top !== window &&
      window.top.document
    ) {
      return window.top.document;
    }
  } catch (_) {}

  return document;
}

function isFullscreenActive() {
  const doc = fullscreenDocument();

  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement
  );
}

async function enterImmersiveMode() {
  if (!readingPreferences.immersive || isFullscreenActive()) {
    return;
  }

  const doc = fullscreenDocument();
  const target = doc.documentElement;
  const request =
    target.requestFullscreen ||
    target.webkitRequestFullscreen;

  if (typeof request !== 'function') {
    if (elements.immersiveStatus) {
      elements.immersiveStatus.textContent =
        'Este navegador no permite pantalla completa desde Kaoru Reader. Al deslizar, el navegador todavía puede ocultar parte de sus barras.';
    }
    return;
  }

  try {
    await request.call(
      target,
      { navigationUI: 'hide' }
    );

    if (elements.immersiveStatus) {
      elements.immersiveStatus.textContent =
        'Lectura inmersiva activa.';
    }
  } catch (error) {
    console.warn('Fullscreen no disponible', error);

    if (elements.immersiveStatus) {
      elements.immersiveStatus.textContent =
        'El teléfono no permitió ocultar todas las barras. La lectura seguirá funcionando normalmente.';
    }
  }
}

async function exitImmersiveMode() {
  const doc = fullscreenDocument();

  if (!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement
  )) {
    return;
  }

  try {
    if (typeof doc.exitFullscreen === 'function') {
      await doc.exitFullscreen();
    } else if (typeof doc.webkitExitFullscreen === 'function') {
      doc.webkitExitFullscreen();
    }
  } catch (_) {}
}

function libraryHistoryUrl() {
  return `${location.pathname}${location.search}`;
}

function readingHistoryUrl() {
  return `${libraryHistoryUrl()}#reading`;
}

function ensureLibraryHistoryState() {
  if (history.state?.[READER_HISTORY_KEY] === 'library') {
    return;
  }

  try {
    history.replaceState(
      { [READER_HISTORY_KEY]: 'library' },
      '',
      libraryHistoryUrl()
    );
  } catch (_) {}
}

function pushReadingHistoryState() {
  ensureLibraryHistoryState();

  if (history.state?.[READER_HISTORY_KEY] === 'reader') {
    return;
  }

  try {
    history.pushState(
      { [READER_HISTORY_KEY]: 'reader' },
      '',
      readingHistoryUrl()
    );
  } catch (_) {}
}

function openBookFromUserGesture(bookId, chapterIndex = 0, restore = true) {
  pushReadingHistoryState();

  if (readingPreferences.immersive) {
    enterImmersiveMode();
  }

  openBook(bookId, chapterIndex, restore);
}

function setStatus(message) {
  elements.libraryStatus.textContent = message || '';
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch (_) {
    return null;
  }
}

function writeSession(data) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (_) {}
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function progressPercent(book, progress) {
  if (isPdfBook(book)) {
    return pdfProgressPercent(book, progress);
  }
  if (!book?.chapters?.length || !progress) return 0;

  const chapter = Math.max(
    0,
    Math.min(book.chapters.length - 1, Number(progress.chapterIndex) || 0)
  );

  const ratio = Math.max(
    0,
    Math.min(1, Number(progress.ratio) || 0)
  );

  return Math.round(
    ((chapter + ratio) / book.chapters.length) * 100
  );
}

function progressText(book, progress) {
  if (isPdfBook(book)) {
    return pdfProgressText(book, progress);
  }
  if (!progress) return 'Sin empezar';

  const chapter = book.chapters[
    Math.max(
      0,
      Math.min(book.chapters.length - 1, Number(progress.chapterIndex) || 0)
    )
  ];

  return `${chapter?.title || 'Lectura'} · ${progressPercent(book, progress)}%`;
}

function cardMarkup(book, progress) {
  const percent = progressPercent(book, progress);
  const pdf = isPdfBook(book);

  const authorLine = pdf
    ? ''
    : `by ${escapeHtml(book.author)}`;

  const meta = pdf
    ? `
      <span>PDF</span>
      <span>${Number(book.pageCount || 1)} páginas</span>
    `
    : `
      <span>${Number(book.storyChapterCount || book.chapters.length)} capítulos</span>
      ${book.language ? `<span>${escapeHtml(book.language)}</span>` : ''}
      ${book.ao3WorkId ? `<span>AO3 #${escapeHtml(book.ao3WorkId)}</span>` : ''}
    `;

  return `
    <span class="book-title">${escapeHtml(book.title)}</span>
    ${authorLine ? `<span class="book-author">${authorLine}</span>` : ''}
    <span class="book-meta">${meta}</span>
    <span class="progress-track"><i style="width:${percent}%"></i></span>
  `;
}

async function renderLibrary() {
  const books = await listBooks();

  elements.bookCount.textContent = String(books.length);
  elements.emptyLibrary.hidden = books.length > 0;
  elements.libraryList.replaceChildren();

  let bestContinue = null;

  for (const book of books) {
    const progress = await getProgress(book.id);

    if (
      progress &&
      progressPercent(book, progress) < 99 &&
      (!bestContinue || progress.updatedAt > bestContinue.progress.updatedAt)
    ) {
      bestContinue = { book, progress };
    }

    const card = document.createElement('article');
    card.className = 'book-card';

    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'book-card-main';
    main.innerHTML = cardMarkup(book, progress);
    main.addEventListener('click', () => {
      openBookFromUserGesture(
        book.id,
        0,
        false
      );
    });

    const footer = document.createElement('div');
    footer.className = 'book-card-footer';

    const label = document.createElement('span');
    label.className = 'progress-label';
    label.textContent = progressText(book, progress);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-book';
    remove.textContent = isCloudUnlocked()
      ? 'Eliminar de todos'
      : 'Eliminar';

    remove.addEventListener('click', async () => {
      if (isCloudUnlocked()) {
        if (!confirm(`¿Eliminar "${book.title}" de la nube y de todos tus dispositivos?`)) {
          return;
        }

        try {
          elements.cloudStatus.textContent = 'Eliminando de la nube…';
          await deleteBookEverywhere(book.id);
          await renderLibrary();
          return;
        } catch (error) {
          elements.cloudStatus.textContent =
            error?.message || 'No se pudo eliminar de la nube.';
          return;
        }
      }

      if (!confirm(`¿Eliminar "${book.title}" de este dispositivo?`)) return;

      await deleteBook(book.id);

      const session = readSession();
      if (session?.bookId === book.id) {
        writeSession({ view: 'library' });
      }

      await renderLibrary();
    });

    footer.append(label, remove);
    card.append(main, footer);
    elements.libraryList.appendChild(card);
  }

  if (bestContinue) {
    elements.continueSection.hidden = false;
    elements.continueCard.className = 'continue-card';

    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `
      ${cardMarkup(bestContinue.book, bestContinue.progress)}
      <span class="progress-label">${escapeHtml(progressText(bestContinue.book, bestContinue.progress))}</span>
    `;

    button.addEventListener('click', () => {
      openBookFromUserGesture(
        bestContinue.book.id,
        bestContinue.progress.chapterIndex || 0,
        true
      );
    });

    elements.continueCard.replaceChildren(button);
  } else {
    elements.continueSection.hidden = true;
    elements.continueCard.replaceChildren();
  }
}

async function showLibrary(fromHistory = false) {
  await saveCurrentPosition(true);
  await exitImmersiveMode();
  await closePdfDocument();

  currentBook = null;
  document.body.classList.remove(
    'is-reading',
    'is-pdf-reading'
  );

  elements.readerView.hidden = true;
  elements.libraryView.hidden = false;

  if (elements.pdfView) {
    elements.pdfView.hidden = true;
  }

  writeSession({ view: 'library' });

  if (!fromHistory) {
    ensureLibraryHistoryState();
  }

  window.scrollTo(0, 0);
  await renderLibrary();

  if (isCloudUnlocked()) {
    scheduleCloudSync(1500);
  }
}

async function returnToLibrary() {
  await saveCurrentPosition(true);
  await exitImmersiveMode();

  if (
    document.body.classList.contains('is-reading') &&
    history.state?.[READER_HISTORY_KEY] === 'reader'
  ) {
    history.back();
    return;
  }

  await showLibrary();
}

function readingAnchors() {
  return Array.from(
    elements.chapterContent.querySelectorAll(
      'p,blockquote,li,h1,h2,h3,h4,h5,h6,dt,dd,pre'
    )
  );
}

function currentAnchor() {
  const anchors = readingAnchors();

  if (!anchors.length) {
    return {
      anchorIndex: 0,
      anchorOffset: 0
    };
  }

  const targetY = Math.max(24, window.innerHeight * 0.22);
  let chosen = anchors[0];
  let index = 0;

  anchors.forEach((element, currentIndex) => {
    if (element.getBoundingClientRect().top <= targetY) {
      chosen = element;
      index = currentIndex;
    }
  });

  return {
    anchorIndex: index,
    anchorOffset: window.scrollY - chosen.offsetTop
  };
}

function currentRatio() {
  const max = Math.max(
    1,
    document.documentElement.scrollHeight - window.innerHeight
  );

  return Math.max(0, Math.min(1, window.scrollY / max));
}

async function saveCurrentPosition(immediate = false) {
  if (!currentBook) return;

  if (isPdfBook(currentBook)) {
    await savePdfPosition(immediate);
    return;
  }

  const perform = async () => {
    const anchor = currentAnchor();

    try {
      await putProgress({
        bookId: currentBook.id,
        chapterIndex: currentChapterIndex,
        anchorIndex: anchor.anchorIndex,
        anchorOffset: anchor.anchorOffset,
        ratio: currentRatio(),
        updatedAt: Date.now()
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
    saveTimer = setTimeout(perform, 280);
  }
}

async function restorePosition(bookId, chapterIndex, token) {
  const progress = await getProgress(bookId);

  if (
    token !== restoreToken ||
    !progress ||
    Number(progress.chapterIndex) !== Number(chapterIndex)
  ) {
    window.scrollTo(0, 0);
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const anchors = readingAnchors();
      const anchor = anchors[
        Math.max(
          0,
          Math.min(anchors.length - 1, Number(progress.anchorIndex) || 0)
        )
      ];

      if (anchor) {
        window.scrollTo(
          0,
          Math.max(0, anchor.offsetTop + (Number(progress.anchorOffset) || 0))
        );
        return;
      }

      const max = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

      window.scrollTo(0, max * Math.max(0, Math.min(1, Number(progress.ratio) || 0)));
    });
  });
}

function prepareChapterAnchors() {
  readingAnchors().forEach((element, index) => {
    element.dataset.readerAnchor = String(index);
  });
}

async function renderChapter(restore = false) {
  if (!currentBook) return;

  const count = currentBook.chapters.length;
  currentChapterIndex = Math.max(
    0,
    Math.min(count - 1, Number(currentChapterIndex) || 0)
  );

  const chapter = currentBook.chapters[currentChapterIndex];
  const token = ++restoreToken;

  elements.workLine.textContent =
    `${currentBook.title} — ${currentBook.author}`;

  elements.chapterTitle.textContent =
    chapter.title || `Chapter ${currentChapterIndex + 1}`;

  elements.chapterContent.innerHTML = chapter.html || '';
  prepareChapterAnchors();

  elements.chapterPosition.textContent =
    `${currentChapterIndex + 1} / ${count}`;

  elements.prevChapterBtn.disabled = currentChapterIndex <= 0;
  elements.nextChapterBtn.disabled = currentChapterIndex >= count - 1;

  elements.prevChapterBtn.textContent = currentChapterIndex > 0
    ? `← ${currentBook.chapters[currentChapterIndex - 1].title}`
    : '← Previous Chapter';

  elements.nextChapterBtn.textContent = currentChapterIndex < count - 1
    ? `${currentBook.chapters[currentChapterIndex + 1].title} →`
    : 'Next Chapter →';

  writeSession({
    view: 'reader',
    bookId: currentBook.id,
    chapterIndex: currentChapterIndex
  });

  if (restore) {
    await restorePosition(currentBook.id, currentChapterIndex, token);
  } else {
    window.scrollTo(0, 0);
    await saveCurrentPosition(true);
  }
}

async function openBook(bookId, chapterIndex = 0, restore = true) {
  const book = await getBook(bookId);

  if (!book) {
    await showLibrary();
    return;
  }

  currentBook = book;
  book.lastOpenedAt = Date.now();
  await putBook(book);

  elements.libraryView.hidden = true;

  if (isPdfBook(book)) {
    elements.readerView.hidden = true;

    if (elements.pdfView) {
      elements.pdfView.hidden = false;
    }

    document.body.classList.add(
      'is-reading',
      'is-pdf-reading'
    );

    try {
      await openPdfDocument(
        book,
        {
          restore,
          onSession: writeSession
        }
      );
    } catch (error) {
      console.error(error);
      setStatus(
        error?.message ||
        'No se pudo abrir este PDF.'
      );
      await showLibrary();
    }

    return;
  }

  document.body.classList.remove('is-pdf-reading');
  elements.readerView.hidden = false;

  if (elements.pdfView) {
    elements.pdfView.hidden = true;
  }

  document.body.classList.add('is-reading');

  currentChapterIndex = Math.max(
    0,
    Math.min(book.chapters.length - 1, Number(chapterIndex) || 0)
  );

  await renderChapter(restore);
}

async function changeChapter(delta) {
  if (!currentBook) return;

  await saveCurrentPosition(true);

  const next = currentChapterIndex + delta;

  if (next < 0 || next >= currentBook.chapters.length) return;

  currentChapterIndex = next;
  await renderChapter(false);

  if (isCloudUnlocked()) {
    scheduleCloudSync(1500);
  }
}

async function importReaderFile(file) {
  if (!file) return;

  const pdf =
    String(file.name || '').toLowerCase().endsWith('.pdf') ||
    file.type === 'application/pdf';

  setStatus(pdf ? 'Analizando PDF…' : 'Analizando EPUB…');
  elements.importBtn.disabled = true;

  try {
    const book = pdf
      ? await parsePdfFile(file)
      : await parseEpub(file);

    const previous = await getBook(book.id);

    if (previous) {
      book.importedAt = previous.importedAt || book.importedAt;
      book.lastOpenedAt = previous.lastOpenedAt || 0;
    }

    book.contentUpdatedAt = Date.now();

    await putBook(book);

    setStatus(
      `${book.title} guardado en este dispositivo.`
    );

    await renderLibrary();

    if (isCloudUnlocked()) {
      scheduleCloudSync(1000);
    }
  } catch (error) {
    console.error(error);

    setStatus(
      error?.message ||
      (
        pdf
          ? 'No se pudo abrir este PDF.'
          : 'No se pudo abrir este EPUB.'
      )
    );
  } finally {
    elements.importBtn.disabled = false;
    elements.epubInput.value = '';
  }
}

function setManualCloudIdleUi(message = '') {
  const saved = getSavedCloudConfig();

  elements.cloudSyncBtn.hidden = true;
  elements.cloudLockBtn.hidden = true;
  elements.cloudSyncBtn.disabled = true;
  elements.cloudLockBtn.disabled = true;

  if (saved) {
    elements.cloudOwner.value = saved.owner || 'cmezav';
    elements.cloudRepo.value = saved.repo || 'kaoru-reader-library';
    elements.cloudSummary.textContent =
      `${saved.owner}/${saved.repo} · sincronización manual`;
    elements.cloudBadge.textContent = 'Manual';
    elements.cloudBadge.classList.remove('is-online');
    elements.cloudConnectBtn.textContent = 'Sincronizar biblioteca';

    elements.cloudStatus.textContent =
      message ||
      'Todo lo local funciona sin contraseña. Escribe tu clave únicamente cuando quieras sincronizar con la nube.';
    return;
  }

  elements.cloudSummary.textContent = 'Solo local';
  elements.cloudBadge.textContent = 'Local';
  elements.cloudBadge.classList.remove('is-online');
  elements.cloudConnectBtn.textContent = 'Configurar y sincronizar';

  elements.cloudStatus.textContent =
    message ||
    'La nube es opcional. Puedes importar y leer EPUB/PDF sin configurarla.';
}

function applySavedCloudUi() {
  setManualCloudIdleUi();
}

async function doCloudSync() {
  if (!isCloudUnlocked()) {
    throw new Error('La nube no está desbloqueada.');
  }

  const result = await syncCloud();

  if (result?.font?.changed) {
    const asset = await loadSavedReadingFont();

    if (asset) {
      elements.fontSummary.textContent =
        asset.name || 'Lucida Sans';
    }
  }

  await renderLibrary();
  return result;
}

setCloudStatusListener(async (event) => {
  if (event.connected) {
    elements.cloudBadge.textContent =
      navigator.onLine ? 'Nube' : 'Offline';
    elements.cloudBadge.classList.toggle(
      'is-online',
      navigator.onLine
    );
    elements.cloudSummary.textContent =
      'Sincronizando biblioteca…';
  }

  if (event.type === 'working' || event.type === 'error') {
    elements.cloudStatus.textContent = event.message || '';
  }

  if (event.fontChanged) {
    try {
      const asset = await loadSavedReadingFont();

      if (asset) {
        elements.fontSummary.textContent =
          asset.name || 'Lucida Sans';
      }
    } catch (_) {}
  }
});

elements.cloudConnectBtn.addEventListener('click', async () => {
  const owner = elements.cloudOwner.value.trim();
  const repo = elements.cloudRepo.value.trim();
  const token = elements.cloudToken.value.trim();
  const password = elements.cloudPassword.value;
  const saved = getSavedCloudConfig();

  if (!navigator.onLine) {
    setManualCloudIdleUi(
      'Necesitas Internet solo para sincronizar. Tu biblioteca local sigue disponible.'
    );
    return;
  }

  if (!password) {
    elements.cloudStatus.textContent =
      'Escribe tu clave de biblioteca solo para realizar esta sincronización.';
    elements.cloudPassword.focus();
    return;
  }

  elements.cloudConnectBtn.disabled = true;
  elements.cloudStatus.textContent =
    'Sincronizando biblioteca…';

  let finalMessage = '';

  try {
    if (
      !token &&
      saved &&
      saved.owner === owner &&
      saved.repo === repo
    ) {
      await unlockSavedCloud(password);
    } else {
      await connectCloud({
        owner,
        repo,
        token,
        password
      });
    }

    elements.cloudToken.value = '';

    await doCloudSync();

    finalMessage =
      'Biblioteca sincronizada. La nube vuelve a quedar cerrada; puedes seguir leyendo sin contraseña.';
  } catch (error) {
    finalMessage =
      error?.message ||
      'No se pudo sincronizar la biblioteca.';
  } finally {
    if (isCloudUnlocked()) {
      lockCloud();
    }

    elements.cloudPassword.value = '';
    elements.cloudConnectBtn.disabled = false;
    setManualCloudIdleUi(finalMessage);
  }
});

elements.cloudSyncBtn.addEventListener('click', () => {
  elements.cloudConnectBtn.click();
});

elements.cloudLockBtn.addEventListener('click', () => {
  if (isCloudUnlocked()) {
    lockCloud();
  }

  elements.cloudPassword.value = '';
  setManualCloudIdleUi();
});

elements.fontImportBtn.addEventListener('click', () => {
  elements.fontInput.click();
});

elements.fontInput.addEventListener('change', async () => {
  const file = elements.fontInput.files?.[0];

  if (!file) return;

  elements.fontImportBtn.disabled = true;
  elements.fontStatus.textContent = 'Importando tipografía…';

  try {
    const asset = await importReadingFont(file);

    elements.fontSummary.textContent = asset.name || 'Lucida Sans';
    elements.fontStatus.textContent =
      `${asset.name} lista para leer offline.`;

    if (isCloudUnlocked()) {
      scheduleCloudSync(1000);
    }
  } catch (error) {
    elements.fontStatus.textContent =
      error?.message || 'No se pudo importar la fuente.';
  } finally {
    elements.fontImportBtn.disabled = false;
    elements.fontInput.value = '';
  }
});

elements.readingSize?.addEventListener('input', () => {
  readingPreferences.fontSize = clampReadingSize(
    elements.readingSize.value
  );

  refreshReadingPreferencesUi();
});

elements.readingSize?.addEventListener('change', () => {
  saveReadingPreferences();
});

elements.immersiveReading?.addEventListener('change', () => {
  readingPreferences.immersive =
    Boolean(elements.immersiveReading.checked);

  saveReadingPreferences();

  if (elements.immersiveStatus) {
    elements.immersiveStatus.textContent =
      readingPreferences.immersive
        ? 'Se intentará activar pantalla completa cuando toques una obra.'
        : 'Lectura inmersiva desactivada.';
  }
});

elements.importBtn.addEventListener('click', () => {
  elements.epubInput.click();
});

elements.epubInput.addEventListener('change', () => {
  importReaderFile(elements.epubInput.files?.[0]);
});

elements.libraryBtn.addEventListener('click', returnToLibrary);

window.addEventListener(
  'kaoru:pdf-library-request',
  returnToLibrary
);
elements.prevChapterBtn.addEventListener('click', () => changeChapter(-1));
elements.nextChapterBtn.addEventListener('click', () => changeChapter(1));

elements.leaveReaderBtn.addEventListener('click', () => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: 'kaoru:navigate',
        studio: 'home'
      },
      '*'
    );
  } else {
    location.href = '../../index.html';
  }
});

window.addEventListener('popstate', () => {
  if (document.body.classList.contains('is-reading')) {
    showLibrary(true);
  }
});

window.addEventListener('scroll', () => {
  if (
    document.body.classList.contains('is-reading') &&
    !document.body.classList.contains('is-pdf-reading')
  ) {
    saveCurrentPosition(false);
  }
}, { passive: true });

window.addEventListener('online', () => {
  elements.cloudBadge.classList.toggle('is-online', isCloudUnlocked());

  if (isCloudUnlocked()) {
    elements.cloudBadge.textContent = 'Nube';
    scheduleCloudSync(1000);
  }
});

window.addEventListener('offline', () => {
  if (isCloudUnlocked()) {
    elements.cloudBadge.textContent = 'Offline';
    elements.cloudBadge.classList.remove('is-online');
    elements.cloudStatus.textContent =
      'Sin conexión. Puedes seguir leyendo; se sincronizará cuando vuelva Internet.';
  }
});

window.addEventListener('visibilitychange', () => {
  if (
    document.visibilityState === 'hidden' &&
    isCloudUnlocked()
  ) {
    scheduleCloudSync(1000);
  }
});

window.addEventListener('pagehide', () => {
  saveCurrentPosition(true);
});

window.parent?.postMessage(
  {
    type: 'kaoru:studio-ready',
    studio: 'reader'
  },
  '*'
);

async function boot() {
  refreshReadingPreferencesUi();
  ensureLibraryHistoryState();

  if (elements.immersiveStatus) {
    elements.immersiveStatus.textContent =
      readingPreferences.immersive
        ? 'Se intentará activar pantalla completa cuando toques una obra.'
        : 'Lectura inmersiva desactivada.';
  }

  applySavedCloudUi();

  try {
    const asset = await loadSavedReadingFont();

    if (asset) {
      elements.fontSummary.textContent = asset.name || 'Lucida Sans';
      elements.fontStatus.textContent =
        'Tipografía cargada desde este dispositivo.';
    }
  } catch (error) {
    console.error(error);
  }

  await renderLibrary();

  if (ENTRY_MODE === 'library') {
    writeSession({ view: 'library' });
    return;
  }

  const session = readSession();

  if (
    (
      session?.view === 'reader' ||
      session?.view === 'pdf'
    ) &&
    session.bookId
  ) {
    const progress = await getProgress(session.bookId);

    pushReadingHistoryState();

    await openBook(
      session.bookId,
      progress?.chapterIndex ?? session.chapterIndex ?? 0,
      true
    );
  }
}

boot().catch((error) => {
  console.error(error);
  setStatus('No se pudo iniciar la biblioteca local.');
});
