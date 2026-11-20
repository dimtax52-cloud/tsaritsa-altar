import { useRef, useState } from 'react';
import { ChevronRight, Upload, Link2, X } from 'lucide-react';
import { ICON_KEYS, ICON_LABELS, IconByKey } from '@/lib/icons';
import type { IconKey } from '@/lib/icons';
import { supabase } from '@/lib/supabase';

type Props = {
  open: boolean;
  onToggle: () => void;
  onSubmit: (data: {
    uid_suffix: string;
    constellation: number;
    refinement: number;
    icon: string;
    avatar_url: string | null;
    message: string | null;
  }) => Promise<string | null>;
};

export default function SidePanel({ open, onToggle, onSubmit }: Props) {
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
  const fileRef = useRef<HTMLInputElement>(null);

  const uidValid = /^\d{4}$/.test(uid);

  async function uploadFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError('Картинка должна быть меньше 2 МБ');
      return;
    }
    const ext = file.name.split('.').pop() || 'png';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
      contentType: file.type,
    });
    if (upErr) {
      setError('Не удалось загрузить картинку');
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
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
  }

  return (
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

      <div className="glass rounded-l-2xl p-4 w-72 max-h-[80vh] overflow-y-auto">
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
              <label className="block text-[10px] uppercase tracking-widest text-sky-200/70 mb-1">Сигна</label>
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
              <div className="flex items-center gap-2 mt-2">
                <img src={avatarUrl} alt="Аватар" className="w-8 h-8 rounded-full object-cover border border-sky-200/40" />
                <span className="text-[11px] text-sky-200/70 flex-1 truncate">Своя картинка</span>
                <button type="button" className="text-sky-200/60 hover:text-white" onClick={() => setAvatarUrl(null)} aria-label="Убрать аватар">
                  <X size={14} />
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

          <button className="btn-ice w-full justify-center text-sm" disabled={busy || !uidValid}>
            {busy ? 'Заморозка...' : 'Записаться на алтарь'}
          </button>
        </form>
      </div>
    </div>
  );
}
