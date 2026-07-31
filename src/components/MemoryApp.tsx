import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { Character, AppSettings, ChatSession, ExtractionSettings } from "../types";
import { MemoryDashboard } from "./MemoryDashboard";
import { MemoryManager } from "./MemoryManager";
import { MemoryScopeModal } from "./MemoryScopeModal";

interface MemoryAppProps {
  characters: Character[];
  settings: AppSettings;
  sessions: ChatSession[];
  onClose: () => void;
  onUpdateCharacter?: (id: string, updated: Partial<Character>) => void;
}

export default function MemoryApp({ characters, settings, sessions, onClose, onUpdateCharacter }: MemoryAppProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [autoExtractSignal, setAutoExtractSignal] = useState<number>(0);

  // Read vectorMemoryEnabled state from localStorage for the active character
  const [vectorMemoryEnabled, setVectorMemoryEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (selectedCharacterId) {
      const savedVal = localStorage.getItem(`vector_memory_enabled_${selectedCharacterId}`);
      setVectorMemoryEnabled(savedVal === "true");
    } else {
      setVectorMemoryEnabled(false);
    }
  }, [selectedCharacterId]);

  const handleToggleVectorMemory = () => {
    if (!selectedCharacterId) return;

    const nextVal = !vectorMemoryEnabled;
    
    if (nextVal) {
      setShowScopeModal(true);
    } else {
      const confirmSwitch = window.confirm("确定要关闭向量记忆模式吗？");
      if (!confirmSwitch) return;
      setVectorMemoryEnabled(false);
      localStorage.setItem(`vector_memory_enabled_${selectedCharacterId}`, "false");
    }
  };

  const handleConfirmScope = (scope: ExtractionSettings["vectorScope"]) => {
    if (!selectedCharacterId) return;
    
    setVectorMemoryEnabled(true);
    localStorage.setItem(`vector_memory_enabled_${selectedCharacterId}`, "true");
    
    // Save scope to character extraction settings
    const activeChar = characters.find(c => c.id === selectedCharacterId);
    if (activeChar && onUpdateCharacter) {
      const updatedSettings: ExtractionSettings = {
        ...(activeChar.extractionSettings || {}),
        vectorScope: scope
      };
      onUpdateCharacter(selectedCharacterId, { extractionSettings: updatedSettings });
    }
    
    setShowScopeModal(false);
    setAutoExtractSignal(prev => prev + 1);
  };

  const activeChar = selectedCharacterId ? characters.find(c => c.id === selectedCharacterId) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 relative overflow-hidden ">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0 shadow-sm z-10 relative">
        <button
          onClick={() => selectedCharacterId ? setSelectedCharacterId(null) : onClose()}
          className="p-1 -ml-1 text-neutral-500 hover:text-black rounded-lg active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-neutral-950">
            {activeChar ? activeChar.name : "记忆"}
          </span>
          {selectedCharacterId && (
            <button
              onClick={handleToggleVectorMemory}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 select-none cursor-pointer ${
                vectorMemoryEnabled
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span>{vectorMemoryEnabled ? "向量记忆 (已开启)" : "开启向量记忆"}</span>
              <div className={`w-1.5 h-1.5 rounded-full ${vectorMemoryEnabled ? "bg-emerald-400 animate-pulse" : "bg-neutral-300"}`} />
            </button>
          )}
        </div>

        <div className="w-7 h-7" />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {selectedCharacterId && activeChar ? (
          <MemoryManager 
            character={activeChar} 
            settings={settings}
            sessions={sessions}
            vectorMemoryEnabled={vectorMemoryEnabled}
            onUpdateCharacter={onUpdateCharacter}
            autoExtractSignal={autoExtractSignal}
          />
        ) : (
          <MemoryDashboard characters={characters} onSelectCharacter={setSelectedCharacterId} />
        )}
      </div>

      <MemoryScopeModal 
        isOpen={showScopeModal}
        onClose={() => setShowScopeModal(false)}
        onConfirm={handleConfirmScope}
      />
    </div>
  );
}
