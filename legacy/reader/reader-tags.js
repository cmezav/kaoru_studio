import { listBookTags, putBookTags, claimLocalBookTags } from './reader-db.js?cache=pdf-reader-1';

export const TAG_PALETTE = ['#b197fc', '#74c0fc', '#63e6be', '#a9e34b', '#ffd43b', '#ffa94d', '#ff8787', '#f783ac'];
export const foldSearch = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
export const tagOwner = () => window.KaoruReaderAccount?.currentUser?.()?.id || 'local';
export function tagColor(value) {
  let hex = String(value || '').trim();
  if (/^#[\da-f]{3}$/i.test(hex)) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('Usa un color hexadecimal como #B197FC o #ABC.');
  return hex.toLowerCase();
}
export function normalizeTags(tags) {
  const names = new Set();
  return (Array.isArray(tags) ? tags : []).map(tag => {
    const label = String(tag.label || '').trim();
    if (!label || label.length > 80) throw new Error('Cada etiqueta necesita un nombre de hasta 80 caracteres.');
    const key = foldSearch(label);
    if (names.has(key)) throw new Error('Ese libro ya tiene una etiqueta con ese nombre.');
    names.add(key);
    return { label, color: tagColor(tag.color) };
  });
}
export function tagInk(hex) {
  const rgb = hex.slice(1).match(/../g).map(c => {
    const v = parseInt(c, 16) / 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2] > .179 ? '#111111' : '#ffffff';
}
const changed = () => window.dispatchEvent(new CustomEvent('kaoru:reader-tags-changed'));
const status = message => { const node = document.getElementById('tagsSyncStatus'); if (node) node.textContent = message; };
export async function libraryTags() {
  const owner = tagOwner();
  await claimLocalBookTags(owner);
  return new Map((await listBookTags(owner)).map(row => [row.bookId, row.tags || []]));
}
export async function saveBookTags(bookId, tags, owner) {
  if (owner !== tagOwner()) throw new Error('La cuenta cambió. Abre de nuevo las etiquetas.');
  await putBookTags({ ownerId: owner, bookId, tags: normalizeTags(tags) }, true);
  changed();
  status(owner === 'local' ? 'Etiquetas guardadas en este dispositivo.' : 'Etiquetas guardadas aquí; sincronización pendiente.');
  scheduleSync();
}
let timer = 0;
let syncing = false;
let again = false;
let channel = null;
export function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(() => syncTags(), 500);
}
export async function syncTags() {
  if (syncing) { again = true; return; }
  const owner = tagOwner();
  const api = window.KaoruReaderAccount?.getClient?.();
  if (owner === 'local' || !api || !navigator.onLine) return;
  syncing = true;
  try {
    await claimLocalBookTags(owner);
    const data = [];
    for (let offset = 0; ; offset += 500) {
      const { data: page, error } = await api.from('kaoru_records')
        .select('entity_id,payload,client_updated_at,deleted')
        .eq('user_id', owner).eq('module', 'reader').eq('entity_type', 'book-tags')
        .order('entity_id').range(offset, offset + 499);
      if (error) throw error;
      if (owner !== tagOwner()) return;
      data.push(...(page || []));
      if (!page || page.length < 500) break;
    }
    const locals = new Map((await listBookTags(owner)).map(row => [row.bookId, row]));
    const remote = new Map();
    let applied = false;
    for (const row of data) {
      if (!Number.isFinite(Number(row.client_updated_at)) || !row.entity_id) continue;
      const tags = row.deleted ? [] : normalizeTags(row.payload?.tags);
      remote.set(String(row.entity_id), row);
      const local = locals.get(String(row.entity_id));
      if (owner !== tagOwner()) return;
      if (!local || Number(row.client_updated_at) > Number(local.updatedAt)) {
        await putBookTags({ ownerId: owner, bookId: String(row.entity_id), tags, updatedAt: Number(row.client_updated_at) });
        applied = true;
      }
    }
    if (applied && owner === tagOwner()) changed();
    for (const local of await listBookTags(owner)) {
      if (owner !== tagOwner()) return;
      if (Number(local.updatedAt) <= Number(remote.get(local.bookId)?.client_updated_at || 0)) continue;
      const { error: uploadError } = await api.rpc('kaoru_upsert_record', {
        p_module: 'reader', p_entity_type: 'book-tags', p_entity_id: local.bookId,
        p_payload: { bookId: local.bookId, tags: local.tags }, p_client_updated_at: local.updatedAt,
        p_deleted: false, p_device_id: localStorage.getItem('kaoru.reader.device-id.v1') || 'reader-device'
      });
      if (uploadError) throw uploadError;
    }
    if (owner === tagOwner()) status('Etiquetas sincronizadas con tu cuenta.');
  } catch (error) {
    console.warn('Kaoru Reader etiquetas', error);
    if (owner === tagOwner()) status('Etiquetas guardadas aquí. No se pudieron sincronizar; se reintentará con conexión.');
  } finally {
    syncing = false;
    if (again) { again = false; scheduleSync(); }
  }
}
async function accountChanged() {
  if (channel) { try { await channel.unsubscribe(); } catch (_) {} channel = null; }
  changed();
  status(tagOwner() === 'local' ? 'Las etiquetas se guardan en este dispositivo. Inicia sesión para sincronizarlas.' : 'Comprobando etiquetas de tu cuenta…');
  const owner = tagOwner();
  const api = window.KaoruReaderAccount?.getClient?.();
  if (owner !== 'local' && api?.channel) {
    channel = api.channel(`kaoru-reader-tags-${owner}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'kaoru_records', filter: `user_id=eq.${owner}`
    }, event => {
      const row = event.new || event.old;
      if (row?.module === 'reader' && row?.entity_type === 'book-tags') scheduleSync();
    }).subscribe();
  }
  scheduleSync();
}
window.addEventListener('kaoru:reader-account', accountChanged);
window.addEventListener('online', scheduleSync);
window.addEventListener('focus', scheduleSync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleSync(); });
setInterval(() => { if (!document.hidden) scheduleSync(); }, 60000);
Promise.resolve(window.KaoruReaderAccount?.ready?.()).then(accountChanged).catch(() => {});
