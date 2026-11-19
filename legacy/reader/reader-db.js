const DB_NAME = 'kaoru.archive-reader';
const DB_VERSION = 3;
const TAG_STORE = 'bookTags';
const BOOK_STORE = 'books';
const PROGRESS_STORE = 'progress';
const ASSET_STORE = 'assets';

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
    let blocked = false;

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        const books = db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
        books.createIndex('importedAt', 'importedAt');
      }

      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: 'bookId' });
      }

      if (!db.objectStoreNames.contains(TAG_STORE)) {
        const tags = db.createObjectStore(TAG_STORE, { keyPath: ['ownerId', 'bookId'] });
        tags.createIndex('ownerId', 'ownerId');
        tags.createIndex('bookId', 'bookId');
      }

      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        db.createObjectStore(ASSET_STORE, { keyPath: 'id' });
      }
    };

    request.onblocked = () => {
      blocked = true;
      dbPromise = null;
      reject(new Error('Cierra las otras ventanas de Kaoru y vuelve a abrir Reader para actualizar la biblioteca.'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
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
  const tx = db.transaction(
    [BOOK_STORE, PROGRESS_STORE, ASSET_STORE, TAG_STORE],
    'readwrite'
  );

  const tags = tx.objectStore(TAG_STORE);
  tags.index('bookId').openCursor(IDBKeyRange.only(id)).onsuccess = event => {
    const cursor = event.target.result;
    if (cursor) { cursor.delete(); cursor.continue(); }
  };
  tx.objectStore(BOOK_STORE).delete(id);
  tx.objectStore(PROGRESS_STORE).delete(id);
  tx.objectStore(ASSET_STORE).delete(`pdf:${id}`);
  tx.objectStore(ASSET_STORE).delete(`source:${id}`);
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

  try {
    window.dispatchEvent(
      new CustomEvent('kaoru:reader-progress-saved', {
        detail: { ...progress }
      })
    );
  } catch (_) {}

  return progress;
}

export async function listProgress() {
  const db = await openReaderDb();
  const tx = db.transaction(PROGRESS_STORE, 'readonly');
  return (await requestPromise(tx.objectStore(PROGRESS_STORE).getAll())) || [];
}

export async function putAsset(asset) {
  const db = await openReaderDb();
  const tx = db.transaction(ASSET_STORE, 'readwrite');
  tx.objectStore(ASSET_STORE).put(asset);
  await txPromise(tx);
  return asset;
}

export async function getAsset(id) {
  const db = await openReaderDb();
  const tx = db.transaction(ASSET_STORE, 'readonly');
  return requestPromise(tx.objectStore(ASSET_STORE).get(id));
}

export async function listAssets() {
  const db = await openReaderDb();
  const tx = db.transaction(ASSET_STORE, 'readonly');
  return (await requestPromise(tx.objectStore(ASSET_STORE).getAll())) || [];
}

export async function deleteAsset(id) {
  const db = await openReaderDb();
  const tx = db.transaction(ASSET_STORE, 'readwrite');
  tx.objectStore(ASSET_STORE).delete(id);
  await txPromise(tx);
}

// Labels are independent of book bytes, so reimporting cannot overwrite them.
export async function listBookTags(ownerId) {
  const db = await openReaderDb();
  return requestPromise(db.transaction(TAG_STORE).objectStore(TAG_STORE).index('ownerId').getAll(ownerId));
}

export async function putBookTags(record, localEdit = false) {
  const db = await openReaderDb();
  const tx = db.transaction(TAG_STORE, 'readwrite');
  const done = txPromise(tx);
  const store = tx.objectStore(TAG_STORE);
  let result;
  store.get([record.ownerId, record.bookId]).onsuccess = event => {
    const previous = event.target.result;
    result = { ...record };
    if (localEdit) result.updatedAt = Math.max(Date.now(), Number(previous?.updatedAt || 0) + 1);
    if (localEdit || !previous || Number(result.updatedAt) > Number(previous.updatedAt)) store.put(result);
    else result = previous;
  };
  await done;
  return result;
}

export async function claimLocalBookTags(ownerId) {
  if (ownerId === 'local') return;
  const db = await openReaderDb();
  const tx = db.transaction(TAG_STORE, 'readwrite');
  const done = txPromise(tx);
  const store = tx.objectStore(TAG_STORE);
  store.index('ownerId').openCursor(IDBKeyRange.only('local')).onsuccess = event => {
    const cursor = event.target.result;
    if (!cursor) return;
    const record = { ...cursor.value, ownerId };
    store.get([ownerId, record.bookId]).onsuccess = current => {
      if (!current.target.result || Number(record.updatedAt) > Number(current.target.result.updatedAt)) store.put(record);
      cursor.delete();
      cursor.continue();
    };
  };
  await done;
}
