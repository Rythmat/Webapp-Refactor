import {
  ChevronDown,
  ChevronRight,
  Heart,
  LayoutGrid,
  List as ListIcon,
  Play,
  Volume2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LearnRoutes } from '@/constants/routes';
import { MeshGradientBg } from '@/daw/components/MeshGradientBg';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { HexagonPattern, DEFAULT_THEMES as THEMES } from '../ui/HexagonPattern';
import './learn.css';

interface ContentItem {
  title: string;
  variant: 'diagonal' | 'cluster' | 'dense' | 'split' | 'default';
  colors: string[];
  mode?: string;
  route?: string;
}

const COURSES_DATA: ContentItem[] = [
  {
    title: 'Pop',
    variant: 'diagonal',
    colors: [THEMES.yellow, '#F4A261', THEMES.orange, '#A6A2C2', '#D3C2D6'],
  },
  {
    title: 'Folk',
    variant: 'cluster',
    colors: ['#A3B18A', '#588157', '#3A5A40', '#DAD7CD', '#E3D5CA'],
  },
  {
    title: 'Rock',
    variant: 'dense',
    colors: ['#E63946', '#1D3557', '#457B9D', '#A8DADC', '#2A3036'],
  },
  {
    title: 'R&B',
    variant: 'split',
    colors: [THEMES.teal, THEMES.indigo, THEMES.yellow, '#F4A261', '#9C27B0'],
  },
  {
    title: 'Jazz',
    variant: 'diagonal',
    colors: [
      THEMES.indigo,
      THEMES.teal,
      THEMES.yellow,
      '#F4A261',
      THEMES.orange,
    ],
  },
  {
    title: 'Classical',
    variant: 'cluster',
    colors: ['#6D597A', '#B56576', '#E5989B', '#FFB4A2', '#FFCDB2'],
  },
  {
    title: 'Electronic',
    variant: 'dense',
    colors: ['#7400B8', '#6930C3', '#5E60CE', '#5390D9', '#4EA8DE'],
  },
  {
    title: 'Hip Hop',
    variant: 'split',
    colors: ['#003049', '#D62828', '#F77F00', '#FCBF49', '#EAE2B7'],
  },
];

const THEORY_DATA: ContentItem[] = [
  {
    title: 'Ionian (Major)',
    variant: 'cluster',
    colors: [THEMES.red, '#9D5C63'],
    route: LearnRoutes.overview({ mode: 'ionian' }),
  },
  {
    title: 'Dorian',
    variant: 'split',
    colors: [THEMES.orange, THEMES.teal],
    route: LearnRoutes.overview({ mode: 'dorian' }),
  },
  {
    title: 'Phrygian',
    variant: 'split',
    colors: [THEMES.red, THEMES.yellow],
    route: LearnRoutes.overview({ mode: 'phrygian' }),
  },
  {
    title: 'Lydian',
    variant: 'diagonal',
    colors: [THEMES.yellow, '#F4A261'],
    route: LearnRoutes.overview({ mode: 'lydian' }),
  },
  {
    title: 'Mixolydian',
    variant: 'dense',
    colors: [THEMES.beige, THEMES.darkGrey],
    route: LearnRoutes.overview({ mode: 'mixolydian' }),
  },
  {
    title: 'Aeolian (Minor)',
    variant: 'diagonal',
    colors: [THEMES.blue, '#A8DADC'],
    route: LearnRoutes.overview({ mode: 'aeolian' }),
  },
  {
    title: 'Locrian',
    variant: 'cluster',
    colors: [THEMES.purple, '#E0AAFF'],
    route: LearnRoutes.overview({ mode: 'locrian' }),
  },
];

