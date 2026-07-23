import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, BookOpen, Settings, Info, UserPlus, Gamepad2, Search, Book, PenTool, Sparkles, Calendar, Image as ImageIcon, Music, Map, Cloud, Camera, Plus } from "lucide-react";
import { Character, ChatSession, AppSettings } from "../types";

const LeftPlaceholder = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100/40 p-3 text-neutral-400 select-none">
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 opacity-60">
      <path d="M20 80 L45 40 L65 70" />
      <path d="M45 70 L65 45 L85 80" />
      <circle cx="70" cy="30" r="8" />
      <line x1="15" y1="80" x2="85" y2="80" />
    </svg>
    <span className="text-[9px] text-neutral-400 mt-2 tracking-wide font-medium">左图 (点击上传/长按重置)</span>
  </div>
);

const RightPlaceholder = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100/40 p-3 text-neutral-400 select-none">
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 opacity-60">
      <path d="M45 80 L55 80 L58 60 L42 60 Z" />
      <path d="M50 60 Q45 45 35 40" />
      <path d="M35 40 Q40 35 45 42" />
      <path d="M50 60 Q50 35 55 25" />
      <path d="M55 25 Q60 30 52 38" />
      <path d="M50 60 Q55 50 65 48" />
      <path d="M65 48 Q60 55 52 54" />
    </svg>
    <span className="text-[9px] text-neutral-400 mt-2 tracking-wide font-medium">右图 (点击上传/长按重置)</span>
  </div>
);

const compressImage = (file: File, maxSizeKB: number = 200): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        const tryCompress = () => {
          if (dataUrl.length > maxSizeKB * 1024 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            tryCompress();
          } else {
            resolve(dataUrl);
          }
        };
        tryCompress();
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
};

interface HomeScreenProps {
  onOpenApp: (appId: string) => void;
  characterCount: number;
  loreCount: number;
  isApiConfigured: boolean;
  characters: Character[];
  sessions: ChatSession[];
  settings?: AppSettings;
}

