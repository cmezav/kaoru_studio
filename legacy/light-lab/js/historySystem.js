export const HISTORY_SYSTEM_PHASE = 7;

function clone(value) {
  if (value == null) return value;
  try { return structuredClone(value); }
  catch (_) { return JSON.parse(JSON.stringify(value)); }
}

function snapshotState(state) {
  const result = clone(state);
  if (result?.reference) result.reference.image = null;
  if (result?.ui) {
    result.ui.selectedSwatchIndex = null;
    result.ui.lastSamplePosition = null;
  }
  return result;
}

function comparable(state) {
  const copy = snapshotState(state);
  if (copy?.project) {
    copy.project.updatedAt = null;
  }
  return JSON.stringify(copy);
}

export function createHistoryController(store, options = {}) {
  const limit = Math.max(10, Number(options.limit) || 100);
  const debounceMs = Math.max(60, Number(options.debounceMs) || 180);
  let past = [];
  let future = [];
  let current = snapshotState(store.getState());
  let pending = null;
  let timer = null;
  let applying = false;
  const listeners = new Set();

  function emit() {
    const status = {
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      undoCount: past.length,
      redoCount: future.length
    };
    listeners.forEach((listener) => listener(status));
  }

  function commitPending() {
    clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const next = pending;
    pending = null;
    if (comparable(next) === comparable(current)) return;
    past.push(current);
    if (past.length > limit) past.shift();
    current = next;
    future = [];
    emit();
  }

  const unsubscribeStore = store.subscribe((state) => {
    if (applying) {
      current = snapshotState(state);
      return;
    }
    pending = snapshotState(state);
    clearTimeout(timer);
    timer = setTimeout(commitPending, debounceMs);
  });

  function applySnapshot(target) {
    const live = store.getState();
    const next = clone(target);
    if (next?.reference) {
      next.reference.image = live?.reference?.image || null;
    }
    applying = true;
    try {
      store.setState(next);
    } finally {
      applying = false;
    }
    current = snapshotState(next);
  }

  function undo() {
    commitPending();
    if (!past.length) return false;
    const previous = past.pop();
    future.push(current);
    applySnapshot(previous);
    emit();
    return true;
  }

  function redo() {
    commitPending();
    if (!future.length) return false;
    const next = future.pop();
    past.push(current);
    applySnapshot(next);
    emit();
    return true;
  }

  function clear() {
    clearTimeout(timer);
    timer = null;
    past = [];
    future = [];
    pending = null;
    current = snapshotState(store.getState());
    emit();
  }

  function checkpoint() {
    commitPending();
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener({
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      undoCount: past.length,
      redoCount: future.length
    });
    return () => listeners.delete(listener);
  }

  function destroy() {
    clearTimeout(timer);
    unsubscribeStore();
    listeners.clear();
  }

  return { undo, redo, clear, checkpoint, subscribe, destroy };
}