const EXPLORE_DATA: ContentItem[] = [
  {
    title: 'Ionian (Major)',
    variant: 'cluster',
    colors: [THEMES.red, '#9D5C63'],
    route: LearnRoutes.overview({ mode: 'ionian' }),
  },
  {
    title: 'Dorian',
    variant: 'split',
    colors: [THEMES.orange, THEMES.teal],
    route: LearnRoutes.overview({ mode: 'dorian' }),
  },
  {
    title: 'Phrygian',
    variant: 'split',
    colors: [THEMES.red, THEMES.yellow],
    route: LearnRoutes.overview({ mode: 'phrygian' }),
  },
  {
    title: 'Lydian',
    variant: 'diagonal',
    colors: [THEMES.yellow, '#F4A261'],
    route: LearnRoutes.overview({ mode: 'lydian' }),
  },
  {
    title: 'Mixolydian',
    variant: 'dense',
    colors: [THEMES.beige, THEMES.darkGrey],
    route: LearnRoutes.overview({ mode: 'mixolydian' }),
  },
  {
    title: 'Aeolian (Minor)',
    variant: 'diagonal',
    colors: [THEMES.blue, '#A8DADC'],
    route: LearnRoutes.overview({ mode: 'aeolian' }),
  },
  {
    title: 'Locrian',
    variant: 'cluster',
    colors: [THEMES.purple, '#E0AAFF'],
    route: LearnRoutes.overview({ mode: 'locrian' }),
  },
];

const RELATIVE_MODES_DATA: ContentItem[] = [
  {
    title: 'Red',
    variant: 'cluster',
    colors: ['#D2404A', '#9D5C63'],
    route: '/learn/relative/c',
  },
  {
    title: 'Vermillion',
    variant: 'split',
    colors: ['#FF7348', '#CC5C3A'],
    route: '/learn/relative/g',
  },
  {
    title: 'Orange',
    variant: 'diagonal',
    colors: ['#FEA93A', '#CC872E'],
    route: '/learn/relative/d',
  },
  {
    title: 'Amber',
    variant: 'dense',
    colors: ['#FFCB30', '#CCA226'],
    route: '/learn/relative/a',
  },
  {
    title: 'Green',
    variant: 'cluster',
    colors: ['#AED580', '#8BAA66'],
    route: '/learn/relative/e',
  },
  {
    title: 'Sage',
    variant: 'split',
    colors: ['#7FC783', '#669F69'],
    route: '/learn/relative/b',
  },
  {
    title: 'Teal',
    variant: 'diagonal',
    colors: ['#28A69A', '#20857B'],
    route: '/learn/relative/fsharp',
  },
  {
    title: 'Blue',
    variant: 'dense',
    colors: ['#62B4F7', '#4E90C6'],
    route: '/learn/relative/dflat',
  },
  {
    title: 'Indigo',
    variant: 'cluster',
    colors: ['#7885CB', '#606AA2'],
    route: '/learn/relative/aflat',
  },
  {
    title: 'Purple',
    variant: 'split',
    colors: ['#9D7FCE', '#7E66A5'],
    route: '/learn/relative/eflat',
  },
  {
    title: 'Magenta',
    variant: 'diagonal',
    colors: ['#C783D3', '#9F69A9'],
    route: '/learn/relative/bflat',
  },
  {
    title: 'Pink',
    variant: 'dense',
    colors: ['#F8C8C5', '#C6A09E'],
    route: '/learn/relative/f',
  },
];

const PARALLEL_MODES_DATA: ContentItem[] = [
  {
    title: 'C',
    variant: 'cluster',
    colors: ['#D2404A', '#9D5C63'],
    route: '/learn/parallel/c',
  },
  {
    title: 'G',
    variant: 'split',
    colors: ['#FF7348', '#CC5C3A'],
    route: '/learn/parallel/g',
  },
  {
    title: 'D',
    variant: 'diagonal',
    colors: ['#FEA93A', '#CC872E'],
    route: '/learn/parallel/d',
  },
  {
    title: 'A',
    variant: 'dense',
    colors: ['#FFCB30', '#CCA226'],
    route: '/learn/parallel/a',
  },
  {
    title: 'E',
    variant: 'cluster',
    colors: ['#AED580', '#8BAA66'],
    route: '/learn/parallel/e',
  },
  {
    title: 'B',
    variant: 'split',
    colors: ['#7FC783', '#669F69'],
    route: '/learn/parallel/b',
  },
  {
    title: 'F#',
    variant: 'diagonal',
    colors: ['#28A69A', '#20857B'],
    route: '/learn/parallel/fsharp',
  },
  {
    title: 'D♭',
    variant: 'dense',
    colors: ['#62B4F7', '#4E90C6'],
    route: '/learn/parallel/dflat',
  },
  {
    title: 'A♭',
    variant: 'cluster',
    colors: ['#7885CB', '#606AA2'],
    route: '/learn/parallel/aflat',
  },
  {
    title: 'E♭',
    variant: 'split',
    colors: ['#9D7FCE', '#7E66A5'],
    route: '/learn/parallel/eflat',
  },
  {
    title: 'B♭',
    variant: 'diagonal',
    colors: ['#C783D3', '#9F69A9'],
    route: '/learn/parallel/bflat',
  },
  {
    title: 'F',
    variant: 'dense',
    colors: ['#F8C8C5', '#C6A09E'],
    route: '/learn/parallel/f',
  },
];

