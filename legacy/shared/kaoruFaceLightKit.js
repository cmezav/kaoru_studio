export const KAORU_FACE_LIGHT_PRESETS = [
  {
    id: 'club-blue-magenta',
    name: 'Club Blue Magenta',
    mood: 'club oscuro Â· dramÃ¡tico Â· seductor',
    faceEffect: 'Afila el rostro. El magenta cae sobre frente, nariz y labios; el azul profundo hunde media cara y alarga cuello y mandÃ­bula.',
    lights: [
      {
        label: 'Magenta key',
        color: '#FF1F8F',
        intensity: 1.35,
        position: { x: -0.28, y: -0.30 },
        softness: 0.20
      },
      {
        label: 'Deep blue ambient',
        color: '#173DFF',
        intensity: 1.15,
        position: { x: 0.55, y: -0.08 },
        softness: 0.62
      },
      {
        label: 'Cyan streak accent',
        color: '#4FD8FF',
        intensity: 0.52,
        position: { x: 0.78, y: -0.18 },
        softness: 0.18
      }
    ],
    palette: [
      { name: 'Deep Night', hex: '#0A0B4F' },
      { name: 'Electric Blue', hex: '#1C3BEB' },
      { name: 'Club Violet', hex: '#2A0A78' },
      { name: 'Hot Magenta', hex: '#D21478' },
      { name: 'Blue Beam', hex: '#53B5FF' }
    ]
  },
  {
    id: 'pink-green-editorial',
    name: 'Pink Green Editorial',
    mood: 'beauty editorial Â· glossy Â· fashion',
    faceEffect: 'Esculpe pÃ³mulos, nariz, labios y cuello. El magenta domina el frente; el verde talla sienes, bordes de nariz y laterales de la cara.',
    lights: [
      {
        label: 'Hot pink beauty key',
        color: '#FF1EC8',
        intensity: 1.55,
        position: { x: 0.16, y: -0.36 },
        softness: 0.24
      },
      {
        label: 'Green side fill',
        color: '#72FF63',
        intensity: 0.72,
        position: { x: -0.60, y: -0.06 },
        softness: 0.32
      },
      {
        label: 'Plum ambient',
        color: '#4A014A',
        intensity: 0.32,
        position: { x: 0.00, y: 0.42 },
        softness: 0.82
      }
    ],
    palette: [
      { name: 'Neon Fuchsia', hex: '#FF14B8' },
      { name: 'Beauty Pink', hex: '#DB007C' },
      { name: 'Acid Green', hex: '#74FF5C' },
      { name: 'Plum Room', hex: '#3A0933' },
      { name: 'Soft Skin Lift', hex: '#F8B0B7' }
    ]
  },
  {
    id: 'electric-blue-rim',
    name: 'Electric Blue Rim',
    mood: 'perfil escultÃ³rico Â· futurista Â· silueta',
    faceEffect: 'Marca perfil, nariz, labios, mentÃ³n, mandÃ­bula, cuello y borde del cabello. EnseÃ±a mÃ¡s la forma del rostro que su detalle interno.',
    lights: [
      {
        label: 'Blue rim',
        color: '#1F63FF',
        intensity: 1.60,
        position: { x: -0.82, y: -0.08 },
        softness: 0.26
      },
      {
        label: 'Dark navy fill',
        color: '#0A173D',
        intensity: 0.18,
        position: { x: 0.30, y: 0.08 },
        softness: 0.70
      }
    ],
    palette: [
      { name: 'Electric Rim', hex: '#0C56F3' },
      { name: 'Royal Blue', hex: '#1037A8' },
      { name: 'Deep Navy', hex: '#09122D' },
      { name: 'Blue Glow', hex: '#4776FF' },
      { name: 'Pale Ice', hex: '#C9DFF9' }
    ]
  },
  {
    id: 'icy-wet-portrait',
    name: 'Icy Wet Portrait',
    mood: 'frÃ­o limpio Â· delicado Â· hÃºmedo',
    faceEffect: 'Aclara piel y suaviza facciones. Las sombras finas del cabello hÃºmedo pasan por ojos, puente de nariz y labios, generando un retrato mÃ¡s delicado.',
    lights: [
      {
        label: 'Icy front key',
        color: '#E8F8FF',
        intensity: 1.45,
        position: { x: 0.04, y: -0.42 },
        softness: 0.42
      },
      {
        label: 'Cool top boost',
        color: '#8FD3FF',
        intensity: 0.60,
        position: { x: 0.00, y: -0.72 },
        softness: 0.28
      },
      {
        label: 'Soft blue separator',
        color: '#356DFF',
        intensity: 0.24,
        position: { x: -0.36, y: -0.02 },
        softness: 0.46
      }
    ],
    palette: [
      { name: 'Icy White', hex: '#EAF8FF' },
      { name: 'Cool Mist', hex: '#C8ECF9' },
      { name: 'Soft Cyan', hex: '#89B7D9' },
      { name: 'Wet Hair Shadow', hex: '#0D1525' },
      { name: 'Lip Tint', hex: '#E9CAD3' }
    ]
  }
];

