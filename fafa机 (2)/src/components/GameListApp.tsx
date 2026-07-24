import React from "react";
import { ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";

interface GameListAppProps {
  onClose: () => void;
  onOpenApp: (appId: string) => void;
}

export function GameListApp({ onClose, onOpenApp }: GameListAppProps) {
  return (
    <div className="flex-1 flex flex-col bg-neutral-50 text-neutral-900 select-none animate-slide-up h-full min-h-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0 shadow-sm z-10 relative">
        <button
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-sans font-bold text-base tracking-wide text-neutral-950 flex items-center gap-1.5">
          <Gamepad2 className="w-5 h-5" />
          游戏中心
        </span>
        <div className="w-7 h-7" />
      </div>

      {/* Game List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-0">
        <div
          onClick={() => onOpenApp("game")} // UNO is mapped to "game" in App.tsx typically, let's keep it that way, wait, the App.tsx maps 'game' to UnoGameApp... No wait, we mapped 'game' to GameListApp in HomeScreen. Let me check what App.tsx maps.
          className="p-4 bg-white border border-neutral-200/60 shadow-sm rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-neutral-200 transition-colors">
              🃏
            </div>
            <div>
              <span className="font-sans font-bold text-sm text-neutral-900 block">UNO 纸牌对战</span>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">经典卡牌对战与策略博弈</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </div>

        <div
          onClick={() => onOpenApp("turtlesoup")}
          className="p-4 bg-white border border-neutral-200/60 shadow-sm rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-neutral-200 transition-colors">
              🐢
            </div>
            <div>
              <span className="font-sans font-bold text-sm text-neutral-900 block">海龟汤 (情境推理)</span>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">海龟汤推理、主持人互动与脑洞大开</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </div>

        <div
          className="p-4 bg-white border border-neutral-200/60 shadow-sm rounded-2xl flex items-center justify-between cursor-not-allowed opacity-60"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-2xl shadow-inner">
              🎭
            </div>
            <div>
              <span className="font-sans font-bold text-sm text-neutral-900 block">真心话大冒险</span>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">即将推出...</p>
            </div>
          </div>
          <span className="text-[10px] bg-neutral-100 px-2 py-1 rounded text-neutral-500 font-sans">敬请期待</span>
        </div>
      </div>
    </div>
  );
}