const HARMONIC_MINOR_DATA: ContentItem[] = [
  {
    title: 'Harmonic Minor',
    variant: 'cluster',
    colors: [THEMES.blue, THEMES.indigo],
    route: LearnRoutes.overview({ mode: 'harmonicminor' }),
  },
  {
    title: 'Locrian ♮6',
    variant: 'split',
    colors: [THEMES.purple, THEMES.blue],
    route: LearnRoutes.overview({ mode: 'locriannat6' }),
  },
  {
    title: 'Ionian #5',
    variant: 'diagonal',
    colors: [THEMES.teal, THEMES.blue],
    route: LearnRoutes.overview({ mode: 'ionian#5' }),
  },
  {
    title: 'Dorian #4',
    variant: 'dense',
    colors: [THEMES.indigo, THEMES.teal],
    route: LearnRoutes.overview({ mode: 'dorian#4' }),
  },
  {
    title: 'Phrygian Dominant',
    variant: 'cluster',
    colors: [THEMES.red, THEMES.indigo],
    route: LearnRoutes.overview({ mode: 'phrygiandominant' }),
  },
  {
    title: 'Lydian #2',
    variant: 'split',
    colors: [THEMES.yellow, THEMES.indigo],
    route: LearnRoutes.overview({ mode: 'lydian#2' }),
  },
  {
    title: 'Altered Diminished',
    variant: 'diagonal',
    colors: [THEMES.purple, THEMES.darkGrey],
    route: LearnRoutes.overview({ mode: 'altereddiminished' }),
  },
];

const MELODIC_MINOR_DATA: ContentItem[] = [
  {
    title: 'Melodic Minor',
    variant: 'cluster',
    colors: [THEMES.orange, THEMES.yellow],
    route: LearnRoutes.overview({ mode: 'melodicminor' }),
  },
  {
    title: 'Dorian ♭2',
    variant: 'split',
    colors: [THEMES.orange, THEMES.darkGrey],
    route: LearnRoutes.overview({ mode: 'dorian♭2' }),
  },
  {
    title: 'Lydian Augmented',
    variant: 'diagonal',
    colors: [THEMES.yellow, THEMES.teal],
    route: LearnRoutes.overview({ mode: 'lydianaugmented' }),
  },
  {
    title: 'Lydian Dominant',
    variant: 'dense',
    colors: [THEMES.yellow, THEMES.orange],
    route: LearnRoutes.overview({ mode: 'lydiandominant' }),
  },
  {
    title: 'Mixolydian ♭6',
    variant: 'cluster',
    colors: [THEMES.beige, THEMES.orange],
    route: LearnRoutes.overview({ mode: 'mixolydiannat6' }),
  },
  {
    title: 'Locrian ♮2',
    variant: 'split',
    colors: [THEMES.darkGrey, THEMES.orange],
    route: LearnRoutes.overview({ mode: 'locriannat2' }),
  },
  {
    title: 'Altered Dominant',
    variant: 'diagonal',
    colors: [THEMES.red, THEMES.orange],
    route: LearnRoutes.overview({ mode: 'altereddominant' }),
  },
];

