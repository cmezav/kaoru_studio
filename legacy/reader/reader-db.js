const DB_NAME = 'kaoru.archive-reader';
const DB_VERSION = 1;
const BOOK_STORE = 'books';
const PROGRESS_STORE = 'progress';

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB error'));
  });
}

function txPromise(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction error'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

let dbPromise = null;

export function openReaderDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        const books = db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
        books.createIndex('importedAt', 'importedAt');
      }

      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: 'bookId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir la biblioteca local.'));
  });

  return dbPromise;
}

export async function putBook(book) {
  const db = await openReaderDb();
  const tx = db.transaction(BOOK_STORE, 'readwrite');
  tx.objectStore(BOOK_STORE).put(book);
  await txPromise(tx);
  return book;
}

export async function getBook(id) {
  const db = await openReaderDb();
  const tx = db.transaction(BOOK_STORE, 'readonly');
  return requestPromise(tx.objectStore(BOOK_STORE).get(id));
}

export async function listBooks() {
  const db = await openReaderDb();
  const tx = db.transaction(BOOK_STORE, 'readonly');
  const books = await requestPromise(tx.objectStore(BOOK_STORE).getAll());

  return (books || []).sort((a, b) =>
    Number(b.lastOpenedAt || b.importedAt || 0) -
    Number(a.lastOpenedAt || a.importedAt || 0)
  );
}

export async function deleteBook(id) {
  const db = await openReaderDb();
  const tx = db.transaction([BOOK_STORE, PROGRESS_STORE], 'readwrite');
  tx.objectStore(BOOK_STORE).delete(id);
  tx.objectStore(PROGRESS_STORE).delete(id);
  await txPromise(tx);
}

export async function getProgress(bookId) {
  const db = await openReaderDb();
  const tx = db.transaction(PROGRESS_STORE, 'readonly');
  return requestPromise(tx.objectStore(PROGRESS_STORE).get(bookId));
}

export async function putProgress(progress) {
  const db = await openReaderDb();
  const tx = db.transaction(PROGRESS_STORE, 'readwrite');
  tx.objectStore(PROGRESS_STORE).put(progress);
  await txPromise(tx);
  return progress;
}
