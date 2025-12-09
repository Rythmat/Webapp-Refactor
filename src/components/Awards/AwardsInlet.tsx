import React, { useMemo } from "react";

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

interface PatternCoord {
  r: number;
  c: number;
}

const AWARDS_DATA = [
  { title: "Popstar", level: 1, description: "Double XP: 25 minutes", pattern: "flower", colors: ["#EDB3B3", THEMES.red, "#9D5C63", "#A6A2C2"] },
  { title: "Rockstar", level: 2, description: "Reward Claimed", pattern: "vShape", colors: [THEMES.darkGrey, "#A3B18A", THEMES.orange, "#3D405B"] },
  { title: "Jewelheart", level: 1, description: "Reward Claimed", pattern: "cluster", colors: ["#9C27B0", "#7209B7", "#4CC9F0", "#F72585", "#E0AAFF"] },
  { title: "Soulstone", level: 1, description: "Double XP: 25 minutes", pattern: "pyramid", colors: [THEMES.red, THEMES.yellow, THEMES.teal, THEMES.indigo, THEMES.purple] },
  { title: "Popstar", level: 2, description: "Triple XP: 15 minutes", pattern: "flower", colors: ["#EDB3B3", THEMES.red, "#9D5C63", "#A6A2C2"] },
  { title: "Rockstar", level: 3, description: "Reward Claimed", pattern: "vShape", colors: [THEMES.darkGrey, "#A3B18A", THEMES.orange, "#3D405B"] },
  { title: "Jewelheart", level: 2, description: "Reward Claimed", pattern: "cluster", colors: ["#9C27B0", "#7209B7", "#4CC9F0", "#F72585", "#E0AAFF"] },
  { title: "Soulstone", level: 2, description: "Reward Claimed", pattern: "pyramid", colors: [THEMES.red, THEMES.yellow, THEMES.teal, THEMES.indigo, THEMES.purple] },
];

interface HexagonPatternProps {
  className?: string;
  colorsOverride?: string[];
  variant?: "default" | "diagonal" | "cluster" | "split" | "dense";
  fixedPattern?: string | PatternCoord[];
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
      const patterns: { [key: string]: PatternCoord[] } = {
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

      const coords = typeof fixedPattern === "string" ? patterns[fixedPattern] || [] : fixedPattern;

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
          const shouldRender = Math.random() > 0.4;
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

interface AwardCardProps {
  title: string;
  level: number;
  description: string;
  pattern: string;
  colors: string[];
}

const AwardCard: React.FC<AwardCardProps> = ({ title, level, description, pattern, colors }) => (
  <div className="flex flex-col rounded-lg overflow-hidden border border-white/10 group hover:border-white/30 transition-all cursor-pointer">
    <div className="h-48 bg-[#121212] relative flex items-center justify-center">
      <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent opacity-50" />
      <HexagonPattern className="w-48 h-48 drop-shadow-2xl" fixedPattern={pattern} colorsOverride={colors} />
    </div>
    <div className="bg-white p-4 flex flex-col gap-1">
      <h3 className="text-black font-serif text-lg">
        {title}: Lvl {level}
      </h3>
      <p className={`text-xs ${description === "Reward Claimed" ? "text-gray-400 italic" : "text-gray-600"}`}>
        {description}
      </p>
    </div>
  </div>
);

export const AwardsInlet: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-12 px-8">
      <div className="flex items-center gap-2 text-lg font-serif text-gray-200 mb-6">
        <h2>Awards</h2>
        <span aria-hidden className="text-gray-600">
          <ChevronRight size={18} />
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {AWARDS_DATA.map((award, i) => (
          <AwardCard key={i} {...award} />
        ))}
      </div>
    </div>
  );
};