const HARMONIC_MAJOR_DATA: ContentItem[] = [
  {
    title: 'Harmonic Major',
    variant: 'cluster',
    colors: [THEMES.teal, '#4ECDC4'],
    route: LearnRoutes.overview({ mode: 'harmonicmajor' }),
  },
  {
    title: 'Dorian ♭5',
    variant: 'split',
    colors: [THEMES.teal, THEMES.darkGrey],
    route: LearnRoutes.overview({ mode: 'dorian♭5' }),
  },
  {
    title: 'Altered Dominant ♮5',
    variant: 'diagonal',
    colors: [THEMES.blue, THEMES.teal],
    route: LearnRoutes.overview({ mode: 'altereddominantnat5' }),
  },
  {
    title: 'Melodic Minor #4',
    variant: 'dense',
    colors: [THEMES.teal, THEMES.yellow],
    route: LearnRoutes.overview({ mode: 'melodicminor#4' }),
  },
  {
    title: 'Mixolydian ♭2',
    variant: 'cluster',
    colors: [THEMES.indigo, '#4ECDC4'],
    route: LearnRoutes.overview({ mode: 'mixolydian♭2' }),
  },
  {
    title: 'Lydian Augmented #2',
    variant: 'split',
    colors: [THEMES.yellow, THEMES.teal],
    route: LearnRoutes.overview({ mode: 'lydianaugmented#2' }),
  },
  {
    title: 'Locrian 𝄫7',
    variant: 'diagonal',
    colors: [THEMES.darkGrey, THEMES.teal],
    route: LearnRoutes.overview({ mode: 'locrian𝄫7' }),
  },
];

const DOUBLE_HARMONIC_DATA: ContentItem[] = [
  {
    title: 'Double Harmonic Major',
    variant: 'cluster',
    colors: [THEMES.red, '#FF6B9D'],
    route: LearnRoutes.overview({ mode: 'doubleharmonicmajor' }),
  },
  {
    title: 'Lydian #2 #6',
    variant: 'split',
    colors: [THEMES.yellow, THEMES.red],
    route: LearnRoutes.overview({ mode: 'lydian#2#6' }),
  },
  {
    title: 'Ultraphrygian',
    variant: 'diagonal',
    colors: [THEMES.purple, THEMES.red],
    route: LearnRoutes.overview({ mode: 'ultraphrygian' }),
  },
  {
    title: 'Double Harmonic Minor',
    variant: 'dense',
    colors: ['#FF6B9D', THEMES.purple],
    route: LearnRoutes.overview({ mode: 'doubleharmonicminor' }),
  },
  {
    title: 'Oriental',
    variant: 'cluster',
    colors: [THEMES.red, THEMES.yellow],
    route: LearnRoutes.overview({ mode: 'oriental' }),
  },
  {
    title: 'Ionian #2 #5',
    variant: 'split',
    colors: ['#FF6B9D', THEMES.teal],
    route: LearnRoutes.overview({ mode: 'ionian#2#5' }),
  },
  {
    title: 'Locrian 𝄫3 𝄫7',
    variant: 'diagonal',
    colors: [THEMES.darkGrey, THEMES.purple],
    route: LearnRoutes.overview({ mode: 'locrian𝄫3𝄫7' }),
  },
];

// interface FilterCheckboxProps {
//   label: string;
//   checked?: boolean;
// }

// const FilterCheckbox: React.FC<FilterCheckboxProps> = ({ label, checked }) => {
//   const [isChecked, setIsChecked] = useState(!!checked);

//   return (
//     <div
//       className="flex items-center gap-3 p-1 cursor-pointer hover:bg-white/5 rounded transition-colors group"
//       onClick={() => setIsChecked((prev) => !prev)}
//     >
//       <div
//         className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? "bg-white border-white" : "border-gray-600 group-hover:border-gray-400"}`}
//       >
//         {isChecked && <Check size={10} className="text-black" />}
//       </div>
//       <span className={`text-sm ${isChecked ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}>{label}</span>
//     </div>
//   );
// };

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  className = '',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={className} style={style}>
      <div
        className="group mb-4 flex w-fit cursor-pointer select-none items-center gap-2"
        style={{
          color: 'var(--color-text)',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2>{title}</h2>
        {isOpen ? (
          <ChevronDown
            className="opacity-60 transition-opacity group-hover:opacity-100"
            size={14}
            style={{ color: 'var(--color-text-dim)' }}
          />
        ) : (
          <ChevronRight
            className="opacity-60 transition-opacity group-hover:opacity-100"
            size={14}
            style={{ color: 'var(--color-text-dim)' }}
          />
        )}
      </div>
      {isOpen && <div className="flex flex-col">{children}</div>}
    </div>
  );
};

