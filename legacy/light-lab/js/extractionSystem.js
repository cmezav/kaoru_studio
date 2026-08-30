import { normalizeHex, rgbToHex } from './colorUtils.js';

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_RENDER_DIMENSION = 1800;
export const MAX_RECENT_COLORS = 24;
export const SAMPLE_ROLES = [
  { id: 'sample', name: 'Muestra' }, { id: 'base', name: 'Principal / Base' },
  { id: 'light', name: 'Luz' }, { id: 'shadow', name: 'Sombra' },
  { id: 'ambient', name: 'Ambiente' }, { id: 'bounce', name: 'Rebote' }
];

function ensureImageBlob(blob) {
  if (!blob || !String(blob.type || '').startsWith('image/')) throw new Error('El archivo no es una imagen compatible.');
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('La imagen supera el límite de 25 MB.');
  return blob;
}

export function imageBlobFromFile(file) { return ensureImageBlob(file); }

export function imageBlobFromPasteEvent(event) {
  const items = [...(event.clipboardData?.items || [])];
  const item = items.find((entry) => entry.type.startsWith('image/'));
  return item ? ensureImageBlob(item.getAsFile()) : null;
}

export async function readImageFromClipboard() {
  if (!navigator.clipboard?.read) throw new Error('Tu navegador no permite leer imágenes con este botón. Usa Ctrl+V.');
  const clipboardItems = await navigator.clipboard.read();
  for (const item of clipboardItems) {
    const type = item.types.find((value) => value.startsWith('image/'));
    if (type) return ensureImageBlob(await item.getType(type));
  }
  throw new Error('El portapapeles no contiene una imagen.');
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob); const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo decodificar la imagen.')); };
    image.src = url;
  });
}

function fittedSize(width, height, maxDimension) {
  const ratio = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

function thumbnailDataUrl(image, maxDimension = 480) {
  const size = fittedSize(image.naturalWidth, image.naturalHeight, maxDimension); const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height; const context=canvas.getContext('2d',{alpha:false}); context.fillStyle='#FFFFFF'; context.fillRect(0,0,size.width,size.height); context.drawImage(image,0,0,size.width,size.height);
  return canvas.toDataURL('image/jpeg',.78);
}

export async function renderImageBlob(blob, canvas, name = 'imagen-pegada') {
  ensureImageBlob(blob); const image = await blobToImage(blob); const size = fittedSize(image.naturalWidth,image.naturalHeight,MAX_RENDER_DIMENSION);
  canvas.width=size.width; canvas.height=size.height; const context=canvas.getContext('2d',{willReadFrequently:true,alpha:true});
  context.clearRect(0,0,size.width,size.height); context.drawImage(image,0,0,size.width,size.height);
  return { name, type: blob.type || 'image/png', originalWidth:image.naturalWidth, originalHeight:image.naturalHeight, renderWidth:size.width, renderHeight:size.height, thumbnailDataUrl:thumbnailDataUrl(image), loadedAt:new Date().toISOString() };
}

export function sampleCanvasAtPointer(canvas, event) {
  if (!canvas.width || !canvas.height) throw new Error('Carga una imagen antes de usar el cuentagotas.');
  const bounds=canvas.getBoundingClientRect(); const x=Math.min(canvas.width-1,Math.max(0,Math.floor((event.clientX-bounds.left)/bounds.width*canvas.width)));
  const y=Math.min(canvas.height-1,Math.max(0,Math.floor((event.clientY-bounds.top)/bounds.height*canvas.height)));
  const pixel=canvas.getContext('2d',{willReadFrequently:true}).getImageData(x,y,1,1).data;
  if (pixel[3]===0) return { hex:'#FFFFFF',x,y,transparent:true,relativeX:(event.clientX-bounds.left)/bounds.width,relativeY:(event.clientY-bounds.top)/bounds.height };
  return { hex:rgbToHex(pixel[0],pixel[1],pixel[2]),x,y,transparent:false,relativeX:(event.clientX-bounds.left)/bounds.width,relativeY:(event.clientY-bounds.top)/bounds.height };
}

export function createExtractedSample(hex, source = 'eyedropper') {
  const safe=normalizeHex(hex); if(!safe) throw new Error('No se pudo crear la muestra de color.');
  const id=globalThis.crypto?.randomUUID?.() || `sample-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, hex:safe, role:'sample', source, createdAt:new Date().toISOString() };
}

export function addRecentColor(colors, hex, source = 'extracted') {
  const safe=normalizeHex(hex); if(!safe) return colors || [];
  const next=[{hex:safe,source,lastUsedAt:new Date().toISOString()},...(colors||[]).filter((item)=>item.hex!==safe)];
  return next.slice(0,MAX_RECENT_COLORS);
}
