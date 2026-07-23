import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, BookOpen, Settings, Info, UserPlus, Gamepad2, Search, Book, PenTool, Sparkles, Calendar, Image as ImageIcon, Music, Map, Cloud, Camera, Plus } from "lucide-react";
import { Character, ChatSession, AppSettings } from "../types";

interface GalleryImage {
  id: string;
  dataUrl: string;
  addedAt: number;
}

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

  // Gallery state
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(() => {
    const saved = localStorage.getItem('mobile_ai_gallery');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', dataUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80&grayscale', addedAt: 8 },
      { id: '2', dataUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=120&q=80&grayscale', addedAt: 7 },
      { id: '3', dataUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=120&q=80&grayscale', addedAt: 6 },
      { id: '4', dataUrl: 'https://images.unsplash.com/photo-1507676184212-d0330a15183c?auto=format&fit=crop&w=120&q=80&grayscale', addedAt: 5 },
      { id: '5', dataUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=120&q=80&grayscale', addedAt: 4 },
      { id: '6', dataUrl: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=120&q=80&grayscale', addedAt: 3 },
    ];
  });

  const N = galleryImages.length;
  const baseRepetitions = Math.max(1, Math.ceil(15 / (N || 1)));
  const baseArr = Array.from({ length: baseRepetitions }).flatMap(() => galleryImages);
  const totalBaseN = baseArr.length;

  const [displayIndex, setDisplayIndex] = useState(totalBaseN);
  const [isGalleryTransitioning, setIsGalleryTransitioning] = useState(true);
  const galleryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const carouselTouchStartX = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [longPressMenu, setLongPressMenu] = useState<{ id: string, x: number, y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const restartGalleryTimer = () => {
    if (galleryTimerRef.current) clearInterval(galleryTimerRef.current);
    galleryTimerRef.current = setInterval(() => {
      setIsGalleryTransitioning(true);
      setDisplayIndex(prev => prev + 1);
    }, 2000);
  };

  useEffect(() => {
    if (galleryImages.length === 0) return;
    restartGalleryTimer();
    return () => clearInterval(galleryTimerRef.current!);
  }, [galleryImages.length]);

  const handleGalleryTransitionEnd = () => {
    if (displayIndex >= totalBaseN * 2) {
      setIsGalleryTransitioning(false);
      setDisplayIndex(displayIndex - totalBaseN);
    } else if (displayIndex <= 0) {
      setIsGalleryTransitioning(false);
      setDisplayIndex(displayIndex + totalBaseN);
    }
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

  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (galleryTimerRef.current) clearInterval(galleryTimerRef.current);
    carouselTouchStartX.current = e.touches[0].clientX;
  };

  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (carouselTouchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = carouselTouchStartX.current - touchEndX;

    if (diff > 30) {
      setIsGalleryTransitioning(true);
      setDisplayIndex(prev => prev + 1);
    } else if (diff < -30) {
      setIsGalleryTransitioning(true);
      setDisplayIndex(prev => prev - 1);
    }
    carouselTouchStartX.current = null;
    restartGalleryTimer();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const dataUrl = await compressImage(file, 200);
      const newImage: GalleryImage = {
        id: Date.now().toString(),
        dataUrl,
        addedAt: Date.now()
      };
      const updated = [newImage, ...galleryImages].sort((a, b) => b.addedAt - a.addedAt).slice(0, 20);
      setGalleryImages(updated);
      localStorage.setItem('mobile_ai_gallery', JSON.stringify(updated));
      setIsGalleryTransitioning(false);
      setDisplayIndex(totalBaseN);
    }
  };

  const handleImageTouchStart = (id: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setLongPressMenu({ id, x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const handleImageTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleImageTouchMove = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const deleteImage = (id: string) => {
    const updated = galleryImages.filter(img => img.id !== id);
    setGalleryImages(updated);
    localStorage.setItem('mobile_ai_gallery', JSON.stringify(updated));
    setLongPressMenu(null);
    setIsGalleryTransitioning(false);
    setDisplayIndex(totalBaseN);
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
          
          {/* Gallery Carousel (15% height) */}
          <div className="w-full h-[100px] flex flex-col items-center justify-center relative select-none overflow-hidden mt-4">
            <div 
              className="relative w-full h-[60px]"
              onTouchStart={handleGalleryTouchStart}
              onTouchMove={handleImageTouchMove}
              onTouchEnd={handleGalleryTouchEnd}
            >
              <div 
                className={`flex gap-[6px] absolute top-0 left-1/2 ${isGalleryTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
                style={{ transform: `translateX(calc(-30px - ${displayIndex * 66}px))` }}
                onTransitionEnd={handleGalleryTransitionEnd}
              >
                {baseArr.map((img, idx) => {
                  const isActive = (displayIndex % N) === (idx % N);
                  
                  return (
                    <div 
                      key={`${img.id}-${idx}`}
                      className={`w-[60px] h-[60px] shrink-0 rounded-xl overflow-hidden transition-all duration-300 ${isActive ? 'ring-2 ring-neutral-400 scale-[1.02]' : 'shadow-sm opacity-90 grayscale-[10%]'}`}
                      onTouchStart={(e) => handleImageTouchStart(img.id, e)}
                      onTouchEnd={handleImageTouchEnd}
                    >
                      <img src={img.dataUrl} className="w-full h-full object-cover" alt="gallery item" />
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Dots */}
            <div className="flex gap-1.5 mt-3">
              {galleryImages.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-[4px] rounded-full transition-all duration-300 ${idx === (displayIndex % N) ? 'w-3 bg-neutral-800' : 'w-1.5 bg-neutral-300'}`}
                />
              ))}
            </div>

            {/* Plus Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 w-6 h-6 bg-white rounded-full shadow border border-neutral-200 flex items-center justify-center text-neutral-600 active:scale-95 z-10"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload} 
            />
          </div>

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

      {/* Long press menu */}
      {longPressMenu && (
        <>
          <div className="fixed inset-0 z-40" onTouchStart={() => setLongPressMenu(null)} onClick={() => setLongPressMenu(null)} />
          <div 
            className="fixed z-50 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 w-28 animate-fade-in"
            style={{ top: longPressMenu.y, left: Math.min(longPressMenu.x, window.innerWidth - 120) }}
          >
            <button onClick={() => deleteImage(longPressMenu.id)} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-neutral-50">
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}