interface CardItemProps {
  title: string;
  colors: string[];
  variant?: 'diagonal' | 'cluster' | 'dense' | 'split' | 'default';
  onSelect?: () => void;
  highlighted?: boolean;
  highlightRef?: React.Ref<HTMLDivElement>;
}

const CardItem: React.FC<CardItemProps> = ({
  title,
  colors,
  variant,
  onSelect,
  highlighted,
  highlightRef,
}) => (
  <div
    ref={highlightRef}
    className={`group flex cursor-pointer flex-col gap-3 ${highlighted ? 'genre-highlight' : ''}`}
  >
    <div
      className="glass-panel relative aspect-square overflow-hidden rounded-2xl transition-colors duration-150"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: highlighted
          ? '2px solid var(--color-accent)'
          : '1px solid var(--color-border)',
      }}
      onClick={onSelect}
    >
      <HexagonPattern
        className="absolute left-0 top-0 size-[120%] transition-transform duration-500 group-hover:scale-105"
        colorsOverride={colors}
        variant={variant}
      />
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
    </div>
    <div className="flex items-start justify-between px-1">
      <h3
        className="text-lg font-semibold"
        style={{ color: 'var(--color-text)' }}
      >
        {title}
      </h3>
      <div
        className="flex items-center gap-3"
        style={{ color: 'var(--color-text-dim)' }}
      >
        <Volume2
          className="cursor-pointer opacity-60 transition-opacity hover:opacity-100"
          size={18}
        />
        <div
          className="flex items-center gap-3 pl-3"
          style={{ borderLeft: '1px solid var(--color-border)' }}
        >
          <Play
            className="cursor-pointer fill-current opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-60"
            size={18}
            onClick={onSelect}
          />
          <Heart
            className="cursor-pointer transition-colors hover:text-red-500"
            size={18}
          />
        </div>
      </div>
    </div>
  </div>
);

interface ListItemProps {
  title: string;
  colors: string[];
  variant?: 'diagonal' | 'cluster' | 'dense' | 'split' | 'default';
  onSelect?: () => void;
  highlighted?: boolean;
  highlightRef?: React.Ref<HTMLDivElement>;
}

const ListItem: React.FC<ListItemProps> = ({
  title,
  colors,
  variant,
  onSelect,
  highlighted,
  highlightRef,
}) => (
  <div
    ref={highlightRef}
    className={`group flex cursor-pointer items-center justify-between rounded-xl p-2 transition-colors duration-150 ${highlighted ? 'genre-highlight' : ''}`}
    style={{
      borderBottom: '1px solid var(--color-border)',
      ...(highlighted ? { border: '2px solid var(--color-accent)' } : {}),
    }}
    onClick={onSelect}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
  >
    <div className="flex items-center gap-4">
      <div
        className="glass-panel-sm relative size-12 shrink-0 overflow-hidden rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <HexagonPattern
          className="absolute -left-1 -top-1 size-[150%]"
          colorsOverride={colors}
          variant={variant}
        />
      </div>
      <div className="flex items-center gap-2">
        <ChevronRight size={14} style={{ color: 'var(--color-text-dim)' }} />
        <h3
          className="text-base font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h3>
      </div>
    </div>
    {/* <div className="flex items-center gap-6 text-gray-500">
      <Volume2 size={16} className="hover:text-white transition-colors" />
      <Play size={16} className="hover:text-white transition-colors fill-current" onClick={onSelect} />
      <Heart size={16} className="hover:text-red-500 transition-colors" />
      <CheckCircle2 size={16} className="hover:text-green-500 transition-colors" />
      <MoreVertical size={16} className="hover:text-white transition-colors" />
    </div> */}
  </div>
);

interface ExploreItemProps {
  title: string;
  colors: string[];
  variant?: 'diagonal' | 'cluster' | 'dense' | 'split' | 'default';
  onSelect?: () => void;
}

