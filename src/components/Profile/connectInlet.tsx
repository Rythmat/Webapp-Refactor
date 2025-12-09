import React, { useState } from "react";
import { HeaderBar } from "../ClassroomLayout/HeaderBar";
import { HexagonPattern, DEFAULT_THEMES as THEMES } from "../ui/HexagonPattern";

const CONNECT_USERS_DATA = [
  { name: "Sarah J.", role: "Vocalist", common: "Pop, R&B" },
  { name: "Mike T.", role: "Producer", common: "Electronic" },
  { name: "Davide R.", role: "Guitarist", common: "Jazz" },
  { name: "Elena V.", role: "Songwriter", common: "Folk" },
];

export const ConnectInlet: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Network");

  return (
    <div className="flex flex-col h-full">
      <HeaderBar title="Connect" />
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
                    <HexagonPattern className="w-[150%] h-[150%] opacity-50" colorsOverride={[THEMES.red, THEMES.teal, THEMES.orange]} />
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
