import React from "react";
import { Play, Trophy, Users } from "lucide-react";
import { HexagonPattern, DEFAULT_THEMES as THEMES } from "../ui/HexagonPattern";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";

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
  { title: "Scale Runner", players: "605", category: "Technique", color: THEMES.orange },
];

interface ArcadeGameCardProps {
  title: string;
  players: string;
  category: string;
  color: string;
  featured?: boolean;
}

const ArcadeGameCard: React.FC<ArcadeGameCardProps> = ({ title, players, category, color, featured }) => (
  <div
    className={`group relative rounded-3xl overflow-hidden border border-white/10 cursor-pointer transition-all duration-500 ${
      featured ? "md:col-span-2 md:row-span-2" : ""
    }`}
  >
    <div className="absolute inset-0 bg-[#1A1A1A]">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/80" />
      <HexagonPattern
        className={`w-[150%] h-[150%] absolute transition-transform duration-700 group-hover:scale-110 ${
          featured ? "-top-10 -left-10" : "-top-4 -left-4"
        }`}
        colorsOverride={[color, "#1A1A1A"]}
        variant={featured ? "diagonal" : "dense"}
      />
    </div>
    <div className={`relative z-10 flex flex-col justify-between h-full ${featured ? "p-8" : "p-5"}`}>
      <div className="flex justify-between items-start">
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10 ${
            featured ? "bg-white/10 text-white" : "bg-black/40 text-gray-300"
          }`}
        >
          {category}
        </div>
        {featured && (
          <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg shadow-red-500/20">
            LIVE
          </div>
        )}
      </div>
      <div>
        <h3 className={`font-serif font-bold text-white mb-2 leading-tight ${featured ? "text-4xl" : "text-xl"}`}>
          {title}
        </h3>
        <div className="flex items-center gap-4 text-gray-300">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Users size={14} className="text-gray-400" />
            {players} Playing
          </div>
          {featured && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-400">
              <Trophy size={14} />
              Prize: 500 Credits
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl text-black">
        <Play size={20} fill="currentColor" />
      </div>
    </div>
  </div>
);

export const ArcadeInlet: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar px-8 pb-12">
      <HeaderBar title="Arcade" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[200px]">
        {ARCADE_GAMES_DATA.map((game, i) => (
          <ArcadeGameCard key={i} {...game} />
        ))}
        <div className="rounded-3xl border border-white/10 bg-[#151515] p-6 flex flex-col justify-between group hover:border-white/20 transition-colors">
          <div>
            <div className="flex items-center gap-2 text-yellow-500 mb-4">
              <Trophy size={20} />
              <span className="text-sm font-bold uppercase tracking-wider">Your Rank</span>
            </div>
            <div className="text-3xl font-serif text-white">#428</div>
            <div className="text-xs text-gray-500 mt-1">Top 15% this week</div>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-yellow-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