export default function HomeScreen({ onOpenApp, characterCount, loreCount, isApiConfigured, characters, sessions, settings }: HomeScreenProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const [greeting, setGreeting] = useState(() => localStorage.getItem("mobile_ai_greeting") || "上午好");
  const [healingText, setHealingText] = useState(() => localStorage.getItem("mobile_ai_healing") || "今天也有好好生活");
  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  const [isEditingHealing, setIsEditingHealing] = useState(false);
  
  const touchStartX = useRef<number | null>(null);

  // Gallery state for two independent cards
  const [cardLeft, setCardLeft] = useState<string | null>(() => localStorage.getItem("mobile_ai_card_left"));
  const [cardRight, setCardRight] = useState<string | null>(() => localStorage.getItem("mobile_ai_card_right"));
  const [activeCardUpload, setActiveCardUpload] = useState<"left" | "right" | null>(null);
  const [resetMenuCard, setResetMenuCard] = useState<"left" | "right" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  const startLongPress = (card: "left" | "right") => {
    isLongPressTriggered.current = false;
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      setResetMenuCard(card);
    }, 600);
  };

  const endLongPress = (card: "left" | "right", isClick: boolean) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (!isLongPressTriggered.current && isClick) {
      setActiveCardUpload(card);
      fileInputRef.current?.click();
    }
  };

  const cancelLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handlePointerDown = (card: "left" | "right", e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startLongPress(card);
  };

  const handlePointerUp = (card: "left" | "right", e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const wasTriggered = isLongPressTriggered.current;
    endLongPress(card, !wasTriggered);
  };

  const handlePointerMove = () => {
    cancelLongPress();
  };

  const handleContextMenu = (card: "left" | "right", e: React.MouseEvent) => {
    e.preventDefault();
    setResetMenuCard(card);
  };

  const defaultCharacter = characters[0];
  const lastSession = sessions && sessions.length > 0
    ? [...sessions].sort((a, b) => b.lastActive - a.lastActive)[0]
    : null;
  const timeSinceLast = lastSession ? Math.round((Date.now() - lastSession.lastActive) / 60000) : null;

  useEffect(() => {
    const updateTimeAndDate = () => {
      const now = new Date();
      
      // Format time
      const hours = now.getHours();
      const ampm = hours < 12 ? '上午' : hours < 18 ? '下午' : '晚上';
      const hours12 = hours % 12 || 12;
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTime(`${ampm} ${hours12}:${minutes}`);

      // Format date in Chinese
      const options: Intl.DateTimeFormatOptions = { 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
      };
      setDate(now.toLocaleDateString('zh-CN', options));
    };

    updateTimeAndDate();
    const timer = setInterval(updateTimeAndDate, 1000);
    return () => clearInterval(timer);
  }, []);

  const saveGreeting = (val: string) => {
    setGreeting(val || "上午好");
    localStorage.setItem("mobile_ai_greeting", val || "上午好");
    setIsEditingGreeting(false);
  };

  const saveHealing = (val: string) => {
    setHealingText(val || "今天也有好好生活");
    localStorage.setItem("mobile_ai_healing", val || "今天也有好好生活");
    setIsEditingHealing(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50 && currentPage === 0) {
      setCurrentPage(1); // Swipe left to next page
    } else if (diff < -50 && currentPage === 1) {
      setCurrentPage(0); // Swipe right to prev page
    }
    touchStartX.current = null;
  };

  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeCardUpload) {
      const file = e.target.files[0];
      const dataUrl = await compressImage(file, 200);
      if (activeCardUpload === "left") {
        setCardLeft(dataUrl);
        localStorage.setItem("mobile_ai_card_left", dataUrl);
      } else if (activeCardUpload === "right") {
        setCardRight(dataUrl);
        localStorage.setItem("mobile_ai_card_right", dataUrl);
      }
      e.target.value = "";
      setActiveCardUpload(null);
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      if (clientWidth > 0) {
        const page = Math.round(scrollLeft / clientWidth);
        if (page !== currentPage) {
          setCurrentPage(page);
        }
      }
    }
  };

  const scrollToPage = (pageIndex: number) => {
    setCurrentPage(pageIndex);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: pageIndex * scrollContainerRef.current.clientWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 relative overflow-hidden">
      {settings?.homeWallpaper && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none opacity-40" 
          style={{ backgroundImage: `url(${settings.homeWallpaper})` }}
        />
      )}
      {/* Scrollable Pages Container with Scroll Snap */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full flex flex-row overflow-x-auto snap-x snap-mandatory scrollbar-none flex-1 min-h-0 scroll-smooth"
      >
        {/* Page 1: Main View */}
        <div className="w-full min-w-full shrink-0 snap-start flex flex-col px-5 pt-4 pb-4 text-neutral-900 select-none overflow-y-auto h-full">
          {/* Top: Clock & Date Widget - sticky */}
          <div className="flex flex-col items-center mt-6 text-center animate-fade-in shrink-0 sticky top-0 bg-neutral-50/90 z-10 py-2">
        <h1 className="text-3xl font-mono tracking-tight font-bold text-neutral-950 mb-1 flex items-center gap-2">
          {time} 
          {isEditingGreeting ? (
            <input 
              autoFocus 
              onBlur={(e) => saveGreeting(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveGreeting((e.target as HTMLInputElement).value)}
              defaultValue={greeting}
              className="text-lg bg-neutral-100 border-none outline-none rounded px-2 w-20 text-center font-sans"
            />
          ) : (
            <span onClick={() => setIsEditingGreeting(true)} className="text-lg cursor-pointer font-sans">{greeting}</span>
          )}
        </h1>
        {isEditingHealing ? (
           <input 
             autoFocus 
             onBlur={(e) => saveHealing(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && saveHealing((e.target as HTMLInputElement).value)}
             defaultValue={healingText}
             className="text-xs bg-neutral-100 border-none outline-none rounded px-2 w-40 text-center text-neutral-500 font-sans italic"
           />
        ) : (
          <p onClick={() => setIsEditingHealing(true)} className="text-xs font-medium tracking-wide text-neutral-500 italic cursor-pointer">
            "{healingText}"
          </p>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 py-4 min-h-0">
        {/* NEW: Start Chat Card */}
        {defaultCharacter && (
          <button
            onClick={() => onOpenApp("chat")}
            className="w-full h-[140px] bg-white border border-neutral-200 shadow-sm rounded-[24px] flex flex-col items-center justify-center gap-1.5 p-4 active:scale-98 transition-transform duration-150 shrink-0"
          >
            {defaultCharacter.chatAvatar ? (
              <img src={defaultCharacter.chatAvatar} alt={defaultCharacter.name} className="w-16 h-16 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center text-3xl">
                {defaultCharacter.avatar || "👤"}
              </div>
            )}
            <span className="text-xl font-bold text-neutral-950">{defaultCharacter.name}</span>
            <span className="text-[10px] text-neutral-400">
              {timeSinceLast !== null ? `上次对话：${timeSinceLast}分钟前` : "新对话"}
            </span>
          </button>
        )}

        {/* New 2x2 App Grid */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <button
            onClick={() => onOpenApp("phonecheck")}
            className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all"
          >
            <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <Search className="w-7 h-7 stroke-[1.5] text-neutral-800" />
            </div>
            <span className="text-[11px] text-neutral-500 font-sans">查手机</span>
          </button>

          <button
            onClick={() => onOpenApp("diary")}
            className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all"
          >
            <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <Book className="w-7 h-7 stroke-[1.5] text-neutral-800" />
            </div>
            <span className="text-[11px] text-neutral-500 font-sans">日记</span>
          </button>

          <button
            onClick={() => onOpenApp("notes")}
            className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all"
          >
            <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <PenTool className="w-7 h-7 stroke-[1.5] text-neutral-800" />
            </div>
            <span className="text-[11px] text-neutral-500 font-sans">随笔</span>
          </button>

          <button
            onClick={() => onOpenApp("universe")}
            className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all"
          >
            <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <Sparkles className="w-7 h-7 stroke-[1.5] text-neutral-800" />
            </div>
            <span className="text-[11px] text-neutral-500 font-sans">宇宙</span>
          </button>
        </div>
      </div>

    </div>

        {/* Page 2: Second Screen View */}
        <div className="w-full min-w-full shrink-0 snap-start flex flex-col px-5 pt-8 pb-4 text-neutral-900 select-none overflow-y-auto h-full">
          
          {/* Two Square Gallery Cards, Side-by-Side */}
          <div className="grid grid-cols-2 gap-4 w-full px-1 mt-4 shrink-0 select-none">
            {/* Left Card */}
            <div 
              className="relative aspect-square w-full rounded-2xl overflow-hidden border border-neutral-200/80 bg-white cursor-pointer active:scale-98 transition-all duration-150 shadow-sm flex items-center justify-center group"
              onPointerDown={(e) => handlePointerDown("left", e)}
              onPointerUp={(e) => handlePointerUp("left", e)}
              onPointerCancel={handlePointerMove}
              onPointerLeave={handlePointerMove}
              onPointerMove={handlePointerMove}
              onContextMenu={(e) => handleContextMenu("left", e)}
            >
              {cardLeft ? (
                <img src={cardLeft} className="w-full h-full object-cover" alt="left gallery item" />
              ) : (
                <LeftPlaceholder />
              )}
              {/* Reset Menu Overlay */}
              {resetMenuCard === "left" && (
                <div 
                  className="absolute inset-0 bg-neutral-900/90 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5 p-3 text-center z-10 animate-fade-in" 
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="text-white text-xs font-bold tracking-wide">恢复为默认线条画？</span>
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardLeft(null);
                        localStorage.removeItem("mobile_ai_card_left");
                        setResetMenuCard(null);
                      }} 
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition-transform"
                    >
                      恢复默认
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setResetMenuCard(null);
                      }} 
                      className="px-3 py-1.5 bg-neutral-700 text-white rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition-transform"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Card */}
            <div 
              className="relative aspect-square w-full rounded-2xl overflow-hidden border border-neutral-200/80 bg-white cursor-pointer active:scale-98 transition-all duration-150 shadow-sm flex items-center justify-center group"
              onPointerDown={(e) => handlePointerDown("right", e)}
              onPointerUp={(e) => handlePointerUp("right", e)}
              onPointerCancel={handlePointerMove}
              onPointerLeave={handlePointerMove}
              onPointerMove={handlePointerMove}
              onContextMenu={(e) => handleContextMenu("right", e)}
            >
              {cardRight ? (
                <img src={cardRight} className="w-full h-full object-cover" alt="right gallery item" />
              ) : (
                <RightPlaceholder />
              )}
              {/* Reset Menu Overlay */}
              {resetMenuCard === "right" && (
                <div 
                  className="absolute inset-0 bg-neutral-900/90 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5 p-3 text-center z-10 animate-fade-in" 
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="text-white text-xs font-bold tracking-wide">恢复为默认线条画？</span>
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardRight(null);
                        localStorage.removeItem("mobile_ai_card_right");
                        setResetMenuCard(null);
                      }} 
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition-transform"
                    >
                      恢复默认
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setResetMenuCard(null);
                      }} 
                      className="px-3 py-1.5 bg-neutral-700 text-white rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition-transform"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleCardUpload} 
          />

          <div className="mt-4 mb-6 text-center animate-fade-in">
            <h1 className="text-2xl font-mono tracking-tight font-bold text-neutral-950">所有应用</h1>
          </div>
          
          <div className="grid grid-cols-4 gap-x-3 gap-y-6 px-1">
            <button className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in opacity-80" onClick={() => alert("日历应用开发中...")}>
              <div className="w-13 h-13 bg-white border border-neutral-200 text-neutral-700 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
                <Calendar className="w-5.5 h-5.5 stroke-[1.75]" />
              </div>
              <span className="text-[10px] font-bold tracking-tight text-neutral-600 font-sans">日历</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in opacity-80" onClick={() => alert("相册应用开发中...")}>
              <div className="w-13 h-13 bg-white border border-neutral-200 text-neutral-700 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
                <ImageIcon className="w-5.5 h-5.5 stroke-[1.75]" />
              </div>
              <span className="text-[10px] font-bold tracking-tight text-neutral-600 font-sans">相册</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in opacity-80" onClick={() => alert("音乐应用开发中...")}>
              <div className="w-13 h-13 bg-white border border-neutral-200 text-neutral-700 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
                <Music className="w-5.5 h-5.5 stroke-[1.75]" />
              </div>
              <span className="text-[10px] font-bold tracking-tight text-neutral-600 font-sans">音乐</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in opacity-80" onClick={() => alert("地图应用开发中...")}>
              <div className="w-13 h-13 bg-white border border-neutral-200 text-neutral-700 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
                <Map className="w-5.5 h-5.5 stroke-[1.75]" />
              </div>
              <span className="text-[10px] font-bold tracking-tight text-neutral-600 font-sans">地图</span>
            </button>

            <button className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in opacity-80" onClick={() => alert("云盘应用开发中...")}>
              <div className="w-13 h-13 bg-white border border-neutral-200 text-neutral-700 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
                <Cloud className="w-5.5 h-5.5 stroke-[1.75]" />
              </div>
              <span className="text-[10px] font-bold tracking-tight text-neutral-600 font-sans">云端</span>
            </button>

            <button className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in opacity-80" onClick={() => alert("相机应用开发中...")}>
              <div className="w-13 h-13 bg-white border border-neutral-200 text-neutral-700 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">
                <Camera className="w-5.5 h-5.5 stroke-[1.75]" />
              </div>
              <span className="text-[10px] font-bold tracking-tight text-neutral-600 font-sans">相机</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pagination Indicators - Sticky Footer */}
      <div className="shrink-0 w-full flex justify-center py-2 bg-neutral-50 z-20">
        <div className="flex gap-1.5 items-center">
          <button 
            onClick={() => scrollToPage(0)} 
            className={`h-1.5 rounded-full transition-all duration-300 ${currentPage === 0 ? "bg-black w-3" : "bg-neutral-300 w-1.5"}`} 
            aria-label="第1页"
          />
          <button 
            onClick={() => scrollToPage(1)} 
            className={`h-1.5 rounded-full transition-all duration-300 ${currentPage === 1 ? "bg-black w-3" : "bg-neutral-300 w-1.5"}`} 
            aria-label="第2页"
          />
        </div>
      </div>

      {/* Bottom Fixed App Bar */}
      <div className="shrink-0 w-full px-5 py-4 bg-neutral-50/90 backdrop-blur-sm border-t border-neutral-100 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 gap-3">
          {/* App 1: Chat */}
          <button
            onClick={() => onOpenApp("chat")}
            className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in"
          >
            <div className="w-13 h-13 bg-black text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 hover:bg-neutral-800 transition-all duration-200">
              <MessageSquare className="w-5.5 h-5.5 stroke-[1.75]" />
            </div>
            <span className="text-[10px] font-bold tracking-tight text-neutral-700 font-sans">
              信息
            </span>
          </button>

          {/* App 2: World Book */}
          <button
            onClick={() => onOpenApp("worldbook")}
            className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in"
          >
            <div className="w-13 h-13 bg-white text-black border border-neutral-300 rounded-xl flex items-center justify-center shadow-sm active:scale-95 hover:bg-neutral-50 transition-all duration-200">
              <BookOpen className="w-5.5 h-5.5 stroke-[1.75]" />
            </div>
            <span className="text-[10px] font-bold tracking-tight text-neutral-700 font-sans">
              世界书
            </span>
          </button>

          {/* App 3: Character Creator */}
          <button
            onClick={() => onOpenApp("creator")}
            className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in"
          >
            <div className="w-13 h-13 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 hover:bg-neutral-800 transition-all duration-200">
              <UserPlus className="w-5.5 h-5.5 stroke-[1.75]" />
            </div>
            <span className="text-[10px] font-bold tracking-tight text-neutral-700 font-sans">
              档案
            </span>
          </button>

          {/* App 4: Settings */}
          <button
            onClick={() => onOpenApp("settings")}
            className="flex flex-col items-center gap-2 group focus:outline-none animate-fade-in"
          >
            <div className="w-13 h-13 bg-neutral-200 text-neutral-800 rounded-xl flex items-center justify-center shadow-sm active:scale-95 hover:bg-neutral-300 transition-all duration-200">
              <Settings className="w-5.5 h-5.5 stroke-[1.75]" />
            </div>
            <span className="text-[10px] font-bold tracking-tight text-neutral-700 font-sans">
              系统设置
            </span>
          </button>
        </div>
      </div>


    </div>
  );
}
