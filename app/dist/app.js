const h = React.createElement;
const THEME_KEY = 'siluetaStudioTheme';
function Icon(props) {
    const name = props.name;
    const common = { viewBox: '0 0 24 24', width: 19, height: 19, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
    const paths = {
        silhouette: [h('path', { d: 'M4 18c2.2-6 4.6-10 8-12 2.1 1.4 4.8 4.4 8 9-4.8-.1-8.4 1-11 4.2C7.4 20.5 5.6 20 4 18Z' }), h('path', { d: 'M9 19.2c2.8-1.8 5.8-2.5 9-2.2' })],
        text: [h('path', { d: 'M5 6V4h14v2' }), h('path', { d: 'M12 4v16' }), h('path', { d: 'M8 20h8' })],
        image: [h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }), h('circle', { cx: 8.5, cy: 9.2, r: 1.5 }), h('path', { d: 'm5 17 4.2-4.2 3.1 3.1 2-2 4.7 3.1' })],
        light: [h('circle', { cx: 12, cy: 12, r: 3.2 }), h('path', { d: 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1' }), h('path', { d: 'M9.8 14.7h4.4M10.4 17h3.2' })],
        gallery: [h('rect', { x: 4, y: 4, width: 6, height: 6, rx: 1 }), h('rect', { x: 14, y: 4, width: 6, height: 6, rx: 1 }), h('rect', { x: 4, y: 14, width: 6, height: 6, rx: 1 }), h('rect', { x: 14, y: 14, width: 6, height: 6, rx: 1 })],
        moon: [h('path', { d: 'M20.2 14.2A8 8 0 0 1 9.8 3.8 8.5 8.5 0 1 0 20.2 14.2Z' })],
        sun: [h('circle', { cx: 12, cy: 12, r: 4 }), h('path', { d: 'M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41' })],
        chevron: [h('path', { d: 'm9 18 6-6-6-6' })],
        dots: [h('circle', { cx: 5, cy: 12, r: 1, fill: 'currentColor', stroke: 'none' }), h('circle', { cx: 12, cy: 12, r: 1, fill: 'currentColor', stroke: 'none' }), h('circle', { cx: 19, cy: 12, r: 1, fill: 'currentColor', stroke: 'none' })]
    };
    return h('svg', common, ...(paths[name] || []));
}
const studios = [
    { id: 'silhouette', name: 'Silueta Studio', short: 'Silueta', subtitle: 'Formas, máscaras y composiciones', src: './legacy/index.html?embed=1', accent: 'violet', icon: h(Icon, { name: 'silhouette' }), hotkey: 'Alt+1' },
    { id: 'text', name: 'Text Studio', short: 'Texto', subtitle: 'Tipografía y efectos avanzados', src: './legacy/text-studio/index.html?embed=1', accent: 'rose', icon: h(Icon, { name: 'text' }), hotkey: 'Alt+2' },
    { id: 'image', name: 'Image Studio', short: 'Imagen', subtitle: 'Ajustes, filtros y exportación', src: './legacy/image-studio/index.html?embed=1', accent: 'blue', icon: h(Icon, { name: 'image' }), hotkey: 'Alt+3' },
    { id: 'light', name: 'Light Lab', short: 'Light Lab', subtitle: 'Paletas, luces, pieles y materiales', src: './legacy/light-lab/index.html?embed=1&phase=4', accent: 'teal', icon: h(Icon, { name: 'light' }), hotkey: 'Alt+4' },
    { id: 'gallery', name: 'Galería', short: 'Galería', subtitle: 'Diseños, proyectos y plantillas', src: './legacy/gallery/index.html?embed=1', accent: 'amber', icon: h(Icon, { name: 'gallery' }), hotkey: 'Alt+5' }
];
function readTheme() { try {
    return localStorage.getItem(THEME_KEY) === 'night' ? 'night' : 'day';
}
catch (_) {
    return 'day';
} }
function hashStudio() { const v = location.hash.replace('#', ''); return studios.some(s => s.id === v) ? v : 'silhouette'; }
class Logo extends React.Component {
    constructor(props) { super(props); this.state = { failed: false }; }
    render() {
        return h('div', { className: 'brand-logo-wrap' }, !this.state.failed && h('img', { className: 'brand-logo', src: './logo.png', alt: "Kaoru's Studio", onError: () => this.setState({ failed: true }) }), this.state.failed && h('div', { className: 'brand-logo-fallback', 'aria-label': "Kaoru's Studio" }, 'K'));
    }
}
class App extends React.Component {
    constructor(props) {
        super(props);
        const first = hashStudio();
        const firstStudio = studios.find(s => s.id === first) || studios[0];
        this.state = { active: first, theme: readTheme(), frameSrc: firstStudio.src };
        this.frame = null;
        this.onKeyBound = this.onKey.bind(this);
        this.onMessageBound = this.onMessage.bind(this);
        this.onHashBound = this.onHash.bind(this);
    }
    componentDidMount() {
        window.addEventListener('keydown', this.onKeyBound);
        window.addEventListener('message', this.onMessageBound);
        window.addEventListener('hashchange', this.onHashBound);
        this.applyTheme(this.state.theme, false);
    }
    componentWillUnmount() {
        window.removeEventListener('keydown', this.onKeyBound);
        window.removeEventListener('message', this.onMessageBound);
        window.removeEventListener('hashchange', this.onHashBound);
    }
    onHash() { const id = hashStudio(); if (id !== this.state.active)
        this.navigate(id, false); }
    onKey(e) {
        if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
            return;
        const map = { '1': 'silhouette', '2': 'text', '3': 'image', '4': 'light', '5': 'gallery' };
        if (!map[e.key])
            return;
        e.preventDefault();
        this.navigate(map[e.key]);
    }
    onMessage(e) {
        const data = e.data || {};
        if (data.type === 'kaoru:navigate' && studios.some(s => s.id === data.studio))
            this.navigate(data.studio);
        else if (data.type === 'kaoru:studio-ready' && studios.some(s => s.id === data.studio))
            this.setState({ active: data.studio });
        else if (data.type === 'kaoru:theme' && (data.theme === 'day' || data.theme === 'night'))
            this.setTheme(data.theme);
    }
    setTheme(theme) { this.setState({ theme: theme }, () => this.applyTheme(theme, true)); }
    applyTheme(theme, save) {
        document.documentElement.dataset.theme = theme;
        if (save) {
            try {
                localStorage.setItem(THEME_KEY, theme);
            }
            catch (_) { }
        }
        try {
            if (this.frame && this.frame.contentWindow && this.frame.contentWindow.StudioBridge)
                this.frame.contentWindow.StudioBridge.applyTheme(theme, save);
        }
        catch (_) { }
    }
    navigate(id, updateHash = true) {
        const target = studios.find(s => s.id === id);
        if (!target)
            return;
        this.setState({ active: id, frameSrc: target.src });
        if (updateHash && location.hash !== ('#' + id))
            location.hash = id;
    }
    onFrameLoad() {
        try {
            const doc = this.frame.contentDocument;
            const id = doc && doc.body && doc.body.dataset.studio;
            if (id && studios.some(s => s.id === id) && id !== this.state.active)
                this.setState({ active: id });
            if (this.frame.contentWindow && this.frame.contentWindow.StudioBridge)
                this.frame.contentWindow.StudioBridge.applyTheme(this.state.theme, false);
        }
        catch (_) { }
    }
    triggerLegacyAction(id) {
        try {
            const button = this.frame && this.frame.contentDocument && this.frame.contentDocument.getElementById(id);
            if (button && !button.disabled)
                button.click();
        }
        catch (_) { }
    }
    saveBlackTemplate() {
        try {
            const api = this.frame && this.frame.contentWindow && this.frame.contentWindow.SilhouetteStudioActions;
            if (api && typeof api.saveBlackTemplate === 'function') {
                api.saveBlackTemplate();
                return;
            }
            this.triggerLegacyAction('saveTemplateBtn');
        }
        catch (_) { this.triggerLegacyAction('saveTemplateBtn'); }
    }
    exportSilhouette() {
        try {
            const api = this.frame && this.frame.contentWindow && this.frame.contentWindow.SilhouetteStudioActions;
            if (api && typeof api.exportPNG === 'function') {
                api.exportPNG();
                return;
            }
            this.triggerLegacyAction('downloadBtn');
        }
        catch (_) { this.triggerLegacyAction('downloadBtn'); }
    }
    openRemoveBg() { window.open('https://www.remove.bg/es', '_blank', 'noopener,noreferrer'); }
    render() {
        const activeStudio = studios.find(s => s.id === this.state.active) || studios[0];
        return h('div', { className: 'kaoru-app' }, h('aside', { className: 'rail' }, h('div', { className: 'rail-brand' }, h(Logo, {})), h('nav', { className: 'rail-nav', 'aria-label': 'Studios' }, ...studios.map(studio => h('button', {
            key: studio.id, className: `rail-item accent-${studio.accent} ${this.state.active === studio.id ? 'is-active' : ''}`,
            onClick: () => this.navigate(studio.id), title: `${studio.name} · ${studio.hotkey}`, 'aria-current': this.state.active === studio.id ? 'page' : undefined
        }, h('span', { className: 'rail-icon' }, studio.icon), h('span', { className: 'rail-label' }, studio.short)))), h('div', { className: 'rail-bottom' }, h('button', { className: 'rail-item theme-rail', onClick: () => this.setTheme(this.state.theme === 'night' ? 'day' : 'night'), title: this.state.theme === 'night' ? 'Modo claro' : 'Modo oscuro' }, h('span', { className: 'rail-icon' }, h(Icon, { name: this.state.theme === 'night' ? 'sun' : 'moon' })), h('span', { className: 'rail-label' }, this.state.theme === 'night' ? 'Claro' : 'Oscuro')))), h('section', { className: 'main-shell' }, h('header', { className: 'appbar' }, h('div', { className: 'appbar-title' }, h('div', { className: 'crumb-brand' }, "Kaoru's Studio"), h(Icon, { name: 'chevron' }), h('div', { className: 'workspace-title' }, h('strong', null, activeStudio.name), h('span', null, activeStudio.subtitle))), h('div', { className: 'appbar-actions' }, this.state.active === 'silhouette' && h('div', { className: 'silhouette-shell-actions' }, h('button', { className: 'shell-action shell-action-secondary', onClick: () => this.openRemoveBg(), title: 'Abrir Quitafondos' }, 'Quitafondos'), h('button', { className: 'shell-action shell-action-secondary', onClick: () => this.saveBlackTemplate(), title: 'Guardar la silueta como plantilla negra pura' }, '＋ Plantilla negra'), h('button', { className: 'shell-action shell-action-primary', onClick: () => this.exportSilhouette(), title: 'Exportar la silueta como PNG' }, 'Exportar PNG')), h('div', { className: 'shortcut-hint' }, h('span', null, 'Cambiar de Studio'), h('kbd', null, activeStudio.hotkey)), h('button', { className: 'appbar-icon', title: 'Opciones de Kaoru’s Studio' }, h(Icon, { name: 'dots' })))), h('div', { className: 'frame-shell' }, h('iframe', { ref: (el) => this.frame = el, className: 'studio-frame', src: this.state.frameSrc, title: activeStudio.name, onLoad: () => this.onFrameLoad() }))));
    }
}
ReactDOM.render(h(App, {}), document.getElementById('root'));