const ExploreItem: React.FC<ExploreItemProps> = ({
  title,
  colors,
  variant,
  onSelect,
}) => (
  <div
    className="group flex cursor-pointer items-center justify-between rounded-xl p-3 transition-colors duration-150"
    style={{ borderBottom: '1px solid var(--color-border)' }}
    onClick={onSelect}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
  >
    <div className="flex items-center gap-4">
      <div
        className="glass-panel-sm relative size-10 shrink-0 overflow-hidden rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <HexagonPattern
          className="absolute -left-1 -top-1 size-[150%]"
          colorsOverride={colors}
          variant={variant}
        />
      </div>
      <div className="flex items-center gap-2">
        <ChevronRight size={14} style={{ color: 'var(--color-text-dim)' }} />
        <h3
          className="text-base font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h3>
      </div>
    </div>
    {/* <div className="flex items-center gap-6 text-gray-500">
      <Volume2 size={16} className="hover:text-white transition-colors" />
      <Play size={16} className="hover:text-white transition-colors fill-current" onClick={onSelect} />
      <Heart size={16} className="hover:text-red-500 transition-colors" />
      <CheckCircle2 size={16} className="hover:text-green-500 transition-colors" />
      <MoreVertical size={16} className="hover:text-white transition-colors" />
    </div> */}
  </div>
);

interface LearnInletProps {
  initialTab?: string;
  setSubTab?: (tab: string) => void;
}

