import React from "react";
import { Activity, ChevronRight, Mic2, Music, User, Users } from "lucide-react";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { UserAvatarPattern } from "../ui/UserAvatarPattern";
import { useMe } from "@/hooks/data";


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

export const ProfilePage: React.FC = () => {
  const { data: user } = useMe();
  const displayName = user?.nickname || user?.username || "USER";

  return (
    <div className="flex flex-col gap-8 pb-12 overflow-y-auto custom-scrollbar h-full px-8">
      <HeaderBar title="Profile" showProfile = {false} className="bg-neutral-900/60" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="mb-4 px-4 py-2 rounded-full bg-black/35 backdrop-blur-sm border border-white/10 text-white text-lg font-serif text-center">
            {displayName}
          </div>
          <div className="w-64 h-64 rounded-full overflow-hidden relative border-4 border-[#2A8BA8] shadow-2xl shadow-blue-900/20 mb-6">
            <Avatar className="w-full h-full rounded-full">
              <AvatarImage alt="Profile" src="/avatars/01.png" />
              <AvatarFallback className="relative overflow-hidden bg-[#E8DAB2] p-0">
                <UserAvatarPattern
                  userName={displayName}
                  className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4"
                />
              </AvatarFallback>
            </Avatar>
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
            {/* <div className="flex items-center justify-end gap-4 mt-8 text-sm text-gray-400">
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <div className="w-4 h-4 rounded-full bg-white border border-white" />
                <span>Public</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <div className="w-4 h-4 rounded-full border border-gray-500" />
                <span>Private</span>
              </div>
            </div> */}
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
              {/* {CONNECT_USERS_DATA.slice(0, 3).map((person, i) => (
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
              ))} */}
              <div className="flex items-center gap-1">
                <div>
                  <div className="text-sm font-medium text-gray-200">Coming Soon...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
