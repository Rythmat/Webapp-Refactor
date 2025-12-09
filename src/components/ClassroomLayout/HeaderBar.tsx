import React from "react";
import { Edit2, Hexagon, Send } from "lucide-react";
import { useNavigate } from "react-router";
import { ProfileRoutes } from "@/constants/routes";

type HeaderContext =
  | "default"
  | "home"
  | "learn"
  | "library"
  | "market"
  | "profile"
  | "awards"
  | "studio"
  | "connect";

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  xp?: number;
  awards?: number;
  credits?: number;
  context?: HeaderContext;
  userName?: string;
  onAwardsClick?: () => void;
  showProfile?: boolean;
  className?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  subtitle,
  xp = 432,
  awards = 12,
  credits = 60,
  context = "default",
  userName = "User",
  onAwardsClick,
  showProfile = true,
  className = "",
}) => {
  const isLibrary = context === "library" || context === "market";
  const isProfile = context === "profile" || context === "awards";
  const highlightAwards = context === "awards";
  const navigate = useNavigate();

  return (
    <header
      className={`h-20 flex items-center justify-between px-8 py-6 bg-gradient-to-b from-[#0A0A0A] to-transparent z-10 flex-shrink-0 ${className}`}
    >
      <div className="flex items-center gap-4 group cursor-default">
        <h1 className="text-4xl font-serif text-gray-100 group-hover:text-white transition-colors">
          {title}
        </h1>
        {subtitle && <div className="text-gray-500 text-lg mt-2 font-light">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-6 text-sm font-medium">
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-white font-bold text-base">{xp}</span> XP
        </div>
        <button
          type="button"
          onClick={onAwardsClick}
          className={`flex items-center gap-2 cursor-pointer transition-colors ${highlightAwards ? "text-white" : "text-gray-400 hover:text-white"}`}
        >
          <Hexagon
            size={16}
            className={`text-yellow-500 ${highlightAwards ? "fill-yellow-500" : "fill-yellow-500/20"}`}
          />
          <span className="text-white font-bold text-base">{awards}</span> Awards
        </button>
        {isLibrary ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <Hexagon size={14} className="text-white fill-white" />
              <span className="text-white font-bold">{credits}</span> Credits
            </div>
            <Send size={18} className="text-gray-400 hover:text-white cursor-pointer" />
          </div>
        ) : isProfile ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white font-bold">{credits}</span> Credits
            </div>
            <button className="flex items-center gap-1 bg-white text-black px-3 py-1.5 rounded-full text-xs font-bold hover:bg-gray-200">
              <Edit2 size={12} /> Edit
            </button>
            <Send size={18} className="text-gray-400 hover:text-white cursor-pointer" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-bold">{credits}</span> Credits
          </div>
        )}
        {showProfile && (
          <button
            type="button"
            onClick={() => navigate(ProfileRoutes.profile())}
            className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer group"
          >
            <div className="text-right hidden md:block">
              <div className={`text-white leading-none ${isProfile ? "text-blue-400" : ""}`}>{userName}</div>
              <div className="text-xs text-gray-500 mt-1">Pro Member</div>
            </div>
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-2 shadow-lg shadow-purple-500/20 transition-all ${
                isProfile ? "border-white scale-105" : "border-white/10 group-hover:border-white/50"
              }`}
            />
          </button>
        )}
      </div>
    </header>
  );
};
