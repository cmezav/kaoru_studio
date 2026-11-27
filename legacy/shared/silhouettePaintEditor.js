/* Shared paint controls for silhouette outlines, shadows and glows. */
(function () {
  'use strict';
  const presets = {
    sunset: ['#FF4D8D', '#FF9D18'],
    ocean: ['#13BFEA', '#635BFF'],
    rainbow: ['#FF4545', '#FFCD38', '#43D981', '#229DFF', '#9747FF']
  };
  function hex(value) {
    let text = String(value || '').trim().replace(/^#/, '');
    if (/^[\da-f]{3}$/i.test(text)) text = text.split('').map(c => c + c).join('');
    return /^[\da-f]{6}$/i.test(text) ? '#' + text.toUpperCase() : null;
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  function gradient(paint) {
    if (!paint.gradient || !Array.isArray(paint.gradient.stops) || paint.gradient.stops.length < 2) {
      paint.gradient = { angle: 0, selectedId: 1, nextId: 3, stops: [
        { id: 1, pos: 0, color: hex(paint.color) || '#000000' },
        { id: 2, pos: 100, color: '#FFFFFF' }
      ] };
    }
    return paint.gradient;
  }
  function create(host, options) {
    host.classList.add('kaoru-paint');
    host.innerHTML = `
      <div class="paint-tabs" role="group" aria-label="Tipo de color">
        <button type="button" data-mode="solid">Color sólido</button>
        <button type="button" data-mode="gradient">Degradado</button>
      </div>
      <div class="paint-gradient" hidden>
        <div class="paint-preview" aria-hidden="true"></div>
        <div class="paint-track" aria-label="Puntos del degradado"></div>
        <div class="paint-actions">
          <button type="button" data-action="add">＋ Punto</button>
          <button type="button" data-action="remove">− Eliminar</button>
        </div>
        <label class="paint-range">Posición del punto (%)
          <span><input class="paint-position" type="range" min="0" max="100" data-no-exact-number="true"><input class="paint-position-number" type="number" min="0" max="100" aria-label="Posición del punto (%)"></span>
        </label>
        <label class="paint-range">Orientación del degradado (°)
          <span><input class="paint-angle" type="range" min="-180" max="180" data-no-exact-number="true"><input class="paint-angle-number" type="number" min="-180" max="180" aria-label="Orientación del degradado (°)"></span>
        </label>
        <div class="paint-presets">
          <button type="button" data-preset="sunset" title="Atardecer" aria-label="Degradado atardecer"></button>
          <button type="button" data-preset="ocean" title="Océano" aria-label="Degradado océano"></button>
          <button type="button" data-preset="rainbow" title="Arcoíris" aria-label="Degradado arcoíris"></button>
        </div>
      </div>
      <label class="paint-color-label">Color <span class="paint-color-target"></span></label>
      <div class="paint-color-row">
        <input class="paint-color" type="color" aria-label="Paleta de color">
        <input class="paint-hex" type="text" maxlength="7" spellcheck="false" placeholder="#7C3AED" aria-label="Color HEX">
        <button type="button" class="paint-eyedropper" title="Tomar color de la pantalla" aria-label="Cuentagotas">💧</button>
      </div>
      <div class="paint-swatches" role="group" aria-label="Paleta rápida"></div>`;
    const find = selector => host.querySelector(selector);
    const track = find('.paint-track');
    const numberPos = find('.paint-position-number'), rangePos = find('.paint-position');
    const numberAngle = find('.paint-angle-number'), rangeAngle = find('.paint-angle');
    const color = find('.paint-color'), hexInput = find('.paint-hex');
    const stops = new Map();
    let dragging = null;
    function selected() {
      const g = gradient(options.get());
      return g.stops.find(s => s.id === g.selectedId) || g.stops[0];
    }
    function currentHex() {
      const paint = options.get();
      return hex(paint.colorFillType === 'gradient' ? selected().color : paint.color) || '#000000';
    }
    function sync() {
      const paint = options.get(), isGradient = paint.colorFillType === 'gradient';
      host.querySelectorAll('[data-mode]').forEach(button => {
        const active = button.dataset.mode === (isGradient ? 'gradient' : 'solid');
        button.classList.toggle('active', active);button.setAttribute('aria-pressed', String(active));
      });
      find('.paint-gradient').hidden = !isGradient;
      find('.paint-color-target').textContent = isGradient ? 'del punto seleccionado' : 'sólido';
      color.value = currentHex();
      if (document.activeElement !== hexInput) hexInput.value = currentHex();
      if (!isGradient) return;
      const g = gradient(paint), selectedStop = selected();
      g.selectedId = selectedStop.id;
      const sorted = [...g.stops].sort((a,b) => a.pos - b.pos);
      // Canvas 0° points right; CSS 90° points right.
      const background = `linear-gradient(${Number(g.angle) + 90}deg, ${sorted.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
      find('.paint-preview').style.background = background;
      track.style.background = `linear-gradient(90deg, ${sorted.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
      for (const [id, button] of stops) {
        if (!g.stops.some(s => s.id === id)) { button.remove();stops.delete(id); }
      }
      for (const stop of g.stops) {
        let button = stops.get(stop.id);
        if (!button) {
          button = document.createElement('button');button.type = 'button';button.className = 'paint-stop';
          button.dataset.stopId = stop.id;
          button.onclick = () => { gradient(options.get()).selectedId = stop.id;sync(); };
          button.onpointerdown = event => {
            if (event.button !== 0) return;
            event.preventDefault();options.begin();dragging = stop.id;
            gradient(options.get()).selectedId = stop.id;track.setPointerCapture(event.pointerId);sync();
          };
          track.appendChild(button);stops.set(stop.id, button);
        }
        button.style.left = stop.pos + '%';button.style.background = stop.color;
        button.classList.toggle('selected', stop.id === selectedStop.id);
        button.title = `${stop.color} · ${Math.round(stop.pos)}%`;
        button.setAttribute('aria-label', `Punto ${stop.color}, ${Math.round(stop.pos)}%`);
        button.setAttribute('aria-pressed', String(stop.id === selectedStop.id));
      }
      rangePos.value = selectedStop.pos;rangeAngle.value = g.angle;
      if (document.activeElement !== numberPos) numberPos.value = Math.round(selectedStop.pos);
      if (document.activeElement !== numberAngle) numberAngle.value = g.angle;
      find('[data-action=remove]').disabled = g.stops.length <= 2;
    }
    function render() { sync();options.render(); }
    function change(fn) { options.commit(() => { fn();render(); }); }
    function setColor(value) {
      const paint = options.get();
      if (paint.colorFillType === 'gradient') selected().color = value;
      else paint.color = value;
    }
    host.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => change(() => {
      options.get().colorFillType = button.dataset.mode;
      if (button.dataset.mode === 'gradient') gradient(options.get());
    }));
    color.oninput = () => { options.begin();setColor(color.value.toUpperCase());render(); };
    color.onchange = () => { options.end();sync(); };
    function applyHex() {
      const value = hex(hexInput.value);
      hexInput.setCustomValidity(value ? '' : 'Escribe un HEX válido: #7C3AED o #ABC.');
      if (!value) { hexInput.reportValidity();return; }
      change(() => setColor(value));hexInput.value = value;
    }
    hexInput.oninput = () => hexInput.setCustomValidity('');
    hexInput.onchange = applyHex;
    hexInput.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault();hexInput.blur(); } };
    find('.paint-eyedropper').onclick = () => options.pick(value => { setColor(value);render(); });
    for (const value of ['#000000','#FFFFFF','#7C3AED','#FF4D8D','#FF9D18','#13BFEA','#43D981','#635BFF']) {
      const button = document.createElement('button');button.type = 'button';button.style.background = value;
      button.title = value;button.setAttribute('aria-label', 'Usar ' + value);
      button.onclick = () => change(() => setColor(value));find('.paint-swatches').appendChild(button);
    }
    function bindRange(range, number, setter, min, max) {
      for (const input of [range, number]) {
        input.oninput = () => {
          if (input.value === '' || !Number.isFinite(input.valueAsNumber)) return;
          options.begin();setter(clamp(input.value, min, max));render();
        };
        input.onchange = () => { options.end();input.value = input === number ? range.value : input.value;sync(); };
      }
    }
    bindRange(rangePos, numberPos, value => selected().pos = value, 0, 100);
    bindRange(rangeAngle, numberAngle, value => gradient(options.get()).angle = value, -180, 180);
    track.onpointermove = event => {
      if (dragging === null) return;
      const rect = track.getBoundingClientRect();
      const stop = gradient(options.get()).stops.find(s => s.id === dragging);
      if (stop) stop.pos = clamp((event.clientX - rect.left) / rect.width * 100, 0, 100);
      render();
    };
    function finishDrag(event) {
      if (dragging === null) return;
      dragging = null;
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      options.end();
    }
    track.onpointerup = finishDrag;track.onpointercancel = finishDrag;
    find('[data-action=add]').onclick = () => change(() => {
      const g = gradient(options.get()), sorted = [...g.stops].sort((a,b) => a.pos - b.pos);
      let left = sorted[0], right = sorted[1];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].pos - sorted[i-1].pos > right.pos - left.pos) { left = sorted[i-1];right = sorted[i]; }
      }
      const id = Math.max(...g.stops.map(s => Number(s.id) || 0), Number(g.nextId) - 1 || 0) + 1;
      g.stops.push({ id, pos: (left.pos + right.pos) / 2, color: currentHex() });g.selectedId = id;g.nextId = id + 1;
    });
    find('[data-action=remove]').onclick = () => change(() => {
      const g = gradient(options.get());if (g.stops.length <= 2) return;
      g.stops = g.stops.filter(s => s.id !== g.selectedId);g.selectedId = g.stops[0].id;
    });
    host.querySelectorAll('[data-preset]').forEach(button => {
      const colors = presets[button.dataset.preset];button.style.background = `linear-gradient(90deg, ${colors.join(',')})`;
      button.onclick = () => change(() => {
        const g = gradient(options.get());
        const firstId = Math.max(Number(g.nextId) || 1, ...g.stops.map(s => (Number(s.id) || 0) + 1));
        g.stops = colors.map((value,i) => ({ id: firstId + i, pos: i / (colors.length - 1) * 100, color: value }));
        g.selectedId = firstId;g.nextId = firstId + colors.length;
      });
    });
    sync();return { sync };
  }
  window.KaoruPaintEditor = { create };
})();
