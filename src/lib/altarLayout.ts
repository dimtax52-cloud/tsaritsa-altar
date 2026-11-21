export type CellSlot = {
  id: number;
  x: number; // percent from left
  y: number; // percent from top
  size: number; // px
  angle: number; // deg, for frost seal rotation
};

// Deterministic pseudo-random so layout is stable between renders.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Badges ride the snow vortices sweeping along the right and left edges and
// scatter around the rim of the screen. The central zone where the Tsaritsa
// stands is always kept clear. Act I uses the first 76 slots, Act II the
// next 76 (mirrored circle).
export function buildAltarSlots(count = 152): CellSlot[] {
  const rng = mulberry32(9931);
  const slots: CellSlot[] = [];

  const inExclusion = (x: number, y: number) => {
    const dx = (x - 44) / 20;
    const dy = (y - 50) / 30;
    return dx * dx + dy * dy < 1;
  };

  const push = (x: number, y: number, size: number) => {
    if (x < 3 || x > 97 || y < 6 || y > 93) return false;
    if (inExclusion(x, y)) return false;
    slots.push({ id: slots.length, x, y, size: size + (rng() - 0.5) * 8, angle: rng() * 360 });
    return true;
  };

  // Vortex arcs hugging the right edge, two lanes.
  for (let i = 0; i < 20; i++) {
    const t = i / 19;
    const y = 8 + t * 82;
    const sway = Math.sin(t * Math.PI * 2.2) * 4.5;
    push(88 - t * 6 + sway, y, 54 - t * 10);
  }
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const y = 10 + t * 78;
    const sway = Math.sin(t * Math.PI * 2.6 + 1.2) * 3.5;
    push(74 + Math.sin(t * 3.1) * 2.5 + sway * 0.4, y, 46);
  }

  // Mirror vortices on the left edge.
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const y = 10 + t * 78;
    const sway = Math.sin(t * Math.PI * 2.4 + 0.6) * 4;
    push(9 + t * 5 + sway, y, 50);
  }

  // Scatter along the sky and floor.
  let placed = 0;
  let tries = 0;
  while (placed < 16 && tries < 120) {
    tries++;
    const before = slots.length;
    if (rng() < 0.55) push(5 + rng() * 90, 6 + rng() * 13, 44);
    else push(5 + rng() * 90, 84 + rng() * 9, 44);
    if (slots.length > before) placed++;
  }

  // A few deep-corner accents.
  placed = 0;
  tries = 0;
  while (placed < 8 && tries < 100) {
    tries++;
    const before = slots.length;
    if (rng() < 0.5) push(4 + rng() * 10, 8 + rng() * 80, 42);
    else push(90 + rng() * 7, 8 + rng() * 80, 42);
    if (slots.length > before) placed++;
  }

  return slots.slice(0, Math.min(count, 152));
}