export const LearnInlet: React.FC<LearnInletProps> = ({
  initialTab = 'Courses',
  setSubTab: parentSetSubTab,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const genreParam = searchParams.get('genre');
  const [subTab, setSubTab] = useState(genreParam ? 'Courses' : initialTab);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [highlightedGenre, setHighlightedGenre] = useState<string | null>(
    genreParam,
  );
  const highlightRef = useRef<HTMLDivElement>(null);
  // const [showFilter, setShowFilter] = useState(false);
  const navigate = useNavigate();

  // Auto-select Courses tab and highlight the genre when arriving from Globe
  useEffect(() => {
    if (genreParam) {
      setSubTab('Courses');
      setHighlightedGenre(genreParam);
      // Clear the query param from the URL without adding a history entry
      setSearchParams({}, { replace: true });
    }
  }, [genreParam, setSearchParams]);

  // Auto-scroll to and fade out the highlighted card
  useEffect(() => {
    if (highlightedGenre && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      const timer = setTimeout(() => setHighlightedGenre(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedGenre]);

  useEffect(() => {
    if (parentSetSubTab) parentSetSubTab(subTab);
  }, [subTab, parentSetSubTab]);

  const activeData =
    subTab === 'Courses'
      ? COURSES_DATA
      : subTab === 'Theory'
        ? THEORY_DATA
        : EXPLORE_DATA;

  const renderContent = (data: ContentItem[]) => {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {data.map((item, i) => {
            const isHighlighted =
              highlightedGenre !== null && item.title === highlightedGenre;
            return (
              <CardItem
                key={i}
                {...item}
                highlighted={isHighlighted}
                highlightRef={isHighlighted ? highlightRef : undefined}
                onSelect={() => {
                  if (item.route) {
                    navigate(item.route);
                  }
                }}
              />
            );
          })}
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        {data.map((item, i) => {
          const isHighlighted =
            highlightedGenre !== null && item.title === highlightedGenre;
          return subTab === 'Explore' || subTab === 'Theory' ? (
            <ExploreItem
              key={i}
              {...item}
              onSelect={() => {
                if (item.route) {
                  navigate(item.route);
                }
              }}
            />
          ) : (
            <ListItem
              key={i}
              {...item}
              highlighted={isHighlighted}
              highlightRef={isHighlighted ? highlightRef : undefined}
              onSelect={() => {
                if (item.route) {
                  navigate(item.route);
                }
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="learn-root relative flex h-full flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <MeshGradientBg />
      <HeaderBar title="Learn " />
      <div className="relative flex flex-1 flex-col overflow-y-auto px-8 pb-12">
        <div className="mb-8 flex flex-col gap-4">
          <div
            className="glass-panel-sm flex w-fit items-center gap-1 rounded-lg p-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
            }}
          >
            {['Courses', 'Theory', 'Explore'].map((tab) => (
              <button
                key={tab}
                className="rounded-md px-6 py-2 text-sm font-medium transition-colors duration-150"
                style={
                  subTab === tab
                    ? {
                        background: 'var(--color-surface-3)',
                        color: 'var(--color-accent)',
                        borderBottom: '2px solid var(--color-accent)',
                      }
                    : {
                        color: 'var(--color-text-dim)',
                        background: 'transparent',
                        borderBottom: '2px solid transparent',
                      }
                }
                onClick={() => setSubTab(tab)}
                onMouseEnter={(e) => {
                  if (subTab !== tab)
                    e.currentTarget.style.color = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  if (subTab !== tab)
                    e.currentTarget.style.color = 'var(--color-text-dim)';
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div
            className="relative flex items-center justify-between pb-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <LayoutGrid
                  className="cursor-pointer transition-colors duration-150"
                  size={20}
                  style={{
                    color:
                      viewMode === 'grid'
                        ? 'var(--color-accent)'
                        : 'var(--color-text-dim)',
                  }}
                  onClick={() => setViewMode('grid')}
                />
                <ListIcon
                  className="cursor-pointer transition-colors duration-150"
                  size={20}
                  style={{
                    color:
                      viewMode === 'list'
                        ? 'var(--color-accent)'
                        : 'var(--color-text-dim)',
                  }}
                  onClick={() => setViewMode('list')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* {showFilter && (
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 absolute top-[150px] left-8 right-8 z-20 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-start mb-4 pb-2 border-b border-white/5">
              <h3 className="text-sm font-medium text-gray-200">Filter</h3>
              <X size={16} className="text-gray-500 cursor-pointer hover:text-white" onClick={() => setShowFilter(false)} />
            </div>
            <div className="grid grid-cols-4 gap-4 h-64 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                <FilterCheckbox label="Diatonic Modes" />
                <FilterCheckbox label="Relative Modes" />
              </div>
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                <FilterCheckbox label="Lydian" />
                <FilterCheckbox label="Dorian" />
              </div>
              <div className="flex flex-col gap-1 border-r border-white/5 pr-4">
                {["C", "G", "D", "A"].map((key) => (
                  <FilterCheckbox key={key} label={key}  />
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <FilterCheckbox label="7th Chords"  />
              </div>
            </div>
          </div>
        )} */}

        <div className="flex-1 overflow-y-auto">
          {subTab === 'Explore' || subTab === 'Theory' ? (
            <>
              <CollapsibleSection
                defaultOpen
                className="mt-4"
                title="Diatonic Modes"
              >
                {renderContent(activeData)}
              </CollapsibleSection>
              <CollapsibleSection
                className="mt-8 pt-4"
                style={{ borderTop: '1px solid var(--color-border)' }}
                title="Relative Modes"
              >
                {renderContent(RELATIVE_MODES_DATA)}
              </CollapsibleSection>
              <CollapsibleSection
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid var(--color-border)' }}
                title="Parallel Modes"
              >
                {renderContent(PARALLEL_MODES_DATA)}
              </CollapsibleSection>
              <CollapsibleSection
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid var(--color-border)' }}
                title="Harmonic Minor Modes"
              >
                {renderContent(HARMONIC_MINOR_DATA)}
              </CollapsibleSection>
              <CollapsibleSection
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid var(--color-border)' }}
                title="Melodic Minor Modes"
              >
                {renderContent(MELODIC_MINOR_DATA)}
              </CollapsibleSection>
              <CollapsibleSection
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid var(--color-border)' }}
                title="Harmonic Major Modes"
              >
                {renderContent(HARMONIC_MAJOR_DATA)}
              </CollapsibleSection>
              <CollapsibleSection
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid var(--color-border)' }}
                title="Double Harmonic Modes"
              >
                {renderContent(DOUBLE_HARMONIC_DATA)}
              </CollapsibleSection>
            </>
          ) : (
            <CollapsibleSection defaultOpen className="mt-4" title="Genres">
              {renderContent(activeData)}
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
};
