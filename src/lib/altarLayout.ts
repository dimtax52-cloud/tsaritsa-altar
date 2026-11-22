export type CellSlot = {
  id: number;
  x: number; // percent from left
  y: number; // percent from top
  size: number; // px
  angle: number; // deg, for frost seal rotation
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildAltarSlots(count = 152): CellSlot[] {
  const rng = mulberry32(9931);
  const slots: CellSlot[] = [];

  // Широкая запретная зона в центре вокруг Царицы и замка, чтобы слоты не лезли в середину
    const inExclusion = (x: number, y: number) => {
    // Центр (Царица в Акте I)
    const dx = (x - 47) / 26;
    const dy = (y - 50) / 36;
    if (dx * dx + dy * dy < 1) return true;

    // Левый нижний угол (Царица на мосту в Акте II)
    if (x < 42 && y > 54) return true;

    // Левый верхний угол (плашка со счётчиком)
    if (x < 22 && y < 22) return true;

    return false;
  };


  // Золотая середина зазора (6.7): колонна идёт плотно, но без наложений
  const tooClose = (x: number, y: number, minDist = 6.7) => {
    for (const s of slots) {
      const dx = (s.x - x) * 1.45;
      const dy = s.y - y;
      if (Math.hypot(dx, dy) < minDist) return true;
    }
    return false;
  };

  // Безопасные отступы от краёв экрана, чтобы даже крупные C6-снежинки не обрезались при 3D-параллаксе
  const push = (x: number, y: number, size: number, minDist = 6.7) => {
    if (x < 5.5 || x > 92.5 || y < 8 || y > 91) return false;
    if (inExclusion(x, y)) return false;
    if (tooClose(x, y, minDist)) return false;
    slots.push({ id: slots.length, x, y, size: size + (rng() - 0.5) * 4, angle: rng() * 360 });
    return true;
  };

  // 1. Внешняя дуга у правого и левого краёв (с запасом от границ экрана)
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const y = 10 + t * 79;
    const swayR = Math.sin(t * Math.PI * 2.0) * 2.2;
    push(90.0 - t * 3.0 + swayR, y, 52, 6.7);

    const swayL = Math.sin(t * Math.PI * 2.0 + 0.6) * 2.2;
    push(7.5 + t * 2.5 + swayL, y, 50, 6.7);
  }

  // 2. Вторая параллельная дуга чуть ближе к краю (в шахматном порядке)
  for (let i = 0; i < 11; i++) {
    const t = (i + 0.5) / 11;
    const y = 11 + t * 77;
    const swayR = Math.sin(t * Math.PI * 2.2 + 1.0) * 2.2;
    push(82.5 - t * 3.0 + swayR, y, 48, 6.7);

    const swayL = Math.sin(t * Math.PI * 2.2 + 1.6) * 2.2;
    push(14.5 + t * 2.5 + swayL, y, 48, 6.7);
  }

  // 3. Нижний снежный шлейф и верхние углы
  for (let i = 0; i < 12; i++) {
    const x = 9 + (i / 11) * 81;
    push(x, 89 - Math.sin((i / 11) * Math.PI) * 2.5, 46, 6.7);
    push(x, 9 + Math.sin((i / 11) * Math.PI) * 2.0, 46, 6.7);
  }

  // 4. Аккуратное дозаполнение оставшихся мест по краям без наложений
  const passes = [6.7, 5.8, 5.0];
  for (const dist of passes) {
    let tries = 0;
    while (slots.length < count && tries < 1600) {
      tries++;
      const x = 5.5 + rng() * 87;
      const y = 8 + rng() * 83;
      push(x, y, 44, dist);
    }
  }

  return slots.slice(0, Math.min(count, 152));
}

// Mobile portrait layout: 76 slots in 3 columns per side, centre and bottom
// 24% stay clear for the Tsaritsa, the counter plate and the signup button.
export function buildMobileSlots(count = 76): CellSlot[] {
  const out: CellSlot[] = [];
  const leftCols = [11, 23, 35];
  const rightCols = [65, 77, 89];
  const perCol = Math.ceil(count / 6); // ~13 per column
  for (let row = 0; row < perCol && out.length < count; row++) {
    for (let c = 0; c < 6 && out.length < count; c++) {
      const x = c < 3 ? leftCols[c] : rightCols[c - 3];
      const y = 26 + (row / (perCol - 1)) * 48; // 26% .. 74%
      out.push({ id: out.length, x, y, size: 0, angle: 0 });
    }
  }
  return out;
}