function ensureClipboard() {
  return navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
}

export async function copyHex(hex) {
  try {
    if (ensureClipboard()) {
      await navigator.clipboard.writeText(hex);
      return true;
    }
  } catch (error) {
    console.warn('Clipboard API fallo:', error);
  }

  try {
    const area = document.createElement('textarea');
    area.value = hex;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    return true;
  } catch (error) {
    console.warn('Fallback copy fallo:', error);
    return false;
  }
}

export function injectKaoruFaceKitStyles(doc = document) {
  if (doc.getElementById('kaoru-face-light-kit-styles')) return;

  const style = doc.createElement('style');
  style.id = 'kaoru-face-light-kit-styles';
  style.textContent = `
    .kaoru-face-kit{
      position: fixed;
      top: 96px;
      right: 18px;
      width: min(340px, calc(100vw - 28px));
      max-height: calc(100vh - 120px);
      overflow: auto;
      z-index: 9999;
      border-radius: 18px;
      padding: 14px;
      backdrop-filter: blur(14px);
      background: rgba(16,16,28,.86);
      color: #f7f2ff;
      border: 1px solid rgba(192,167,255,.18);
      box-shadow: 0 18px 48px rgba(0,0,0,.38);
      font-family: Inter, system-ui, sans-serif;
    }
    .kaoru-face-kit *{ box-sizing:border-box; }
    .kaoru-face-kit__head{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:10px;
      margin-bottom: 12px;
    }
    .kaoru-face-kit__title{
      margin:0;
      font-size:14px;
      font-weight:800;
      letter-spacing:.03em;
      text-transform:uppercase;
    }
    .kaoru-face-kit__sub{
      margin:4px 0 0;
      opacity:.78;
      font-size:12px;
      line-height:1.35;
    }
    .kaoru-face-kit__toggle{
      appearance:none;
      border:1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.08);
      color: white;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 10px;
      cursor: pointer;
    }
    .kaoru-face-kit__section{
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,.09);
    }
    .kaoru-face-kit__section h4{
      margin: 0 0 10px;
      font-size: 12px;
      letter-spacing: .05em;
      text-transform: uppercase;
      opacity: .88;
    }
    .kaoru-preset-card{
      width: 100%;
      text-align: left;
      margin: 0 0 10px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.05);
      color: white;
      border-radius: 14px;
      padding: 11px 12px;
      cursor: pointer;
      transition: transform .12s ease, border-color .12s ease, background .12s ease;
    }
    .kaoru-preset-card:hover{
      transform: translateY(-1px);
      border-color: rgba(255,255,255,.25);
      background: rgba(255,255,255,.08);
    }
    .kaoru-preset-card__name{
      font-weight: 800;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .kaoru-preset-card__mood{
      font-size: 11px;
      opacity: .72;
      margin-bottom: 7px;
    }
    .kaoru-preset-card__effect{
      font-size: 12px;
      line-height: 1.38;
      opacity: .92;
    }
    .kaoru-swatch-group{
      margin-bottom: 12px;
      padding: 10px;
      border-radius: 14px;
      background: rgba(255,255,255,.035);
      border: 1px solid rgba(255,255,255,.08);
    }
    .kaoru-swatch-group__title{
      font-size: 12px;
      font-weight: 800;
      margin: 0 0 8px;
    }
    .kaoru-swatches{
      display: grid;
      grid-template-columns: 1fr;
      gap: 7px;
    }
    .kaoru-swatch{
      width: 100%;
      display: grid;
      grid-template-columns: 20px 1fr auto;
      align-items: center;
      gap: 9px;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 12px;
      padding: 8px 10px;
      background: rgba(255,255,255,.045);
      color: white;
      cursor: pointer;
    }
    .kaoru-swatch:hover{
      background: rgba(255,255,255,.085);
      border-color: rgba(255,255,255,.20);
    }
    .kaoru-swatch__dot{
      width: 20px;
      height: 20px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.24);
      box-shadow: inset 0 0 0 1px rgba(0,0,0,.10);
    }
    .kaoru-swatch__name{
      font-size: 11px;
      opacity: .84;
    }
    .kaoru-swatch__hex{
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .03em;
    }
    .kaoru-face-kit__status{
      margin-top: 10px;
      min-height: 16px;
      font-size: 11px;
      opacity: .8;
    }
    .kaoru-face-kit.is-collapsed .kaoru-face-kit__body{
      display:none;
    }

    @media (max-width: 980px){
      .kaoru-face-kit{
        top: auto;
        bottom: 12px;
        right: 12px;
        left: 12px;
        width: auto;
        max-height: 54vh;
      }
    }
  `;
  doc.head.appendChild(style);
}

