/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useState, type FC, type FormEvent } from 'react';
import {
  ArrowRight,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Play,
  Volume2,
  VolumeX,
  Heart,
  Repeat,
  Shuffle,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useUISound } from '@/hooks/useUISound';
import { type PrismModeSlug } from '@/hooks/data/prism';
import { keyLabelToUrlParam, urlParamToKeyLabel } from '@/lib/musicKeyUrl';
import { getChordScales } from '@/components/learn/chordScaleData';
import { useProgressSummary } from '@/hooks/data';
import {
  AtlasRoutes,
  GameRoutes,
  LearnRoutes,
  StudioRoutes,
} from '@/constants/routes';
import { HexAvatarSVG } from '../ui/HexAvatarSVG';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { useAssistantMatcher } from './dashboard/assistant/useAssistantMatcher';
import type { AssistantPhase } from './dashboard/assistant/types';

/* ── Inline icon helper ──────────────────────────────────────────────── */
const Icon: FC<{ src: string; className?: string; alt?: string; style?: React.CSSProperties }> = ({ src, className = 'w-4 h-4', alt = '', style }) => (
  <img src={src} alt={alt} className={className} style={style} draggable={false} />
);

/* ── Section card config ─────────────────────────────────────────────── */
const SECTIONS = [
  { label: 'Learn', icon: '/icons/learn-icon.svg', bg: '/backgrounds/learn-bg.svg', route: LearnRoutes.root.definition },
  { label: 'Studio', icon: '/icons/studio-icon.svg', bg: '/backgrounds/studio-bg.svg', route: StudioRoutes.root.definition },
  { label: 'Arcade', icon: '/icons/arcade-icon.svg', bg: '/backgrounds/arcade-bg.svg', route: GameRoutes.root.definition },
  { label: 'Globe', icon: '/icons/globe-icon.svg', bg: '/backgrounds/globe-bg.svg', route: AtlasRoutes.root.definition },
] as const;

