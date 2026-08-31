export const SCENE3D_PHASE = 2;

export function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch (_) {
    return false;
  }
}

export function drawPhaseOneViewport(canvas, color = '#C98E78') {
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(640, Math.round(bounds.width * ratio));
  const height = Math.max(380, Math.round(bounds.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const background = ctx.createRadialGradient(
    width * .5, height * .42, 0,
    width * .5, height * .5, width * .7
  );
  background.addColorStop(0, '#2B2633');
  background.addColorStop(1, '#100E14');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = .14;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  const step = Math.max(42, Math.round(width / 20));
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  const cx = width * .5;
  const cy = height * .47;
  const radius = Math.min(width, height) * .19;

  ctx.save();
  ctx.globalAlpha = .30;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = .8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * .72, radius, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = .5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.moveTo(cx - radius * .7, cy - radius * .1);
  ctx.lineTo(cx + radius * .7, cy - radius * .1);
  ctx.moveTo(cx - radius * .52, cy + radius * .45);
  ctx.lineTo(cx + radius * .52, cy + radius * .45);
  ctx.stroke();
  ctx.restore();
}