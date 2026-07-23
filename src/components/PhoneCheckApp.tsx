import React, { useState, useEffect } from "react";
import { ChevronLeft, MessageCircle, Image, Settings, Calendar, Users, ShoppingBag, FileText, Globe, Search, Battery, Signal, Wifi } from "lucide-react";
import { Character } from "../types";

interface PhoneCheckAppProps {
  characters: Character[];
  onClose: () => void;
}

export default function PhoneCheckApp({ characters, onClose }: PhoneCheckAppProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const selectedChar = characters.find(c => c.id === selectedCharId);

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const modules = [
    { name: "短信", icon: <MessageCircle className="w-6 h-6 text-[#1A1A1A]" />, id: "messages" },
    { name: "相册", icon: <Image className="w-6 h-6 text-[#1A1A1A]" />, id: "gallery" },
    { name: "设置", icon: <Settings className="w-6 h-6 text-[#1A1A1A]" />, id: "settings" },
    { name: "日历", icon: <Calendar className="w-6 h-6 text-[#1A1A1A]" />, id: "calendar" },
    { name: "论坛", icon: <Users className="w-6 h-6 text-[#1A1A1A]" />, id: "forum" },
    { name: "购物车", icon: <ShoppingBag className="w-6 h-6 text-[#1A1A1A]" />, id: "shopping" },
    { name: "备忘录", icon: <FileText className="w-6 h-6 text-[#1A1A1A]" />, id: "notes" },
    { name: "浏览器", icon: <Globe className="w-6 h-6 text-[#1A1A1A]" />, id: "browser" },
  ];

  // Simulated search history based on character tags or basic logic
  const searchHistory = selectedChar ? [
    `${selectedChar.name} 最近关注的事`,
    "心理咨询师考试",
    "附近的咖啡馆",
    "如何提高AI交互感",
    "深夜美食推荐"
  ] : [];

  if (!selectedCharId) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#F5F3F0] font-sans text-[#1A1A1A]">
        <div className="flex items-center p-4">
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm active:scale-95 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="flex-1 text-center font-serif text-lg">查手机</h2>
          <div className="w-9" />
        </div>
        
        <div className="flex-1 p-8">
          <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto">
            {characters.map(char => (
              <button 
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className="flex flex-col items-center gap-3 group active:scale-95 transition-all"
              >
                <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-white shadow-md group-hover:border-neutral-900/10 transition-colors">
                  {char.chatAvatar || char.avatar ? (
                    <img src={char.chatAvatar || char.avatar} alt={char.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-2xl">👤</div>
                  )}
                </div>
                <span className="font-serif text-sm font-medium">{char.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F3F0] relative overflow-hidden font-sans text-[#1A1A1A]">
      {/* Phone Header - Status Bar */}
      <div className="px-5 pt-3 flex justify-between items-center text-[10px] text-[#A8A39A] font-medium">
        <div className="flex items-center gap-1">
          <Signal className="w-3 h-3" />
          <span>中国移动</span>
          <Wifi className="w-3 h-3" />
        </div>
        <div className="flex items-center gap-1">
          <span>88%</span>
          <Battery className="w-3 h-3 rotate-90" />
        </div>
      </div>

      {/* Time & Weather */}
      <div className="flex flex-col items-center justify-center py-6 shrink-0 relative">
        <button 
          onClick={() => setSelectedCharId(null)}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/50 backdrop-blur-sm rounded-full shadow-sm active:scale-95 transition-all z-10"
        >
          <ChevronLeft className="w-5 h-5 text-[#A8A39A]" />
        </button>
        <div className="font-serif italic font-normal text-[#A8A39A] text-4xl tracking-tight mb-1">{formatTime(currentTime)}</div>
        <div className="flex items-center gap-2 text-[#A8A39A] font-serif italic text-sm">
          <span>{formatDate(currentTime)}</span>
          <span className="mx-1">|</span>
          <span>晴 28°C</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-6">
        <div className="relative">
          <button 
            onClick={() => setShowSearchHistory(!showSearchHistory)}
            className="w-full bg-white/60 backdrop-blur-md border border-neutral-200/50 rounded-xl py-2 px-4 flex items-center gap-2 text-neutral-400 text-sm shadow-sm transition-all active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            <span>搜索...</span>
          </button>

          {showSearchHistory && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-lg rounded-xl shadow-lg border border-neutral-100 p-3 z-20 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest mb-2 px-1">最近搜索</div>
              <div className="space-y-2">
                {searchHistory.map((item, idx) => (
                  <div key={idx} className="text-xs py-1 px-1 border-b border-neutral-50 last:border-0 text-neutral-600">
                    {item}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowSearchHistory(false)}
                className="w-full text-center text-[10px] text-neutral-400 mt-3 pt-2 border-t border-neutral-50"
              >
                关闭
              </button>
            </div>
          )}
        </div>
      </div>

      {/* App Grid */}
      <div className="flex-1 px-6 overflow-y-auto pb-20">
        <div className="grid grid-cols-4 gap-y-8 gap-x-4">
          {modules.map((mod) => (
            <button key={mod.id} className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-white/50 group-hover:scale-105 transition-transform active:scale-95">
                {mod.icon}
              </div>
              <span className="font-sans text-[11px] font-medium text-[#1A1A1A]">{mod.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="mt-auto px-6 py-4 flex flex-col items-center gap-1 border-t border-neutral-200/20">
        <div className="flex items-center gap-2">
          <img src={selectedChar?.chatAvatar || selectedChar?.avatar || "👤"} alt={selectedChar?.name} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" />
          <span className="font-serif italic text-xs text-[#A8A39A]">{selectedChar?.name}的手机</span>
        </div>
        <div className="text-[10px] text-[#BFBAB2] font-sans">
          存储空间：已用 32.8GB / 64GB
        </div>
      </div>
    </div>
  );
}
