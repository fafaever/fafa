import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Character, AppSettings, ChatSession } from "../types";
import { MemoryDashboard } from "./MemoryDashboard";
import { MemoryManager } from "./MemoryManager";

interface MemoryAppProps {
  characters: Character[];
  settings: AppSettings;
  sessions: ChatSession[];
  onClose: () => void;
}

export default function MemoryApp({ characters, settings, sessions, onClose }: MemoryAppProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 relative overflow-hidden font-sans">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0 shadow-sm z-10 relative">
        <button
          onClick={() => selectedCharacterId ? setSelectedCharacterId(null) : onClose()}
          className="p-1 -ml-1 text-neutral-500 hover:text-black rounded-lg active:scale-95 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-base text-neutral-950">
          {selectedCharacterId ? characters.find(c => c.id === selectedCharacterId)?.name : "记忆"}
        </span>
        <div className="w-7 h-7" />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {selectedCharacterId ? (
          <MemoryManager 
            character={characters.find(c => c.id === selectedCharacterId)!} 
            settings={settings}
            sessions={sessions}
          />
        ) : (
          <MemoryDashboard characters={characters} onSelectCharacter={setSelectedCharacterId} />
        )}
      </div>
    </div>
  );
}