/* ── Component ───────────────────────────────────────────────────────── */
export const HomeInlet = () => {
  const navigate = useNavigate();
  const { play } = useUISound();
  const { data: progressSummary } = useProgressSummary(true);

  /* Assistant state */
  const [phase, setPhase] = useState<AssistantPhase>({ type: 'idle' });
  const [assistantInput, setAssistantInput] = useState('');
  const { match } = useAssistantMatcher();

  const handleAssistantSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = assistantInput.trim();
    if (!trimmed) return;
    play('click');
    setPhase({ type: 'result', query: trimmed, matches: match(trimmed) });
  };
  const handleAssistantReset = () => { play('click'); setPhase({ type: 'idle' }); setAssistantInput(''); };

  /* Player state */
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(66);
  const [seekPosition, setSeekPosition] = useState(33);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const totalSeconds = 204; // 3:24
  const currentSeconds = Math.round((seekPosition / 100) * totalSeconds);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* Latest continue lesson */
  const latestContinue = (() => {
    const latest = progressSummary?.lessons?.find(
      (l) => l.lessonId.startsWith('mode-lesson-flow') && !!l.mode && !!l.root && (l.completedCount ?? 0) > 0,
    );
    if (!latest?.mode || !latest.root) return null;
    const mode = latest.mode;
    const root = latest.root;
    return {
      modeTitle: getChordScales(mode as PrismModeSlug)?.modeName ?? mode,
      rootTitle: urlParamToKeyLabel(root),
      route: LearnRoutes.lesson({ mode: mode as PrismModeSlug, key: keyLabelToUrlParam(root) }),
    };
  })();

  return (
    <div className="flex flex-col h-full" style={{ backgroundImage: 'url(/backgrounds/dashboard-bg.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* ── Main area — flex fills viewport, no scroll on desktop ──── */}
      <div className="flex-1 min-h-0 flex flex-col lg:overflow-hidden overflow-y-auto custom-scrollbar" style={{ padding: 'clamp(0.5rem, 1.5vw, 2rem)' }}>

        {/* ── Row 1: Section Navigation Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 flex-[5] min-h-0" style={{ gap: 'clamp(0.5rem, 1vw, 1rem)' }}>
          {SECTIONS.map((sec) => (
            <div
              key={sec.label}
              className="relative rounded-2xl glass-panel overflow-hidden cursor-pointer group transition-all duration-200 hover:brightness-110"
              style={{ background: 'rgba(26, 26, 26, 0.7)' }}
              onClick={() => { play('select'); navigate(sec.route); }}
            >
              <img src={sec.bg} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                <Icon src={sec.icon} className="opacity-100" style={{ width: 'clamp(2.5rem, 5vw, 4rem)', height: 'clamp(2.5rem, 5vw, 4rem)' }} />
                <span className="font-medium text-white/80 mt-2" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}>{sec.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: 'clamp(0.5rem, 1vw, 1rem)', flexShrink: 0 }} />

        {/* ── Row 2: Quick Start / Assistant / Challenges ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-[2] min-h-0" style={{ gap: 'clamp(0.5rem, 1vw, 1rem)' }}>

          {/* Quick Start */}
          <div className="rounded-2xl glass-panel-sm overflow-hidden flex flex-col" style={{ background: 'rgba(26, 26, 26, 0.7)', padding: 'clamp(0.75rem, 1.5vw, 1.25rem)' }}>
            <div className="flex items-center gap-2 mb-auto">
              <Icon src="/icons/quick-start-icon.svg" className="opacity-100" style={{ width: 'clamp(0.75rem, 1.2vw, 1rem)', height: 'clamp(0.75rem, 1.2vw, 1rem)' }} />
              <span className="font-medium" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)', color: '#ffffff' }}>Quick Start</span>
            </div>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => { play('click'); navigate(latestContinue?.route ?? LearnRoutes.root.definition); }}
                className="flex-1 flex items-center gap-2 rounded-xl font-medium transition-colors hover:bg-white/5"
                style={{ background: 'rgba(30, 30, 30, 0.6)', color: '#ffffff', padding: 'clamp(0.4rem, 0.8vw, 0.625rem) clamp(0.5rem, 1vw, 0.75rem)', fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)' }}
              >
                <Icon src="/icons/continue-learning-icon.svg" className="opacity-100 flex-shrink-0" style={{ width: 'clamp(0.75rem, 1vw, 1rem)', height: 'clamp(0.75rem, 1vw, 1rem)' }} />
                Continue Learning
              </button>
              <button
                onClick={() => { play('click'); navigate(StudioRoutes.root.definition); }}
                className="flex-1 flex items-center gap-2 rounded-xl font-medium transition-colors hover:bg-white/5"
                style={{ background: 'rgba(30, 30, 30, 0.6)', color: '#ffffff', padding: 'clamp(0.4rem, 0.8vw, 0.625rem) clamp(0.5rem, 1vw, 0.75rem)', fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)' }}
              >
                <Icon src="/icons/new-session-icon.svg" className="opacity-100 flex-shrink-0" style={{ width: 'clamp(0.75rem, 1vw, 1rem)', height: 'clamp(0.75rem, 1vw, 1rem)' }} />
                New Session
              </button>
            </div>
          </div>

          {/* Assistant */}
          <div className="rounded-2xl glass-panel-sm overflow-hidden flex flex-col" style={{ background: 'rgba(26, 26, 26, 0.7)', padding: 'clamp(0.75rem, 1.5vw, 1.25rem)' }}>
            <div className="flex items-center gap-2 mb-auto">
              <Icon src="/icons/assistant-icon.svg" className="opacity-100" style={{ width: 'clamp(0.75rem, 1.2vw, 1rem)', height: 'clamp(0.75rem, 1.2vw, 1rem)' }} />
              <span className="font-medium" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)', color: '#ffffff' }}>Assistant</span>
            </div>

            <div className="mt-auto">
              {phase.type === 'idle' ? (
                <form onSubmit={handleAssistantSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    placeholder="Try 'learn funk' or 'play a game'..."
                    className="flex-1 rounded-xl outline-none transition-colors"
                    style={{ background: 'rgba(30, 30, 30, 0.6)', color: '#ffffff', padding: 'clamp(0.4rem, 0.8vw, 0.625rem) clamp(0.5rem, 1vw, 0.75rem)', fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)' }}
                  />
                  <button type="submit" className="flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#ffffff', width: 'clamp(1.5rem, 2.5vw, 2rem)', height: 'clamp(1.5rem, 2.5vw, 2rem)' }}>
                    <ArrowRight size={14} />
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {phase.matches.length > 0 ? (
                    phase.matches.slice(0, 2).map((m) => (
                      <button key={m.entry.route} onClick={() => navigate(m.entry.route)} className="flex items-center justify-between rounded-xl transition-colors hover:bg-white/5 text-left" style={{ background: 'rgba(30, 30, 30, 0.6)', color: '#ffffff', padding: 'clamp(0.4rem, 0.6vw, 0.5rem) clamp(0.5rem, 1vw, 0.75rem)', fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)' }}>
                        <span className="truncate">{m.entry.label}</span>
                        <ArrowRight size={12} style={{ color: '#ffffff' }} />
                      </button>
                    ))
                  ) : (
                    <p style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)', color: '#ffffff' }}>No matches found.</p>
                  )}
                  <button onClick={handleAssistantReset} className="self-start flex items-center gap-1" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.625rem)', color: '#ffffff' }}>
                    <RotateCcw size={10} /> Ask again
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Challenges */}
          <div className="rounded-2xl glass-panel-sm overflow-hidden flex flex-col" style={{ background: 'rgba(26, 26, 26, 0.7)', padding: 'clamp(0.75rem, 1.5vw, 1.25rem)' }}>
            <div className="flex items-center gap-2 mb-auto">
              <Icon src="/icons/challenges-icon.svg" className="opacity-100" style={{ width: 'clamp(0.75rem, 1.2vw, 1rem)', height: 'clamp(0.75rem, 1.2vw, 1rem)' }} />
              <span className="font-medium" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)', color: '#ffffff' }}>Challenges</span>
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              {[
                { name: 'Challenge 1', time: '16 hrs' },
                { name: 'Challenge 2', time: '5 days' },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded border flex-shrink-0" style={{ borderColor: 'var(--color-border)', width: 'clamp(0.75rem, 1.2vw, 1rem)', height: 'clamp(0.75rem, 1.2vw, 1rem)' }} />
                    <span style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)', color: '#ffffff' }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.625rem)', color: '#ffffff' }}>{c.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: 'clamp(0.5rem, 1vw, 1rem)', flexShrink: 0 }} />

        {/* ── Row 3: Notifications / Recent Projects ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-[2] min-h-0" style={{ gap: 'clamp(0.5rem, 1vw, 1rem)' }}>

          {/* Notifications */}
          <div className="rounded-2xl glass-panel-sm overflow-hidden flex flex-col" style={{ background: 'rgba(26, 26, 26, 0.7)', padding: 'clamp(0.75rem, 1.5vw, 1.25rem)' }}>
            <div className="flex items-center gap-2 mb-auto">
              <Icon src="/icons/notifications-icon.svg" className="opacity-100" style={{ width: 'clamp(0.75rem, 1.2vw, 1rem)', height: 'clamp(0.75rem, 1.2vw, 1rem)' }} />
              <span className="font-medium" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)', color: '#ffffff' }}>Notifications</span>
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              {['"User Name" invited you to...', '"User Name" invited you to...'].map((msg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="rounded border flex-shrink-0" style={{ borderColor: 'var(--color-border)', width: 'clamp(0.75rem, 1.2vw, 1rem)', height: 'clamp(0.75rem, 1.2vw, 1rem)' }} />
                  <span className="truncate" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)', color: '#ffffff' }}>{msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="rounded-2xl glass-panel-sm overflow-hidden flex flex-col" style={{ background: 'rgba(26, 26, 26, 0.7)', padding: 'clamp(0.75rem, 1.5vw, 1.25rem)' }}>
            <div className="flex items-center gap-2 mb-auto">
              <Icon src="/icons/popular-releases-icon.svg" className="opacity-100" style={{ width: 'clamp(0.75rem, 1.2vw, 1rem)', height: 'clamp(0.75rem, 1.2vw, 1rem)' }} />
              <span className="font-medium" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.875rem)', color: '#ffffff' }}>Recent Projects</span>
            </div>
            <div className="flex gap-4 mt-auto">
              {[
                { title: 'Untitled 1', icon: '/icons/file-icon-1.svg' },
                { title: 'Untitled 2', icon: '/icons/file-icon-2.svg' },
                { title: 'Untitled 3', icon: '/icons/file-icon-1.svg' },
              ].map((release) => (
                <div key={release.title} className="flex items-center gap-2.5">
                  <div className="rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(30, 30, 30, 0.6)', width: 'clamp(2.5rem, 4vw, 5rem)', height: 'clamp(2.5rem, 4vw, 5rem)' }}>
                    <Icon src={release.icon} className="opacity-100" style={{ width: 'clamp(1.75rem, 3vw, 3.5rem)', height: 'clamp(1.75rem, 3vw, 3.5rem)' }} />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)', color: '#ffffff' }}>{release.title}</span>
                    <span className="block" style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.625rem)', color: '#ffffff' }}>Artist Name</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Now Playing Footer — interactive 3-column layout ─────── */}
      <footer className="flex-shrink-0 glass-panel px-4 sm:px-6 lg:px-8" style={{ background: 'rgba(26, 26, 26, 0.85)', height: 'clamp(4.5rem, 6vw, 5.5rem)' }}>
        <div className="h-full grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_2fr_1fr] items-center gap-3 lg:gap-4">

          {/* ── Left: Track info ── */}
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <div className="rounded-lg flex-shrink-0 overflow-hidden" style={{ background: 'rgba(30, 30, 30, 0.6)', width: 'clamp(2.5rem, 3.5vw, 3.5rem)', height: 'clamp(2.5rem, 3.5vw, 3.5rem)' }}>
              <HexAvatarSVG config={defaultAvatarConfig('now-playing')} circular={false} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-white truncate" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>Untitled 1</p>
              <p className="text-white/50 truncate" style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.75rem)' }}>Artist Name</p>
            </div>
            <button
              onClick={() => { play(isLiked ? 'item-locked' : 'select'); setIsLiked(!isLiked); }}
              className={`flex-shrink-0 transition-colors ${isLiked ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* ── Center: Controls + seek bar ── */}
          <div className="flex flex-col items-center justify-center gap-0.5">
            {/* Controls */}
            <div className="flex items-center" style={{ gap: 'clamp(0.5rem, 1.2vw, 1rem)' }}>
              <button
                onClick={() => { play(isShuffle ? 'alt-click' : 'click'); setIsShuffle(!isShuffle); }}
                className={`transition-colors ${isShuffle ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
                aria-label="Shuffle"
              >
                <Shuffle style={{ width: 'clamp(0.7rem, 1vw, 0.875rem)', height: 'clamp(0.7rem, 1vw, 0.875rem)' }} />
              </button>
              <button className="text-white/70 hover:text-white transition-colors" aria-label="Previous">
                <SkipBack style={{ width: 'clamp(0.8rem, 1.1vw, 1rem)', height: 'clamp(0.8rem, 1.1vw, 1rem)' }} />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                style={{ width: 'clamp(1.75rem, 2.5vw, 2.25rem)', height: 'clamp(1.75rem, 2.5vw, 2.25rem)' }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying
                  ? <Pause fill="currentColor" style={{ width: 'clamp(0.7rem, 1vw, 0.875rem)', height: 'clamp(0.7rem, 1vw, 0.875rem)' }} />
                  : <Play className="ml-0.5" fill="currentColor" style={{ width: 'clamp(0.7rem, 1vw, 0.875rem)', height: 'clamp(0.7rem, 1vw, 0.875rem)' }} />
                }
              </button>
              <button className="text-white/70 hover:text-white transition-colors" aria-label="Next">
                <SkipForward style={{ width: 'clamp(0.8rem, 1.1vw, 1rem)', height: 'clamp(0.8rem, 1.1vw, 1rem)' }} />
              </button>
              <button
                onClick={() => { play(isRepeat ? 'alt-click' : 'click'); setIsRepeat(!isRepeat); }}
                className={`transition-colors ${isRepeat ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
                aria-label="Repeat"
              >
                <Repeat style={{ width: 'clamp(0.7rem, 1vw, 0.875rem)', height: 'clamp(0.7rem, 1vw, 0.875rem)' }} />
              </button>
            </div>
            {/* Seek bar */}
            <div className="w-full flex items-center" style={{ gap: 'clamp(0.25rem, 0.5vw, 0.375rem)', maxWidth: 'min(100%, 40rem)' }}>
              <span className="text-white/40 tabular-nums flex-shrink-0" style={{ fontSize: 'clamp(0.5rem, 0.65vw, 0.625rem)' }}>{formatTime(currentSeconds)}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={seekPosition}
                onChange={(e) => setSeekPosition(Number(e.target.value))}
                className="player-range flex-1"
                style={{ background: `linear-gradient(to right, rgba(255,255,255,0.7) ${seekPosition}%, rgba(255,255,255,0.1) ${seekPosition}%)` }}
                aria-label="Seek"
              />
              <span className="text-white/40 tabular-nums flex-shrink-0" style={{ fontSize: 'clamp(0.5rem, 0.65vw, 0.625rem)' }}>{formatTime(totalSeconds)}</span>
            </div>
          </div>

          {/* ── Right: Volume ── */}
          <div className="flex items-center justify-end" style={{ gap: 'clamp(0.25rem, 0.5vw, 0.375rem)' }}>
            <button
              onClick={() => { play('click'); setVolume(volume > 0 ? 0 : 66); }}
              className="text-white/50 hover:text-white transition-colors flex-shrink-0"
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0
                ? <VolumeX style={{ width: 'clamp(0.75rem, 1vw, 0.875rem)', height: 'clamp(0.75rem, 1vw, 0.875rem)' }} />
                : <Volume2 style={{ width: 'clamp(0.75rem, 1vw, 0.875rem)', height: 'clamp(0.75rem, 1vw, 0.875rem)' }} />
              }
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="player-range"
              style={{ width: 'clamp(3rem, 5vw, 5rem)', background: `linear-gradient(to right, rgba(255,255,255,0.5) ${volume}%, rgba(255,255,255,0.1) ${volume}%)` }}
              aria-label="Volume"
            />
          </div>

        </div>
      </footer>
    </div>
  );
};
