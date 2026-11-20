import type { AltarEntry } from '@/lib/supabase';
import { IconByKey } from '@/lib/icons';
import type { CellSlot } from '@/lib/altarLayout';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

const W = 1920;
const H = 1080;

async function loadVideoFrame(video: HTMLVideoElement): Promise<HTMLImageElement | null> {
  try {
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    if (!c.width || !c.height) return null;
    c.getContext('2d')!.drawImage(video, 0, 0);
    const img = new Image();
    const url = c.toDataURL('image/png');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('frame decode failed'));
      img.src = url;
    });
    return img;
  } catch {
    return null;
  }
}

async function loadAvatar(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function hexPath(ctx: CanvasRenderingContext2D, half: number) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * half;
    const py = Math.sin(a) * half;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

async function renderIconToImage(icon: string, color: string, px: number): Promise<HTMLCanvasElement | null> {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
  document.body.appendChild(host);
  const root = createRoot(host);
  flushSync(() => {
    root.render(<IconByKey icon={icon} className="" />);
  });
  const svgEl = host.querySelector('svg');
  let out: HTMLCanvasElement | null = null;
  if (svgEl) {
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgEl.setAttribute('width', String(px));
    svgEl.setAttribute('height', String(px));
    svgEl.querySelectorAll('[stroke]').forEach((el) => el.setAttribute('stroke', color));
    svgEl.querySelectorAll('[fill]').forEach((el) => el.setAttribute('fill', color));
    svgEl.setAttribute('style', `color:${color}`);
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
    });
    if (loaded) {
      out = document.createElement('canvas');
      out.width = px;
      out.height = px;
      out.getContext('2d')!.drawImage(img, 0, 0, px, px);
    }
  }
  root.unmount();
  host.remove();
  return out;
}

export async function renderAltarToDataUrl(
  video: HTMLVideoElement | null,
  slots: CellSlot[],
  bySlot: (AltarEntry | null)[],
  totals: { total: number; c6: number }
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  // --- Final video frame, drawn object-cover across the full canvas ---
  let drewFrame = false;
  if (video && video.videoWidth > 0) {
    const frame = await loadVideoFrame(video);
    if (frame) {
      const scale = Math.max(W / video.videoWidth, H / video.videoHeight);
      const dw = video.videoWidth * scale;
      const dh = video.videoHeight * scale;
      ctx.drawImage(frame, (W - dw) / 2, (H - dh) / 2, dw, dh);
      drewFrame = true;
    }
  }
  if (!drewFrame) {
    const bg = ctx.createRadialGradient(W / 2, H * 0.32, 80, W / 2, H * 0.5, H * 0.95);
    bg.addColorStop(0, '#16324a');
    bg.addColorStop(0.55, '#0a1e2e');
    bg.addColorStop(1, '#050d16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // --- Filled altar cells with icon/avatar, UID digits and C/R badge ---
  const S = 74;
  const half = S / 2;
  for (let i = 0; i < slots.length; i++) {
    const entry = bySlot[i];
    if (!entry) continue;
    const x = (slots[i].x / 100) * W;
    const y = (slots[i].y / 100) * H;

    ctx.save();
    ctx.translate(x, y);
    hexPath(ctx, half);

    ctx.fillStyle = 'rgba(8, 20, 38, 0.88)';
    ctx.fill();
    ctx.shadowColor = entry.constellation === 6 ? 'rgba(255,200,100,0.75)' : 'rgba(125,211,252,0.6)';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = entry.constellation === 6 ? 'rgba(255,215,130,0.95)' : 'rgba(125,211,252,0.85)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Icon or avatar (icon slot: upper area of the hex)
    const iconPx = 16;
    if (entry.icon === 'custom' && entry.avatar_url) {
      const av = await loadAvatar(entry.avatar_url);
      if (av) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y - 20, 10, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(av, x - 10, y - 30, 20, 20);
        ctx.restore();
        ctx.strokeStyle = 'rgba(200,240,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y - 20, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      const iconImg = await renderIconToImage(entry.icon, '#dff4ff', iconPx);
      if (iconImg) ctx.drawImage(iconImg, x - iconPx / 2, y - 30, iconPx, iconPx);
    }

    // 4-digit UID
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.font = '800 15px "Courier New", monospace';
    ctx.fillText(entry.uid_suffix, x, y - 2);
    ctx.shadowBlur = 0;

    // C/R badge pill
    const label = `C${entry.constellation}R${entry.refinement}`;
    ctx.font = '700 9px Georgia, serif';
    const pillW = ctx.measureText(label).width + 10;
    const pillY = y + 8;
    ctx.fillStyle = entry.constellation === 6 ? 'rgba(150,105,20,0.75)' : 'rgba(56,140,210,0.65)';
    ctx.beginPath();
    ctx.roundRect(x - pillW / 2, pillY, pillW, 14, 7);
    ctx.fill();
    ctx.strokeStyle = entry.constellation === 6 ? 'rgba(255,220,140,0.7)' : 'rgba(150,225,255,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = entry.constellation === 6 ? '#ffe9b8' : '#dff4ff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, pillY + 8);
    ctx.textBaseline = 'alphabetic';
  }

  // --- /genshin/ counter plate, top-left corner ---
  const px = 40;
  const py = 40;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 28, 44, 0.6)';
  ctx.strokeStyle = 'rgba(191,230,255,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(px, py, 320, 84, 14);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(191,230,255,0.65)';
  ctx.font = '600 15px Georgia, serif';
  ctx.fillText('/genshin/ • АЛТАРЬ ЦАРИЦЫ', px + 20, py + 30);

  ctx.fillStyle = '#eaf6ff';
  ctx.font = '700 22px "Courier New", monospace';
  ctx.fillText(String(totals.total), px + 20, py + 62);
  ctx.fillStyle = 'rgba(191,230,255,0.8)';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('записалось', px + 52, py + 62);

  ctx.fillStyle = '#eaf6ff';
  ctx.font = '700 22px "Courier New", monospace';
  ctx.fillText(String(totals.c6), px + 190, py + 62);
  ctx.fillStyle = 'rgba(191,230,255,0.8)';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('C6', px + 214, py + 62);
  ctx.restore();

  return canvas.toDataURL('image/png');
}
