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
        three: [h('path', { d: 'M12 2 20 6.5v9L12 20l-8-4.5v-9L12 2Z' }), h('path', { d: 'm4 6.5 8 4.5 8-4.5M12 11v9' }), h('path', { d: 'M8.5 8.7 12 6.8l3.5 1.9' })],
        combine: [h('rect', { x: 4, y: 5, width: 11, height: 11, rx: 2 }), h('rect', { x: 9, y: 8, width: 11, height: 11, rx: 2 }), h('path', { d: 'M7 12l2-2 2 2 2-2 4 4' })],
        gallery: [h('rect', { x: 4, y: 4, width: 6, height: 6, rx: 1 }), h('rect', { x: 14, y: 4, width: 6, height: 6, rx: 1 }), h('rect', { x: 4, y: 14, width: 6, height: 6, rx: 1 }), h('rect', { x: 14, y: 14, width: 6, height: 6, rx: 1 })],
        tasks: [h('rect', { x: 4, y: 4, width: 16, height: 16, rx: 3 }), h('path', { d: 'M8 9l1.5 1.5L12 8M8 14l1.5 1.5L12 13M14 9h3M14 14h3' })],        reader: [h('path', { d: 'M5 4.5A3.5 3.5 0 0 1 8.5 2H12v18H8.5A3.5 3.5 0 0 0 5 23.5v-19Z' }), h('path', { d: 'M19 4.5A3.5 3.5 0 0 0 15.5 2H12v18h3.5a3.5 3.5 0 0 1 3.5 3.5v-19Z' })],
        moon: [h('path', { d: 'M20.2 14.2A8 8 0 0 1 9.8 3.8 8.5 8.5 0 1 0 20.2 14.2Z' })],
        sun: [h('circle', { cx: 12, cy: 12, r: 4 }), h('path', { d: 'M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41' })],
        chevron: [h('path', { d: 'm9 18 6-6-6-6' })],
        dots: [h('circle', { cx: 5, cy: 12, r: 1, fill: 'currentColor', stroke: 'none' }), h('circle', { cx: 12, cy: 12, r: 1, fill: 'currentColor', stroke: 'none' }), h('circle', { cx: 19, cy: 12, r: 1, fill: 'currentColor', stroke: 'none' })]
    };
    return h('svg', common, ...(paths[name] || []));
}
const studios = [
    { id: 'home', name: 'Inicio', short: 'Inicio', subtitle: 'Tu espacio creativo', src: './legacy/home/index.html?embed=1', accent: 'home', icon: h(Icon, { name: 'gallery' }), hotkey: 'Inicio' },
    { id: 'silhouette', name: 'Silueta Studio', short: 'Silueta', subtitle: 'Formas, máscaras y composiciones', src: './legacy/index.html?embed=1', accent: 'violet', icon: h(Icon, { name: 'silhouette' }), hotkey: 'Alt+1' },
    { id: 'text', name: 'Text Studio', short: 'Texto', subtitle: 'Tipografía y efectos avanzados', src: './legacy/text-studio/index.html?embed=1', accent: 'rose', icon: h(Icon, { name: 'text' }), hotkey: 'Alt+2' },
    { id: 'image', name: 'Image Studio', short: 'Imagen', subtitle: 'Ajustes, filtros y exportación', src: './legacy/image-studio/index.html?embed=1', accent: 'blue', icon: h(Icon, { name: 'image' }), hotkey: 'Alt+3' },
    { id: 'light', name: 'Light Lab', short: 'Light Lab', subtitle: 'Paletas, luces, pieles y materiales', src: './legacy/light-lab/index.html?embed=1', accent: 'teal', icon: h(Icon, { name: 'light' }), hotkey: 'Alt+4' },
    { id: '3d', name: '3D Lighting Studio', short: '3D', subtitle: 'Modelos, anatomia y luces 3D', src: './legacy/3d-lighting/index.html?embed=1', accent: 'indigo', icon: h(Icon, { name: 'three' }), hotkey: 'Alt+5' },
    { id: 'combiner', name: 'Image Combiner Studio', short: 'Combiner', subtitle: 'Lienzos, capas y composiciones de imagen', src: './legacy/image-combiner/index.html?embed=1', accent: 'coral', icon: h(Icon, { name: 'combine' }), hotkey: 'Alt+6' },
    { id: 'gallery', name: 'Galería', short: 'Galería', subtitle: 'Diseños, proyectos y plantillas', src: './legacy/gallery/index.html?embed=1', accent: 'amber', icon: h(Icon, { name: 'gallery' }), hotkey: 'Alt+7' },
    { id: 'tasks', name: 'Task Studio', short: 'Tareas', subtitle: 'Cursos, tareas, notas y entregas', src: './legacy/task-studio/index.html?embed=1', accent: 'mint', icon: h(Icon, { name: 'tasks' }), hotkey: 'Alt+9' },    { id: 'reader', name: 'Archive Reader', short: 'Reader', subtitle: 'Lectura EPUB offline', src: './legacy/reader/index.html?embed=1', accent: 'reader', icon: h(Icon, { name: 'reader' }), hotkey: 'Alt+8' }
];
function readTheme() { try {
    return localStorage.getItem(THEME_KEY) === 'night' ? 'night' : 'day';
}
catch (_) {
    return 'day';
} }
function hashStudio() { const v = location.hash.replace('#', ''); return studios.some(s => s.id === v) ? v : 'home'; }
function shouldOpenReaderStandalone() {
    try {
        return window.matchMedia('(max-width: 800px)').matches;
    }
    catch (_) {
        return false;
    }
}
function readerStandaloneUrl() {
    return './legacy/reader/index.html?entry=library&standalone=1&visit=' + Date.now();
}function tasksStandaloneUrl() {
    return './legacy/task-studio/index.html?standalone=1&visit=' + Date.now();
}class Logo extends React.Component {
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
        if (this.state.active === 'reader' && shouldOpenReaderStandalone()) {
            window.location.assign(readerStandaloneUrl());
            return;
        }
        if (this.state.active === 'tasks' && shouldOpenReaderStandalone()) {
            window.location.assign(tasksStandaloneUrl());
            return;
        }        window.addEventListener('keydown', this.onKeyBound);
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
        const map = { '1': 'silhouette', '2': 'text', '3': 'image', '4': 'light', '5': '3d', '6': 'combiner', '7': 'gallery', '8': 'reader', '9': 'tasks' };
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
        else if (data.type === 'kaoru:task-count') {
            const count = Number(data.count) || 0;
            document.title = count > 0 ? '(' + count + ') kaoru\'s studio' : 'kaoru\'s studio';
        }
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

        if (id === 'reader' && shouldOpenReaderStandalone()) {
            window.location.assign(readerStandaloneUrl());
            return;
        }

        if (id === 'tasks' && shouldOpenReaderStandalone()) {
            window.location.assign(tasksStandaloneUrl());
            return;
        }
        const nextSrc = id === 'reader'
            ? target.src + '&entry=library&visit=' + Date.now()
            : id === 'tasks'
                ? target.src + '&visit=' + Date.now()
                : target.src;

        this.setState({ active: id, frameSrc: nextSrc });

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
        return h('div', { className: 'kaoru-app' + (this.state.active === 'reader' ? ' is-reader' : '') + (this.state.active === 'tasks' ? ' is-tasks' : '') + (this.state.active === 'home' ? ' is-home' : '') }, h('aside', { className: 'rail' }, h('div', { className: 'rail-brand' }, h(Logo, {})), h('nav', { className: 'rail-nav', 'aria-label': 'Studios' }, ...studios.map(studio => h('button', {
            key: studio.id, className: `rail-item accent-${studio.accent} ${this.state.active === studio.id ? 'is-active' : ''}`,
            onClick: () => this.navigate(studio.id), title: `${studio.name} · ${studio.hotkey}`, 'aria-current': this.state.active === studio.id ? 'page' : undefined
        }, h('span', { className: 'rail-icon' }, studio.icon), h('span', { className: 'rail-label' }, studio.short)))), h('div', { className: 'rail-bottom' }, h('button', { className: 'rail-item theme-rail', onClick: () => this.setTheme(this.state.theme === 'night' ? 'day' : 'night'), title: this.state.theme === 'night' ? 'Modo claro' : 'Modo oscuro' }, h('span', { className: 'rail-icon' }, h(Icon, { name: this.state.theme === 'night' ? 'sun' : 'moon' })), h('span', { className: 'rail-label' }, this.state.theme === 'night' ? 'Claro' : 'Oscuro')))), h('section', { className: 'main-shell' }, h('header', { className: 'appbar' }, h('div', { className: 'appbar-title' }, h('div', { className: 'crumb-brand' }, "Kaoru's Studio"), h(Icon, { name: 'chevron' }), h('div', { className: 'workspace-title' }, h('strong', null, activeStudio.name), h('span', null, activeStudio.subtitle))), h('div', { className: 'appbar-actions' }, this.state.active === 'silhouette' && h('div', { className: 'silhouette-shell-actions' }, h('button', { className: 'shell-action shell-action-secondary', onClick: () => this.openRemoveBg(), title: 'Abrir Quitafondos' }, 'Quitafondos'), h('button', { className: 'shell-action shell-action-secondary', onClick: () => this.saveBlackTemplate(), title: 'Guardar la silueta como plantilla negra pura' }, '＋ Plantilla negra'), h('button', { className: 'shell-action shell-action-primary', onClick: () => this.exportSilhouette(), title: 'Exportar la silueta como PNG' }, 'Exportar PNG')), h('div', { className: 'shortcut-hint' }, h('span', null, 'Cambiar de Studio'), h('kbd', null, activeStudio.hotkey)), h('button', { className: 'appbar-icon', title: 'Opciones de Kaoru’s Studio' }, h(Icon, { name: 'dots' })))), h('div', { className: 'frame-shell' }, h('iframe', { ref: (el) => this.frame = el, className: 'studio-frame', allowFullScreen: true, allow: 'fullscreen', src: this.state.frameSrc, title: activeStudio.name, onLoad: () => this.onFrameLoad() }))));
    }
}
ReactDOM.render(h(App, {}), document.getElementById('root'));
