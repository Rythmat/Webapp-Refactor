import React, { useMemo, useState } from "react";
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
  fixedPattern?: string;
}

const HexagonPattern: React.FC<HexagonPatternProps> = ({
  className,
  colorsOverride,
  variant = "default",
  fixedPattern,
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

    if (fixedPattern) {
      const patterns: { [key: string]: { r: number; c: number }[] } = {
        flower: [
          { r: 2, c: 2 },
          { r: 2, c: 3 },
          { r: 3, c: 2 },
          { r: 3, c: 3 },
          { r: 1, c: 2 },
          { r: 1, c: 3 },
          { r: 2, c: 1 },
        ],
        vShape: [
          { r: 1, c: 1 },
          { r: 2, c: 2 },
          { r: 3, c: 3 },
          { r: 2, c: 4 },
          { r: 1, c: 5 },
          { r: 1, c: 2 },
          { r: 2, c: 3 },
          { r: 1, c: 4 },
        ],
        cluster: [
          { r: 1, c: 4 },
          { r: 2, c: 3 },
          { r: 2, c: 4 },
          { r: 2, c: 5 },
          { r: 3, c: 3 },
          { r: 3, c: 4 },
          { r: 3, c: 5 },
        ],
        pyramid: [
          { r: 1, c: 3 },
          { r: 2, c: 2 },
          { r: 2, c: 3 },
          { r: 2, c: 4 },
          { r: 3, c: 1 },
          { r: 3, c: 2 },
          { r: 3, c: 3 },
          { r: 3, c: 4 },
          { r: 3, c: 5 },
        ],
      };

      const coords = patterns[fixedPattern] || [];

      coords.forEach((pos, i) => {
        const x = pos.c * 26 + (pos.r % 2) * 13;
        const y = pos.r * 22;
        const color = colors[i % colors.length];
        generatedHexs.push(
          <path
            key={`fixed-${i}`}
            d="M13 0 L26 7.5 L26 22.5 L13 30 L0 22.5 L0 7.5 Z"
            fill={color}
            transform={`translate(${x}, ${y}) scale(0.95)`}
            className="opacity-90"
          />,
        );
      });
    } else {
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
    }
    return generatedHexs;
  }, [colorsOverride, variant, fixedPattern]);

  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <g transform="translate(20, 20)">{hexs}</g>
    </svg>
  );
};

interface ConnectUser {
  name: string;
  role: string;
  common: string;
}

const CONNECT_USERS_DATA: ConnectUser[] = [
  { name: "Ryan M.", role: "Lyricist", common: "Hip Hop" },
  { name: "Aaron M.", role: "Guitarist", common: "R&B" },
  { name: "Peter S.", role: "Pianist", common: "Jazz" },
  { name: "Scooter V.", role: "Percussionist", common: "World" },
];

export const ConnectInlet: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Network");

  return (
    <div className="flex flex-col h-full">
      <HeaderBar
        title="Connect"
        context="connect"
      />
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-12">
        <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-4 text-sm text-gray-400 border-b border-white/10 pb-4">
          {["Network", "Messages", "Collaborations"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 -mb-4 border-b-2 transition-colors ${activeTab === tab ? "border-white text-white" : "border-transparent hover:text-gray-200"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <h2 className="text-xl font-serif text-white">Recommended for You</h2>
          {CONNECT_USERS_DATA.map((person, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-[#151515] border border-white/5 rounded-xl hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#2A2A2A] rounded-full overflow-hidden relative">
                  <HexagonPattern className="w-[150%] h-[150%] opacity-50" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{person.name}</h3>
                  <p className="text-xs text-gray-500">
                    {person.role} • {person.common}
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-gray-200">
                Connect
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <div className="bg-[#151515] border border-white/5 rounded-3xl p-6">
             <h3 className="text-lg font-serif text-white mb-4">Online Now</h3>
             <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 relative">
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#151515] rounded-full" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-200">User {i}</div>
                    <div className="text-[10px] text-gray-500">In Studio</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
