/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import { useMemo, useState, type FC } from 'react';
import { Search } from 'lucide-react';
import type { NavigateFunction } from 'react-router';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { useProgressSummary } from '@/hooks/data';
import { useUISound } from '@/hooks/useUISound';
import { getAllSongs } from '@/curriculum/data/songs';

const Ico: FC<{ src: string; className?: string; style?: React.CSSProperties }> = ({ src, className = '', style }) => (
  <img src={src} alt="" className={className} style={style} draggable={false} />
);

/* ── Progress Card ──────────────────────────────────────────────────── */
interface ProgressCardProps {
  title: string;
  artSeed: string;
  label: string;
  completion: number;
  accuracy: number;
  xp: number;
  maxXp: number;
  onClick: () => void;
}

const ProgressCard: FC<ProgressCardProps> = ({ title, artSeed, label, completion, accuracy, xp, maxXp, onClick }) => {
  const { play } = useUISound();
  return (
    <div
      className="rounded-2xl glass-panel-sm overflow-hidden flex flex-col cursor-pointer hover:brightness-110 transition-all"
      style={{ background: 'rgba(26, 26, 26, 0.75)', padding: 'clamp(0.5rem, 1vw, 0.875rem)' }}
      onClick={() => { play('select'); onClick(); }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 'clamp(0.2rem, 0.4vw, 0.4rem)' }}>
        <span className="font-semibold text-white" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}>{title}</span>
        <div className="rounded-full flex items-center justify-center" style={{ width: 'clamp(1rem, 1.5vw, 1.5rem)', height: 'clamp(1rem, 1.5vw, 1.5rem)', background: 'rgba(255,255,255,0.08)' }}>
          <svg viewBox="0 0 10 10" fill="none" style={{ width: '0.5rem', height: '0.5rem' }}><path d="M3.5 2L6.5 5L3.5 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <div className="flex flex-1 min-h-0" style={{ gap: 'clamp(0.3rem, 0.6vw, 0.5rem)' }}>
        <div className="rounded-lg overflow-hidden flex-shrink-0 self-stretch" style={{ aspectRatio: '1', width: 'auto' }}>
          <HexAvatarSVG config={defaultAvatarConfig(artSeed)} circular={false} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          <span className="text-white font-semibold truncate" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}>{label}</span>
          <div className="flex flex-col justify-evenly flex-1 mt-1">
            {[
              { name: 'Completion', value: completion, color: '#9ca3af' },
              { name: 'Accuracy', value: accuracy, color: '#34d399' },
              { name: 'XP', value: Math.min(100, (xp / maxXp) * 100), color: '#FFCC33', suffix: `${xp} XP` },
            ].map((bar) => (
              <div key={bar.name} className="flex items-center" style={{ gap: 'clamp(0.15rem, 0.3vw, 0.25rem)' }}>
                <span className="flex-shrink-0" style={{ fontSize: 'clamp(0.4rem, 0.65vw, 0.55rem)', color: bar.color, minWidth: 'clamp(2.8rem, 4.5vw, 4rem)' }}>{bar.name}</span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 'clamp(3px, 0.4vw, 5px)', background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${bar.value}%`, background: bar.color }} />
                </div>
                <span className="flex-shrink-0 tabular-nums text-white/60" style={{ fontSize: 'clamp(0.4rem, 0.6vw, 0.5rem)', minWidth: 'clamp(1.5rem, 2.5vw, 2.5rem)', textAlign: 'right' }}>
                  {bar.suffix ?? `${Math.round(bar.value)}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Data ────────────────────────────────────────────────────────────── */
const TABS = ['Keyboard', 'Style', 'Theory', 'Technique', 'Songs'] as const;

const TAB_ROUTES: Partial<Record<typeof TABS[number], string>> = {
  Style: '/learn?tab=Courses',
  Theory: '/learn?tab=Theory',
  Technique: '/learn?tab=Technique',
  Songs: '/songs',
};

const DIFFICULTY_LABEL: Record<number, string> = { 1: 'L1', 2: 'L2', 3: 'L3' };

const CHALLENGES = [
  { name: 'Challenge 1', time: '16 hrs', xp: 100 },
  { name: 'Challenge 2', time: '1 week', xp: 500 },
  { name: 'Challenge 3', time: '1 day', xp: 50 },
  { name: 'Challenge 4', time: '3 days', xp: 200 },
  { name: 'Challenge 5', time: '4 hrs', xp: 250 },
  { name: 'Challenge 6', time: '5 days', xp: 100 },
];

/* ── Main Component ─────────────────────────────────────────────────── */
export interface LearnDashboardProps {
  navigate: NavigateFunction;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const LearnDashboard: FC<LearnDashboardProps> = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Keyboard');
  const [songSearch, setSongSearch] = useState('');
  const { play } = useUISound();
  const { data: progressSummary } = useProgressSummary(true);

  /* ── Compute Style (genre/course) card data ── */
  const styleData = useMemo(() => {
    const lessons = progressSummary?.lessons?.filter(
      (l) => l.lessonId.startsWith('curriculum:') && !l.lessonId.includes('piano-fundamentals'),
    ) ?? [];
    if (lessons.length === 0) return { label: 'No courses started', artSeed: 'rock', completion: 0, xp: 0 };

    // Find most recently updated genre
    const latest = [...lessons].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0];
    // Extract genre from lessonId: 'curriculum:JAZZ:L1' → 'JAZZ'
    const parts = latest.lessonId.split(':');
    const genreId = parts[1] ?? 'ROCK';
    const genreName = capitalize(genreId.toLowerCase().replace(/_/g, ' '));

    // Aggregate all levels of this genre
    const genreLessons = lessons.filter((l) => l.lessonId.startsWith(`curriculum:${genreId}:`));
    const completed = genreLessons.reduce((s, l) => s + l.completedCount, 0);
    const total = genreLessons.reduce((s, l) => s + (l.totalCount ?? 0), 0);
    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { label: genreName, artSeed: genreName.toLowerCase(), completion, xp: completed * 5 };
  }, [progressSummary]);

  /* ── Compute Theory (mode) card data ── */
  const theoryData = useMemo(() => {
    const lessons = progressSummary?.lessons?.filter(
      (l) => l.lessonId.startsWith('mode-lesson-flow') && !!l.mode,
    ) ?? [];
    if (lessons.length === 0) return { label: 'No modes explored', artSeed: 'ionian', completion: 0, xp: 0 };

    const latest = [...lessons].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0];
    const modeName = capitalize(latest.mode ?? 'ionian');
    const completion = latest.totalCount && latest.totalCount > 0
      ? Math.round((latest.completedCount / latest.totalCount) * 100)
      : 0;

    return { label: modeName, artSeed: (latest.mode ?? 'ionian').toLowerCase(), completion, xp: latest.completedCount * 5 };
  }, [progressSummary]);

  /* ── Compute Technique card data ── */
  const techniqueData = useMemo(() => {
    const lesson = progressSummary?.lessons?.find((l) => l.lessonId.includes('piano-fundamentals'));
    if (!lesson) return { completion: 0, xp: 0 };
    const completion = lesson.totalCount && lesson.totalCount > 0
      ? Math.round((lesson.completedCount / lesson.totalCount) * 100)
      : 0;
    return { completion, xp: lesson.completedCount * 5 };
  }, [progressSummary]);


  /* ── Top songs for dashboard display ── */
  const allSongs = useMemo(() =>
    getAllSongs().sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)),
  []);

  const filteredSongs = useMemo(() => {
    if (!songSearch) return allSongs.slice(0, 6);
    const query = songSearch.toLowerCase();
    return allSongs
      .filter((s) => `${s.artist} ${s.title}`.toLowerCase().includes(query))
      .slice(0, 6);
  }, [allSongs, songSearch]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundImage: 'url(/backgrounds/dashboard-bg.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

      {/* ── Banner ── */}
      <div className="flex-shrink-0 overflow-hidden" style={{ height: 'clamp(2.5rem, 5vh, 4rem)' }}>
        <img src="/backgrounds/learn-banner.svg" alt="" className="w-full h-full object-cover" draggable={false} />
      </div>

      {/* ── Pill Tabs ── */}
      <div className="flex-shrink-0 flex justify-start px-4 sm:px-6 lg:px-8" style={{ paddingTop: 'clamp(0.4rem, 0.8vw, 0.75rem)', paddingBottom: 'clamp(0.3rem, 0.6vw, 0.5rem)' }}>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                play('click');
                const route = TAB_ROUTES[tab];
                if (route) { navigate(route); } else { setActiveTab(tab); }
              }}
              className="rounded-full font-medium transition-all"
              style={{
                padding: 'clamp(0.25rem, 0.4vw, 0.375rem) clamp(0.6rem, 1.2vw, 1rem)',
                fontSize: 'clamp(0.55rem, 0.85vw, 0.7rem)',
                background: activeTab === tab ? '#ffffff' : 'rgba(255,255,255,0.06)',
                color: activeTab === tab ? '#000000' : 'rgba(255,255,255,0.5)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 min-h-0 lg:overflow-hidden overflow-y-auto custom-scrollbar flex flex-col" style={{ padding: '0 clamp(0.5rem, 1.2vw, 1rem) clamp(0.5rem, 1vw, 0.75rem)' }}>

        {/* ── Top Row: 3 Progress Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 flex-shrink-0" style={{ gap: 'clamp(0.4rem, 0.7vw, 0.6rem)', marginBottom: 'clamp(0.4rem, 0.7vw, 0.6rem)' }}>
          <ProgressCard title="Style" artSeed={styleData.artSeed} label={styleData.label} completion={styleData.completion} accuracy={90} xp={styleData.xp} maxXp={Math.max(styleData.xp, 500)} onClick={() => navigate('/learn?tab=Courses')} />
          <ProgressCard title="Theory" artSeed={theoryData.artSeed} label={theoryData.label} completion={theoryData.completion} accuracy={90} xp={theoryData.xp} maxXp={Math.max(theoryData.xp, 500)} onClick={() => navigate('/learn?tab=Theory')} />
          <ProgressCard title="Technique" artSeed="technique" label="Fundamentals" completion={techniqueData.completion} accuracy={90} xp={techniqueData.xp} maxXp={Math.max(techniqueData.xp, 300)} onClick={() => navigate('/learn?tab=Technique')} />
        </div>

        {/* ── Bottom Row: Songs + Challenges ── */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] flex-1 min-h-0" style={{ gap: 'clamp(0.4rem, 0.7vw, 0.6rem)' }}>

          {/* Songs Table */}
          <div className="rounded-2xl glass-panel-sm overflow-hidden flex flex-col" style={{ background: 'rgba(26, 26, 26, 0.75)', padding: 'clamp(0.5rem, 1vw, 0.875rem)' }}>
            {/* Header + search */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'clamp(0.3rem, 0.6vw, 0.5rem)' }}>
              <div className="flex items-center" style={{ gap: 'clamp(0.3rem, 0.6vw, 0.5rem)' }}>
                <span className="text-white font-semibold" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}>Songs</span>
                <span
                  className="text-white/40 hover:text-white/70 cursor-pointer transition-colors"
                  style={{ fontSize: 'clamp(0.4rem, 0.65vw, 0.55rem)' }}
                  onClick={() => { play('click'); navigate('/songs'); }}
                >
                  See All →
                </span>
              </div>
              <div className="flex items-center rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', padding: 'clamp(0.2rem, 0.35vw, 0.3rem) clamp(0.3rem, 0.6vw, 0.5rem)' }}>
                <Search className="text-white/30 flex-shrink-0" style={{ width: 'clamp(0.6rem, 0.9vw, 0.75rem)', height: 'clamp(0.6rem, 0.9vw, 0.75rem)' }} />
                <input
                  type="text"
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  placeholder="Search artist or song title"
                  className="bg-transparent outline-none text-white placeholder:text-white/30 ml-1.5"
                  style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.6rem)', width: 'clamp(6rem, 12vw, 14rem)' }}
                />
              </div>
            </div>
            {/* Table header */}
            <div className="flex items-center text-white/30" style={{ fontSize: 'clamp(0.4rem, 0.6vw, 0.5rem)', marginBottom: 'clamp(0.2rem, 0.3vw, 0.25rem)', gap: 'clamp(0.3rem, 0.5vw, 0.4rem)' }}>
              <span style={{ flex: '1.2' }}>Artist</span>
              <span style={{ flex: '1.5' }}>Title</span>
              <span style={{ flex: '0.8', textAlign: 'right' }}>Difficulty</span>
            </div>
            {/* Rows */}
            <div className="flex flex-col flex-1 justify-evenly overflow-hidden">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                  style={{ padding: 'clamp(0.2rem, 0.4vw, 0.35rem) clamp(0.2rem, 0.3vw, 0.25rem)', gap: 'clamp(0.3rem, 0.5vw, 0.4rem)' }}
                  onClick={() => { play('click'); navigate(`/songs/${song.id}`); }}
                >
                  <span className="text-white truncate" style={{ flex: '1.2', fontSize: 'clamp(0.5rem, 0.75vw, 0.65rem)' }}>{song.artist}</span>
                  <span className="text-white/60 truncate" style={{ flex: '1.5', fontSize: 'clamp(0.5rem, 0.75vw, 0.65rem)' }}>"{song.title}"</span>
                  <span className="text-white/40 text-right" style={{ flex: '0.8', fontSize: 'clamp(0.45rem, 0.7vw, 0.6rem)' }}>{DIFFICULTY_LABEL[song.difficulty] ?? `L${song.difficulty}`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Challenges */}
          <div className="rounded-2xl glass-panel-sm overflow-hidden flex flex-col" style={{ background: 'rgba(26, 26, 26, 0.75)', padding: 'clamp(0.5rem, 1vw, 0.875rem)' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 'clamp(0.3rem, 0.6vw, 0.5rem)' }}>
              <Ico src="/icons/challenges-icon.svg" style={{ width: 'clamp(0.6rem, 0.85vw, 0.75rem)', height: 'clamp(0.6rem, 0.85vw, 0.75rem)' }} />
              <span className="text-white font-semibold" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}>Challenges</span>
            </div>
            <div className="flex flex-col flex-1 justify-evenly">
              {CHALLENGES.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center" style={{ gap: 'clamp(0.25rem, 0.4vw, 0.35rem)' }}>
                    <div className="rounded-full border flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.2)', width: 'clamp(0.6rem, 0.85vw, 0.75rem)', height: 'clamp(0.6rem, 0.85vw, 0.75rem)' }} />
                    <span className="text-white" style={{ fontSize: 'clamp(0.5rem, 0.75vw, 0.65rem)' }}>{c.name}</span>
                  </div>
                  <div className="flex items-center" style={{ gap: 'clamp(0.5rem, 1vw, 1rem)' }}>
                    <span className="text-white/40 tabular-nums" style={{ fontSize: 'clamp(0.45rem, 0.65vw, 0.55rem)' }}>{c.time}</span>
                    <span className="text-white tabular-nums font-medium" style={{ fontSize: 'clamp(0.45rem, 0.65vw, 0.55rem)' }}>{c.xp} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
