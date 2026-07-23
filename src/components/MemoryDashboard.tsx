import React from "react";
import { Character } from "../types";

interface MemoryDashboardProps {
  characters: Character[];
  onSelectCharacter: (id: string) => void;
}

export function MemoryDashboard({ characters, onSelectCharacter }: MemoryDashboardProps) {
  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      {characters.map(char => (
        <button
          key={char.id}
          onClick={() => onSelectCharacter(char.id)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex flex-col items-center gap-2 active:scale-95 transition-all"
        >
          {char.chatAvatar || char.avatar ? (
            <img src={char.chatAvatar || char.avatar} alt={char.name} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-3xl">👤</div>
          )}
          <span className="text-sm font-bold text-neutral-900">{char.name}</span>
        </button>
      ))}
    </div>
  );
}
