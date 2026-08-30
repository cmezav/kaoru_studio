(function () {
  'use strict';

  const THEME_KEY = 'siluetaStudioTheme';
  const html = document.documentElement;
  const EMBEDDED = window.parent !== window;
  if (EMBEDDED) html.classList.add('kaoru-embedded');

  function normalizedTheme(value) { return value === 'night' ? 'night' : 'day'; }
  function readTheme() {
    try { return normalizedTheme(localStorage.getItem(THEME_KEY)); }
    catch (_) { return 'day'; }
  }

  function updateThemeButtons(theme) {
    const night = theme === 'night';
    document.querySelectorAll('.theme-fab').forEach((button) => {
      button.classList.toggle('is-night', night);
      button.setAttribute('aria-pressed', String(night));
      button.setAttribute('aria-label', night ? 'Cambiar a modo día' : 'Cambiar a modo noche');
      button.title = night ? 'Modo día' : 'Modo noche';
    });
  }

  function applyTheme(theme, save) {
    const next = normalizedTheme(theme);
    const changed = html.dataset.theme !== next;
    html.dataset.theme = next;
    updateThemeButtons(next);
    if (save) {
      try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    }
    // Evita el eco infinito entre el iframe y la aplicación principal.
    if (!changed) return;
    document.dispatchEvent(new CustomEvent('studio-theme-change', { detail: { theme: next } }));
    if (EMBEDDED) window.parent.postMessage({ type: 'kaoru:theme', theme: next }, '*');
  }

  function studioUrl(studio) {
    if (window.KAORU_PATHS && window.KAORU_PATHS[studio]) return new URL(window.KAORU_PATHS[studio], location.href).href;
    const current = document.body && document.body.dataset.studio;
    const folders = { text: 'text-studio', image: 'image-launcher', gallery: 'gallery' };
    if (current === 'silhouette') {
      if (studio === 'silhouette') return new URL('./index.html', location.href).href;
      return new URL(`./${folders[studio] || 'gallery'}/index.html`, location.href).href;
    }
    if (studio === 'silhouette') return new URL('../index.html', location.href).href;
    if (studio === current) return new URL('./index.html', location.href).href;
    return new URL(`../${folders[studio] || 'gallery'}/index.html`, location.href).href;
  }

  function installNavigationShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.key === '1' ? 'silhouette' : event.key === '2' ? 'text' : event.key === '3' ? 'image' : event.key === '4' ? 'gallery' : null;
      if (!target) return;
      event.preventDefault();
      if (EMBEDDED) {
        window.parent.postMessage({ type: 'kaoru:navigate', studio: target }, '*');
      } else {
        location.href = studioUrl(target);
      }
    });
  }

  function markCurrentStudio() {
    const current = document.body && document.body.dataset.studio;
    document.querySelectorAll('[data-studio-link]').forEach((link) => {
      if (link.dataset.studioLink === current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  applyTheme(readTheme(), false);

  function init() {
    if (EMBEDDED && document.body) document.body.classList.add('kaoru-embedded-body');
    updateThemeButtons(normalizedTheme(html.dataset.theme));
    markCurrentStudio();
    if (EMBEDDED) {
      const current = document.body && document.body.dataset.studio;
      window.parent.postMessage({ type: 'kaoru:studio-ready', studio: current, theme: normalizedTheme(html.dataset.theme) }, '*');
    }
    document.querySelectorAll('.theme-fab').forEach((button) => button.addEventListener('click', () => {
      applyTheme(html.dataset.theme === 'night' ? 'day' : 'night', true);
    }));
    installNavigationShortcuts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.addEventListener('storage', (event) => {
    if (event.key === THEME_KEY) applyTheme(normalizedTheme(event.newValue), false);
  });

  window.StudioBridge = { applyTheme, readTheme, studioUrl };
}());

