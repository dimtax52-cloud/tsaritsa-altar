import type { AltarEntry } from '@/lib/supabase';
import { IconByKey } from '@/lib/icons';
import type { CellSlot } from '@/lib/altarLayout';

function drawSnowflake(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = '#eaf6ff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.stroke();
    const bx = x + Math.cos(a) * r * 0.6;
    const by = y + Math.sin(a) * r * 0.6;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a + 0.6) * r * 0.25, by + Math.sin(a + 0.6) * r * 0.25);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a - 0.6) * r * 0.25, by + Math.sin(a - 0.6) * r * 0.25);
    ctx.stroke();
  }
}

function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.5);
  ctx.lineTo(x - r, y - r * 0.4);
  ctx.lineTo(x - r * 0.5, y);
  ctx.lineTo(x, y - r * 0.7);
  ctx.lineTo(x + r * 0.5, y);
  ctx.lineTo(x + r, y - r * 0.4);
  ctx.lineTo(x + r, y + r * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawMask(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = '#eaf6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.7, r * 0.9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.15, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.28, y - r * 0.15, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.2, y + r * 0.4);
  ctx.quadraticCurveTo(x, y + r * 0.55, x + r * 0.2, y + r * 0.4);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPenguin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 0.55, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a1e2e';
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.3, r * 0.07, 0, Math.PI * 2);
  ctx.arc(x + r * 0.2, y - r * 0.3, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.15);
  ctx.lineTo(x - r * 0.1, y);
  ctx.lineTo(x + r * 0.1, y);
  ctx.closePath();
  ctx.fill();
}

function drawIceHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.7);
  ctx.bezierCurveTo(x - r * 1.1, y - r * 0.1, x - r * 0.5, y - r * 0.85, x, y - r * 0.25);
  ctx.bezierCurveTo(x + r * 0.5, y - r * 0.85, x + r * 1.1, y - r * 0.1, x, y + r * 0.7);
  ctx.fill();
}

function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = '#eaf6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.8);
  ctx.lineTo(x + r * 0.65, y - r * 0.15);
  ctx.lineTo(x, y + r * 0.8);
  ctx.lineTo(x - r * 0.65, y - r * 0.15);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.65, y - r * 0.15);
  ctx.lineTo(x + r * 0.65, y - r * 0.15);
  ctx.stroke();
}

function drawSwords(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = '#eaf6ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y + r * 0.6);
  ctx.lineTo(x + r * 0.55, y - r * 0.55);
  ctx.moveTo(x + r * 0.55, y - r * 0.55);
  ctx.lineTo(x + r * 0.2, y - r * 0.5);
  ctx.moveTo(x + r * 0.55, y - r * 0.55);
  ctx.lineTo(x + r * 0.5, y - r * 0.2);
  ctx.moveTo(x - r * 0.35, y + r * 0.1);
  ctx.lineTo(x - r * 0.05, y + r * 0.4);
  ctx.moveTo(x - r * 0.6, y + r * 0.6);
  ctx.lineTo(x - r * 0.45, y + r * 0.75);
  ctx.stroke();
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = '#eaf6ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - r * 0.45, y - r * 0.4, r * 0.9, r * 1.0);
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.1, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y - r * 0.4);
  ctx.quadraticCurveTo(x, y - r * 0.8, x + r * 0.45, y - r * 0.4);
  ctx.stroke();
}

export function drawGlyph(ctx: CanvasRenderingContext2D, icon: string, x: number, y: number, r: number) {
  switch (icon) {
    case 'crown': return drawCrown(ctx, x, y, r);
    case 'mask': return drawMask(ctx, x, y, r);
    case 'penguin': return drawPenguin(ctx, x, y, r);
    case 'iceheart': return drawIceHeart(ctx, x, y, r);
    case 'gem': return drawGem(ctx, x, y, r);
    case 'swords': return drawSwords(ctx, x, y, r);
    case 'lantern': return drawLantern(ctx, x, y, r);
    default: return drawSnowflake(ctx, x, y, r);
  }
}

