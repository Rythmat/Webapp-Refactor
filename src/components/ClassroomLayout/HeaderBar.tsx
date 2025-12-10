import React from "react";
import {  Hexagon } from "lucide-react";
import { useNavigate } from "react-router";
import { ProfileRoutes } from "@/constants/routes";

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  xp?: number;
  awards?: number;
  credits?: number;
  userName?: string;
  showProfile?: boolean;
  className?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  subtitle,
  xp = 432,
  awards = 14,
  credits = 60,
  userName = "User",
  showProfile = true,
  className = "",
}) => {
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
          onClick={() => navigate(ProfileRoutes.awards())}
          className={`flex items-center gap-2 cursor-pointer transition-colors text-gray-400 hover:text-white`}
        >
          <Hexagon
            size={16}
            className={`text-yellow-500 fill-yellow-500/20`}
          />
          <span className="text-white font-bold text-base">{awards}</span> Awards
        </button>
        {(
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
              <div className={`text-white leading-none`}>{userName}</div>
              {/* <div className="text-xs text-gray-500 mt-1">Pro Member</div> */}
            </div>
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-2 shadow-lg shadow-purple-500/20 transition-all border-white/10 group-hover:border-white/50`}
            />
          </button>
        )}
      </div>
    </header>
  );
};
