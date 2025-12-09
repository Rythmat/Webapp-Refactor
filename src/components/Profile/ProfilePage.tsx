import React, { useMemo } from "react";
import { Activity, ChevronRight, Mic2, Music, Share2, User, Users } from "lucide-react";
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
}

const HexagonPattern: React.FC<HexagonPatternProps> = ({ className, colorsOverride }) => {
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
        if (Math.random() > 0.4) {
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
  }, [colorsOverride]);

  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <g transform="translate(20, 20)">{hexs}</g>
    </svg>
  );
};

interface TagProps {
  label: string;
  icon?: React.ElementType;
}

const Tag: React.FC<TagProps> = ({ label, icon: Icon }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs bg-white/5 border-white/5 text-gray-300">
    {Icon && <Icon size={10} />}
    {label}
  </div>
);

interface ConnectUser {
  name: string;
  role: string;
  common: string;
}

const CONNECT_USERS_DATA: ConnectUser[] = [
  { name: "Sarah J.", role: "Vocalist", common: "Pop, R&B" },
  { name: "Mike T.", role: "Producer", common: "Electronic" },
  { name: "Davide R.", role: "Guitarist", common: "Jazz" },
  { name: "Elena V.", role: "Songwriter", common: "Folk" },
];

export const ProfilePage: React.FC = () => {
  return (
    <div className="flex flex-col gap-8 pb-12 overflow-y-auto custom-scrollbar h-full px-8">
      <HeaderBar title="Flow Select" context="learn" showProfile = {false} className="bg-neutral-900/60" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="w-64 h-64 rounded-full overflow-hidden relative border-4 border-[#2A8BA8] shadow-2xl shadow-blue-900/20 mb-6">
            <div className="absolute inset-0 bg-[#E8DAB2]">
              <HexagonPattern
                className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4"
                colorsOverride={[THEMES.red, "#2A3036", THEMES.orange, "#3D405B", "#F4F1DE"]}
              />
            </div>
          </div>
        </div>
        <div className="lg:col-span-8">
          <div className="flex items-center gap-2 mb-4 text-gray-200">
            <User size={20} />
            <h2 className="text-lg font-serif">Bio</h2>
          </div>
          <div className="bg-[#151515] border border-white/5 rounded-3xl p-8 relative">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-serif text-gray-400 mb-3">Instruments</h3>
                <div className="flex flex-wrap gap-2">
                  <Tag label="Vocals" icon={Mic2} />
                  <Tag label="Piano" icon={Music} />
                  <Tag label="Guitar" icon={Music} />
                  <Tag label="Drums" icon={Activity} />
                </div>
              </div>
              <div className="h-px w-full bg-white/5" />
              <div>
                <h3 className="text-sm font-serif text-gray-400 mb-3">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  <Tag label="Pop" icon={Activity} />
                  <Tag label="R&B" icon={Activity} />
                </div>
              </div>
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
          <div className="flex items-center gap-6 mb-4">
            <h2 className="text-xl font-serif text-gray-100">XP</h2>
            <div className="flex gap-4 text-xs font-medium text-gray-400">
              <span>This Week vs Last Week</span>
            </div>
          </div>
          <div className="h-64 w-full relative pt-4 bg-[#151515] rounded-3xl border border-white/5 p-4 flex items-center justify-center text-gray-500">
            Chart Placeholder
          </div>
        </div>
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div className="flex items-center gap-2 mb-4 text-gray-200">
            <Users size={18} />
            <h2 className="text-lg font-serif">Connect</h2>
            <ChevronRight size={16} className="text-gray-600" />
          </div>
          <div className="bg-[#151515] border border-white/5 rounded-3xl p-4">
            <div className="space-y-1">
              {CONNECT_USERS_DATA.slice(0, 3).map((person, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2A2A2A] overflow-hidden">
                      <HexagonPattern className="w-[150%] h-[150%] opacity-50" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-200">{person.name}</div>
                      <p className="text-xs text-gray-500">
                        {person.role} • {person.common}
                      </p>
                    </div>
                  </div>
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
