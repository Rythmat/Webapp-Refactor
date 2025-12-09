import React, { useMemo, useState } from "react";
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
} from "lucide-react";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";

interface ThemeColors {
  [key: string]: string;
}

const THEMES: ThemeColors = {
  red: "#D65A65",
  darkGrey: "#5C6B73",
  beige: "#C2C5AA",
  darkRed: "#9D5C63",
  yellow: "#E9C46A",
  teal: "#2A9D8F",
  purple: "#9D4EDD",
  orange: "#E76F51",
  blue: "#457B9D",
  indigo: "#264653",
};

interface HexagonPatternProps {
  className?: string;
  colorsOverride?: string[];
  variant?: "default" | "diagonal" | "cluster" | "split" | "dense";
}

const HexagonPattern: React.FC<HexagonPatternProps> = ({
  className,
  colorsOverride,
  variant = "default",
}) => {
  const hexs = useMemo(() => {
    const generatedHexs: React.JSX.Element[] = [];
    const colors =
      colorsOverride || [
        THEMES.red,
        THEMES.red,
        THEMES.darkGrey,
        THEMES.beige,
        THEMES.beige,
        THEMES.darkRed,
      ];

    const rows = 12;
    const cols = 16;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let shouldRender = false;
        if (variant === "diagonal") {
          shouldRender = r + c > 8 && r + c < 18 && Math.random() > 0.3;
        } else if (variant === "cluster") {
          shouldRender = Math.sqrt(r * r + c * c) < 10 && Math.random() > 0.4;
        } else if (variant === "split") {
          shouldRender = (c < 6 || c > 10) && Math.random() > 0.3;
        } else if (variant === "dense") {
          shouldRender = Math.random() > 0.2;
        } else {
          shouldRender = Math.random() > 0.4;
        }

        if (shouldRender) {
          const x = c * 26 + (r % 2) * 13;
          const y = r * 22;
          const color = colors[Math.floor(Math.random() * colors.length)];
          generatedHexs.push(
            <path
              key={`${r}-${c}`}
              d="M13 0 L26 7.5 L26 22.5 L13 30 L0 22.5 L0 7.5 Z"
              fill={color}
              transform={`translate(${x}, ${y}) scale(0.95)`}
              className="opacity-90"
            />,
          );
        }
      }
    }
    return generatedHexs;
  }, [colorsOverride, variant]);

  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <g transform="translate(20, 20)">{hexs}</g>
    </svg>
  );
};

interface LibraryItemProps {
  title: string;
  subtitle?: string;
  tags?: string[];
  index: number;
  type: "lesson" | "sound";
}

const LibraryItem: React.FC<LibraryItemProps> = ({ title, subtitle, tags, index, type }) => {
  const [isChecked, setIsChecked] = useState(false);
  const colors = [THEMES.red, THEMES.darkGrey, THEMES.beige, THEMES.darkRed];
  const color = colors[index % colors.length];

  return (
    <div className="group flex items-center gap-4 py-3 border-b border-white/5 hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors cursor-pointer">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsChecked(!isChecked);
        }}
        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${isChecked ? "bg-white border-white text-black" : "border-white/30 text-transparent hover:border-white/60"}`}
      >
        <CheckCircle2 size={12} />
      </div>
      <div className="w-10 h-10 bg-[#1A1A1A] rounded-lg border border-white/10 flex items-center justify-center overflow-hidden relative flex-shrink-0">
        <div className="absolute inset-0 opacity-40">
          <HexagonPattern className="w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2" colorsOverride={[color]} />
        </div>
        {type === "lesson" ? (
          <FileAudio size={18} className="text-gray-300 relative z-10" />
        ) : (
          <Sliders size={18} className="text-gray-300 relative z-10" />
        )}
      </div>
      <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
        <Play size={16} fill="currentColor" />
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <span className="text-sm font-medium text-gray-200">{title}</span>
        {type === "lesson" ? (
          <span className="text-[10px] text-gray-500 bg-white/5 w-fit px-1.5 py-0.5 rounded uppercase tracking-wide">
            {subtitle}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            {tags?.map((tag, i) => (
              <div
                key={i}
                className="flex items-center gap-1 bg-[#1A1A1A] border border-white/10 rounded-full px-2 py-0.5"
              >
                <Activity size={8} className="text-gray-500" />
                <span className="text-[10px] text-gray-400">{tag}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-gray-500">
        <Heart size={16} className="hover:text-red-500 transition-colors" />
        <Share2 size={16} className="hover:text-white transition-colors" />
        <MoreVertical size={16} className="hover:text-white transition-colors" />
      </div>
    </div>
  );
};

export const LibraryInlet: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <HeaderBar
        title="Library"
        context="library"
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-12 px-8">
        <div className="mb-10">
          <div className="flex items-center gap-2 text-lg font-serif text-gray-200 mb-6 group cursor-pointer w-fit">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <LayoutGrid size={16} />
          </div>
          <h2>Generated Lessons</h2>
          <ChevronRight size={18} className="text-gray-600 group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="flex flex-col">
          {[
            { title: "Untitled 1", date: "Generated: 10.02.25" },
            { title: "Untitled 2", date: "Generated: 10.01.25" },
            { title: "Untitled 3", date: "Generated: 09.29.25" },
            { title: "Untitled 4", date: "Generated: 09.28.25" },
          ].map((item, i) => (
            <LibraryItem key={i} index={i} type="lesson" title={item.title} subtitle={item.date} />
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 text-lg font-serif text-gray-200 mb-6 group cursor-pointer w-fit">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Music size={16} />
          </div>
          <h2>My Sounds</h2>
          <ChevronRight size={18} className="text-gray-600 group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="flex flex-col">
          {[
            { title: "Preset 1", tags: ["Synth", "Nu Jazz"] },
            { title: "Preset 2", tags: ["Clav", "Wah", "Funk"] },
            { title: "Preset 3", tags: ["Synth", "Bass"] },
            { title: "Preset 4", tags: ["Synth", "Lead", "Hip Hop"] },
          ].map((item, i) => (
            <LibraryItem key={i} index={i + 4} type="sound" title={item.title} tags={item.tags} />
          ))}
        </div>
      </div>
    </div>
  </div>
  );
};
