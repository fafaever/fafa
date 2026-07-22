import React from "react";
import { ChevronLeft, Sparkles } from "lucide-react";

interface UniverseAppProps {
  onClose: () => void;
}

export default function UniverseApp({ onClose }: UniverseAppProps) {
  return (
    <div className="flex-1 flex flex-col bg-neutral-950 text-white animate-fade-in relative h-full">
      <div className="h-14 border-b border-neutral-800 flex items-center px-3 shrink-0 sticky top-0 z-50">
        <button onClick={onClose} className="p-1.5 hover:bg-neutral-900 rounded-lg transition active:scale-95 cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative space-y-4">
        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center animate-pulse">
          <Sparkles className="w-8 h-8 text-neutral-400" />
        </div>
        <p className="text-sm font-mono tracking-widest text-neutral-500 uppercase">正在探索中...</p>
      </div>
      {/* Background stars effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
    </div>
  );
}
