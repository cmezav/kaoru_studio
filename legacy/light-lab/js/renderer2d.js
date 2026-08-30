function colorAt(colors, index, fallback) { return colors[index] || colors[colors.length - 1] || fallback; }

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function renderSphere(ctx, width, height, colors) {
  const radius = Math.min(width, height) * 0.29;
  const cx = width * 0.52;
  const cy = height * 0.49;
  ctx.save();
  ctx.shadowColor = 'rgba(10,12,20,.28)'; ctx.shadowBlur = radius * .18; ctx.shadowOffsetY = radius * .11;
  const gradient = ctx.createRadialGradient(cx - radius * .38, cy - radius * .42, radius * .05, cx, cy, radius);
  gradient.addColorStop(0, colorAt(colors, 13, '#fff'));
  gradient.addColorStop(.2, colorAt(colors, 12, '#ddd'));
  gradient.addColorStop(.48, colorAt(colors, 6, '#999'));
  gradient.addColorStop(.74, colorAt(colors, 3, '#555'));
  gradient.addColorStop(1, colorAt(colors, 0, '#111'));
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  const rim = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0);
  rim.addColorStop(0, colorAt(colors, 15, '#333')); rim.addColorStop(.28, 'transparent'); rim.addColorStop(.82, 'transparent'); rim.addColorStop(1, colorAt(colors, 14, '#aaa'));
  ctx.fillStyle = rim; ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(cx, cy, radius * .985, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function renderBand(ctx, width, height, colors) {
  const x = width * .13, y = height * .27, w = width * .74, h = height * .44;
  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  const indices = [0,3,6,12,9,1,13,11,4,0];
  indices.forEach((index, i) => gradient.addColorStop(i / (indices.length - 1), colorAt(colors, index, '#777')));
  ctx.save(); ctx.shadowColor = 'rgba(10,12,20,.3)'; ctx.shadowBlur = 32; ctx.shadowOffsetY = 18;
  roundedRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = gradient; ctx.fill();
  ctx.shadowColor = 'transparent';
  const shine = ctx.createLinearGradient(0, y, 0, y + h); shine.addColorStop(0, 'rgba(255,255,255,.55)'); shine.addColorStop(.38, 'rgba(255,255,255,.06)'); shine.addColorStop(1, 'rgba(0,0,0,.28)');
  roundedRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = shine; ctx.fill(); ctx.restore();
}

function renderPlane(ctx, width, height, colors) {
  const x = width * .13, y = height * .18, w = width * .74, h = height * .63;
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  [0,3,6,10,13].forEach((index, i) => gradient.addColorStop(i / 4, colorAt(colors, index, '#777')));
  ctx.save(); ctx.translate(width / 2, height / 2); ctx.transform(1, -.12, -.18, .92, 0, 0);
  ctx.shadowColor = 'rgba(10,12,20,.28)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 18;
  roundedRect(ctx, -w / 2, -h / 2, w, h, 22); ctx.fillStyle = gradient; ctx.fill(); ctx.restore();
}

export function renderBasicPreview(canvas, colors, mode = 'sphere') {
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, Math.round(bounds.width * ratio));
  const height = Math.max(220, Math.round(bounds.height * ratio));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d');
  const dark = document.documentElement.dataset.theme === 'night';
  ctx.clearRect(0, 0, width, height);
  const backdrop = ctx.createRadialGradient(width * .5, height * .42, 0, width * .5, height * .5, width * .72);
  backdrop.addColorStop(0, dark ? '#292532' : '#ffffff'); backdrop.addColorStop(1, dark ? '#111016' : '#eeeaf2');
  ctx.fillStyle = backdrop; ctx.fillRect(0, 0, width, height);
  if (mode === 'band') renderBand(ctx, width, height, colors);
  else if (mode === 'plane') renderPlane(ctx, width, height, colors);
  else renderSphere(ctx, width, height, colors);
}
