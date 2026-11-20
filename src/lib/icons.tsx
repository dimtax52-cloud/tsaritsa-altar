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

export function IconByKey({ icon, className }: { icon: string; className?: string }) {
  switch (icon as IconKey) {
    case 'crown':
      return <Crown className={className} />;
    case 'mask':
      return <Theater className={className} />;
    case 'cryoeye':
      return <Eye className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'iceheart':
      return <Heart className={className} />;
    case 'gem':
      return <Gem className={className} />;
    case 'swords':
      return <Swords className={className} />;
    default:
      return <Snowflake className={className} />;
  }
}

export function isIconKey(icon: string): boolean {
  return (ICON_KEYS as readonly string[]).includes(icon);
}
