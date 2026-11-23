import { useRef, useState } from 'react';
import { X, Pencil, Trash2, Save, Upload, Link2, RotateCcw } from 'lucide-react';
import type { AltarEntry } from '@/lib/supabase';
import { IconByKey } from '@/lib/icons';
import { ICON_KEYS, ICON_LABELS } from '@/lib/icons';
import type { IconKey } from '@/lib/icons';

type Props = {
  entries: AltarEntry[];
  onClose: () => void;
  onUpdate: (
    id: string,
    patch: Partial<AltarEntry> & { new_avatar_url?: string | null }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

// Downscale + center-crop to a 128x128 data URL for the admin avatar upload.
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function EntryRow({ entry, onUpdate, onDelete }: { entry: AltarEntry } & Pick<Props, 'onUpdate' | 'onDelete'>) {
  const [editing, setEditing] = useState(false);
  const [constellation, setConstellation] = useState(entry.constellation);
  const [refinement, setRefinement] = useState(entry.refinement);
  const [icon, setIcon] = useState(entry.icon);
  const [message, setMessage] = useState(entry.message ?? '');
  // undefined = leave the avatar untouched, '' = reset to the default icon,
  // a string = replace it (data URL from a file or a pasted image link).
  const [avatarEdit, setAvatarEdit] = useState<string | undefined>(undefined);
  const [showAvatarLink, setShowAvatarLink] = useState(false);
  const [avatarLink, setAvatarLink] = useState('');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewAvatar =
    avatarEdit === '' ? null : avatarEdit !== undefined ? avatarEdit : entry.avatar_url;

  if (editing) {
    return (
      <div className="glass rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg tracking-widest">{entry.uid_suffix}</span>
          <div className="flex gap-1">
            <button
              className="btn-ghost"
              title="Сохранить"
              onClick={async () => {
                await onUpdate(entry.id, {
                  constellation,
                  refinement,
                  icon,
                  message: message.trim() || null,
                  ...(avatarEdit !== undefined ? { new_avatar_url: avatarEdit } : {}),
                });
                setEditing(false);
              }}
            >
              <Save size={16} />
            </button>
            <button className="btn-ghost" onClick={() => setEditing(false)} title="Отмена">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className="input-ice" value={constellation} onChange={(e) => setConstellation(Number(e.target.value))}>
            {[0, 1, 2, 3, 4, 5, 6].map((c) => (
              <option key={c} value={c}>C{c}</option>
            ))}
          </select>
          <select className="input-ice" value={refinement} onChange={(e) => setRefinement(Number(e.target.value))}>
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>R{r}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 glass rounded-xl p-2">
          {previewAvatar ? (
            <img
              src={previewAvatar}
              alt="Аватар"
              className="w-12 h-12 rounded-full object-cover border-2 border-sky-300/70 shrink-0"
            />
          ) : (
            <div className="slot-filled seal w-12 h-12 flex items-center justify-center shrink-0">
              <IconByKey icon={icon} className="text-sky-100 w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-sky-100">Аватар записи</p>
            {avatarError && <p className="text-[11px] text-rose-300">{avatarError}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
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
              onClick={() => setShowAvatarLink((s) => !s)}
              title="По ссылке"
            >
              <Link2 size={13} />
              Ссылка
            </button>
            <button
              type="button"
              className="btn-ghost text-[11px] px-2 py-1"
              onClick={() => {
                setAvatarEdit('');
                setIcon('snowflake');
                setAvatarError(null);
              }}
              title="Сбросить к стандартному значку"
            >
              <RotateCcw size={13} />
              Сбросить
            </button>
          </div>
        </div>
        {showAvatarLink && (
          <div className="flex gap-1">
            <input
              className="input-ice text-xs py-1.5"
              placeholder="https://..."
              value={avatarLink}
              onChange={(e) => setAvatarLink(e.target.value)}
            />
            <button
              type="button"
              className="btn-ghost text-[11px]"
              onClick={() => {
                if (/^https?:\/\/.+/i.test(avatarLink)) {
                  setAvatarEdit(avatarLink.trim());
                  setShowAvatarLink(false);
                  setAvatarError(null);
                } else {
                  setAvatarError('Ссылка должна начинаться с http(s)://');
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
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > 5 * 1024 * 1024) {
              setAvatarError('Файл должен быть меньше 5 МБ');
              return;
            }
            try {
              setAvatarEdit(await compressImage(f));
              setAvatarError(null);
            } catch {
              setAvatarError('Не удалось обработать картинку');
            }
          }}
        />
        <select className="input-ice" value={icon} onChange={(e) => setIcon(e.target.value)}>
          {ICON_KEYS.map((k) => (
            <option key={k} value={k}>{ICON_LABELS[k]}</option>
          ))}
        </select>
        <textarea
          className="input-ice resize-none"
          rows={2}
          maxLength={120}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Пожелание"
        />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <div className="slot-filled seal w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden">
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <IconByKey icon={entry.icon} className="text-sky-100 w-5 h-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg tracking-widest">{entry.uid_suffix}</span>
          <span className="text-sm text-sky-300/90">
            C{entry.constellation}R{entry.refinement}
          </span>
        </div>
        <p className="text-xs text-sky-200/50 truncate">
          {fmtDate(entry.created_at)}
          {entry.message ? ` — ${entry.message}` : ''}
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button className="btn-ghost" onClick={() => setEditing(true)} title="Редактировать">
          <Pencil size={15} />
        </button>
        <button
          className="btn-ghost hover:text-rose-300"
          onClick={() => {
            if (window.confirm(`Удалить запись ${entry.uid_suffix}?`)) onDelete(entry.id);
          }}
          title="Удалить"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function AdminPanel({ entries, onClose, onUpdate, onDelete }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
      <div className="glass rounded-2xl w-full max-w-lg p-6 rise-in relative max-h-[92vh] flex flex-col">
        <button
          className="absolute top-3 right-3 text-sky-200/70 hover:text-white"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>
        <h2 className="font-display text-2xl text-glow mb-1">Управление алтарём</h2>
        <p className="text-sky-200/60 text-sm mb-4">Всего записей: {entries.length}</p>
        <div className="space-y-2 overflow-y-auto pr-1">
          {entries.length === 0 && (
            <p className="text-sky-200/50 text-sm">Пока никто не записался.</p>
          )}
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}