function findAddLightButton(doc = document) {
  const selectors = [
    '#addLightBtn',
    '[data-add-light]',
    '[data-action="add-light"]',
    'button[aria-label*="Add light" i]',
    'button[aria-label*="Agregar luz" i]',
    'button[title*="Add light" i]',
    'button[title*="Agregar luz" i]'
  ];

  for (const selector of selectors) {
    const found = doc.querySelector(selector);
    if (found) return found;
  }

  const allButtons = [...doc.querySelectorAll('button')];
  return allButtons.find((button) => {
    const text = (button.textContent || '').trim().toLowerCase();
    return (
      text.includes('add light') ||
      text.includes('agregar luz') ||
      text.includes('nueva luz') ||
      text.includes('aÃ±adir luz')
    );
  }) || null;
}

function findLightCards(doc = document) {
  const selectors = [
    '#lightsList > *',
    '.lights-list > *',
    '.light-card',
    '.light-item',
    '.light-row',
    '[data-light-item]',
    '[data-light-row]'
  ];

  for (const selector of selectors) {
    const items = [...doc.querySelectorAll(selector)];
    if (items.length) return items;
  }

  return [];
}

function setInputValue(input, value) {
  if (!input) return false;

  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function pickInput(card, regexes, preferredTypes = []) {
  const inputs = [...card.querySelectorAll('input, select, textarea')];

  const byLabel = inputs.find((input) => {
    const text = [
      input.name,
      input.id,
      input.placeholder,
      input.dataset?.label,
      input.dataset?.field,
      input.getAttribute('aria-label')
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return regexes.some((regex) => regex.test(text)) &&
      (!preferredTypes.length || preferredTypes.includes((input.type || '').toLowerCase()));
  });

  if (byLabel) return byLabel;

  return inputs.find((input) =>
    !preferredTypes.length || preferredTypes.includes((input.type || '').toLowerCase())
  ) || null;
}

function setLightCardFromPreset(card, light) {
  let touched = false;

  const colorInput = card.querySelector('input[type="color"]') || pickInput(card, [/color|colour|hex|luz/], ['color', 'text']);
  if (colorInput) touched = setInputValue(colorInput, light.color) || touched;

  const intensityInput = pickInput(card, [/intensity|power|strength|brightness|energ/i], ['range', 'number', 'text']);
  if (intensityInput) touched = setInputValue(intensityInput, light.intensity) || touched;

  const softnessInput = pickInput(card, [/soft|spread|radius|blur|falloff|size/i], ['range', 'number', 'text']);
  if (softnessInput) touched = setInputValue(softnessInput, light.softness) || touched;

  const xInput = pickInput(card, [/\bx\b|posx|horizontal|left|right/i], ['range', 'number', 'text']);
  const yInput = pickInput(card, [/\by\b|posy|vertical|up|down|top|bottom/i], ['range', 'number', 'text']);

  if (xInput) touched = setInputValue(xInput, light.position.x) || touched;
  if (yInput) touched = setInputValue(yInput, light.position.y) || touched;

  return touched;
}

function ensureEnoughCards(doc, count) {
  let cards = findLightCards(doc);
  const addLightButton = findAddLightButton(doc);

  let guard = 0;
  while (cards.length < count && addLightButton && guard < 8) {
    addLightButton.click();
    cards = findLightCards(doc);
    guard += 1;
  }

  return cards;
}

export function applyPresetToLightEditorDom(preset, doc = document) {
  const lights = preset?.lights || [];
  if (!lights.length) return false;

  const cards = ensureEnoughCards(doc, lights.length);
  if (!cards.length) return false;

  let touched = false;
  lights.forEach((light, index) => {
    if (cards[index]) {
      touched = setLightCardFromPreset(cards[index], light) || touched;
    }
  });

  return touched;
}

function createEl(tag, className = '', html = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html) el.innerHTML = html;
  return el;
}

export function mountKaoruFacePanel({
  doc = document,
  title = 'Face Light Presets',
  subtitle = 'Presets analizados desde retratos para estudiar cara, cabello y ambiente.',
  applyPreset = () => false
} = {}) {
  injectKaoruFaceKitStyles(doc);

  let existing = doc.getElementById('kaoru-face-kit-panel');
  if (existing) existing.remove();

  const panel = createEl('aside', 'kaoru-face-kit');
  panel.id = 'kaoru-face-kit-panel';

  panel.innerHTML = `
    <div class="kaoru-face-kit__head">
      <div>
        <h3 class="kaoru-face-kit__title">${title}</h3>
        <p class="kaoru-face-kit__sub">${subtitle}</p>
      </div>
      <button type="button" class="kaoru-face-kit__toggle">Ocultar</button>
    </div>
    <div class="kaoru-face-kit__body">
      <section class="kaoru-face-kit__section">
        <h4>Luces analizadas</h4>
        <div class="kaoru-face-kit__presets"></div>
      </section>
      <section class="kaoru-face-kit__section">
        <h4>Paleta para copiar</h4>
        <div class="kaoru-face-kit__palettes"></div>
      </section>
      <div class="kaoru-face-kit__status"></div>
    </div>
  `;

  const presetsWrap = panel.querySelector('.kaoru-face-kit__presets');
  const palettesWrap = panel.querySelector('.kaoru-face-kit__palettes');
  const status = panel.querySelector('.kaoru-face-kit__status');
  const toggle = panel.querySelector('.kaoru-face-kit__toggle');

  toggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('is-collapsed');
    toggle.textContent = collapsed ? 'Mostrar' : 'Ocultar';
  });

  KAORU_FACE_LIGHT_PRESETS.forEach((preset) => {
    const card = createEl('button', 'kaoru-preset-card');
    card.type = 'button';
    card.innerHTML = `
      <div class="kaoru-preset-card__name">${preset.name}</div>
      <div class="kaoru-preset-card__mood">${preset.mood}</div>
      <div class="kaoru-preset-card__effect">${preset.faceEffect}</div>
    `;

    card.addEventListener('click', async () => {
      const ok = await Promise.resolve(applyPreset(preset));
      status.textContent = ok
        ? `Preset aplicado: ${preset.name}`
        : `No pude aplicarlo por API; intentÃ© el modo compatible por inputs para ${preset.name}.`;
    });

    presetsWrap.appendChild(card);

    const group = createEl('div', 'kaoru-swatch-group');
    group.innerHTML = `
      <div class="kaoru-swatch-group__title">${preset.name}</div>
      <div class="kaoru-swatches"></div>
    `;

    const swatches = group.querySelector('.kaoru-swatches');

    preset.palette.forEach((swatch) => {
      const btn = createEl('button', 'kaoru-swatch');
      btn.type = 'button';
      btn.innerHTML = `
        <span class="kaoru-swatch__dot" style="background:${swatch.hex}"></span>
        <span class="kaoru-swatch__name">${swatch.name}</span>
        <span class="kaoru-swatch__hex">${swatch.hex}</span>
      `;

      btn.addEventListener('click', async () => {
        const copied = await copyHex(swatch.hex);
        status.textContent = copied
          ? `Copiado: ${swatch.hex}`
          : `No pude copiar ${swatch.hex}, pero ya lo tienes visible.`;
      });

      swatches.appendChild(btn);
    });

    palettesWrap.appendChild(group);
  });

  doc.body.appendChild(panel);
  return panel;
}
