import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Lock, RefreshCw, Users, Gem, X, KeyRound, Volume2, VolumeX, Play } from 'lucide-react';
import { supabase, type AltarEntry } from '@/lib/supabase';
import { buildAltarSlots, type CellSlot } from '@/lib/altarLayout';
import Snowfall from '@/components/Snowfall';
import SnowflakeShape from '@/components/SnowflakeShape';
import SidePanel from '@/components/SidePanel';
import AdminPanel from '@/components/AdminPanel';
import { IconByKey } from '@/lib/icons';
import { renderAltarToDataUrl } from '@/lib/exportCanvas';
import { useIsMobile, useIsTouch } from '@/lib/useMediaQuery';

const SCATTER_AT = 4.5;
const FREEZE_AT = 6.0;
const ACT_SIZE = 76;
const TOTAL_SLOTS = 152;

const slots = buildAltarSlots(TOTAL_SLOTS);

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

function actOfEntry(entries: AltarEntry[], e: AltarEntry) {
  const idx = entries.indexOf(e);
  return idx >= 0 && idx < ACT_SIZE ? 1 : 2;
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
  const [act, setAct] = useState<1 | 2>(1);
  const [cellsIn, setCellsIn] = useState(false);
  const [sceneReady, setSceneReady] = useState(false); // видео текущего акта дошло до финала
  const [entries, setEntries] = useState<AltarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<{ entry: AltarEntry; slot: CellSlot } | null>(null);
  const [selected, setSelected] = useState<AltarEntry | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showAdminLock, setShowAdminLock] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishedRef = useRef(false);
  const bgmStartedRef = useRef(false);
  const isMobile = useIsMobile();
  const isTouch = useIsTouch();
  const tilt = useTilt(sceneReady && !isTouch);

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

  const totalFilled = entries.length;

  // Default to Act II when the first circle is already full.
  useEffect(() => {
    if (!loading && totalFilled > ACT_SIZE) setAct(2);
  }, [loading, totalFilled]);

  // --- Intro video for the active act: plays fullscreen from page load.
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
    });
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnded);
    };
  }, [finishIntro, act]);

  // Open the side panel once the scene is ready.
  useEffect(() => {
    if (sceneReady) {
      const t = setTimeout(() => setPanelOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [sceneReady]);

  const bySlot = useMemo<(AltarEntry | null)[]>(() => {
    const arr: (AltarEntry | null)[] = new Array(slots.length).fill(null);
    entries.forEach((e, i) => {
      if (i < slots.length) arr[i] = e;
    });
    return arr;
  }, [entries]);

  const actSlots = useMemo(
    () => (act === 1 ? slots.slice(0, ACT_SIZE) : slots.slice(ACT_SIZE, TOTAL_SLOTS)),
    [act]
  );
  const actOffset = act === 1 ? 0 : ACT_SIZE;

  const actBySlot = useMemo<(AltarEntry | null)[]>(() => {
    const arr: (AltarEntry | null)[] = new Array(actSlots.length).fill(null);
    entries.forEach((e, i) => {
      const inAct = act === 1 ? i < ACT_SIZE : i >= ACT_SIZE && i < TOTAL_SLOTS;
      if (inAct) {
        const idx = act === 1 ? i : i - ACT_SIZE;
        if (idx < actSlots.length) arr[idx] = e;
      }
    });
    return arr;
  }, [entries, actSlots, act]);

  const totals = useMemo(
    () => ({
      total: entries.length,
      c6: entries.filter((e) => e.constellation === 6).length,
    }),
    [entries]
  );

  const totalPower = useMemo(
    () => entries.reduce((sum, e) => sum + e.constellation + 1, 0),
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
        const msg = error.message ?? '';
        if (error.code === '23505') return 'Этот UID уже записан на алтарь.';
        if (msg.includes('152')) return 'Алтарь полон — все 152 места заняты.';
        if (msg.includes('2 человека')) return 'С этого устройства уже записаны 2 человека.';
        return 'Не удалось записаться. Попробуйте ещё раз.';
      }
      if (row) {
        setEntries((prev) => {
          const next = [...prev, row as AltarEntry];
          // If Act I is full, the new badge lands in Act II — switch there.
          if (next.length > ACT_SIZE) setAct(2);
          return next;
        });
        setCellsIn(true);
      }
      return null;
    },
    []
  );

  const handleDownload = useCallback(async () => {
    try {
      const url = await renderAltarToDataUrl(
        videoRef.current,
        actSlots,
        actBySlot,
        { total: actBySlot.filter(Boolean).length, c6: actBySlot.filter((e) => e?.constellation === 6).length }
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = act === 1 ? 'altar-tsaritsa-act1.png' : 'altar-tsaritsa-act2.png';
      a.click();
    } catch {
      alert('Не удалось сохранить скриншот. Попробуйте ещё раз.');
    }
  }, [actBySlot, actSlots, totals, act]);

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
    [adminPass]
  );

  const handleAdminLogin = useCallback(async () => {
    setAdminBusy(true);
    const { data: ok } = await supabase.rpc('check_admin_password', { pass: adminPass });
    setAdminBusy(false);
    if (ok) {
      setShowAdmin(true);
      setShowAdminLock(false);
      setAdminError(null);
  
    } else {
      setAdminError('Неверный пароль');
    }
  }, [adminPass]);

  useEffect(() => {
    if (sceneReady) tilt.start();
  }, [sceneReady, tilt]);

  // Close the detail card on Esc.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const replayIntro = useCallback(() => {
    setCellsIn(false);
    finishedRef.current = false;
    setSceneReady(false);
    setPanelOpen(false);
    setVideoReady(false);
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      // Same source: loadeddata won't re-fire, so reveal from readyState.
      if (v.readyState >= 2) setVideoReady(true);
      v.play().catch(() => {});
    }
  }, []);

  // Switching acts: swap the video and replay its intro.
  const switchAct = useCallback(
    (next: 1 | 2) => {
      if (next === act) return;
      setAct(next);
      setCellsIn(false);
      finishedRef.current = false;
      setSceneReady(false);
      setPanelOpen(false);
      setHovered(null);
      setVideoReady(false);
    },
    [act]
  );

  const bgBind = tilt.bind(-18, 2.2, 1.6); // задний слой — видео, глубокий сдвиг + наклон
  const midBind = tilt.bind(28, 3.0, 2.0); // вихри и сияние
  const frontBind = tilt.bind(58, 3.8, 2.5); // значки и ближний снег

  // На мобильных растягиваем раскладку к краям (6% / 94%), центр остаётся свободным.
  const displaySlots = useMemo(() => {
    if (!isMobile) return actSlots;
    return actSlots.map((s) => {
      const d = s.x - 50;
      const x = Math.min(94, Math.max(6, 50 + d * 1.3));
      return { ...s, x };
    });
  }, [actSlots, isMobile]);

  const videoSrc = act === 1 ? '/tsaritsa.mp4' : '/tsaritsa2.mp4';

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />
      <audio ref={bgmRef} src="/bgm.mp3" preload="auto" />

      {/* Фон: видео Царицы активного акта. Пока первый кадр нового ролика не готов,
          слой закрыт тёмно-синей плашкой, чтобы не мелькал кадр прошлого акта. */}
      <div className={`absolute inset-0 overflow-hidden ${videoReady ? '' : 'bg-[#06101e]'}`}>
        <div
          {...bgBind}
          className="absolute"
          style={{
            inset: '-5%',
            width: '110%',
            height: '110%',
            transform: sceneReady ? undefined : 'none',
            transition: 'opacity 1s ease',
          }}
          
        >
          <video
            key={act}
            ref={videoRef}
            src={videoSrc}
            muted
            playsInline
            preload="auto"
            onLoadedData={() => setVideoReady(true)}
            onCanPlay={() => setVideoReady(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              videoReady ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 44% 50%, transparent 32%, rgba(5,13,22,0.55) 100%)' }}
        />
      </div>

      {/* Средний слой: метель (на тач-устройствах — лёгкий снегопад) */}
      <div {...midBind} className="absolute -inset-6 pointer-events-none">
        <Snowfall count={isTouch ? 12 : 30} totalPower={isTouch ? 0 : totalPower} storm={sceneReady && !isTouch} />
      </div>
     


      {/* Передний слой: значки анонов и лёгкие парящие снежинки (на тач-устройствах — меньше) */}
      <div {...frontBind} className="absolute -inset-3">
        <div className="absolute inset-0 pointer-events-none">
          <Snowfall count={isTouch ? 8 : 0} totalPower={0} storm={false} />
        </div>
                   {displaySlots.map((slot, i) => {
            const entry = actBySlot[i];
            return (
              <div
                key={`${act}-${slot.id}`}
                className={`absolute ${cellsIn ? 'scatter-in' : 'opacity-0'} ${
                  entry?.constellation === 6 ? 'float-c6' : ''
                }`}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  zIndex: entry?.constellation === 6 ? 10 : 1,
                  transform: 'translate(-50%, -50%)',
                  ['--sx' as string]: `${(Math.random() - 0.5) * 260}px`,
                  ['--sy' as string]: `${(Math.random() - 0.5) * 260}px`,
                  ['--sr' as string]: `${(Math.random() - 0.5) * 90}deg`,
                  animationDelay: cellsIn ? `${i * 24}ms` : undefined,
                }}
              >
                {entry ? (
                  <button
                    className={`slot-filled const-c${entry.constellation} relative flex items-center justify-center`}
                    style={{ width: `var(--cell)`, height: `var(--cell)` }}
                    onMouseEnter={() => setHovered({ entry, slot })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(entry)}
                  >
                    <SnowflakeShape className="absolute inset-0 w-full h-full" />
                    <span
                      className="cell-plate"
                      style={{ width: '68%', height: '68%' }}
                    />
                    <span className="cell-inner flex flex-col items-center justify-center">
                      {entry.icon === 'custom' && entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt=""
                          className="rounded-full object-cover border border-sky-100/80 mb-0.5"
                          style={{ width: 26, height: 26 }}
                        />
                      ) : (
                        <IconByKey
                          icon={entry.icon}
                          className="text-sky-100 mb-0.5 drop-shadow-[0_0_6px_rgba(140,220,255,0.9)]"
                          style={{ width: 22, height: 22 }}
                        />
                      )}
                      <span
                        className="font-mono font-extrabold leading-none text-white"
                        style={{
                          fontSize: 13,
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
                    </span>
                  </button>
                ) : (
                  <div
                    className="slot-empty relative flex items-center justify-center"
                    style={{ width: slot.size, height: slot.size }}
                  >
                    <SnowflakeShape className="absolute inset-0 w-full h-full" />
                    <span className="plus-sign text-sky-100/70 font-mono" style={{ fontSize: slot.size * 0.22 }}>
                      +
                    </span>
                  </div>
                )}
              </div>
            );
          })}
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

      {/* Top-left counters + act switcher (на мобильных — компактная плашка ниже кнопок) */}
      <div
        className={`absolute top-4 left-4 z-30 glass rounded-xl px-4 py-3 transition-opacity duration-1000 max-[768px]:top-auto max-[768px]:bottom-20 max-[768px]:left-2 max-[768px]:px-2.5 max-[768px]:py-2 max-[768px]:max-w-[62vw] ${
          sceneReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-[10px] uppercase tracking-[0.25em] text-sky-200/60 max-[768px]:hidden">/genshin/ • Алтарь Царицы</p>
        <div className="flex items-center gap-4 mt-1.5 max-[768px]:gap-2.5 max-[768px]:mt-0 max-[768px]:text-xs">
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
        <div className="flex items-center gap-1 mt-2.5 glass rounded-full p-1">
          <button
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-all ${
              act === 1 ? 'bg-sky-300/30 text-white' : 'text-sky-200/70 hover:text-white'
            }`}
            onClick={() => switchAct(1)}
          >
            <Play size={11} />
            Акт I
            <span className="text-[10px] opacity-70">1–76</span>
          </button>
          <button
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-all ${
              act === 2 ? 'bg-sky-300/30 text-white' : 'text-sky-200/70 hover:text-white'
            }`}
            onClick={() => switchAct(2)}
          >
            <Play size={11} />
            Акт II
            <span className="text-[10px] opacity-70">77–152</span>
          </button>
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
        <button className="btn-ghost glass rounded-full" onClick={replayIntro} title="Пересмотреть интро">
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

      {/* Side signup panel — на мобильных превращается в нижнюю шторку */}
      {sceneReady && (
        <SidePanel open={panelOpen} onToggle={() => setPanelOpen((o) => !o)} onSubmit={handleSignup} isMobile={isMobile} />
      )}

      {/* Мобильная кнопка «Записаться» снизу */}
      {sceneReady && isMobile && !panelOpen && (
        <button
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 btn-ice glass rounded-full px-6 py-3 text-sm shadow-lg"
          onClick={() => setPanelOpen(true)}
        >
          <SnowflakeShape className="w-4 h-4" />
          Записаться
        </button>
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

      {/* Detail card — opened by clicking a filled snowflake */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass rounded-2xl w-full max-w-sm p-6 rise-in relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-sky-200/70 hover:text-white"
              onClick={() => setSelected(null)}
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
            {selected.icon === 'custom' && selected.avatar_url ? (
              <img
                src={selected.avatar_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover border-2 border-sky-300/70 mx-auto shadow-[0_0_24px_rgba(125,211,252,0.5)]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-sky-950/60 border-2 border-sky-300/70 shadow-[0_0_24px_rgba(125,211,252,0.5)]">
                <IconByKey icon={selected.icon} className="w-10 h-10 text-sky-100" />
              </div>
            )}
            <p className="font-mono text-3xl tracking-[0.35em] text-sky-50 mt-4">{selected.uid_suffix}</p>
            <p className="text-sky-300 mt-1">
              Созвездие C{selected.constellation} • Пробуждение R{selected.refinement}
            </p>
            <p className="text-xs text-sky-200/60 mt-1">
              Акт {actOfEntry(entries, selected)} • {fmtDate(selected.created_at)}
            </p>
            {selected.message && (
              <p className="font-display text-lg text-sky-100/90 italic mt-4 leading-relaxed">
                «{selected.message}»
              </p>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="glass rounded-full px-4 py-2 text-sm text-sky-200/80">Чтение ледяных скрижалей...</div>
        </div>
      )}
    </div>
  );
}
