import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, BookOpen, Music, Globe, Library, ShoppingBag, Users, PlusCircle, Settings, RefreshCw, Search, 
  ChevronRight, ChevronLeft, ChevronDown, Hexagon, Play, Heart, Bookmark, Mic2, MoreVertical, Activity, 
  Layers, Edit2, Send, Share2, User, Volume2, LayoutGrid, List, ArrowUpDown, CheckCircle2, 
  Gamepad2, Map as MapIcon, Clock, Menu, X, Plus, Minus, FileAudio, Sliders, 
  Square, SkipBack, SkipForward, Repeat, Shuffle, Check, Disc, Eye, 
  Mic,Trophy
} from 'lucide-react';

// ==========================================
// SECTION 1: TYPES & DATA
// ==========================================

interface ThemeColors {
  [key: string]: string;
}

const THEMES: ThemeColors = {
  red: '#D65A65',
  darkGrey: '#5C6B73',
  beige: '#C2C5AA',
  darkRed: '#9D5C63',
  yellow: '#E9C46A',
  teal: '#2A9D8F',
  purple: '#9D4EDD',
  orange: '#E76F51',
  blue: '#457B9D',
  indigo: '#264653'
};

interface PatternCoord {
  r: number;
  c: number;
}

interface Award {
  title: string;
  level: number;
  description: string;
  pattern: string;
  colors: string[];
}

const AWARDS_DATA: Award[] = [
  { title: 'Popstar', level: 1, description: 'Double XP: 25 minutes', pattern: 'flower', colors: ['#EDB3B3', THEMES.red, '#9D5C63', '#A6A2C2'] },
  { title: 'Rockstar', level: 2, description: 'Reward Claimed', pattern: 'vShape', colors: [THEMES.darkGrey, '#A3B18A', THEMES.orange, '#3D405B'] },
  { title: 'Jewelheart', level: 1, description: 'Reward Claimed', pattern: 'cluster', colors: ['#9C27B0', '#7209B7', '#4CC9F0', '#F72585', '#E0AAFF'] },
  { title: 'Soulstone', level: 1, description: 'Double XP: 25 minutes', pattern: 'pyramid', colors: [THEMES.red, THEMES.yellow, THEMES.teal, THEMES.indigo, THEMES.purple] },
  { title: 'Popstar', level: 2, description: 'Triple XP: 15 minutes', pattern: 'flower', colors: ['#EDB3B3', THEMES.red, '#9D5C63', '#A6A2C2'] },
  { title: 'Rockstar', level: 3, description: 'Reward Claimed', pattern: 'vShape', colors: [THEMES.darkGrey, '#A3B18A', THEMES.orange, '#3D405B'] },
  { title: 'Jewelheart', level: 2, description: 'Reward Claimed', pattern: 'cluster', colors: ['#9C27B0', '#7209B7', '#4CC9F0', '#F72585', '#E0AAFF'] },
  { title: 'Soulstone', level: 2, description: 'Reward Claimed', pattern: 'pyramid', colors: [THEMES.red, THEMES.yellow, THEMES.teal, THEMES.indigo, THEMES.purple] },
];

interface ContentItem {
  title: string;
  variant: 'diagonal' | 'cluster' | 'dense' | 'split' | 'default';
  colors: string[];
}

const COURSES_DATA: ContentItem[] = [
  { title: 'Pop', variant: 'diagonal', colors: [THEMES.yellow, '#F4A261', THEMES.orange, '#A6A2C2', '#D3C2D6'] },
  { title: 'Folk', variant: 'cluster', colors: ['#A3B18A', '#588157', '#3A5A40', '#DAD7CD', '#E3D5CA'] },
  { title: 'Rock', variant: 'dense', colors: ['#E63946', '#1D3557', '#457B9D', '#A8DADC', '#2A3036'] },
  { title: 'R&B', variant: 'split', colors: [THEMES.teal, THEMES.indigo, THEMES.yellow, '#F4A261', '#9C27B0'] },
  { title: 'Jazz', variant: 'diagonal', colors: [THEMES.indigo, THEMES.teal, THEMES.yellow, '#F4A261', THEMES.orange] },
  { title: 'Classical', variant: 'cluster', colors: ['#6D597A', '#B56576', '#E5989B', '#FFB4A2', '#FFCDB2'] },
  { title: 'Electronic', variant: 'dense', colors: ['#7400B8', '#6930C3', '#5E60CE', '#5390D9', '#4EA8DE'] },
  { title: 'Hip Hop', variant: 'split', colors: ['#003049', '#D62828', '#F77F00', '#FCBF49', '#EAE2B7'] }
];

const THEORY_DATA: ContentItem[] = [
  { title: 'Lydian', variant: 'diagonal', colors: [THEMES.yellow, '#F4A261'] },
  { title: 'Ionian (Major)', variant: 'cluster', colors: [THEMES.red, '#9D5C63'] },
  { title: 'Mixolydian', variant: 'dense', colors: [THEMES.beige, THEMES.darkGrey] },
  { title: 'Dorian', variant: 'split', colors: [THEMES.orange, THEMES.teal] },
  { title: 'Aeolian (Minor)', variant: 'diagonal', colors: [THEMES.blue, '#A8DADC'] },
  { title: 'Locrian', variant: 'cluster', colors: [THEMES.purple, '#E0AAFF'] }
];

const EXPLORE_DATA: ContentItem[] = [
  { title: 'Lydian', variant: 'diagonal', colors: [THEMES.yellow, '#F4A261'] },
  { title: 'Ionian (Major)', variant: 'cluster', colors: [THEMES.red, '#9D5C63'] },
  { title: 'Mixolydian', variant: 'dense', colors: [THEMES.beige, THEMES.darkGrey] },
  { title: 'Dorian', variant: 'split', colors: [THEMES.orange, THEMES.teal] },
  { title: 'Aeolian (Minor)', variant: 'diagonal', colors: [THEMES.blue, '#A8DADC'] },
  { title: 'Locrian', variant: 'cluster', colors: [THEMES.purple, '#E0AAFF'] }
];

interface ArcadeGame {
  title: string;
  players: string;
  category: string;
  color: string;
  featured?: boolean;
}

const ARCADE_GAMES_DATA: ArcadeGame[] = [
  { title: "Rhythm Racer", players: "1.2k", category: "Rhythm", color: THEMES.red, featured: true },
  { title: "Chord Crusher", players: "842", category: "Theory", color: THEMES.yellow },
  { title: "Synth Match", players: "530", category: "Ear Training", color: THEMES.teal },
  { title: "Beat Builder", players: "320", category: "Production", color: THEMES.indigo },
  { title: "Pitch Perfect", players: "1.5k", category: "Ear Training", color: THEMES.purple },
  { title: "Scale Runner", players: "605", category: "Technique", color: THEMES.orange }
];

interface ConnectUser {
  name: string;
  role: string;
  common: string;
}

const CONNECT_USERS_DATA: ConnectUser[] = [
  { name: 'Sarah J.', role: 'Vocalist', common: 'Pop, R&B' }, 
  { name: 'Mike T.', role: 'Producer', common: 'Electronic' }, 
  { name: 'Davide R.', role: 'Guitarist', common: 'Jazz' }, 
  { name: 'Elena V.', role: 'Songwriter', common: 'Folk' }
];

// ==========================================
// SECTION 2: SHARED COMPONENTS
// ==========================================

interface HexagonPatternProps {
  className?: string;
  colorsOverride?: string[];
  variant?: 'default' | 'diagonal' | 'cluster' | 'split' | 'dense';
  fixedPattern?: string | PatternCoord[];
}