export function renderAltarToCanvas(
  canvas: HTMLCanvasElement,
  slots: CellSlot[],
  bySlot: (AltarEntry | null)[],
  totals: { total: number; c6: number }
) {
  const W = 1920;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  const bg = ctx.createRadialGradient(W / 2, H * 0.32, 80, W / 2, H * 0.5, H * 0.95);
  bg.addColorStop(0, '#16324a');
  bg.addColorStop(0.55, '#0a1e2e');
  bg.addColorStop(1, '#050d16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4,12,20,0.6)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Snow specks
  for (let i = 0; i < 120; i++) {
    const sx = (i * 761) % W;
    const sy = (i * 419) % H;
    const s = 1 + (i % 3);
    ctx.fillStyle = `rgba(235,248,255,${0.15 + ((i * 37) % 50) / 100})`;
    ctx.beginPath();
    ctx.arc(sx, sy, s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Centerpiece glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 260);
  glow.addColorStop(0, 'rgba(150,220,255,0.28)');
  glow.addColorStop(1, 'rgba(150,220,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(W / 2 - 300, H / 2 - 300, 600, 600);

  drawGlyph(ctx, 'crown', W / 2, H / 2 - 60, 52);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.shadowColor = 'rgba(150,220,255,0.8)';
  ctx.shadowBlur = 24;
  ctx.font = '600 64px Georgia, serif';
  ctx.fillText('ЦАРИЦА', W / 2, H / 2 + 40);
  ctx.shadowBlur = 0;
  ctx.font = '26px Georgia, serif';
  ctx.fillStyle = 'rgba(191,230,255,0.75)';
  ctx.fillText('/genshin/ • Алтарь Царицы', W / 2, H / 2 + 82);

  // Cells
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const x = (slot.x / 100) * W;
    const y = (slot.y / 100) * H;
    const s = slot.size;
    const half = s / 2;
    const entry = bySlot[i] ?? null;

    ctx.save();
    ctx.translate(x, y);
    // hexagon path
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * half;
      const py = Math.sin(a) * half;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.clip();

    if (entry) {
      const cellBg = ctx.createLinearGradient(-half, -half, half, half);
      cellBg.addColorStop(0, 'rgba(150,215,255,0.34)');
      cellBg.addColorStop(1, 'rgba(30,70,110,0.30)');
      ctx.fillStyle = cellBg;
      ctx.fill();
      ctx.shadowColor = 'rgba(120,205,255,0.6)';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = 'rgba(200,240,255,0.7)';
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'rgba(120,190,235,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(170,220,250,0.28)';
    }
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    if (entry) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eaf6ff';
      ctx.font = `600 ${Math.round(s * 0.28)}px "Courier New", monospace`;
      ctx.fillText(entry.uid_suffix, x, y - s * 0.04);
      ctx.font = `${Math.round(s * 0.2)}px Georgia, serif`;
      ctx.fillStyle = 'rgba(200,240,255,0.95)';
      ctx.fillText(`C${entry.constellation}R${entry.refinement}`, x, y + s * 0.18);
      drawGlyph(ctx, entry.icon, x, y - s * 0.3, s * 0.13);
    } else {
      ctx.strokeStyle = 'rgba(190,230,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Footer counters
  ctx.textAlign = 'left';
  ctx.font = '22px Georgia, serif';
  ctx.fillStyle = 'rgba(191,230,255,0.85)';
  ctx.fillText(`Записалось: ${totals.total}`, 40, H - 44);
  ctx.fillText(`C6-обладателей: ${totals.c6}`, 40, H - 16);
  ctx.textAlign = 'right';
  ctx.fillText('Да пребудет вечная мерзлота', W - 40, H - 30);
}

export function renderAltarToDataUrl(
  slots: CellSlot[],
  bySlot: (AltarEntry | null)[],
  totals: { total: number; c6: number }
): string {
  const canvas = document.createElement('canvas');
  renderAltarToCanvas(canvas, slots, bySlot, totals);
  return canvas.toDataURL('image/png');
}
