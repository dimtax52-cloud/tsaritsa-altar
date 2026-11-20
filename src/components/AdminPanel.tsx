import { useState } from 'react';
import { X, Pencil, Trash2, Save } from 'lucide-react';
import type { AltarEntry } from '@/lib/supabase';
import { IconByKey } from '@/lib/icons';
import { ICON_KEYS, ICON_LABELS } from '@/lib/icons';
import type { IconKey } from '@/lib/icons';

type Props = {
  entries: AltarEntry[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<AltarEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function EntryRow({ entry, onUpdate, onDelete }: { entry: AltarEntry } & Pick<Props, 'onUpdate' | 'onDelete'>) {
  const [editing, setEditing] = useState(false);
  const [constellation, setConstellation] = useState(entry.constellation);
  const [refinement, setRefinement] = useState(entry.refinement);
  const [icon, setIcon] = useState(entry.icon);
  const [message, setMessage] = useState(entry.message ?? '');

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
      <div className="slot-filled seal w-10 h-10 flex items-center justify-center shrink-0">
        <IconByKey icon={entry.icon} className="text-sky-100 w-5 h-5" />
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
