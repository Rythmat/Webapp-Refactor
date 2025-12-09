import { ChevronRight } from "lucide-react";
import React from "react";
import { HexagonPattern, DEFAULT_THEMES as THEMES } from "../ui/HexagonPattern";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";

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
      <HeaderBar title="Awards" className="bg-neutral-900/60" />
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
