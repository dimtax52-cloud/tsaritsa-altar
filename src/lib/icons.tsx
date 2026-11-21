import { Snowflake, Crown, Theater, Eye, Star, Heart, Gem, Swords } from 'lucide-react';

export const ICON_KEYS = ['snowflake', 'crown', 'mask', 'cryoeye', 'star', 'iceheart', 'gem', 'swords'] as const;
export type IconKey = (typeof ICON_KEYS)[number];

export const ICON_LABELS: Record<IconKey, string> = {
  snowflake: 'Снежинка',
  crown: 'Корона',
  mask: 'Маска Фатуи',
  cryoeye: 'Крио-глаз',
  star: 'Звезда',
  iceheart: 'Сердце льда',
  gem: 'Кристалл',
  swords: 'Мечи',
};

export function IconByKey({
  icon,
  className,
  style,
}: {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const pass = { className, style };
  switch (icon as IconKey) {
    case 'crown':
      return <Crown {...pass} />;
    case 'mask':
      return <Theater {...pass} />;
    case 'cryoeye':
      return <Eye {...pass} />;
    case 'star':
      return <Star {...pass} />;
    case 'iceheart':
      return <Heart {...pass} />;
    case 'gem':
      return <Gem {...pass} />;
    case 'swords':
      return <Swords {...pass} />;
    default:
      return <Snowflake {...pass} />;
  }
}

export function isIconKey(icon: string): boolean {
  return (ICON_KEYS as readonly string[]).includes(icon);
}
