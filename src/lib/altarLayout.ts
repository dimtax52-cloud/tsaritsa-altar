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

  // Зона в центре вокруг Царицы всегда остаётся свободной
  const inExclusion = (x: number, y: number) => {
    const dx = (x - 44) / 21;
    const dy = (y - 50) / 31;
    return dx * dx + dy * dy < 1;
  };

  // Проверка, чтобы соседние снежинки (даже крупные C6 ~112px) не наезжали друг на друга
  const tooClose = (x: number, y: number, minDist = 8.2) => {
    for (const s of slots) {
      // Переводим проценты в условные единицы экрана 16:9 для точного кругового зазора
      const dx = (s.x - x) * 1.45;
      const dy = s.y - y;
      if (Math.hypot(dx, dy) < minDist) return true;
    }
    return false;
  };

  const push = (x: number, y: number, size: number, minDist = 8.2) => {
    if (x < 4.5 || x > 95.5 || y < 8 || y > 91) return false;
    if (inExclusion(x, y)) return false;
    if (tooClose(x, y, minDist)) return false;
    slots.push({ id: slots.length, x, y, size: size + (rng() - 0.5) * 6, angle: rng() * 360 });
    return true;
  };

  // Основные дуги справа и слева (9 шагов сверху вниз с широким зазором)
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const y = 11 + t * 77;
    const swayR = Math.sin(t * Math.PI * 2.1) * 4.2;
    push(88 - t * 5 + swayR, y, 54 - t * 6, 8.6);

    const swayL = Math.sin(t * Math.PI * 2.1 + 0.7) * 3.8;
    push(8 + t * 4.5 + swayL, y, 52 - t * 5, 8.6);
  }

  // Вторая внутренняя линия вихрей справа и слева (со сдвигом по высоте в шахматном порядке)
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8;
    const y = 11 + t * 77;
    const swayR = Math.sin(t * Math.PI * 2.4 + 1.1) * 3.5;
    push(73 + swayR, y, 48, 8.4);

    const swayL = Math.sin(t * Math.PI * 2.4 + 1.8) * 3.2;
    push(20 + swayL, y, 48, 8.4);
  }

  // Верхняя небесная дуга и нижний снежный край
  for (let i = 0; i < 10; i++) {
    const x = 14 + (i / 9) * 72;
    push(x, 10 + Math.sin((i / 9) * Math.PI) * 3, 46, 8.2);
    push(x, 88 - Math.sin((i / 9) * Math.PI) * 3, 46, 8.2);
  }

  // Аккуратное дозаполнение оставшихся мест без наложений (сначала с широким зазором, потом плотнее)
  const passes = [8.0, 6.8, 5.8];
  for (const dist of passes) {
    let tries = 0;
    while (slots.length < count && tries < 1400) {
      tries++;
      const x = 4.5 + rng() * 91;
      const y = 8 + rng() * 83;
      push(x, y, 44, dist);
    }
  }

  return slots.slice(0, Math.min(count, 152));
}
