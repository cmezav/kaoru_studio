/* ============================================================
   HISTORYSYSTEM.JS — Historial no destructivo de la Fase 8.
   Agrupa cambios continuos (sliders/arrastres) y conserva estados
   completos serializables. La aplicación aporta get/apply state.
   ============================================================ */

(function () {
  const MAX_STATES = 80;
  let states = [];
  let index = -1;
  let timer = null;
  let configured = false;
  let applying = false;
  let applyState = null;
  let onChange = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function signature(value) {
    return JSON.stringify(value);
  }

  function notify() {
    if (onChange) onChange({ canUndo: index > 0, canRedo: index >= 0 && index < states.length - 1 });
  }

  function pushNow(state, label) {
    if (!configured || applying || !state) return false;
    const next = clone(state);
    const current = states[index];
    if (current && signature(current.state) === signature(next)) return false;
    if (index < states.length - 1) states = states.slice(0, index + 1);
    states.push({ state: next, label: label || 'Edición', at: Date.now() });
    if (states.length > MAX_STATES) states.shift();
    index = states.length - 1;
    notify();
    return true;
  }

  const HistorySystem = {
    configure(options) {
      applyState = options.applyState;
      onChange = options.onChange || null;
      states = [];
      index = -1;
      configured = true;
      pushNow(options.initialState, 'Estado inicial');
    },

    schedule(state, label, delay = 180) {
      if (!configured || applying) return;
      clearTimeout(timer);
      const pending = clone(state);
      timer = setTimeout(() => pushNow(pending, label), delay);
    },

    commit(state, label) {
      if (!configured || applying) return;
      clearTimeout(timer);
      timer = null;
      pushNow(state, label);
    },

    async undo() {
      clearTimeout(timer);
      timer = null;
      if (index <= 0 || !applyState) return false;
      index -= 1;
      applying = true;
      try { await applyState(clone(states[index].state), { fromHistory: true }); }
      finally { applying = false; notify(); }
      return true;
    },

    async redo() {
      clearTimeout(timer);
      timer = null;
      if (index < 0 || index >= states.length - 1 || !applyState) return false;
      index += 1;
      applying = true;
      try { await applyState(clone(states[index].state), { fromHistory: true }); }
      finally { applying = false; notify(); }
      return true;
    },

    reset(initialState, label = 'Proyecto abierto') {
      clearTimeout(timer);
      states = [];
      index = -1;
      pushNow(initialState, label);
    },

    get isApplying() { return applying; },
    get canUndo() { return index > 0; },
    get canRedo() { return index >= 0 && index < states.length - 1; },
  };

  window.HistorySystem = HistorySystem;
})();
