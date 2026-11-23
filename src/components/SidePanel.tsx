import { useRef, useState } from 'react';
import { ChevronRight, Upload, Link2, X, Snowflake } from 'lucide-react';
import { ICON_KEYS, ICON_LABELS, IconByKey } from '@/lib/icons';
import type { IconKey } from '@/lib/icons';
import { supabase } from '@/lib/supabase';

type SignupData = {
  uid_suffix: string;
  constellation: number;
  refinement: number;
  icon: string;
  avatar_url: string | null;
  message: string | null;
};

type Props = {
  open: boolean;
  onToggle: () => void;
  onSubmit: (data: SignupData) => Promise<string | null>;
  isMobile?: boolean;
};

export default function SidePanel({ open, onToggle, onSubmit, isMobile = false }: Props) {
  const [uid, setUid] = useState('');
  const [constellation, setConstellation] = useState(0);
  const [refinement, setRefinement] = useState(0);
  const [icon, setIcon] = useState<IconKey>('snowflake');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uidValid = /^\d{4}$/.test(uid);

  // Downscale + center-crop to a 128x128 square, compressed as webp/jpeg.
  async function compressImage(file: File): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, 128, 128);
    return canvas.toDataURL('image/webp', 0.82).startsWith('data:image/webp')
      ? canvas.toDataURL('image/webp', 0.82)
      : canvas.toDataURL('image/jpeg', 0.82);
  }

  async function dataUrlToFile(dataUrl: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], 'avatar.webp', { type: blob.type || 'image/webp' });
  }

  async function uploadFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError('Файл должен быть меньше 5 МБ');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Выберите файл изображения');
      return;
    }
    let compressed: string;
    try {
      compressed = await compressImage(file);
    } catch {
      setError('Не удалось обработать картинку');
      return;
    }
    // Try Storage first; on any error fall back to a lightweight data URL
    // saved directly in altar_entries.avatar_url.
    try {
      const f = await dataUrlToFile(compressed);
      const path = `${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, f, {
        contentType: f.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch {
      setAvatarUrl(compressed);
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uidValid) {
      setError('UID должен состоять ровно из 4 цифр');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit({
      uid_suffix: uid,
      constellation,
      refinement,
      icon: avatarUrl ? 'custom' : icon,
      avatar_url: avatarUrl,
      message: message.trim() ? message.trim() : null,
    });
    setBusy(false);
    if (err) setError(err);
    else setDone(true);
  }

  // Один и тот же контент работает и в мобильной шторке, и в боковой панели.
  const content = done ? (
    <div className="text-center py-6 space-y-3">
      <Snowflake size={36} className="mx-auto text-sky-300 drop-shadow-[0_0_12px_rgba(140,220,255,0.9)]" />
      <h3 className="font-display text-xl text-glow">Вы записаны на алтарь!</h3>
      <p className="text-sm text-sky-200/70">Ваш знак уже красуется на льду рядом с Царицей.</p>
      <button className="btn-ice w-full justify-center text-sm" onClick={onToggle}>
        {isMobile ? 'Закрыть' : 'Свернуть'}
      </button>
    </div>
  ) : (
    <>
      <h3 className="font-display text-xl text-glow mb-3">Запись на алтарь</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-sky-200/70 mb-1">
            Последние 4 цифры UID
          </label>
          <input
            className="input-ice text-base font-mono tracking-[0.4em] text-center"
            value={uid}
            onChange={(e) => setUid(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="9935"
            inputMode="numeric"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-sky-200/70 mb-1">Созвездие</label>
            <select className="input-ice" value={constellation} onChange={(e) => setConstellation(Number(e.target.value))}>
              {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                <option key={c} value={c}>C{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-sky-200/70 mb-1">Сигнатура</label>
            <select className="input-ice" value={refinement} onChange={(e) => setRefinement(Number(e.target.value))}>
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>R{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-sky-200/70 mb-1.5">Значок</label>
          <div className="grid grid-cols-4 gap-1.5">
            {ICON_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setIcon(key);
                  setAvatarUrl(null);
                }}
                title={ICON_LABELS[key]}
                className={`seal flex items-center justify-center aspect-square transition-all ${
                  !avatarUrl && icon === key ? 'slot-filled scale-105' : 'slot-empty opacity-70 hover:opacity-100'
                }`}
              >
                <IconByKey icon={key} className="text-sky-100 w-5 h-5" />
              </button>
            ))}
          </div>
          {avatarUrl && (
            <div className="flex items-center gap-3 mt-2 glass rounded-xl p-2">
              <img
                src={avatarUrl}
                alt="Предпросмотр аватарки"
                className="w-14 h-14 rounded-full object-cover border-2 border-sky-300/70 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-sky-100">Ваша аватарка</p>
                <p className="text-[10px] text-sky-200/60">Так её увидят на алтаре</p>
              </div>
              <button
                type="button"
                className="text-sky-200/60 hover:text-white shrink-0"
                onClick={() => setAvatarUrl(null)}
                aria-label="Убрать аватар"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="btn-ghost text-[11px] px-2 py-1"
              onClick={() => fileRef.current?.click()}
              title="Загрузить с устройства"
            >
              <Upload size={13} />
              Файл
            </button>
            <button
              type="button"
              className="btn-ghost text-[11px] px-2 py-1"
              onClick={() => setShowLinkInput((s) => !s)}
              title="По ссылке"
            >
              <Link2 size={13} />
              Ссылка
            </button>
          </div>
          {showLinkInput && (
            <div className="flex gap-1 mt-1.5">
              <input
                className="input-ice text-xs py-1.5"
                placeholder="https://..."
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
              />
              <button
                type="button"
                className="btn-ghost text-[11px]"
                onClick={() => {
                  if (/^https?:\/\/.+/i.test(linkValue)) {
                    setAvatarUrl(linkValue.trim());
                    setShowLinkInput(false);
                    setError(null);
                  } else {
                    setError('Ссылка должна начинаться с http(s)://');
                  }
                }}
              >
                ОК
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = '';
            }}
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-sky-200/70 mb-1">
            Пожелание (необязательно)
          </label>
          <textarea
            className="input-ice resize-none text-sm"
            rows={2}
            maxLength={120}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Да пребудет вечная мерзлота..."
          />
        </div>

        {error && (
          <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-400/30 rounded-lg px-2.5 py-1.5">
            {error}
          </p>
        )}

        <button className="btn-ice w-full justify-center text-sm" disabled={busy || !uidValid || done}>
          {busy ? 'Заморозка...' : 'Записаться на алтарь'}
        </button>
      </form>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onToggle}
        />
        <div
          className={`fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-[#0b1728]/95 border-t border-sky-200/20 p-4 pb-8 transition-transform duration-300 ease-out ${
            open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
          }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="w-10 h-1 rounded-full bg-sky-200/40 mx-auto mb-3" />
          {content}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Always-visible tab on the right edge — opens/closes the panel */}
      <button
        className={`absolute right-0 z-30 glass rounded-l-xl px-2.5 py-3 flex flex-col items-center gap-1.5 text-sky-100 hover:text-white transition-all duration-500 ${
          open ? 'opacity-0 pointer-events-none translate-x-2' : 'opacity-100'
        }`}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
        onClick={onToggle}
        aria-label="Открыть панель записи"
      >
        <Snowflake size={18} className="text-sky-300" />
        <span className="text-[11px] tracking-[0.2em] uppercase" style={{ writingMode: 'vertical-rl' }}>
          Запись
        </span>
      </button>

      <div
        className="absolute top-1/2 right-0 z-30 transition-transform duration-700 ease-out"
        style={{ transform: open ? 'translate(0, -50%)' : 'translate(calc(100% + 60px), -50%)' }}
      >
        {/* Collapse handle — stays visible when the panel is hidden */}
        <button
          className="glass rounded-l-xl p-2 flex flex-col items-center gap-1 text-sky-200 hover:text-white"
          onClick={onToggle}
          aria-label={open ? 'Свернуть панель' : 'Развернуть панель записи'}
          style={{ position: 'absolute', left: -34, top: 12 }}
        >
          <ChevronRight size={16} className={open ? 'rotate-180' : ''} style={{ transition: 'transform 0.4s' }} />
        </button>

        <div className="glass rounded-l-2xl p-4 w-72 max-h-[80vh] overflow-y-auto">{content}</div>
      </div>
    </>
  );
}
