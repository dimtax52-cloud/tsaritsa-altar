import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Lock, RefreshCw, Users, Gem, X, KeyRound, Volume2, VolumeX } from 'lucide-react';
import { supabase, type AltarEntry } from '@/lib/supabase';
import { buildAltarSlots, type CellSlot } from '@/lib/altarLayout';
import Snowfall from '@/components/Snowfall';
import SidePanel from '@/components/SidePanel';
import AdminPanel from '@/components/AdminPanel';
import IceVortices from '@/components/IceVortices';
import { IconByKey, isIconKey } from '@/lib/icons';
import { renderAltarToDataUrl } from '@/lib/exportCanvas';

const SCATTER_AT = 4.5;
const FREEZE_AT = 6.0;
const SLOT_COUNT = 76;

const slots = buildAltarSlots(SLOT_COUNT);

type AltarSignupData = {
  uid_suffix: string;
  constellation: number;
  refinement: number;
  icon: string;
  avatar_url: string | null;
  message: string | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
}

// 3D tilt + parallax: layers translate at different speeds, the background
// layer additionally rotates in perspective for a real angle-of-view shift.
function useTilt(enabled: boolean) {
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const running = useRef(false);
  const layers = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [enabled]);

  const start = useCallback(() => {
    if (running.current) return;
    running.current = true;
    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.06;
      current.current.y += (target.current.y - current.current.y) * 0.06;
      layers.current.forEach((el, key) => {
        const [depth, rotY, rotX] = key.split(':').map(Number);
        el.style.transform = `perspective(1100px) translate3d(${current.current.x * depth}px, ${
          current.current.y * depth
        }px, 0) rotateY(${current.current.x * rotY}deg) rotateX(${-current.current.y * rotX}deg)`;
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const bind = useCallback((depth: number, rotY = 0, rotX = 0) => ({
    ref: (el: HTMLElement | null) => {
      if (el) layers.current.set(`${depth}:${rotY}:${rotX}`, el);
      else layers.current.delete(`${depth}:${rotY}:${rotX}`);
    },
    style: { willChange: 'transform' as const },
  }), []);

  return { start, bind };
}

export default function App() {
  const [cellsIn, setCellsIn] = useState(false);
  const [sceneReady, setSceneReady] = useState(false); // видео дошло до финала
  const [entries, setEntries] = useState<AltarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<{ entry: AltarEntry; slot: CellSlot } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showAdminLock, setShowAdminLock] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishedRef = useRef(false);
  const bgmStartedRef = useRef(false);
  const tilt = useTilt(sceneReady);

  // --- BGM: attempt autoplay; if blocked, start on first pointer/keyboard activity.
  const startBgm = useCallback(() => {
    if (bgmStartedRef.current) return;
    const b = bgmRef.current;
    if (!b) return;
    bgmStartedRef.current = true;
    b.loop = true;
    b.volume = muted ? 0 : 0.7;
    b.play().catch(() => {
      bgmStartedRef.current = false;
    });
  }, [muted]);

  useEffect(() => {
    startBgm();
    const kick = () => startBgm();
    window.addEventListener('pointerdown', kick);
    window.addEventListener('pointermove', kick, { once: false });
    window.addEventListener('keydown', kick);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('pointermove', kick);
      window.removeEventListener('keydown', kick);
    };
  }, [startBgm]);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = muted;
  }, [muted]);

  // --- Intro video: plays fullscreen from page load.
  const finishIntro = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
      } catch {
        /* already ended */
      }
    }
    setSceneReady(true);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.currentTime >= SCATTER_AT) setCellsIn(true);
      if (v.currentTime >= FREEZE_AT) finishIntro();
    };
    const onEnded = () => finishIntro();
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
    v.play().catch(() => {
      // Autoplay blocked: fall back to the timed scene anyway.
      const t1 = setTimeout(() => setCellsIn(true), 4500);
      const t2 = setTimeout(finishIntro, 6200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    });
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnded);
    };
  }, [finishIntro]);

  // Open the side panel once the scene is ready.
  useEffect(() => {
    if (sceneReady) {
      const t = setTimeout(() => setPanelOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [sceneReady]);

  // --- Database + realtime
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.from('altar_entries').select('*').order('created_at', { ascending: true });
      if (data) setEntries(data);
      setLoading(false);

      channel = supabase
        .channel('altar_entries_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'altar_entries' }, () => {
          (async () => {
            const { data: fresh } = await supabase.from('altar_entries').select('*').order('created_at', { ascending: true });
            if (fresh) setEntries(fresh);
          })();
        })
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const bySlot = useMemo<(AltarEntry | null)[]>(() => {
    const arr: (AltarEntry | null)[] = new Array(slots.length).fill(null);
    entries.forEach((e, i) => {
      if (i < slots.length) arr[i] = e;
    });
    return arr;
  }, [entries]);

  const totals = useMemo(
    () => ({
      total: entries.length,
      c6: entries.filter((e) => e.constellation === 6).length,
    }),
    [entries]
  );

  const handleSignup = useCallback(
    async (data: AltarSignupData): Promise<string | null> => {
      const { data: row, error } = await supabase
        .from('altar_entries')
        .insert(data)
        .select()
        .single();
      if (error) {
        if (error.code === '23505') return 'Этот UID уже записан на алтарь.';
        return 'Не удалось записаться. Попробуйте ещё раз.';
      }
      if (row) {
        setEntries((prev) => [...prev, row as AltarEntry]);
        setCellsIn(true);
      }
      return null;
    },
    []
  );

  const handleDownload = useCallback(async () => {
    try {
      const url = await renderAltarToDataUrl(videoRef.current, slots, bySlot, totals);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'altar-tsaritsa.png';
      a.click();
    } catch {
      alert('Не удалось сохранить скриншот. Попробуйте ещё раз.');
    }
  }, [bySlot, totals]);

  const handleAdminUpdate = useCallback(
    async (id: string, patch: Partial<AltarEntry>) => {
      const pass = adminPass || window.prompt('Пароль администратора:') || '';
      const { data, error } = await supabase.rpc('admin_update_entry', {
        pass,
        entry_id: id,
        new_constellation: patch.constellation ?? 0,
        new_refinement: patch.refinement ?? 0,
        new_icon: patch.icon ?? 'snowflake',
        new_message: patch.message ?? null,
      });
      if (error || !data) {
        setAdminError('Неверный пароль');
        setShowAdmin(false);
        return;
      }
      setEntries((prev) => prev.map((e) => (e.id === id ? (data as AltarEntry) : e)));
    },
    [adminPass]
  );

  const handleAdminDelete = useCallback(
    async (id: string) => {
      const pass = adminPass || window.prompt('Пароль администратора:') || '';
      const { error } = await supabase.rpc('admin_delete_entry', {
        pass,
        entry_id: id,
      });
      if (error) {
        setAdminError('Неверный пароль');
        setShowAdmin(false);
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    []
  );

  const handleAdminLogin = useCallback(async () => {
    setAdminBusy(true);
    const { data: ok } = await supabase.rpc('check_admin_password', { pass: adminPass });
    setAdminBusy(false);
    if (ok) {
      setShowAdmin(true);
      setShowAdminLock(false);
      setAdminError(null);
      setAdminPass('');
    } else {
      setAdminError('Неверный пароль');
    }
  }, [adminPass]);

  useEffect(() => {
    if (sceneReady) tilt.start();
  }, [sceneReady, tilt]);

  const bgBind = tilt.bind(-18, 2.2, 1.6); // задний слой — видео, глубокий сдвиг + наклон
  const midBind = tilt.bind(28, 3.0, 2.0); // вихри и сияние
  const frontBind = tilt.bind(58, 3.8, 2.5); // значки и ближний снег

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />
      <audio ref={bgmRef} src="/bgm.mp3" preload="auto" />

      {/* Фон: видео Царицы, 106% зум, tilt + параллакс после финала */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          {...bgBind}
          className="absolute"
          style={{
            inset: '-5%',
            width: '110%',
            height: '110%',
            transform: sceneReady ? undefined : 'none',
          }}
        >
          <video
            ref={videoRef}
            src="/tsaritsa.mp4.mp4"
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 44% 50%, transparent 32%, rgba(5,13,22,0.55) 100%)' }}
        />
      </div>

      {/* Средний слой: анимированные вихри, сияние и снег */}
      <div {...midBind} className="absolute -inset-6 pointer-events-none">
        <IceVortices />
        <Snowfall count={70} />
      </div>
      <div className="frost-vignette" />
      <div className="frost-corner" style={{ top: 0, left: 0 }} />
      <div className="frost-corner" style={{ top: 0, right: 0, transform: 'scaleX(-1)' }} />
      <div className="frost-corner" style={{ bottom: 0, left: 0, transform: 'scaleY(-1)' }} />
      <div className="frost-corner" style={{ bottom: 0, right: 0, transform: 'scale(-1)' }} />

      {/* Передний слой: значки анонов и парящие снежинки */}
      <div {...frontBind} className="absolute -inset-3">
        <div className="absolute inset-0 pointer-events-none">
          <Snowfall count={30} />
        </div>
        <div className="absolute inset-0">
          {slots.map((slot, i) => {
            const entry = bySlot[i];
            return (
              <div
                key={slot.id}
                className={`absolute ${cellsIn ? 'scatter-in' : 'opacity-0'}`}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  transform: 'translate(-50%, -50%)',
                  ['--sx' as any]: `${(Math.random() - 0.5) * 260}px`,
                  ['--sy' as any]: `${(Math.random() - 0.5) * 260}px`,
                  ['--sr' as any]: `${(Math.random() - 0.5) * 90}deg`,
                  animationDelay: cellsIn ? `${i * 24}ms` : undefined,
                }}
              >
                {entry ? (
                  <button
                    className={`slot-filled seal cryo-pulse flex flex-col items-center justify-center ${
                      entry.constellation === 6 ? 'slot-c6' : ''
                    }`}
                    style={{ width: Math.max(slot.size, 74), height: Math.max(slot.size, 74) }}
                    onMouseEnter={() => setHovered({ entry, slot })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setHovered({ entry, slot })}
                  >
                    {entry.icon === 'custom' && entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt=""
                        className="rounded-full object-cover border border-sky-100/60 mb-1"
                        style={{ width: 16, height: 16 }}
                      />
                    ) : (
                      <IconByKey icon={entry.icon} className="w-4 h-4 text-sky-100 mb-0.5 drop-shadow-[0_0_6px_rgba(140,220,255,0.9)]" />
                    )}
                    <span
                      className="font-mono font-extrabold leading-none text-white"
                      style={{
                        fontSize: Math.max(slot.size * 0.22, 14),
                        textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.7)',
                      }}
                    >
                      {entry.uid_suffix}
                    </span>
                    <span
                      className={`badge-cr mt-0.5 ${entry.constellation === 6 ? 'badge-cr-c6' : ''}`}
                    >
                      C{entry.constellation}R{entry.refinement}
                    </span>
                  </button>
                ) : (
                  <div
                    className="slot-empty seal flex items-center justify-center"
                    style={{ width: slot.size, height: slot.size }}
                  >
                    <span className="text-sky-100/70 font-mono" style={{ fontSize: slot.size * 0.22 }}>
                      +
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className="tooltip-panel glass"
          style={{
            left: `min(max(${hovered.slot.x}%, 240px), calc(100% - 240px))`,
            top: `calc(${hovered.slot.y}% + ${hovered.slot.size / 2 + 10}px)`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="font-mono text-base tracking-widest text-sky-50">{hovered.entry.uid_suffix}</p>
          <p className="text-sky-300">
            C{hovered.entry.constellation}R{hovered.entry.refinement} • {fmtDate(hovered.entry.created_at)}
          </p>
          {hovered.entry.message && <p className="text-sky-100/80 italic mt-1">«{hovered.entry.message}»</p>}
        </div>
      )}

      {/* Top-left counters */}
      <div
        className={`absolute top-4 left-4 z-30 glass rounded-xl px-4 py-3 transition-opacity duration-1000 ${
          sceneReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-[10px] uppercase tracking-[0.25em] text-sky-200/60">/genshin/ • Алтарь Царицы</p>
        <div className="flex items-center gap-4 mt-1.5">
          <span className="flex items-center gap-1.5 text-sky-50">
            <Users size={15} className="text-sky-300" />
            <b className="font-mono">{totals.total}</b>
            <span className="text-xs text-sky-200/70">записалось</span>
          </span>
          <span className="flex items-center gap-1.5 text-sky-50">
            <Gem size={15} className="text-sky-300" />
            <b className="font-mono">{totals.c6}</b>
            <span className="text-xs text-sky-200/70">C6</span>
          </span>
        </div>
      </div>

      {/* Top-right: mute + download + replay */}
      <div
        className={`absolute top-4 right-4 z-40 flex items-center gap-2 transition-opacity duration-1000 ${
          sceneReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button className="btn-ghost glass rounded-full" onClick={handleDownload} title="Скачать PNG без интерфейса">
          <Download size={16} />
        </button>
        <button
          className="btn-ghost glass rounded-full"
          onClick={() => {
            setCellsIn(false);
            finishedRef.current = false;
            setSceneReady(false);
            setPanelOpen(false);
            const v = videoRef.current;
            if (v) {
              v.currentTime = 0;
              v.play().catch(() => {});
            }
          }}
          title="Пересмотреть интро"
        >
          <RefreshCw size={16} />
        </button>
        <button
          className="glass rounded-full w-11 h-11 flex items-center justify-center text-sky-100 hover:text-white transition-colors"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
        >
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </div>

      {/* Side signup panel */}
      {sceneReady && (
        <SidePanel open={panelOpen} onToggle={() => setPanelOpen((o) => !o)} onSubmit={handleSignup} />
      )}

      {/* Admin lock bottom-right */}
      <div
        className={`absolute bottom-5 right-5 z-30 transition-opacity duration-1000 ${
          sceneReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {showAdminLock ? (
          <div className="glass rounded-xl p-3 flex items-center gap-2 relative">
            <KeyRound size={16} className="text-sky-300" />
            <input
              type="password"
              className="input-ice w-40"
              placeholder="Пароль"
              value={adminPass}
              autoFocus
              onChange={(e) => setAdminPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
            <button className="btn-ghost" disabled={adminBusy} onClick={handleAdminLogin}>
              Войти
            </button>
            <button
              className="text-sky-200/60 hover:text-white"
              onClick={() => {
                setShowAdminLock(false);
                setAdminError(null);
              }}
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
            {adminError && <p className="text-xs text-rose-300 absolute -bottom-5 right-0">{adminError}</p>}
          </div>
        ) : (
          <button
            className="text-sky-300/40 hover:text-sky-200 transition-colors"
            onClick={() => setShowAdminLock(true)}
            aria-label="Админ-панель"
          >
            <Lock size={18} />
          </button>
        )}
      </div>

      {showAdmin && (
        <AdminPanel
          entries={entries}
          onClose={() => setShowAdmin(false)}
          onUpdate={handleAdminUpdate}
          onDelete={handleAdminDelete}
        />
      )}

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="glass rounded-full px-4 py-2 text-sm text-sky-200/80">Чтение ледяных скрижалей...</div>
        </div>
      )}
    </div>
  );
}
