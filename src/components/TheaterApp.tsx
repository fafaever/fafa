import React, { useState } from "react";
import { Character, AppSettings } from "../types";
import { OfflineMeetView } from "./OfflineMeetView";
import { ArrowLeft, User, Sparkles } from "lucide-react";

interface TheaterAppProps {
  characters: Character[];
  settings: AppSettings;
  activeChatCharId: string | null;
  onClose: () => void;
}

export const TheaterApp: React.FC<TheaterAppProps> = ({
  characters,
  settings,
  activeChatCharId,
  onClose
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(activeChatCharId || null);

  const selectedChar = characters.find(c => c.id === selectedCharId);

  if (selectedChar) {
    return (
      <OfflineMeetView
        character={selectedChar}
        settings={settings}
        onClose={onClose}
        forcedMode="isolated"
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8F6F3] text-stone-900 font-sans h-full w-full select-none">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-100 shrink-0 shadow-sm z-10 relative">
        <button 
          onClick={onClose}
          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-base tracking-wide text-stone-800">小剧场</span>
          <span className="text-[9px] text-stone-500 font-medium">独立架空演绎模式</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        <div className="text-center mb-6 mt-4">
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-sm font-bold text-stone-800">选择演绎角色</h2>
          <p className="text-[11px] text-stone-500 mt-1 max-w-[240px] mx-auto">
            小剧场是完全独立的平行宇宙，不读取任何主线记忆。你可以与角色进行任意剧情演绎。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {characters.filter(c => !c.isGroup).map(char => (
            <button
              key={char.id}
              onClick={() => setSelectedCharId(char.id)}
              className="bg-white p-3 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center gap-2 hover:border-purple-200 hover:shadow-md transition-all active:scale-95 group"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 border border-stone-200 shadow-sm group-hover:scale-105 transition-transform">
                {char.avatar.startsWith('http') ? (
                  <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    {char.avatar}
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-stone-800 truncate w-full text-center">{char.name}</span>
            </button>
          ))}
          {characters.filter(c => !c.isGroup).length === 0 && (
             <div className="col-span-2 text-center text-xs text-stone-400 py-4">
               暂无可用角色
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
