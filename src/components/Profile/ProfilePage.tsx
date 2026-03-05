import { Activity, ChevronRight, Mic2, Music, User, Users } from 'lucide-react';
import React from 'react';
import { useMe } from '@/hooks/data';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { UserAvatarPattern } from '../ui/UserAvatarPattern';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface TagProps {
  label: string;
  icon?: React.ElementType;
}

const Tag: React.FC<TagProps> = ({ label, icon: Icon }) => (
  <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
    {Icon && <Icon size={10} />}
    {label}
  </div>
);

export const ProfilePage: React.FC = () => {
  const { data: user } = useMe();
  const displayName = user?.nickname || user?.username || 'USER';

  return (
    <div className="custom-scrollbar flex h-full flex-col gap-8 overflow-y-auto px-8 pb-12">
      <HeaderBar
        className="bg-neutral-900/60"
        showProfile={false}
        title="Profile"
      />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col items-center lg:col-span-4">
          <div className="mb-4 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-center font-serif text-lg text-white backdrop-blur-sm">
            {displayName}
          </div>
          <div className="relative mb-6 size-64 overflow-hidden rounded-full border-4 border-[#2A8BA8] shadow-2xl shadow-blue-900/20">
            <Avatar className="size-full rounded-full">
              <AvatarImage alt="Profile" src="/avatars/01.png" />
              <AvatarFallback className="relative overflow-hidden bg-[#E8DAB2] p-0">
                <UserAvatarPattern
                  className="size-full"
                  userName={displayName}
                />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="lg:col-span-8">
          <div className="mb-4 flex items-center gap-2 text-gray-200">
            <User size={20} />
            <h2 className="font-serif text-lg">Bio</h2>
          </div>
          <div className="relative rounded-3xl border border-white/5 bg-[#151515] p-8">
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-serif text-sm text-gray-400">
                  Instruments
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Tag icon={Mic2} label="Vocals" />
                  <Tag icon={Music} label="Piano" />
                  <Tag icon={Music} label="Guitar" />
                  <Tag icon={Activity} label="Drums" />
                </div>
              </div>
              <div className="h-px w-full bg-white/5" />
              <div>
                <h3 className="mb-3 font-serif text-sm text-gray-400">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Tag icon={Activity} label="Pop" />
                  <Tag icon={Activity} label="R&B" />
                </div>
              </div>
              <div className="h-px w-full bg-white/5" />
              <div>
                <h3 className="mb-3 font-serif text-sm text-gray-400">Focus</h3>
                <div className="flex flex-wrap gap-2">
                  <Tag icon={Activity} label="Producing" />
                  <Tag icon={Activity} label="Songwriting" />
                  <Tag icon={Activity} label="Performing" />
                  <Tag icon={Activity} label="Education" />
                  <Tag icon={Activity} label="Audio" />
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="mb-4 flex items-center gap-6">
            <h2 className="font-serif text-xl text-gray-100">XP</h2>
            <div className="flex gap-4 text-xs font-medium text-gray-400">
              <span>This Week vs Last Week</span>
            </div>
          </div>
          <div className="relative flex h-64 w-full items-center justify-center rounded-3xl border border-white/5 bg-[#151515] p-4 text-gray-500">
            Chart Placeholder
          </div>
        </div>
        <div className="mt-8 lg:col-span-4 lg:mt-0">
          <div className="mb-4 flex items-center gap-2 text-gray-200">
            <Users size={18} />
            <h2 className="font-serif text-lg">Connect</h2>
            <ChevronRight className="text-gray-600" size={16} />
          </div>
          <div className="rounded-3xl border border-white/5 bg-[#151515] p-4">
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
                  <div className="text-sm font-medium text-gray-200">
                    Coming Soon...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
