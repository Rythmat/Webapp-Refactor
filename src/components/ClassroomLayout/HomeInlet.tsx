/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order, tailwindcss/enforces-shorthand, tailwindcss/no-custom-classname, tailwindcss/migration-from-tailwind-2 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type FC,
} from 'react';
import {
  Activity,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Hexagon,
  Mic2,
  MoreVertical,
  Music,
  Play,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { type PrismModeSlug } from '@/hooks/data/prism';
import { formatActivityTitle } from '@/lib/activityTitle';
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
import { LockedFeatureOverlay } from '../ui/LockedFeatureOverlay';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { useIsPremium } from '@/hooks/useIsPremium';
import { HeaderBar } from './HeaderBar';
import { useStore } from '@/daw/store';
import {
  getFirstChords,
  getOptions,
  graphToken,
  generateChord,
  normalizeSequence,
  unstepChord,
  degreeMidi,
  getModeOffset,
  getChordColor,
  noteNameInKey,
  type RGB,
  type SuggestionChord,
} from '@prism/engine';
import { parsePrompt } from '@/lib/promptParser';
import { GenrePicker, STUDIO_GENRES } from './GenrePicker';
import { KeyPicker, keyLabel, type KeySelection } from './KeyPicker';
import { TempoPicker } from './TempoPicker';

interface TagProps {
  label: string;
  icon?: ElementType;
  active?: boolean;
  onClick?: () => void;
}

const Tag: FC<TagProps> = ({ label, icon: Icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${active ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'}`}
  >
    {Icon && <Icon size={10} />}
    {label}
  </button>
);

interface ProjectCardProps {
  title: string;
  genre: string;
  author: string;
  active?: boolean;
}

const ProjectCard: FC<ProjectCardProps> = ({
  title,
  genre,
  author,
  active,
}) => (
  <div
    className={`group relative p-4 rounded-2xl border transition-all duration-300 ${active ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 hover:bg-white/5'}`}
  >
    <div className="flex justify-between items-start mb-2">
      <div>
        <h3 className="text-lg font-serif text-gray-100 mb-1">{title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Activity size={12} />
          <span>{genre}</span>
        </div>
      </div>
      <Bookmark
        size={18}
        className="text-gray-500 hover:text-white cursor-pointer"
      />
    </div>
    <div className="flex justify-between items-end mt-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold">
          {author[0]}
        </div>
        <span className="text-xs text-gray-400">{author}</span>
      </div>
      <Heart
        size={16}
        className="text-gray-500 hover:text-white cursor-pointer transition-colors"
      />
    </div>
  </div>
);

const bannerSlides = [
  {
    title: 'Study',
    route: LearnRoutes.root.definition,
  },
  {
    title: 'Create',
    route: StudioRoutes.root.definition,
  },
  {
    title: 'Play',
    route: GameRoutes.root.definition,
  },
  {
    title: 'Explore',
    route: AtlasRoutes.root.definition,
  },
];

export const HomeInlet = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState<ProjectCardProps[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<KeySelection | null>(null);
  const [selectedBpm, setSelectedBpm] = useState<number | null>(null);
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [showKeyPicker, setShowKeyPicker] = useState(false);
  const [showTempoPicker, setShowTempoPicker] = useState(false);
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();
  const { data: progressSummary } = useProgressSummary(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setProjects([]);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 5000);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    resetTimer();
  };
  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length,
    );
    resetTimer();
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  // Inline genre tags shown directly (first 5 of STUDIO_GENRES)
  const INLINE_GENRES = STUDIO_GENRES.slice(0, 5);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // If nothing is specified, randomize everything
      const hasInput =
        prompt.trim() || selectedGenre || selectedKey || selectedBpm;
      const randGenre = hasInput
        ? selectedGenre
        : STUDIO_GENRES[Math.floor(Math.random() * STUDIO_GENRES.length)];
      const randKey = hasInput
        ? selectedKey
        : {
            root: Math.floor(Math.random() * 12),
            mode: Math.random() < 0.5 ? 'ionian' : 'aeolian',
          };

      const parsed = parsePrompt(prompt, randGenre, randKey, selectedBpm);
      const store = useStore.getState();

      // Configure Prism
      store.clearSequence();
      store.setRootNote(parsed.rootNote);
      store.setMode(parsed.mode);
      store.selectGenre(parsed.genre);
      store.setBpm(parsed.bpm);

      // Random graph walk — picks randomly at every step for maximum variety
      const numChords = 4;
      const degrees: string[] = [];
      const firstChords = getFirstChords();
      const start = firstChords[Math.floor(Math.random() * firstChords.length)];
      degrees.push(start);
      let history = [start];

      for (let i = 1; i < numChords; i++) {
        const token = graphToken(history);
        let options = getOptions(2, token);
        if (options.length === 0) {
          for (let len = history.length - 1; len > 0; len--) {
            options = getOptions(2, graphToken(history.slice(-len)));
            if (options.length > 0) break;
          }
        }
        if (options.length === 0) options = firstChords;
        degrees.push(options[Math.floor(Math.random() * options.length)]);
        history = [...history, degrees[degrees.length - 1]];
        if (history.length > 3) history = history.slice(-3);
      }

      // Convert degree names to SuggestionChord[] for loadProgression
      // Apply modal shift: degree names are Ionian-relative, so shift root
      // back to the parent Ionian root (matches degreeNameToChord in prismSlice)
      const rootMidi = parsed.rootNote + 48;
      const parentRoot = rootMidi - getModeOffset(parsed.mode);
      const midiArrays = degrees.map((d) => {
        const quality = unstepChord(d);
        const midi = degreeMidi(parentRoot, d);
        return generateChord(midi, quality);
      });
      const normalized = normalizeSequence(midiArrays);

      const chords: SuggestionChord[] = degrees.map((degree, j) => {
        const quality = unstepChord(degree);
        const midi = degreeMidi(parentRoot, degree);
        const pc = ((midi % 12) + 12) % 12;
        const noteLetter = noteNameInKey(pc, rootMidi % 12);
        return {
          degree,
          quality,
          noteName: `${noteLetter} ${quality}`,
          midi: normalized[j],
          color: getChordColor(degree, rootMidi, parsed.mode) as RGB,
        };
      });

      if (chords.length > 0) {
        store.loadProgression(chords);
        await store.generateOrchestration();
        store.analyzeSession();
      }

      navigate(StudioRoutes.root.definition);
    } finally {
      setIsGenerating(false);
    }
  };
  const visibleProjects = projects.slice(0, 2);

  const latestContinue = (() => {
    const latest = progressSummary?.lessons?.find(
      (lesson) =>
        lesson.lessonId.startsWith('mode-lesson-flow') &&
        !!lesson.mode &&
        !!lesson.root &&
        (lesson.completedCount ?? 0) > 0,
    );
    if (!latest?.mode || !latest.root) return null;
    const parts = latest.currentActivityInstanceId?.split('::') ?? [];
    const activityDefId = parts.length >= 5 ? parts[2] : null;
    const mode = latest.mode;
    const root = latest.root;
    const modeTitle = getChordScales(mode as PrismModeSlug)?.modeName ?? mode;
    const rootTitle = urlParamToKeyLabel(root);
    const progressPct =
      latest.totalCount && latest.totalCount > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round((latest.completedCount / latest.totalCount) * 100),
            ),
          )
        : null;

    return {
      lessonId: latest.lessonId,
      mode,
      root,
      rootTitle,
      modeTitle,
      activityDefId,
      progressPct,
      completedCount: latest.completedCount,
      totalCount: latest.totalCount,
      route: LearnRoutes.lesson({
        mode: mode as PrismModeSlug,
        key: keyLabelToUrlParam(root),
      }),
    };
  })();

  return (
    <div className="flex flex-col h-full">
      <HeaderBar title="Welcome" />
      <div className="flex-1 overflow-hidden flex flex-col space-y-8">
        <div className="h-full overflow-y-auto custom-scrollbar pb-12 px-8 space-y-12">
          <section className="relative w-full h-80 rounded-[2rem] overflow-hidden mb-12 group">
            <div className="absolute inset-0 bg-[#2A3036]">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2A3036] via-transparent to-[#E3D5CA] opacity-20" />
              {bannerSlides.map((slide, idx) => (
                <div
                  key={slide.title}
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{ opacity: currentSlide === idx ? 1 : 0 }}
                >
                  {slide.title === 'Study' ? (
                    <img
                      src="/login-bg.svg"
                      alt=""
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <HexAvatarSVG
                      config={defaultAvatarConfig(slide.title)}
                      circular={false}
                      className="w-full h-full object-cover opacity-80"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="absolute inset-0 p-8 flex flex-col justify-between">
              <div className="flex justify-between items-center w-full z-10">
                <button
                  onClick={prevSlide}
                  className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors text-white border border-white/10"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors text-white border border-white/10"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex items-end justify-between z-10">
                <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-full p-1.5 pr-2 flex items-center gap-4 pl-6 group/start cursor-pointer transition-all hover:bg-black/40">
                  <span className="font-serif text-2xl italic pr-4">
                    {bannerSlides[currentSlide].title}
                  </span>
                  <div className="h-10 w-24 bg-white/10 rounded-full flex items-center justify-end px-1 group-hover/start:bg-white/20 transition-colors">
                    <div
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover/start:scale-105 transition-transform"
                      onClick={() => {
                        navigate(bannerSlides[currentSlide].route);
                      }}
                    >
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {bannerSlides.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-3 h-3 rounded-full cursor-pointer transition-all ${currentSlide === idx ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] scale-110' : 'bg-white/20 hover:bg-white/40'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xl font-serif text-gray-200">
                <h2>{latestContinue ? 'Continue' : 'Start'}</h2>
                <ChevronRight size={18} className="text-gray-600" />
              </div>
              <div
                className="flex-1 bg-gradient-to-br from-teal-800/20 to-emerald-900/20 border border-white/5 rounded-3xl p-6 relative overflow-hidden group cursor-pointer hover:border-emerald-500/30 transition-all"
                onClick={() =>
                  navigate(latestContinue?.route ?? LearnRoutes.root.definition)
                }
              >
                <div className="absolute inset-0 opacity-30">
                  <HexAvatarSVG
                    config={defaultAvatarConfig('study')}
                    circular={false}
                    className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4"
                  />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-end">
                  <div className="mb-4">
                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1 block">
                      {latestContinue ? 'Resume lesson' : 'Start Learning'}
                    </span>
                    <h3 className="text-2xl font-serif leading-tight mb-2">
                      {latestContinue
                        ? `${latestContinue.rootTitle} ${latestContinue.modeTitle}`
                        : ''}
                      <br />
                      {latestContinue
                        ? formatActivityTitle(latestContinue.activityDefId)
                        : 'Start a music lesson'}
                    </h3>
                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${latestContinue?.progressPct ?? 0}%`,
                        }}
                      />
                    </div>
                    {latestContinue &&
                      latestContinue.totalCount != null &&
                      latestContinue.completedCount > 0 && (
                        <div className="mt-2 text-xs text-emerald-200/80">
                          {latestContinue.completedCount} /{' '}
                          {latestContinue.totalCount} completed
                        </div>
                      )}
                  </div>
                  <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Play size={18} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>
            <LockedFeatureOverlay locked={!isPremium} className="lg:col-span-4 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xl font-serif text-gray-200">
                <h2>Projects</h2>
                <ChevronRight size={18} className="text-gray-600" />
              </div>
              <div className="flex flex-col gap-3">
                {visibleProjects.map((project) => (
                  <ProjectCard
                    key={`${project.title}-${project.author}`}
                    title={project.title}
                    genre={project.genre}
                    author={project.author}
                    active={project.active}
                  />
                ))}
                <div
                  className="p-4 rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30 cursor-pointer transition-all h-20"
                  onClick={() => navigate(StudioRoutes.root.definition)}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <PlusCircle size={16} /> Create New Project
                  </div>
                </div>
              </div>
            </LockedFeatureOverlay>
            <LockedFeatureOverlay locked={!isPremium} className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xl font-serif text-gray-200">
                <h2>Generate</h2>
                <ChevronRight size={18} className="text-gray-600" />
              </div>
              <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 h-full flex flex-col relative">
                <div className="flex-1 min-h-[160px]">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the song you want to create... (e.g., 'An upbeat lo-fi track with jazzy piano chords and a relaxed drum beat')"
                    className="w-full h-full bg-transparent border-none resize-none text-gray-300 placeholder:text-gray-600 focus:outline-none text-lg leading-relaxed custom-scrollbar"
                  />
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex flex-wrap gap-2 relative">
                    <div className="relative">
                      <Tag
                        label={selectedKey ? keyLabel(selectedKey) : 'Key'}
                        icon={Music}
                        active={!!selectedKey}
                        onClick={() => setShowKeyPicker((v) => !v)}
                      />
                      {showKeyPicker && (
                        <KeyPicker
                          selected={selectedKey}
                          onSelect={setSelectedKey}
                          onClose={() => setShowKeyPicker(false)}
                        />
                      )}
                    </div>
                    <div className="relative">
                      <Tag
                        label={selectedBpm ? `${selectedBpm} BPM` : 'Tempo'}
                        icon={Activity}
                        active={!!selectedBpm}
                        onClick={() => setShowTempoPicker((v) => !v)}
                      />
                      {showTempoPicker && (
                        <TempoPicker
                          selected={selectedBpm}
                          onSelect={setSelectedBpm}
                          onClose={() => setShowTempoPicker(false)}
                        />
                      )}
                    </div>
                    <div className="w-px h-6 bg-white/10 mx-1" />
                    {INLINE_GENRES.map((g) => (
                      <Tag
                        key={g}
                        label={g}
                        active={selectedGenre === g}
                        onClick={() =>
                          setSelectedGenre((prev) => (prev === g ? null : g))
                        }
                      />
                    ))}
                    <div className="relative">
                      <button
                        onClick={() => setShowGenrePicker((v) => !v)}
                        className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {showGenrePicker && (
                        <GenrePicker
                          selected={selectedGenre}
                          onSelect={setSelectedGenre}
                          onClose={() => setShowGenrePicker(false)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mic2 size={12} />
                      <span>
                        Voice Mode:{' '}
                        <span className="text-gray-300">Instrumental</span>
                      </span>
                    </div>
                    <button
                      onClick={handleGenerate}
                      className="bg-white text-black px-6 py-2.5 rounded-full font-medium text-sm hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/5"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />{' '}
                          Generating...
                        </>
                      ) : (
                        <>
                          <Hexagon size={16} fill="black" /> Generate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </LockedFeatureOverlay>
          </div>
        </div>
      </div>
    </div>
  );
};
