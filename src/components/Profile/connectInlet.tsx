import React, { useState } from 'react';
import { HeaderBar } from '../ClassroomLayout/HeaderBar';
import { HexagonPattern, DEFAULT_THEMES as THEMES } from '../ui/HexagonPattern';

const CONNECT_USERS_DATA = [
  { name: 'Sarah J.', role: 'Vocalist', common: 'Pop, R&B' },
  { name: 'Mike T.', role: 'Producer', common: 'Electronic' },
  { name: 'Davide R.', role: 'Guitarist', common: 'Jazz' },
  { name: 'Elena V.', role: 'Songwriter', common: 'Folk' },
];

export const ConnectInlet: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Network');

  return (
    <div className="flex h-full flex-col">
      <HeaderBar title="Connect" />
      <div className="custom-scrollbar flex-1 overflow-y-auto px-8 pb-12">
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-4 border-b border-white/10 pb-4 text-sm text-gray-400">
            {['Network', 'Messages', 'Collaborations'].map((tab) => (
              <button
                key={tab}
                className={`-mb-4 border-b-2 pb-4 transition-colors ${activeTab === tab ? 'border-white text-white' : 'border-transparent hover:text-gray-200'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <h2 className="font-serif text-xl text-white">
              Recommended for You
            </h2>
            {CONNECT_USERS_DATA.map((person, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-[#151515] p-4 transition-colors hover:border-white/20"
              >
                <div className="flex items-center gap-4">
                  <div className="relative size-12 overflow-hidden rounded-full bg-[#2A2A2A]">
                    <HexagonPattern
                      className="size-[150%] opacity-50"
                      colorsOverride={[THEMES.red, THEMES.teal, THEMES.orange]}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{person.name}</h3>
                    <p className="text-xs text-gray-500">
                      {person.role} • {person.common}
                    </p>
                  </div>
                </div>
                <button className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-gray-200">
                  Connect
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/5 bg-[#151515] p-6">
              <h3 className="mb-4 font-serif text-lg text-white">Online Now</h3>
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="relative size-8 rounded-full bg-gray-700">
                      <div className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#151515] bg-green-500" />
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
