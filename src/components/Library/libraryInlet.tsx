import {
  Activity,
  CheckCircle2,
  ChevronRight,
  FileAudio,
  Heart,
  LayoutGrid,
  MoreVertical,
  Music,
  Play,
  Share2,
  Sliders,
} from 'lucide-react';
import React, { useState } from 'react';
// import { useNavigate } from "react-router-dom";
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
// import { ProfileRoutes } from "@/constants/routes";
import { HexagonPattern } from '../ui/HexagonPattern';

const THEMES = {
  red: '#D65A65',
  darkGrey: '#5C6B73',
  beige: '#C2C5AA',
  darkRed: '#9D5C63',
  yellow: '#E9C46A',
  teal: '#2A9D8F',
  purple: '#9D4EDD',
  orange: '#E76F51',
  blue: '#457B9D',
  indigo: '#264653',
};

interface LibraryItemProps {
  title: string;
  subtitle?: string;
  tags?: string[];
  index: number;
  type: 'lesson' | 'sound';
}

const LibraryItem: React.FC<LibraryItemProps> = ({
  title,
  subtitle,
  tags,
  index,
  type,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const colors = [THEMES.red, THEMES.darkGrey, THEMES.beige, THEMES.darkRed];
  const color = colors[index % colors.length];

  return (
    <div className="group -mx-2 flex cursor-pointer items-center gap-4 rounded-lg border-b border-white/5 px-2 py-3 transition-colors hover:bg-white/5">
      <div
        className={`flex size-5 cursor-pointer items-center justify-center rounded border transition-colors ${isChecked ? 'border-white bg-white text-black' : 'border-white/30 text-transparent hover:border-white/60'}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsChecked(!isChecked);
        }}
      >
        <CheckCircle2 size={12} />
      </div>
      <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#1A1A1A]">
        <div className="absolute inset-0 opacity-40">
          <HexagonPattern
            className="size-[200%] -translate-x-1/2 -translate-y-1/2"
            colorsOverride={[color]}
          />
        </div>
        {type === 'lesson' ? (
          <FileAudio className="relative z-10 text-gray-300" size={18} />
        ) : (
          <Sliders className="relative z-10 text-gray-300" size={18} />
        )}
      </div>
      <button className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
        <Play fill="currentColor" size={16} />
      </button>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-gray-200">{title}</span>
        {type === 'lesson' ? (
          <span className="w-fit rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
            {subtitle}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {tags?.map((tag, i) => (
              <div
                key={i}
                className="flex items-center gap-1 rounded-full border border-white/10 bg-[#1A1A1A] px-2 py-0.5"
              >
                <Activity className="text-gray-500" size={8} />
                <span className="text-[10px] text-gray-400">{tag}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-gray-500">
        <Heart className="transition-colors hover:text-red-500" size={16} />
        <Share2 className="transition-colors hover:text-white" size={16} />
        <MoreVertical
          className="transition-colors hover:text-white"
          size={16}
        />
      </div>
    </div>
  );
};

export const LibraryInlet: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <HeaderBar title="Library" />
      <div className="custom-scrollbar flex-1 overflow-y-auto px-8 pb-12">
        <div className="mb-10">
          <div className="group mb-6 flex w-fit cursor-pointer items-center gap-2 font-serif text-lg text-gray-200">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <LayoutGrid size={16} />
            </div>
            <h2>Generated Lessons</h2>
            <ChevronRight
              className="text-gray-600 transition-transform group-hover:translate-x-1"
              size={18}
            />
          </div>
          <div className="flex flex-col">
            {[
              { title: 'Untitled 1', date: 'Generated: 10.02.25' },
              { title: 'Untitled 2', date: 'Generated: 10.01.25' },
              { title: 'Untitled 3', date: 'Generated: 09.29.25' },
              { title: 'Untitled 4', date: 'Generated: 09.28.25' },
            ].map((item, i) => (
              <LibraryItem
                key={i}
                index={i}
                subtitle={item.date}
                title={item.title}
                type="lesson"
              />
            ))}
          </div>
        </div>
        <div>
          <div className="group mb-6 flex w-fit cursor-pointer items-center gap-2 font-serif text-lg text-gray-200">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <Music size={16} />
            </div>
            <h2>My Sounds</h2>
            <ChevronRight
              className="text-gray-600 transition-transform group-hover:translate-x-1"
              size={18}
            />
          </div>
          <div className="flex flex-col">
            {[
              { title: 'Preset 1', tags: ['Synth', 'Nu Jazz'] },
              { title: 'Preset 2', tags: ['Clav', 'Wah', 'Funk'] },
              { title: 'Preset 3', tags: ['Synth', 'Bass'] },
              { title: 'Preset 4', tags: ['Synth', 'Lead', 'Hip Hop'] },
            ].map((item, i) => (
              <LibraryItem
                key={i}
                index={i + 4}
                tags={item.tags}
                title={item.title}
                type="sound"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