const HexagonPattern: React.FC<HexagonPatternProps> = ({ className, colorsOverride, variant = 'default', fixedPattern }) => {
  const hexs = useMemo(() => {
    const generatedHexs: React.JSX.Element[] = [];
    const colors = colorsOverride || [THEMES.red, THEMES.red, THEMES.darkGrey, THEMES.beige, THEMES.beige, THEMES.darkRed];

    if (fixedPattern) {
      const patterns: { [key: string]: PatternCoord[] } = {
        flower: [{r: 2, c: 2}, {r: 2, c: 3}, {r: 3, c: 2}, {r: 3, c: 3}, {r: 1, c: 2}, {r: 1, c: 3}, {r: 2, c: 1}],
        vShape: [{r: 1, c: 1}, {r: 2, c: 2}, {r: 3, c: 3}, {r: 2, c: 4}, {r: 1, c: 5}, {r: 1, c: 2}, {r: 2, c: 3}, {r: 1, c: 4}],
        cluster: [{r: 1, c: 4}, {r: 2, c: 3}, {r: 2, c: 4}, {r: 2, c: 5}, {r: 3, c: 3}, {r: 3, c: 4}, {r: 3, c: 5}],
        pyramid: [{r: 1, c: 3}, {r: 2, c: 2}, {r: 2, c: 3}, {r: 2, c: 4}, {r: 3, c: 1}, {r: 3, c: 2}, {r: 3, c: 3}, {r: 3, c: 4}, {r: 3, c: 5}]
      };
      
      const coords = typeof fixedPattern === 'string' ? (patterns[fixedPattern] || []) : fixedPattern;

      coords.forEach((pos, i) => {
        const x = pos.c * 26 + (pos.r % 2) * 13;
        const y = pos.r * 22;
        const color = colors[i % colors.length]; 
        generatedHexs.push(<path key={`fixed-${i}`} d="M13 0 L26 7.5 L26 22.5 L13 30 L0 22.5 L0 7.5 Z" fill={color} transform={`translate(${x}, ${y}) scale(0.95)`} className="opacity-90" />);
      });
    } else {
      const rows = 12; 
      const cols = 16;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let shouldRender = false;
          if (variant === 'diagonal') shouldRender = (r + c) > 8 && (r + c) < 18 && Math.random() > 0.3;
          else if (variant === 'cluster') shouldRender = Math.sqrt(r*r + c*c) < 10 && Math.random() > 0.4;
          else if (variant === 'split') shouldRender = (c < 6 || c > 10) && Math.random() > 0.3;
          else if (variant === 'dense') shouldRender = Math.random() > 0.2;
          else shouldRender = Math.random() > 0.4;

          if (shouldRender) {
            const x = c * 26 + (r % 2) * 13;
            const y = r * 22;
            const color = colors[Math.floor(Math.random() * colors.length)];
            generatedHexs.push(<path key={`${r}-${c}`} d="M13 0 L26 7.5 L26 22.5 L13 30 L0 22.5 L0 7.5 Z" fill={color} transform={`translate(${x}, ${y}) scale(0.95)`} className="opacity-90" />);
          }
        }
      }
    }
    return generatedHexs;
  }, [colorsOverride, variant, fixedPattern]);

  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <g transform="translate(20, 20)">{hexs}</g>
    </svg>
  );
};

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick, collapsed }) => (
  <div onClick={onClick} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors group ${active ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
    <Icon size={22} strokeWidth={1.5} />
    {!collapsed && <span className="font-medium text-sm tracking-wide">{label}</span>}
  </div>
);

interface TagProps {
  label: string;
  icon?: React.ElementType;
  active?: boolean;
}

const Tag: React.FC<TagProps> = ({ label, icon: Icon, active }) => (
  <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${active ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'}`}>
    {Icon && <Icon size={10} />}
    {label}
  </button>
);

interface FilterPillProps {
  label: string;
  icon: React.ElementType;
  id: string;
  activeFilter: string | null;
  toggleFilter: (id: string) => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, icon: Icon, id, activeFilter, toggleFilter }) => (
  <div className="relative">
    <button 
      onClick={() => toggleFilter(id)}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all backdrop-blur-md ${activeFilter === id ? 'bg-white text-black' : 'bg-black/40 text-white hover:bg-black/60'} border border-white/10`}
    >
      {Icon && <Icon size={14} />}
      {label}
      {activeFilter === id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    </button>
    {activeFilter === id && (
      <div className="absolute top-full mt-2 left-0 w-48 bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
        {id === 'decade' && ['2020\'s', '2010\'s', '2000\'s', '1990\'s', '1980\'s', '1970\'s'].map(item => <div key={item} className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg cursor-pointer text-sm text-gray-200"><div className="w-4 h-4 border border-gray-500 rounded flex items-center justify-center" />{item}</div>)}
        {id === 'region' && ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania'].map(item => <div key={item} className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg cursor-pointer text-sm text-gray-200"><div className="w-4 h-4 border border-gray-500 rounded flex items-center justify-center" />{item}</div>)}
      </div>
    )}
  </div>
);

interface FilterCheckboxProps {
  label: string;
  checked?: boolean;
}

const FilterCheckbox: React.FC<FilterCheckboxProps> = ({ label, checked }) => (
  <div className="flex items-center gap-3 p-1 cursor-pointer hover:bg-white/5 rounded transition-colors group">
    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-white border-white' : 'border-gray-600 group-hover:border-gray-400'}`}>{checked && <Check size={10} className="text-black" />}</div>
    <span className={`text-sm ${checked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{label}</span>
  </div>
);

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = false, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <div 
        className="flex items-center gap-2 text-lg font-serif text-gray-200 mb-4 cursor-pointer select-none group w-fit"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2>{title}</h2>
        {isOpen ? (
          <ChevronDown size={18} className="text-gray-600 group-hover:text-white transition-colors" />
        ) : (
          <ChevronRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />
        )}
      </div>
      {isOpen && (
        <div className="flex flex-col animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

const PlayerBar: React.FC = () => (
  <div className="h-20 bg-[#121212] border-t border-white/10 px-8 flex items-center justify-between z-30 flex-shrink-0">
    <div className="flex items-center gap-6"><SkipBack size={24} className="text-gray-400 hover:text-white cursor-pointer" /><Play size={28} className="text-white fill-white cursor-pointer hover:scale-110 transition-transform" /><SkipForward size={24} className="text-gray-400 hover:text-white cursor-pointer" /></div>
    <div className="flex items-center gap-4 bg-[#1A1A1A] p-2 rounded-xl pr-8 border border-white/5">
      <div className="w-10 h-10 bg-[#2A2A2A] rounded-lg border border-white/10 relative overflow-hidden"><HexagonPattern className="w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2" colorsOverride={['#C2C5AA', '#5C6B73']} /></div>
      <div><div className="text-sm font-medium text-white">Preset 4</div><div className="flex items-center gap-2 text-[10px] text-gray-500"><Activity size={10} /> <span>Synth</span><Activity size={10} /> <span>Lead</span><Activity size={10} /> <span>Hip Hop</span></div></div>
    </div>
    <div className="flex items-center gap-6"><div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center hover:bg-gray-200 cursor-pointer"><Plus size={18} /></div><Repeat size={20} className="text-gray-400 hover:text-white cursor-pointer" /><div className="flex items-center gap-3 group"><Volume2 size={20} className="text-gray-400 group-hover:text-white" /><div className="w-24 h-1 bg-white/20 rounded-full overflow-hidden"><div className="w-3/4 h-full bg-gray-400 group-hover:bg-white transition-colors" /></div></div></div>
  </div>
);

// ==========================================
// SECTION 3: FEATURE COMPONENTS
// ==========================================

interface ProjectCardProps {
  title: string;
  genre: string;
  author: string;
  active?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ title, genre, author, active }) => (
  <div className={`group relative p-4 rounded-2xl border transition-all duration-300 ${active ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 hover:bg-white/5'}`}>
    <div className="flex justify-between items-start mb-2"><div><h3 className="text-lg font-serif text-gray-100 mb-1">{title}</h3><div className="flex items-center gap-2 text-xs text-gray-400"><Activity size={12} /><span>{genre}</span></div></div><Bookmark size={18} className="text-gray-500 hover:text-white cursor-pointer" /></div>
    <div className="flex justify-between items-end mt-4"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold">{author[0]}</div><span className="text-xs text-gray-400">{author}</span></div><Heart size={16} className="text-gray-500 hover:text-red-400 cursor-pointer transition-colors" /></div>
  </div>
);

interface AwardCardProps {
  title: string;
  level: number;
  description: string;
  pattern: string;
  colors: string[];
}

const AwardCard: React.FC<AwardCardProps> = ({ title, level, description, pattern, colors }) => (
  <div className="flex flex-col rounded-lg overflow-hidden border border-white/10 group hover:border-white/30 transition-all cursor-pointer">
    <div className="h-48 bg-[#121212] relative flex items-center justify-center"><div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent opacity-50" /><HexagonPattern className="w-48 h-48 drop-shadow-2xl" fixedPattern={pattern} colorsOverride={colors} /></div>
    <div className="bg-white p-4 flex flex-col gap-1"><h3 className="text-black font-serif text-lg">{title}: Lvl {level}</h3><p className={`text-xs ${description === 'Reward Claimed' ? 'text-gray-400 italic' : 'text-gray-600'}`}>{description}</p></div>
  </div>
);

interface EffectNodeProps {
  label: string;
  color: string;
  type?: string;
}

const EffectNode: React.FC<EffectNodeProps> = ({ label, color }) => (
  <div className="relative group cursor-pointer flex flex-col items-center">
    <div className="w-14 h-16 relative flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 115" preserveAspectRatio="none">
        <path d="M50 0 L93.3 25 V75 L50 100 L6.7 75 V25 Z" fill="transparent" stroke={color} strokeWidth="4" className="group-hover:fill-white/10 transition-colors" />
        <path d="M50 10 L85 30 V70 L50 90 L15 70 V30 Z" fill={color} fillOpacity="0.2" />
      </svg>
      <div className="relative z-10 text-[10px] font-bold text-gray-300 uppercase tracking-wider text-center leading-tight">{label}</div>
    </div>
  </div>
);

interface TrackRowProps {
  name: string;
  type: 'audio' | 'midi' | 'drum';
  tags: string[];
  color?: string;
  isActive: boolean;
}

const TrackRow: React.FC<TrackRowProps> = ({ name, type, tags, isActive }) => (
  <div className={`flex items-center h-16 border-b border-white/5 ${isActive ? 'bg-white/5' : 'hover:bg-white/5'} transition-colors group`}>
    <div className="w-64 flex items-center px-4 gap-4 border-r border-white/5 flex-shrink-0">
      <MoreVertical size={16} className="text-gray-600 cursor-grab" />
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {type === 'audio' && <Mic size={14} className="text-blue-400" />}
          {type === 'midi' && <Music size={14} className="text-purple-400" />}
          {type === 'drum' && <Activity size={14} className="text-orange-400" />}
          <span className="text-sm font-medium text-gray-200">{name}</span>
        </div>
        <div className="flex gap-1">{tags.map((tag, i) => <span key={i} className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{tag}</span>)}</div>
      </div>
    </div>
    <div className="flex-1 relative">
      <div className="absolute inset-0 flex">{[...Array(8)].map((_, i) => <div key={i} className="flex-1 border-r border-white/5 h-full" />)}</div>
      {name === 'Color' && (
        <div className="absolute top-1 bottom-1 left-0 right-0 flex">
           <div className="flex-1 bg-red-500/20 m-0.5 rounded" /><div className="flex-1 bg-transparent m-0.5" /><div className="flex-1 bg-purple-500/20 m-0.5 rounded" /><div className="flex-1 bg-transparent m-0.5" /><div className="flex-1 bg-transparent m-0.5" /><div className="flex-1 bg-transparent m-0.5" /><div className="flex-1 bg-indigo-500/20 m-0.5 rounded" /><div className="flex-1 bg-red-500/20 m-0.5 rounded" />
        </div>
      )}
    </div>
  </div>
);

interface CardItemProps {
  title: string;
  colors: string[];
  variant?: 'diagonal' | 'cluster' | 'dense' | 'split' | 'default';
}

const CardItem: React.FC<CardItemProps> = ({ title, colors, variant }) => (
  <div className="group flex flex-col gap-3 cursor-pointer">
    <div className="aspect-square rounded-2xl overflow-hidden relative border border-white/5 group-hover:border-white/20 transition-all duration-300"><div className={`absolute inset-0 bg-[#1A1A1A]`} /><HexagonPattern className="w-[120%] h-[120%] absolute top-0 left-0 transition-transform duration-500 group-hover:scale-105" colorsOverride={colors} variant={variant} /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" /></div>
    <div className="flex items-start justify-between px-1"><h3 className="text-lg font-serif text-gray-100">{title}</h3><div className="flex items-center gap-3 text-gray-500"><Volume2 size={18} className="hover:text-white transition-colors" /><div className="flex items-center gap-3 pl-3 border-l border-white/10"><Play size={18} className="hover:text-white transition-colors fill-current opacity-0 group-hover:opacity-100" /><Heart size={18} className="hover:text-red-500 transition-colors" /></div></div></div>
  </div>
);

interface ListItemProps {
  title: string;
  colors: string[];
  variant?: 'diagonal' | 'cluster' | 'dense' | 'split' | 'default';
}

const ListItem: React.FC<ListItemProps> = ({ title, colors, variant }) => (
  <div className="group flex items-center justify-between p-2 rounded-xl border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
    <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-lg overflow-hidden relative bg-[#1A1A1A] border border-white/10 flex-shrink-0"><HexagonPattern className="w-[150%] h-[150%] absolute -top-1 -left-1" colorsOverride={colors} variant={variant} /></div><div className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-500" /><h3 className="text-base font-medium text-gray-200">{title}</h3></div></div>
    <div className="flex items-center gap-6 text-gray-500"><Volume2 size={16} className="hover:text-white transition-colors" /><Play size={16} className="hover:text-white transition-colors fill-current" /><Heart size={16} className="hover:text-red-500 transition-colors" /><CheckCircle2 size={16} className="hover:text-green-500 transition-colors" /><MoreVertical size={16} className="hover:text-white transition-colors" /></div>
  </div>
);

interface ExploreItemProps {
  title: string;
  colors: string[];
  variant?: 'diagonal' | 'cluster' | 'dense' | 'split' | 'default';
}

const ExploreItem: React.FC<ExploreItemProps> = ({ title, colors, variant }) => (
  <div className="group flex items-center justify-between p-3 rounded-xl border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg overflow-hidden relative bg-[#1A1A1A] border border-white/10 flex-shrink-0">
        <HexagonPattern 
          className="w-[150%] h-[150%] absolute -top-1 -left-1" 
          colorsOverride={colors} 
          variant={variant}
        />
      </div>
      <div className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-500" /><h3 className="text-base font-medium text-gray-200">{title}</h3></div>
    </div>
    <div className="flex items-center gap-6 text-gray-500">
      <Volume2 size={16} className="hover:text-white transition-colors" /><Play size={16} className="hover:text-white transition-colors fill-current" />
      <Heart size={16} className="hover:text-red-500 transition-colors" /><CheckCircle2 size={16} className="hover:text-green-500 transition-colors" /><MoreVertical size={16} className="hover:text-white transition-colors" />
    </div>
  </div>
);

interface LibraryItemProps {
  title: string;
  subtitle?: string;
  tags?: string[];
  index: number;
  type: 'lesson' | 'sound';
}

const LibraryItem: React.FC<LibraryItemProps> = ({ title, subtitle, tags, index, type }) => {
  const [isChecked, setIsChecked] = useState(false);
  const colors = [THEMES.red, THEMES.darkGrey, THEMES.beige, THEMES.darkRed];
  const color = colors[index % colors.length];

  return (
    <div className="group flex items-center gap-4 py-3 border-b border-white/5 hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors cursor-pointer">
      <div onClick={(e) => { e.stopPropagation(); setIsChecked(!isChecked); }} className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${isChecked ? 'bg-white border-white text-black' : 'border-white/30 text-transparent hover:border-white/60'}`}><CheckCircle2 size={12} /></div>
      <div className="w-10 h-10 bg-[#1A1A1A] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative flex-shrink-0"><div className="absolute inset-0 opacity-40"><HexagonPattern className="w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2" colorsOverride={[color]} /></div>{type === 'lesson' ? <FileAudio size={18} className="text-gray-300 relative z-10" /> : <Sliders size={18} className="text-gray-300 relative z-10" />}</div>
      <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><Play size={16} fill="currentColor" /></button>
      <div className="flex-1 flex flex-col gap-0.5"><span className="text-sm font-medium text-gray-200">{title}</span>{type === 'lesson' ? <span className="text-[10px] text-gray-500 bg-white/5 w-fit px-1.5 py-0.5 rounded uppercase tracking-wide">{subtitle}</span> : <div className="flex items-center gap-2">{tags?.map((tag, i) => <div key={i} className="flex items-center gap-1 bg-[#1A1A1A] border border-white/10 rounded-full px-2 py-0.5"><Activity size={8} className="text-gray-500" /><span className="text-[10px] text-gray-400">{tag}</span></div>)}</div>}</div>
      <div className="flex items-center gap-4 text-gray-500"><Heart size={16} className="hover:text-red-500 transition-colors" /><Share2 size={16} className="hover:text-white transition-colors" /><MoreVertical size={16} className="hover:text-white transition-colors" /></div>
    </div>
  );
};

interface MarketItemProps {
  title: string;
  tags: string[];
  index: number;
}

const MarketItem: React.FC<MarketItemProps> = ({ title, tags, index }) => {
  const [isChecked, setIsChecked] = useState(false);
  const colors = [THEMES.red, THEMES.darkGrey, THEMES.beige, THEMES.darkRed];
  const color = colors[index % colors.length];

  return (
    <div className="group flex items-center py-3 border-b border-white/5 hover:bg-white/5 -mx-4 px-4 transition-colors">
      <div className="w-10 flex justify-center"><div onClick={() => setIsChecked(!isChecked)} className={`w-4 h-4 rounded border cursor-pointer ${isChecked ? 'bg-white border-white' : 'border-gray-600 hover:border-gray-400'}`} /></div>
      <div className="w-12 h-12 bg-[#1A1A1A] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative flex-shrink-0 mx-4"><div className="absolute inset-0 opacity-40"><HexagonPattern className="w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2" colorsOverride={[color]} /></div><div className="w-2 h-2 rounded-full bg-white opacity-50" /></div>
      <Play size={20} className="text-gray-400 hover:text-white cursor-pointer mr-6 fill-current" />
      <div className="flex-1 flex flex-col gap-1"><span className="text-base text-gray-200 font-serif">{title}</span><div className="flex items-center gap-2">{tags.map((tag, i) => <div key={i} className="flex items-center gap-1 bg-[#1A1A1A] border border-white/10 rounded-full px-2 py-0.5"><Activity size={8} className="text-gray-500" /><span className="text-[10px] text-gray-400">{tag}</span></div>)}</div></div>
      <div className="flex items-center gap-6 text-gray-500 pr-4"><Heart size={18} className="hover:text-red-500 transition-colors cursor-pointer" /><div className="w-7 h-7 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-200 cursor-pointer"><Plus size={14} /></div><MoreVertical size={18} className="hover:text-white transition-colors cursor-pointer" /></div>
    </div>
  );
};

interface ArcadeGameCardProps {
  title: string;
  players: string;
  category: string;
  color: string;
  featured?: boolean;
}

const ArcadeGameCard: React.FC<ArcadeGameCardProps> = ({ title, players, category, color, featured }) => (
  <div className={`group relative rounded-3xl overflow-hidden border border-white/10 cursor-pointer transition-all duration-500 ${featured ? 'md:col-span-2 md:row-span-2' : ''}`}>
    <div className="absolute inset-0 bg-[#1A1A1A]"><div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/80" /><HexagonPattern className={`w-[150%] h-[150%] absolute transition-transform duration-700 group-hover:scale-110 ${featured ? '-top-10 -left-10' : '-top-4 -left-4'}`} colorsOverride={[color, '#1A1A1A']} variant={featured ? 'diagonal' : 'dense'} /></div>
    <div className={`relative z-10 flex flex-col justify-between h-full ${featured ? 'p-8' : 'p-5'}`}>
      <div className="flex justify-between items-start"><div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10 ${featured ? 'bg-white/10 text-white' : 'bg-black/40 text-gray-300'}`}>{category}</div>{featured && <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg shadow-red-500/20">LIVE</div>}</div>
      <div><h3 className={`font-serif font-bold text-white mb-2 leading-tight ${featured ? 'text-4xl' : 'text-xl'}`}>{title}</h3><div className="flex items-center gap-4 text-gray-300"><div className="flex items-center gap-1.5 text-xs font-medium"><Users size={14} className="text-gray-400" />{players} Playing</div>{featured && <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-400"><Trophy size={14} />Prize: 500 Credits</div>}</div></div>
      <div className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl text-black"><Play size={20} fill="currentColor" /></div>
    </div>
  </div>
);

// ==========================================
// SECTION 4: PAGE VIEWS (src/pages/*)
// ==========================================

interface GenerateState {
  prompt: string;
  setPrompt: (value: string) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
}

interface HomeViewProps {
  onGenerate: GenerateState;
}

const HomeView: React.FC<HomeViewProps> = ({ onGenerate }) => {
  // Banner Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const bannerSlides = [
    { title: "Start", color: [THEMES.red, THEMES.darkRed, THEMES.beige] },
    { title: "Create", color: [THEMES.teal, THEMES.indigo, THEMES.yellow] },
    { title: "Explore", color: [THEMES.orange, THEMES.darkGrey, THEMES.red] },
    { title: "Learn", color: [THEMES.purple, THEMES.beige, THEMES.blue] }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-12 px-8">
      {/* Hero Section / Carousel */}
      <section className="relative w-full h-80 rounded-[2rem] overflow-hidden mb-12 group">
        <div className="absolute inset-0 bg-[#2A3036] transition-colors duration-500">
           <div className="absolute inset-0 bg-gradient-to-r from-[#2A3036] via-transparent to-[#E3D5CA] opacity-20" />
           <HexagonPattern 
              className="w-full h-full object-cover opacity-80 transition-opacity duration-500" 
              colorsOverride={bannerSlides[currentSlide].color} 
              variant="dense" 
           />
        </div>

        <div className="absolute inset-0 p-8 flex flex-col justify-between">
          <div className="flex justify-between items-center w-full z-10">
            <button onClick={prevSlide} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors text-white border border-white/10"><ChevronLeft size={20} /></button>
            <button onClick={nextSlide} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors text-white border border-white/10"><ChevronRight size={20} /></button>
          </div>

          <div className="flex items-end justify-between z-10">
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-full p-1.5 pr-2 flex items-center gap-4 pl-6 group/start cursor-pointer transition-all hover:bg-black/40">
              <span className="font-serif text-2xl italic pr-4">{bannerSlides[currentSlide].title}</span>
              <div className="h-10 w-24 bg-white/10 rounded-full flex items-center justify-end px-1 group-hover/start:bg-white/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform group-hover/start:scale-105 transition-transform">
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
          <div className="flex items-center gap-2 text-xl font-serif text-gray-200"><h2>Continue</h2><ChevronRight size={18} className="text-gray-600" /></div>
          <div className="flex-1 bg-gradient-to-br from-teal-800/20 to-emerald-900/20 border border-white/5 rounded-3xl p-6 relative overflow-hidden group cursor-pointer hover:border-emerald-500/30 transition-all">
            <div className="absolute inset-0 opacity-30"><HexagonPattern className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 text-emerald-500/20 fill-emerald-500/20" fixedPattern="cluster" colorsOverride={[THEMES.teal]} /></div>
            <div className="relative z-10 h-full flex flex-col justify-end"><div className="mb-4"><span className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1 block">Lesson 4</span><h3 className="text-2xl font-serif leading-tight mb-2">Advanced<br/>Polyrhythms</h3><div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden"><div className="w-3/4 h-full bg-emerald-500 rounded-full" /></div></div><button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><Play size={18} fill="currentColor" /></button></div>
          </div>
        </div>
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xl font-serif text-gray-200"><h2>Projects</h2><ChevronRight size={18} className="text-gray-600" /></div>
          <div className="flex flex-col gap-3">
            <ProjectCard title="Neon City Drive" genre="Synthwave, 120BPM" author="Alex M., AI" active={true} />
            <ProjectCard title="Acoustic Morning" genre="Folk, Guitar" author="Alex M." active={false} />
            <div className="p-4 rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30 cursor-pointer transition-all h-20">
              <div className="flex items-center gap-2 text-sm font-medium"><PlusCircle size={16} /> Create New Project</div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xl font-serif text-gray-200"><h2>Generate</h2><ChevronRight size={18} className="text-gray-600" /></div>
          <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-6 right-6 w-12 h-12 rounded-full border border-white/10 flex items-center justify-center"><div className="flex items-center gap-0.5 h-4"><div className="w-0.5 h-full bg-gradient-to-t from-orange-500 to-red-500 animate-pulse" /><div className="w-0.5 h-2 bg-gray-600" /><div className="w-0.5 h-3 bg-gray-600" /><div className="w-0.5 h-1 bg-gray-600" /></div></div>
            <div className="flex-1 min-h-[160px]">
               <textarea 
                 value={onGenerate.prompt} 
                 onChange={(e) => onGenerate.setPrompt(e.target.value)} 
                 placeholder="Describe the song you want to create... (e.g., 'An upbeat lo-fi track with jazzy piano chords and a relaxed drum beat')" 
                 className="w-full h-full bg-transparent border-none resize-none text-gray-300 placeholder:text-gray-600 focus:outline-none text-lg leading-relaxed custom-scrollbar" 
               />
            </div>
            <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex flex-wrap gap-2"><Tag label="Key" icon={Music} /><Tag label="Tempo" icon={Activity} /><div className="w-px h-6 bg-white/10 mx-1" /><Tag label="Pop" /><Tag label="R&B" /><Tag label="Jazz" /><Tag label="Lo-Fi" /><button className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30"><MoreVertical size={14} /></button></div>
                <div className="flex items-center justify-between mt-2">
                   <div className="flex items-center gap-2 text-xs text-gray-500"><Mic2 size={12} /><span>Voice Mode: <span className="text-gray-300">Instrumental</span></span></div>
                   <button onClick={() => { onGenerate.setIsGenerating(true); setTimeout(() => onGenerate.setIsGenerating(false), 2000); }} className="bg-white text-black px-6 py-2.5 rounded-full font-medium text-sm hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/5">{onGenerate.isGenerating ? (<><RefreshCw size={14} className="animate-spin" /> Generating...</>) : (<><Hexagon size={16} fill="black" /> Generate</>)}</button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileView: React.FC = () => {
  return (
    <div className="flex flex-col gap-8 pb-12 overflow-y-auto custom-scrollbar h-full px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="w-64 h-64 rounded-full overflow-hidden relative border-4 border-[#2A8BA8] shadow-2xl shadow-blue-900/20 mb-6"><div className="absolute inset-0 bg-[#E8DAB2]"><HexagonPattern className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4" colorsOverride={[THEMES.red, '#2A3036', THEMES.orange, '#3D405B', '#F4F1DE']} /></div></div>
        </div>
        <div className="lg:col-span-8">
           <div className="flex items-center gap-2 mb-4 text-gray-200"><User size={20} /><h2 className="text-lg font-serif">Bio</h2></div>
           <div className="bg-[#151515] border border-white/5 rounded-3xl p-8 relative">
             <div className="space-y-6">
                <div><h3 className="text-sm font-serif text-gray-400 mb-3">Instruments</h3><div className="flex flex-wrap gap-2"><Tag label="Vocals" icon={Mic2} /><Tag label="Piano" icon={Music} /><Tag label="Guitar" icon={Music} /><Tag label="Drums" icon={Activity} /></div></div>
                 <div className="h-px w-full bg-white/5" />
                <div><h3 className="text-sm font-serif text-gray-400 mb-3">Genres</h3><div className="flex flex-wrap gap-2"><Tag label="Pop" icon={Activity} /><Tag label="R&B" icon={Activity} /></div></div>
                <div className="h-px w-full bg-white/5" />
                <div>
                  <h3 className="text-sm font-serif text-gray-400 mb-3">Focus</h3>
                  <div className="flex flex-wrap gap-2">
                    <Tag label="Producing" icon={Activity} />
                    <Tag label="Songwriting" icon={Activity} />
                    <Tag label="Performing" icon={Activity} />
                    <Tag label="Education" icon={Activity} />
                    <Tag label="Audio" icon={Activity} />
                  </div>
                </div>
             </div>
             <div className="flex items-center justify-end gap-4 mt-8 text-sm text-gray-400">
                <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <div className="w-4 h-4 rounded-full bg-white border border-white" />
                  <span>Public</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <div className="w-4 h-4 rounded-full border border-gray-500" />
                  <span>Private</span>
                </div>
             </div>
           </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-6 mb-4"><h2 className="text-xl font-serif text-gray-100">XP</h2><div className="flex gap-4 text-xs font-medium text-gray-400"><span>This Week vs Last Week</span></div></div>
          <div className="h-64 w-full relative pt-4 bg-[#151515] rounded-3xl border border-white/5 p-4 flex items-center justify-center text-gray-500">Chart Placeholder</div>
        </div>
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div className="flex items-center gap-2 mb-4 text-gray-200"><Users size={18} /><h2 className="text-lg font-serif">Connect</h2><ChevronRight size={16} className="text-gray-600" /></div>
           <div className="bg-[#151515] border border-white/5 rounded-3xl p-4">
             <div className="space-y-1">
               {CONNECT_USERS_DATA.slice(0,3).map((person, i) => (
                 <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer group">
                   <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full bg-[#2A2A2A] overflow-hidden`}><HexagonPattern className="w-[150%] h-[150%] opacity-50" /></div><div><div className="text-sm font-medium text-gray-200">{person.name}</div><p className="text-xs text-gray-500">{person.role} • {person.common}</p></div></div>
                   <Share2 size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const AwardsView: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-12 px-8">
      <div className="flex items-center gap-2 text-lg font-serif text-gray-200 mb-6"><h2>Awards</h2><ChevronRight size={18} className="text-gray-600" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{AWARDS_DATA.map((award, i) => <AwardCard key={i} {...award} />)}</div>
    </div>
  );
};

const AtlasView: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [year, setYear] = useState(1950);

  const toggleFilter = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter);
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="absolute top-6 left-6 right-6 z-20 flex flex-col gap-4 pointer-events-none">
        <div className="flex items-start gap-4 pointer-events-auto">
          <div className="relative">
             <div className="flex items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden h-10 w-80">
                <button onClick={() => { setShowSettings(!showSettings); setActiveFilter(null); }} className="h-full px-3 hover:bg-white/10 transition-colors text-gray-300"><Menu size={20} /></button>
                <input type="text" placeholder="Search" className="bg-transparent h-full flex-1 focus:outline-none text-sm text-white placeholder:text-gray-400" />
                <button className="h-full px-3 hover:bg-white/10 transition-colors text-gray-300"><Search size={18} /></button>
             </div>
             {showSettings && (
               <div className="absolute top-full mt-2 left-0 w-56 bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/10 rounded-xl py-2 shadow-2xl z-50">
                 {[{ label: 'Saved', icon: Heart }, { label: 'Recents', icon: Clock }, { label: 'Your timeline', icon: Activity }, { label: 'Location sharing', icon: MapIcon }, { label: 'Search settings', icon: Settings }].map((item, i) => (
                   <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer text-sm text-gray-200"><item.icon size={16} className="text-gray-400" />{item.label}</div>
                 ))}
               </div>
             )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FilterPill label="Decade" icon={Clock} id="decade" activeFilter={activeFilter} toggleFilter={toggleFilter} />
            <FilterPill label="Region" icon={Globe} id="region" activeFilter={activeFilter} toggleFilter={toggleFilter} />
            <FilterPill label="Genre" icon={Music} id="genre" activeFilter={activeFilter} toggleFilter={toggleFilter} />
            <FilterPill label="Culture" icon={Users} id="culture" activeFilter={activeFilter} toggleFilter={toggleFilter} />
            <FilterPill label="Musicians" icon={Mic2} id="musicians" activeFilter={activeFilter} toggleFilter={toggleFilter} />
          </div>
        </div>
      </div>
      <div className="flex-1 bg-[#62D2D5] relative overflow-hidden cursor-move">
         <svg className="w-full h-full absolute inset-0 text-[#A7D8C6] fill-current" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">
            <path d="M150,60 L200,50 L280,40 L350,50 L380,80 L320,120 L300,180 L260,200 L240,230 L220,220 L200,180 L150,150 L100,100 Z" />
            <path d="M220,120 L240,110 L250,130 L230,140 Z" opacity="0.8" />
            <path d="M260,230 L320,230 L360,270 L340,360 L320,420 L280,440 L270,380 L250,300 Z" />
            <path d="M440,80 L480,70 L510,80 L520,110 L500,120 L480,130 L460,120 L450,100 Z" />
            <path d="M420,70 L435,85 L425,100 L410,85 Z" />
            <path d="M430,160 L500,150 L530,180 L550,250 L510,330 L470,310 L440,260 L420,200 Z" />
            <path d="M560,280 L575,290 L565,320 L550,310 Z" />
            <path d="M530,80 L650,80 L750,90 L800,130 L820,200 L760,250 L700,280 L650,240 L600,220 L560,180 L540,120 Z" />
            <path d="M780,160 L795,170 L785,210 L770,200 Z" />
            <path d="M680,280 L700,290 L690,320 L670,310 Z" />
            <path d="M730,300 L810,300 L830,340 L790,390 L750,370 L730,340 Z" />
            <path d="M850,380 L860,410 L850,430 L840,400 Z" />
            <path d="M360,40 L420,50 L400,90 L350,80 Z" />
         </svg>
         {[
           { x: '25%', y: '30%', color: 'bg-[#F2C94C]' }, { x: '30%', y: '65%', color: 'bg-[#9B51E0]' }, { x: '49%', y: '25%', color: 'bg-[#EB5757]' }, { x: '52%', y: '50%', color: 'bg-[#2F80ED]' }, { x: '72%', y: '35%', color: 'bg-[#F2994A]' }, { x: '82%', y: '70%', color: 'bg-[#56CCF2]' }
         ].map((point, i) => <div key={i} className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-150 transition-transform ${point.color}`} style={{ left: point.x, top: point.y }} />)}
         <div className="absolute bottom-24 right-8 flex flex-col gap-2"><button className="w-8 h-8 bg-[#E0E0E0] text-gray-600 rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors"><Plus size={18} /></button><button className="w-8 h-8 bg-[#E0E0E0] text-gray-600 rounded-lg shadow-lg flex items-center justify-center hover:bg-white transition-colors"><Minus size={18} /></button></div>
      </div>
      <div className="h-20 bg-[#0F0F0F] border-t border-white/10 px-8 flex items-center relative z-20">
         <div className="w-full relative h-10 flex items-center">
            <div className="absolute left-0 right-0 h-0.5 bg-white/20" />
            {[1900, 1925, 1950, 1975, 2000, 2025].map((tick) => (<div key={tick} className="absolute h-full flex flex-col items-center justify-center" style={{ left: `${((tick - 1900) / 125) * 100}%` }}><div className="h-3 w-px bg-white/50 mb-6" /><span className="absolute bottom-0 text-xs text-gray-400 font-mono">{tick}</span></div>))}
            <div className="absolute h-full w-0.5 bg-white flex flex-col items-center cursor-ew-resize group" style={{ left: `${((year - 1900) / 125) * 100}%` }}>
               <div className="w-3 h-3 bg-white rounded-full -mt-1.5 shadow-[0_0_10px_white]" />
               <div className="absolute -top-8 bg-white text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{year}</div>
            </div>
            <input type="range" min="1900" max="2025" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
         </div>
      </div>
    </div>
  );
};

const LibraryView: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-12 px-8">
      <div className="mb-10">
        <div className="flex items-center gap-2 text-lg font-serif text-gray-200 mb-6 group cursor-pointer w-fit"><div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center"><LayoutGrid size={16} /></div><h2>Generated Lessons</h2><ChevronRight size={18} className="text-gray-600 group-hover:translate-x-1 transition-transform" /></div>
        <div className="flex flex-col">{[{ title: 'Untitled 1', date: 'Generated: 10.02.25' }, { title: 'Untitled 2', date: 'Generated: 10.01.25' }, { title: 'Untitled 3', date: 'Generated: 09.29.25' }, { title: 'Untitled 4', date: 'Generated: 09.28.25' }].map((item, i) => <LibraryItem key={i} index={i} type="lesson" title={item.title} subtitle={item.date} />)}</div>
      </div>
      <div>
        <div className="flex items-center gap-2 text-lg font-serif text-gray-200 mb-6 group cursor-pointer w-fit"><div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center"><Music size={16} /></div><h2>My Sounds</h2><ChevronRight size={18} className="text-gray-600 group-hover:translate-x-1 transition-transform" /></div>
        <div className="flex flex-col">{[{ title: 'Preset 1', tags: ['Synth', 'Nu Jazz'] }, { title: 'Preset 2', tags: ['Clav', 'Wah', 'Funk'] }, { title: 'Preset 3', tags: ['Synth', 'Bass'] }, { title: 'Preset 4', tags: ['Synth', 'Lead', 'Hip Hop'] }].map((item, i) => <LibraryItem key={i} index={i + 4} type="sound" title={item.title} tags={item.tags} />)}</div>
      </div>
    </div>
  );
};

const MarketView: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col gap-6 mb-2 px-8 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-gray-200 hover:border-white/30 transition-all">Your Library <CheckCircle2 size={14} className="text-gray-400" /></button>
          <button className="flex items-center gap-2 px-4 py-2 bg-transparent border border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white transition-all w-32 justify-between">Instrument <ChevronDown size={14} /></button>
          <button className="flex items-center gap-2 px-4 py-2 bg-transparent border border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white transition-all w-32 justify-between">Genre <ChevronDown size={14} /></button>
          <button className="flex items-center gap-2 px-4 py-2 bg-transparent border border-white/20 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white transition-all w-32 justify-between">Saved <Heart size={14} /></button>
        </div>
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex gap-16 text-sm text-gray-500 pl-4"><span>Selection</span><span className="flex items-center gap-1 text-gray-300">Name <ArrowUpDown size={12} /></span></div>
          <div className="flex items-center gap-4"><button className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-lg text-xs text-gray-300 hover:border-white/30">Sort <ArrowUpDown size={12} /></button><Shuffle size={18} className="text-gray-500 hover:text-white cursor-pointer" /></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8">
        <div className="flex flex-col">{[{ title: 'Preset 1', tags: ['Synth', 'Nu Jazz'] }, { title: 'Preset 2', tags: ['Clav', 'Wah', 'Funk'] }, { title: 'Preset 3', tags: ['Synth', 'Bass'] }, { title: 'Preset 4', tags: ['Synth', 'Lead', 'Hip Hop'] }, { title: 'Preset 5', tags: ['Piano', 'Pop', 'Singer Songwriter'] }, { title: 'Preset 6', tags: ['Synth', 'Bass', 'EDM'] }, { title: 'Preset 7', tags: ['Synth', 'Chords', 'R&B'] }].map((item, i) => <MarketItem key={i} index={i} {...item} />)}</div>
        <div className="flex justify-center items-center gap-4 mt-8 mb-4 text-sm text-gray-500 font-serif"><ChevronLeft size={16} className="hover:text-white cursor-pointer" /><span className="text-white border-b border-white">1</span><span className="hover:text-white cursor-pointer">2</span><span className="hover:text-white cursor-pointer">3</span><span className="hover:text-white cursor-pointer">4</span><span className="hover:text-white cursor-pointer">5</span><ChevronRight size={16} className="hover:text-white cursor-pointer" /></div>
      </div>
      <PlayerBar />
    </div>
  );
};

const ArcadeView: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar px-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[200px]">
        {ARCADE_GAMES_DATA.map((game, i) => <ArcadeGameCard key={i} {...game} />)}
        <div className="rounded-3xl border border-white/10 bg-[#151515] p-6 flex flex-col justify-between group hover:border-white/20 transition-colors"><div><div className="flex items-center gap-2 text-yellow-500 mb-4"><Trophy size={20} /><span className="text-sm font-bold uppercase tracking-wider">Your Rank</span></div><div className="text-3xl font-serif text-white">#428</div><div className="text-xs text-gray-500 mt-1">Top 15% this week</div></div><div className="flex gap-2 mt-4"><div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full w-3/4 bg-yellow-500" /></div></div></div>
      </div>
    </div>
  );
};

const ConnectView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Network');
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar px-8 pb-12">
       <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-4 text-sm text-gray-400 border-b border-white/10 pb-4">{['Network', 'Messages', 'Collaborations'].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 -mb-4 border-b-2 transition-colors ${activeTab === tab ? 'border-white text-white' : 'border-transparent hover:text-gray-200'}`}>{tab}</button>)}</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
           <h2 className="text-xl font-serif text-white">Recommended for You</h2>
           {CONNECT_USERS_DATA.map((person, i) => (
             <div key={i} className="flex items-center justify-between p-4 bg-[#151515] border border-white/5 rounded-xl hover:border-white/20 transition-colors">
               <div className="flex items-center gap-4"><div className="w-12 h-12 bg-[#2A2A2A] rounded-full overflow-hidden relative"><HexagonPattern className="w-[150%] h-[150%] opacity-50" /></div><div><h3 className="font-medium text-white">{person.name}</h3><p className="text-xs text-gray-500">{person.role} • {person.common}</p></div></div>
               <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-gray-200">Connect</button>
             </div>
           ))}
        </div>
        <div className="flex flex-col gap-6">
          <div className="bg-[#151515] border border-white/5 rounded-3xl p-6">
             <h3 className="text-lg font-serif text-white mb-4">Online Now</h3>
             <div className="flex flex-col gap-4">{[1, 2, 3].map(i => <div key={i} className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-700 relative"><div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#151515] rounded-full" /></div><div className="flex-1"><div className="text-sm text-gray-200">User {i}</div><div className="text-[10px] text-gray-500">In Studio</div></div></div>)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const StudioView: React.FC = () => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  return (
    <div className="flex flex-col h-full bg-[#0F0F0F] text-white overflow-hidden">
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0F0F0F] z-20">
        <div className="flex items-center gap-4"><h1 className="text-2xl font-serif">Untitled <span className="text-blue-400">,</span></h1></div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 bg-[#1A1A1A] px-2 py-1 rounded border border-white/10"><span className="text-sm font-mono">120</span><span className="text-xs text-gray-500">BPM</span><div className="flex gap-1 ml-2"><div className="w-3 h-3 rounded-full border border-gray-500" /><div className="w-3 h-3 rounded-full bg-gray-500" /></div></div>
          <div className="flex items-center gap-2 bg-[#1A1A1A] p-1 rounded-lg border border-white/10"><button className="p-2 hover:bg-white/10 rounded"><Square size={14} fill="currentColor" className="text-gray-400" /></button><button className="p-2 hover:bg-white/10 rounded"><Play size={14} fill="currentColor" className="text-white" /></button><button className="p-2 hover:bg-white/10 rounded"><Disc size={14} fill="currentColor" className="text-red-500" /></button></div>
          <div className="flex items-center gap-4 text-gray-400"><Repeat size={18} className="hover:text-white cursor-pointer" /><div onClick={() => setShowAddMenu(!showAddMenu)} className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${showAddMenu ? 'bg-white text-black rotate-45' : 'bg-white/10 hover:bg-white/20'}`}><Plus size={18} /></div><Eye size={18} className="hover:text-white cursor-pointer" /><Activity size={18} className="hover:text-white cursor-pointer text-blue-400" /></div>
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-sm"><Users size={16} /><span>Connect</span></div>
      </div>
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-8 border-b border-white/10 flex bg-[#0F0F0F]">
          <div className="w-64 border-r border-white/10 px-4 flex items-center text-xs text-gray-500 font-mono">Timeline</div>
          <div className="flex-1 flex">{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="flex-1 border-r border-white/5 pl-2 pt-2 text-xs text-gray-600 font-mono">{i}</div>)}</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0A0A0A] relative">
          <TrackRow name="Color" type="midi" tags={[]} isActive={false} /><TrackRow name="Vocal" type="audio" tags={['Audio']} isActive={false} /><TrackRow name="Melody" type="midi" tags={['Synth', 'Lead']} isActive={false} /><TrackRow name="Chords" type="midi" tags={['Keyboard', 'Nu Jazz']} isActive={true} /><TrackRow name="Bass" type="midi" tags={['Synth', 'Bass']} isActive={false} /><TrackRow name="Drums" type="drum" tags={['Rock']} isActive={false} /><TrackRow name="Master" type="audio" tags={[]} isActive={false} />
          {showAddMenu && (
            <div className="absolute top-20 left-[280px] z-50 flex shadow-2xl rounded-xl overflow-hidden bg-[#252525] border border-white/10 text-sm">
              <div className="w-32 bg-[#2A2A2A] p-2 flex flex-col gap-1 border-r border-white/5">
                <div className="flex items-center justify-between px-2 py-1 text-gray-400 mb-2"><span>Add</span> <Plus size={12} /></div>
                {['Instrument', 'FX', 'Chain'].map((item) => <div key={item} className={`px-3 py-2 rounded cursor-pointer flex items-center gap-2 ${item === 'FX' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}>{item === 'Instrument' && <Activity size={14} />}{item === 'FX' && <Activity size={14} className="rotate-180" />}{item === 'Chain' && <Layers size={14} />}{item}</div>)}
              </div>
              <div className="w-36 bg-[#333333] p-2 flex flex-col gap-1 border-r border-white/5">
                 {['Amp', 'Compressor', 'EQ', 'Overdrive', 'Phaser', 'Reverb', 'Tuner'].map((item) => <div key={item} className={`px-3 py-2 rounded cursor-pointer flex items-center gap-2 ${item === 'Reverb' ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}><Hexagon size={12} className="text-gray-500" />{item}</div>)}
              </div>
              <div className="w-40 bg-[#3A3A3A] p-2 flex flex-col gap-1 relative"><X size={14} className="absolute top-2 right-2 text-gray-500 cursor-pointer hover:text-white" onClick={() => setShowAddMenu(false)} /><div className="px-2 py-1 text-gray-400 mb-2 invisible">Spacer</div>{['Big Room', 'Concert Hall', 'Outer Space'].map((item) => <div key={item} className="px-3 py-2 rounded cursor-pointer flex items-center gap-2 text-gray-200 hover:bg-white/10"><Hexagon size={12} className="text-gray-500" />{item}</div>)}</div>
            </div>
          )}
        </div>
      </div>
      <div className="h-48 bg-[#151515] border-t border-white/10 flex">
        <div className="w-48 border-r border-white/10 p-4 flex gap-4">
           <div className="flex flex-col justify-between items-center h-full"><span className="text-[10px] text-gray-500 font-mono">Gain</span><div className="h-24 w-1 bg-gray-800 rounded-full relative"><div className="absolute bottom-0 w-full h-3/4 bg-green-500 rounded-full" /><div className="absolute bottom-3/4 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow" /></div><span className="text-[10px] text-gray-400 font-mono">0.0</span></div>
           <div className="flex flex-col gap-2 justify-center"><div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center"><div className="w-1 h-3 bg-white rounded-full" /></div><div className="text-[10px] text-center text-gray-500">Pan</div><button className="text-[10px] bg-red-500/20 text-red-400 px-1 rounded border border-red-500/50">Rec</button><button className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1 rounded border border-yellow-500/50">Solo</button></div>
        </div>
        <div className="flex-1 p-4 relative overflow-x-auto custom-scrollbar flex items-center px-12">
           <div className="flex items-center gap-2">
              <EffectNode label="Tuner" color="#5C6B73" /><div className="w-8 h-0.5 bg-gray-700" /><div className="flex flex-col gap-2"><div className="flex gap-2"><EffectNode label="Wah" color="#9C27B0" /><EffectNode label="Pitch" color="#2A9D8F" /></div><div className="flex gap-2 justify-center"><EffectNode label="Comp" color="#264653" /><EffectNode label="Octave" color="#E9C46A" /></div></div><div className="w-8 h-0.5 bg-gray-700" /><div className="flex gap-2"><EffectNode label="OD" color="#E76F51" /><EffectNode label="Dist" color="#D62828" /></div><div className="w-8 h-0.5 bg-gray-700" /><div className="flex flex-col gap-2"><div className="flex gap-2"><EffectNode label="Flange" color="#9D4EDD" /><EffectNode label="Phase" color="#457B9D" /></div><div className="flex gap-2 justify-center"><EffectNode label="Chorus" color="#E9C46A" /></div></div><div className="w-8 h-0.5 bg-gray-700" /><div className="flex flex-col gap-2"><EffectNode label="Delay" color="#F4A261" /><EffectNode label="Reverb" color="#A8DADC" /></div>
           </div>
           <div className="absolute right-0 top-0 bg-white px-2 py-0.5 text-xs text-black font-bold">Instrument</div>
        </div>
      </div>
    </div>
  );
};

// --- FILE: src/pages/LearnView.jsx ---
interface LearnViewProps {
  initialTab?: string;
  setSubTab?: (tab: string) => void;
}

const LearnView: React.FC<LearnViewProps> = ({ initialTab = 'Courses', setSubTab: parentSetSubTab }) => {
  const [subTab, setSubTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilter, setShowFilter] = useState(false);

  // Sync internal state with parent state if provided
  useEffect(() => {
    if (parentSetSubTab) parentSetSubTab(subTab);
  }, [subTab, parentSetSubTab]);

  const activeData = subTab === 'Courses' ? COURSES_DATA : subTab === 'Theory' ? THEORY_DATA : EXPLORE_DATA;
  
  // Helper to render content based on view mode
  const renderContent = (data: ContentItem[]) => {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.map((item, i) => <CardItem key={i} {...item} />)}
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        {data.map((item, i) => (subTab === 'Explore' || subTab === 'Theory' ? <ExploreItem key={i} {...item} /> : <ListItem key={i} {...item} />))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-12 px-8 relative">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-1 bg-[#151515] w-fit p-1 rounded-lg border border-white/5">{['Courses', 'Theory', 'Explore'].map(tab => <button key={tab} onClick={() => setSubTab(tab)} className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${subTab === tab ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>{tab}</button>)}</div>
        <div className="flex items-center justify-between border-b border-white/5 pb-4 relative">
            <div className="flex items-center gap-2">
               <button onClick={() => setShowFilter(!showFilter)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-all w-32 justify-between ${showFilter ? 'bg-white text-black border-white' : 'bg-[#151515] border-white/10 text-gray-300 hover:text-white hover:border-white/20'}`}>Filter {showFilter ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
               <button className="flex items-center gap-2 px-4 py-2 bg-[#151515] border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all w-32 justify-between">Saved <Heart size={14} /></button>
               <button className="flex items-center gap-2 px-4 py-2 bg-[#151515] border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all w-32 justify-between">Sort <ArrowUpDown size={14} /></button>
            </div>
            <div className="flex items-center gap-4 text-gray-500"><div className="flex items-center gap-2"><LayoutGrid size={20} className={`cursor-pointer transition-colors ${viewMode === 'grid' ? 'text-white' : 'hover:text-white'}`} onClick={() => setViewMode('grid')} /><List size={20} className={`cursor-pointer transition-colors ${viewMode === 'list' ? 'text-white' : 'hover:text-white'}`} onClick={() => setViewMode('list')} /></div></div>
        </div>
      </div>
      
      {showFilter && (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 absolute top-[150px] left-8 right-8 z-20 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-start mb-4 pb-2 border-b border-white/5"><h3 className="text-sm font-medium text-gray-200">Filter</h3><X size={16} className="text-gray-500 cursor-pointer hover:text-white" onClick={() => setShowFilter(false)} /></div>
          <div className="grid grid-cols-4 gap-4 h-64 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-1 border-r border-white/5 pr-4"><FilterCheckbox label="Diatonic Modes" checked={true} /><FilterCheckbox label="Relative Modes" /></div>
            <div className="flex flex-col gap-1 border-r border-white/5 pr-4"><FilterCheckbox label="Lydian" /><FilterCheckbox label="Dorian" checked={true} /></div>
            <div className="flex flex-col gap-1 border-r border-white/5 pr-4">{['C', 'G', 'D', 'A'].map(key => <FilterCheckbox key={key} label={key} checked={key === 'A'} />)}</div>
            <div className="flex flex-col gap-1"><FilterCheckbox label="7th Chords" checked={true} /></div>
          </div>
        </div>
      )}

      <div className="flex-1">
        {subTab === 'Explore' || subTab === 'Theory' ? (
          <>
            <CollapsibleSection title="Diatonic Modes" defaultOpen={true} className="mt-4">
              {renderContent(activeData)}
            </CollapsibleSection>
            <CollapsibleSection title="Relative Modes" className="mt-8 border-t border-white/5 pt-4">
              {renderContent(EXPLORE_DATA.slice(0, 3))}
            </CollapsibleSection>
            <CollapsibleSection title="Parallel Modes" className="mt-4 border-t border-white/5 pt-4">
              {renderContent(EXPLORE_DATA.slice(3, 6))}
            </CollapsibleSection>
          </>
        ) : (
           <CollapsibleSection title="Continue" defaultOpen={true} className="mt-4">
              {renderContent(activeData)}
           </CollapsibleSection>
        )}
      </div>
    </div>
  );
};


// --- FILE: src/MusicApp.jsx (Main) ---
export default function MusicApp() {
  const [currentView, setCurrentView] = useState('home'); 
  const [activeTab, setActiveTab] = useState('Home');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const navigateTo = (view: string, tabName: string) => {
    setCurrentView(view);
    if (tabName) setActiveTab(tabName);
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-gray-100 font-sans overflow-hidden selection:bg-red-500/30">
      <aside className="w-64 flex-shrink-0 border-r border-white/5 flex flex-col justify-between p-4 bg-[#0F0F0F]">
        <div>
          <div className="flex items-center gap-3 px-2 mb-8 mt-2">
            <div className="w-10 h-10 flex items-center justify-center relative overflow-hidden group cursor-pointer" onClick={() => navigateTo('home', 'Home')}>
              <img src="https://lh3.googleusercontent.com/pw/AP1GczP9936a8QzW631_v3895A5R7Z3X8h476Y99417195X14335_32892091187978651950-42165006467066011786=w1280-h720" alt="Music Atlas Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="relative mb-6 group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} /><input type="text" placeholder="Search..." className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 focus:bg-[#202020] transition-all placeholder:text-gray-600" /></div>
          <nav className="space-y-1">
            <SidebarItem icon={Home} label="Home" active={activeTab === 'Home' && currentView === 'home'} onClick={() => navigateTo('home', 'Home')} />
            <SidebarItem icon={BookOpen} label="Learn" active={activeTab === 'Learn' && currentView === 'home'} onClick={() => navigateTo('home', 'Learn')} />
            <SidebarItem icon={Music} label="Studio" active={activeTab === 'Studio' || currentView === 'studio'} onClick={() => navigateTo('studio', 'Studio')} />
            <SidebarItem icon={Globe} label="Atlas" active={currentView === 'atlas'} onClick={() => navigateTo('atlas', 'Atlas')} />
            <SidebarItem icon={Library} label="Library" active={currentView === 'library'} onClick={() => navigateTo('library', 'Library')} />
            <SidebarItem icon={ShoppingBag} label="Market" active={currentView === 'market'} onClick={() => navigateTo('market', 'Market')} />
            <SidebarItem icon={Gamepad2} label="Arcade" active={currentView === 'arcade'} onClick={() => navigateTo('arcade', 'Arcade')} />
            <SidebarItem icon={Users} label="Connect" active={currentView === 'connect'} onClick={() => navigateTo('connect', 'Connect')} />
          </nav>
        </div>
        <div className="space-y-1 pt-4 border-t border-white/5"><SidebarItem icon={PlusCircle} label="Add Credits" /><SidebarItem icon={RefreshCw} label="Update Plan" /><SidebarItem icon={Settings} label="Settings" /></div>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-20 flex items-center justify-between px-8 py-6 bg-gradient-to-b from-[#0A0A0A] to-transparent z-10 flex-shrink-0">
          <div className="flex items-center gap-4 group cursor-pointer"><h1 className="text-4xl font-serif text-gray-100 group-hover:text-white transition-colors">{currentView === 'profile' || currentView === 'awards' ? 'Profile' : currentView === 'atlas' ? 'Atlas' : currentView === 'library' ? 'Library' : currentView === 'market' ? 'Market' : currentView === 'arcade' ? 'Arcade' : currentView === 'connect' ? 'Connect' : currentView === 'studio' ? 'Studio' : activeTab === 'Learn' ? 'Learn' : 'Welcome'}</h1>{(currentView === 'profile' || currentView === 'awards' || currentView === 'library' || currentView === 'market' || currentView === 'arcade' || currentView === 'connect') && <div className="text-gray-500 text-lg mt-2 font-light">User Name</div>}</div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <div className="flex items-center gap-2 text-gray-400"><span className="text-white font-bold text-base">432</span> XP</div>
            <div className={`flex items-center gap-2 cursor-pointer transition-colors ${currentView === 'awards' ? 'text-white' : 'text-gray-400 hover:text-white'}`} onClick={() => navigateTo('awards', 'Awards')}><Hexagon size={16} className={`text-yellow-500 ${currentView === 'awards' ? 'fill-yellow-500' : 'fill-yellow-500/20'}`} /><span className="text-white font-bold text-base">12</span> Awards</div>
            {currentView === 'library' || currentView === 'market' ? (<div className="flex items-center gap-3"><div className="flex items-center gap-2 text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><Hexagon size={14} className="text-white fill-white" /><span className="text-white font-bold">60</span> Credits</div><Send size={18} className="text-gray-400 hover:text-white cursor-pointer" /></div>) : (currentView === 'profile' || currentView === 'awards') ? (<div className="flex items-center gap-3"><div className="flex items-center gap-2 text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-white font-bold">60</span> Credits</div><button className="flex items-center gap-1 bg-white text-black px-3 py-1.5 rounded-full text-xs font-bold hover:bg-gray-200"><Edit2 size={12} /> Edit</button><Send size={18} className="text-gray-400 hover:text-white cursor-pointer" /></div>) : (<div className="flex items-center gap-2 text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-white font-bold">60</span> Credits</div>)}
            {!['library', 'market', 'studio'].includes(currentView) && <div className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer group" onClick={() => navigateTo('profile', 'Profile')}><div className="text-right hidden md:block"><div className={`text-white leading-none ${(currentView === 'profile' || currentView === 'awards') ? 'text-blue-400' : ''}`}>User</div><div className="text-xs text-gray-500 mt-1">Pro Member</div></div><div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-2 shadow-lg shadow-purple-500/20 transition-all ${(currentView === 'profile' || currentView === 'awards') ? 'border-white scale-105' : 'border-white/10 group-hover:border-white/50'}`} /></div>}
          </div>
        </header>
        <div className="flex-1 overflow-hidden px-0 pb-0 relative">
          {currentView === 'profile' ? <ProfileView /> : currentView === 'awards' ? <AwardsView /> : currentView === 'atlas' ? <AtlasView /> : currentView === 'library' ? <LibraryView /> : currentView === 'market' ? <MarketView /> : currentView === 'studio' ? <StudioView /> : currentView === 'arcade' ? <ArcadeView /> : currentView === 'connect' ? <ConnectView /> : activeTab === 'Learn' ? <LearnView /> : (
            <HomeView onGenerate={{ prompt, setPrompt, isGenerating, setIsGenerating }} />
          )}
        </div>
      </main>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 20px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }`}</style>
    </div>
  );
}
