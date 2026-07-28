import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, BookOpen, Settings, Info, UserPlus, Gamepad2, Search, Book, PenTool, Sparkles, Calendar, Image as ImageIcon, Music, Map, Cloud, Camera, Plus, Network } from "lucide-react";
import { Character, ChatSession, AppSettings } from "../types";

const LeftPlaceholder = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100/40 p-3 text-neutral-400 select-none">
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 opacity-60">
      <path d="M20 80 L45 40 L65 70" />
      <path d="M45 70 L65 45 L85 80" />
      <circle cx="70" cy="30" r="8" />
      <line x1="15" y1="80" x2="85" y2="80" />
    </svg>
          <div className="text-[11px] text-neutral-400 mt-2 tracking-wide font-medium">左图 (点击上传/长按重置)</div>
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
          <div className="text-[11px] text-neutral-400 mt-2 tracking-wide font-medium">右图 (点击上传/长按重置)</div>
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

export interface LauncherItem {
  id: string;
  name: string;
  colSpan: number; // 1, 2, 3
  type: 'app' | 'card';
}

const DEFAULT_LAUNCHER_ITEMS: LauncherItem[] = [
  { id: 'phonecheck', name: '查手机', colSpan: 1, type: 'app' },
  { id: 'universe', name: '宇宙', colSpan: 1, type: 'app' },
  { id: 'theater', name: '小剧场', colSpan: 1, type: 'app' },
  { id: 'forum', name: '论坛卡片', colSpan: 2, type: 'card' },
  { id: 'gamelist', name: '游戏', colSpan: 1, type: 'app' },
  { id: 'memory', name: '记忆', colSpan: 1, type: 'app' },
  { id: 'network', name: '关系网', colSpan: 1, type: 'app' },
  { id: 'cloud', name: '云端', colSpan: 1, type: 'app' },
  { id: 'help', name: '帮助', colSpan: 1, type: 'app' },
];

export default function HomeScreen({ onOpenApp, characterCount, loreCount, isApiConfigured, characters, sessions, settings }: HomeScreenProps) {
  const [launcherItems, setLauncherItems] = useState<LauncherItem[]>(() => {
    const saved = localStorage.getItem("mobile_ai_launcher_items_v2");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_LAUNCHER_ITEMS;
  });

  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const draggedElementRef = useRef<HTMLDivElement | null>(null);

  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSpan = useRef(2);

  const itemLongPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isItemLongPressTriggered = useRef(false);

  const handleItemPointerDown = (index: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isItemLongPressTriggered.current = false;
    if (itemLongPressTimeoutRef.current) clearTimeout(itemLongPressTimeoutRef.current);
    
    itemLongPressTimeoutRef.current = setTimeout(() => {
      isItemLongPressTriggered.current = true;
      setIsEditingLayout(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600);
  };

  const handleItemPointerUp = (index: number, item: LauncherItem, e: React.PointerEvent) => {
    if (itemLongPressTimeoutRef.current) {
      clearTimeout(itemLongPressTimeoutRef.current);
      itemLongPressTimeoutRef.current = null;
    }
    
    if (!isItemLongPressTriggered.current) {
      if (!isEditingLayout) {
        if (item.id === 'cloud') {
          alert("云端服务即将开放...");
        } else {
          onOpenApp(item.id);
        }
      }
    }
  };

  const handleItemPointerCancel = () => {
    if (itemLongPressTimeoutRef.current) {
      clearTimeout(itemLongPressTimeoutRef.current);
      itemLongPressTimeoutRef.current = null;
    }
  };

  const handleDragStart = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditingLayout) return;
    if ((e.target as HTMLElement).closest(".resize-handle")) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggedIndex(index);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
    draggedElementRef.current = e.currentTarget;
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggedIndex === null) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    setDragOffset({ x: dx, y: dy });

    const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    const hoverItem = element?.closest("[data-launcher-index]") as HTMLElement;
    if (hoverItem) {
      const hoverIndex = parseInt(hoverItem.getAttribute("data-launcher-index") || "", 10);
      if (!isNaN(hoverIndex) && hoverIndex !== draggedIndex) {
        setLauncherItems(prev => {
          const next = [...prev];
          const [draggedItem] = next.splice(draggedIndex, 1);
          next.splice(hoverIndex, 0, draggedItem);
          setDraggedIndex(hoverIndex);
          return next;
        });
      }
    }
  };

  const handleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggedIndex === null) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggedIndex(null);
    setDragOffset({ x: 0, y: 0 });
    draggedElementRef.current = null;
    localStorage.setItem("mobile_ai_launcher_items_v2", JSON.stringify(launcherItems));
  };

  const handleResizeStart = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizingIndex(index);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSpan.current = launcherItems[index].colSpan;
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizingIndex === null) return;
    const dx = e.clientX - resizeStartPos.current.x;
    const threshold = 60;
    const spanChange = Math.round(dx / threshold);
    let nextSpan = resizeStartSpan.current + spanChange;
    nextSpan = Math.max(1, Math.min(3, nextSpan));
    
    if (nextSpan !== launcherItems[resizingIndex].colSpan) {
      setLauncherItems(prev => {
        const next = [...prev];
        next[resizingIndex] = { ...next[resizingIndex], colSpan: nextSpan };
        return next;
      });
    }
  };

  const handleResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizingIndex === null) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setResizingIndex(null);
    localStorage.setItem("mobile_ai_launcher_items_v2", JSON.stringify(launcherItems));
  };

  // Partition helper
  const page1Items: LauncherItem[] = [];
  const page2Items: LauncherItem[] = [];
  let currentSlots = 0;
  launcherItems.forEach(item => {
    if (currentSlots + item.colSpan <= 6) {
      page1Items.push(item);
      currentSlots += item.colSpan;
    } else {
      page2Items.push(item);
    }
  });

  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const [greeting, setGreeting] = useState(() => localStorage.getItem("mobile_ai_greeting") || "上午好");
  const [healingText, setHealingText] = useState(() => localStorage.getItem("mobile_ai_healing") || "今天也有好好生活");
  const [loveText, setLoveText] = useState(() => localStorage.getItem("mobile_ai_card_love_text") || "Love");
  const [isEditingGreeting, setIsEditingGreeting] = useState(false);
  const [isEditingHealing, setIsEditingHealing] = useState(false);
  const [isEditingLoveText, setIsEditingLoveText] = useState(false);
  
  const touchStartX = useRef<number | null>(null);

  // Gallery state for two independent cards
  const [cardLeft, setCardLeft] = useState<string | null>(() => localStorage.getItem("mobile_ai_card_left"));
  const [cardRight, setCardRight] = useState<string | null>(() => localStorage.getItem("mobile_ai_card_right"));
  const [activeCardUpload, setActiveCardUpload] = useState<"left" | "right" | null>(null);
  const [resetMenuCard, setResetMenuCard] = useState<"left" | "right" | null>(null);
  const [latestForumPost, setLatestForumPost] = useState<any>(null);
  const [latestForumBoardName, setLatestForumBoardName] = useState<string>("");

  useEffect(() => {
    try {
      const storedPosts = localStorage.getItem("mobile_ai_forum_posts");
      if (storedPosts) {
        const posts = JSON.parse(storedPosts);
        if (Array.isArray(posts) && posts.length > 0) {
          // Find the post with the latest comment, or just the latest post if no comments
          let latestPost = posts[0];
          let latestTime = posts[0].timestamp;
          
          for (const post of posts) {
            let postLatestTime = post.timestamp;
            if (post.comments && post.comments.length > 0) {
              const lastComment = post.comments[post.comments.length - 1];
              if (lastComment.timestamp > postLatestTime) {
                postLatestTime = lastComment.timestamp;
              }
            }
            if (postLatestTime > latestTime) {
              latestTime = postLatestTime;
              latestPost = post;
            }
          }
          
          setLatestForumPost(latestPost);
          
          const storedBoards = localStorage.getItem("mobile_ai_forum_boards");
          if (storedBoards) {
            const boards = JSON.parse(storedBoards);
            const board = boards.find((b: any) => b.id === latestPost.boardId);
            if (board) setLatestForumBoardName(board.name);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);


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
  const targetChar = lastSession 
    ? characters.find(c => c.id === lastSession.characterId) || defaultCharacter 
    : defaultCharacter;
  const timeSinceLast = lastSession ? Math.round((Date.now() - lastSession.lastActive) / 60000) : null;
  
  // Random status for demo
  const [status, setStatus] = useState("在线");
  useEffect(() => {
    const statuses = ["在线", "在发呆", "刚刚离线", "正在输入...", "在看风景"];
    setStatus(statuses[Math.floor(Math.random() * statuses.length)]);
  }, [defaultCharacter]);

  useEffect(() => {
    const updateTimeAndDate = () => {
      const now = new Date();
      
      // Format time (24h)
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTime(`${hours}:${minutes}`);

      // Format date in Chinese
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric',
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

  const defaultIcons: Record<string, string> = {
    'phonecheck': '/images/tubiao/查手机.jpg',
    'universe': '/images/tubiao/宇宙.jpg',
    'theater': '/images/tubiao/小剧场.jpg',
    'gamelist': '/images/tubiao/游戏.jpg',
    'memory': '/images/tubiao/记忆.jpg',
    'cloud': '/images/tubiao/云端.jpg',
    'help': '/images/tubiao/帮助.jpg',
    'chat': '/images/tubiao/信息.jpg',
    'worldbook': '/images/tubiao/世界书.jpg',
    'creator': '/images/tubiao/档案.jpg',
    'settings': '/images/tubiao/系统设置.jpg',
    'forum': '/images/tubiao/信息.jpg',
    'network': '/images/tubiao/关系网.jpg'
  };

  const getAppIcon = (key: string, fallback: React.ReactNode) => {
    if (settings?.appIcons?.[key]) {
      return <img src={settings.appIcons[key]} className="w-full h-full object-cover" />;
    }
    if (defaultIcons[key]) {
      return <img src={defaultIcons[key]} className="w-full h-full object-cover" />;
    }
    return fallback;
  };

  const renderLauncherItem = (item: LauncherItem, indexInList: number) => {
    const isDragged = draggedIndex === indexInList;
    const style: React.CSSProperties = isDragged ? {
      transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
      zIndex: 50,
      opacity: 0.8,
      pointerEvents: 'none'
    } : {};

    let iconContent: React.ReactNode = null;
    if (item.id === 'phonecheck') {
      iconContent = getAppIcon('phonecheck', <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-[1.5] stroke-black" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /></svg>);
    } else if (item.id === 'universe') {
      iconContent = getAppIcon('universe', <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-[1.5] stroke-black" fill="none"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>);
    } else if (item.id === 'theater') {
      iconContent = getAppIcon('theater', <span className="text-2xl grayscale">🎭</span>);
    } else if (item.id === 'gamelist') {
      iconContent = getAppIcon('gamelist', <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-[1.5] stroke-black" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 12h4m-2-2v4m10-2h-4" /></svg>);
    } else if (item.id === 'memory') {
      iconContent = getAppIcon('memory', <span className="text-2xl grayscale">🧠</span>);
    } else if (item.id === 'network') {
      iconContent = getAppIcon('network', <Network className="w-7 h-7 text-black/80 stroke-[1.5]" />);
    } else if (item.id === 'cloud') {
      iconContent = getAppIcon('cloud', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-black/80"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>);
    } else if (item.id === 'help') {
      iconContent = getAppIcon('help', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-black/80"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
    }

    if (item.type === 'card' && item.id === 'forum') {
      const colSpanClass = item.colSpan === 3 ? 'col-span-3' : item.colSpan === 2 ? 'col-span-2' : 'col-span-1';
      return (
        <div
          key={item.id}
          data-launcher-index={indexInList}
          style={style}
          onPointerDown={(e) => handleDragStart(indexInList, e)}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          className={`${colSpanClass} relative h-[88px] rounded-[24px] select-none transition-all shadow-sm p-[2px] bg-white group text-left touch-none`}
        >
          <button
            onPointerDown={(e) => handleItemPointerDown(indexInList, e)}
            onPointerUp={(e) => handleItemPointerUp(indexInList, item, e)}
            onPointerCancel={handleItemPointerCancel}
            className="w-full h-full text-left focus:outline-none"
          >
            <div className="w-full h-full rounded-[22px] bg-white/60 backdrop-blur-md flex flex-col justify-between px-4 pt-3 pb-2 border border-neutral-100/50 shadow-[inset_0_1px_4px_rgba(255,255,255,0.8)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
              <div className="relative z-10 w-full">
                <div className="w-full border-b border-neutral-200/80 pb-1 mb-1.5 flex items-center justify-between shrink-0">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 flex items-center justify-center overflow-hidden">
                    {getAppIcon('forum', <MessageSquare className="w-3 h-3 text-neutral-400" />)}
                  </div>
                  {isEditingLayout && (
                    <span className="text-[9px] px-1 bg-black/10 text-black/60 rounded">宽 {item.colSpan}</span>
                  )}
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-neutral-200" />
                    <div className="w-1 h-1 rounded-full bg-neutral-200" />
                    <div className="w-1 h-1 rounded-full bg-neutral-200" />
                  </div>
                </div>
                {item.colSpan > 1 ? (
                  <p className="text-[11px] text-neutral-700 font-medium line-clamp-2 leading-[1.4] w-11/12">
                    {latestForumPost ? (latestForumPost.comments?.length > 0 ? latestForumPost.comments[latestForumPost.comments.length - 1].content : latestForumPost.content) : "暂时没有新的帖子更新..."}
                  </p>
                ) : (
                  <p className="text-[10px] text-neutral-500 font-bold text-center mt-2">论坛</p>
                )}
              </div>
              {item.colSpan > 1 && (
                <div className="w-full flex justify-between items-end shrink-0 pt-0.5 relative z-10">
                  <div className="flex gap-1 items-center opacity-40">
                    <div className="w-1 h-1 rounded-full bg-neutral-500"></div>
                    <div className="w-1 h-1 rounded-full bg-neutral-500"></div>
                    <div className="w-3 h-0.5 rounded-full bg-neutral-500"></div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300 opacity-80"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
              )}
            </div>
          </button>

          {isEditingLayout && (
            <div className="absolute inset-0 rounded-[24px] border-2 border-dashed border-black/30 pointer-events-none flex items-center justify-center bg-black/5 animate-pulse z-10" />
          )}

          {isEditingLayout && (
            <div
              onPointerDown={(e) => handleResizeStart(indexInList, e)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
              onPointerCancel={handleResizeEnd}
              className="resize-handle absolute bottom-1 right-1 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center cursor-se-resize shadow-md hover:scale-110 active:scale-95 transition-all z-20"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <path d="M15 19l-4-4 4-4" />
                <path d="M9 19l-4-4 4-4" />
              </svg>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={item.id}
        data-launcher-index={indexInList}
        style={style}
        onPointerDown={(e) => handleDragStart(indexInList, e)}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        className="flex flex-col items-center gap-2 group focus:outline-none relative touch-none select-none"
      >
        <button
          onPointerDown={(e) => handleItemPointerDown(indexInList, e)}
          onPointerUp={(e) => handleItemPointerUp(indexInList, item, e)}
          onPointerCancel={handleItemPointerCancel}
          className="flex flex-col items-center gap-2 group focus:outline-none"
        >
          <div className="w-16 h-16 bg-white/60 backdrop-blur-md border border-neutral-100/50 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)] overflow-hidden relative">
            {iconContent}
            {isEditingLayout && (
              <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-black/30 bg-black/5 animate-pulse" />
            )}
          </div>
          <span className="text-[11px] font-bold text-black/60 tracking-tight">{item.name}</span>
        </button>
      </div>
    );
  };

  return (
    <div 
      className={`flex-1 flex flex-col h-full relative overflow-hidden ${settings?.homeWallpaper || settings?.homeWallpaper2 ? 'bg-transparent' : 'bg-neutral-50'}`}
    >
      {/* Edit Mode Banner overlay */}
      {isEditingLayout && (
        <div className="absolute top-12 left-4 right-4 z-50 bg-black/95 text-white backdrop-blur-lg rounded-2xl py-3 px-4 flex items-center justify-between shadow-lg border border-white/10 animate-fade-in">
          <div className="flex flex-col">
            <span className="text-[12px] font-bold tracking-tight">排版编辑模式</span>
            <span className="text-[10px] text-white/60">拖动图标调整位置，拖拽卡片右下角调整大小</span>
          </div>
          <button
            onClick={() => setIsEditingLayout(false)}
            className="bg-white text-black font-bold text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm"
          >
            完成
          </button>
        </div>
      )}

      {/* Dynamic Wallpapers for each page */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${currentPage === 0 ? "opacity-100 scale-100" : "opacity-0 scale-110"}`}
          style={{ 
            backgroundImage: settings?.homeWallpaper 
              ? `url(${settings.homeWallpaper})` 
              : 'linear-gradient(135deg, #fce7f3 0%, #dbeafe 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div 
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${currentPage === 1 ? "opacity-100 scale-100" : "opacity-0 scale-110"}`}
          style={{ 
            backgroundImage: settings?.homeWallpaper2 
              ? `url(${settings.homeWallpaper2})` 
              : 'linear-gradient(135deg, #fce7f3 0%, #dbeafe 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        {/* Dark overlay for readability - adjusted opacity */}
        <div className={`absolute inset-0 transition-opacity duration-700 ${(settings?.homeWallpaper || settings?.homeWallpaper2) ? 'bg-white/10' : 'bg-transparent'} backdrop-blur-[1px]`} />
      </div>

      {/* Scrollable Pages Container with Scroll Snap */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full flex flex-row overflow-x-auto snap-x snap-mandatory scrollbar-none flex-1 min-h-0 scroll-smooth relative z-10"
      >
        {/* Page 1: Main View */}
        <div className="w-full min-w-full shrink-0 snap-start flex flex-col px-5 pt-4 pb-4 text-neutral-900 select-none overflow-y-auto h-full">
        {/* Top: Header with Status & Fafa Shortcut */}
        <div className="flex items-center justify-between mt-2 animate-fade-in shrink-0 sticky top-0 bg-transparent z-10 py-2 px-1">
          <div className="flex flex-col items-start">
            <h1 className="text-4xl tracking-tight font-bold text-neutral-950">
              {time}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase">
                {date}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onOpenApp("fafa_chat");
            }}
            className="w-12 h-12 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-all group overflow-hidden"
          >
            <div className="w-full h-full p-1">
              <img 
                src="/images/fafa/fafa.jpg" 
                alt="fafa"
                className="w-full h-full object-cover rounded-xl grayscale hover:grayscale-0 transition-all"
                referrerPolicy="no-referrer"
              />
            </div>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-start gap-4 pt-3 pb-4 min-h-0">
          {/* NEW: Start Chat Card */}
          {targetChar && (
            <div
              className="w-full h-[88px] rounded-[20px] flex items-center justify-between px-4 transition-all duration-150 shrink-0 relative"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(239, 236, 232, 0.3)",
                boxShadow: "0 2px 16px rgba(0, 0, 0, 0.04)",
                color: settings?.fontColor || undefined
              }}
            >
              <button
                onClick={() => {
                    if (lastSession) {
                      localStorage.setItem("active_char_id", lastSession.characterId);
                    } else if (targetChar) {
                      localStorage.setItem("active_char_id", targetChar.id);
                    }
                    onOpenApp("chat");
                }}
                className="flex-1 flex items-center gap-3 min-w-0 text-left active:scale-98 transition-all"
              >
                {targetChar.chatAvatar ? (
                  <img src={targetChar.chatAvatar} alt={targetChar.name} className="w-13 h-13 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-2xl shrink-0">
                    {targetChar.avatar || "👤"}
                  </div>
                )}
                <div className="flex flex-col items-start overflow-hidden min-w-0">
                  <div className="flex items-baseline">
                    <span className="text-lg font-bold" style={{ color: settings?.fontColor || undefined }}>
                      {targetChar.name}
                    </span>
                  </div>
                  <span className="text-[13px] opacity-75 mt-0.5 w-full truncate text-left" style={{ color: settings?.fontColor || undefined }}>
                    {lastSession && lastSession.messages.length > 0 
                      ? (lastSession.messages[lastSession.messages.length - 1].content.length > 18 
                          ? lastSession.messages[lastSession.messages.length - 1].content.substring(0, 18) + "..."
                          : lastSession.messages[lastSession.messages.length - 1].content)
                      : "开始你的第一次对话吧"}
                  </span>
                </div>
              </button>
              <div className="flex flex-col items-center justify-center gap-0.5 ml-3 shrink-0">
                <span className="text-xl leading-none font-light" style={{ color: settings?.fontColor || undefined }}>♡</span>
                {isEditingLoveText ? (
                  <input
                    type="text"
                    value={loveText}
                    autoFocus
                    onChange={(e) => setLoveText(e.target.value)}
                    onBlur={() => {
                      setIsEditingLoveText(false);
                      localStorage.setItem("mobile_ai_card_love_text", loveText || "Love");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingLoveText(false);
                        localStorage.setItem("mobile_ai_card_love_text", loveText || "Love");
                      }
                    }}
                    className="w-14 text-center text-[12px] font-serif italic bg-white/40 border border-white/40 rounded px-1 outline-none"
                    style={{ color: settings?.fontColor || undefined }}
                  />
                ) : (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingLoveText(true);
                    }}
                    className="text-[12px] font-serif italic cursor-pointer hover:underline opacity-85"
                    style={{ color: settings?.fontColor || undefined }}
                    title="点击修改文字"
                  >
                    {loveText}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* New 3x2 Customizable App Grid */}
          <div className="grid grid-cols-3 gap-y-6 gap-x-4 shrink-0">
            {page1Items.map((item) => {
              const globalIndex = launcherItems.findIndex(x => x.id === item.id);
              return renderLauncherItem(item, globalIndex);
            })}
          </div>
          
          <div className="mt-auto text-center" />
        </div>

    </div>

        {/* Page 2: Second Screen View */}
        <div className="w-full min-w-full shrink-0 snap-start flex flex-col px-5 pt-8 pb-4 text-neutral-900 select-none overflow-y-auto h-full">
          
          <div className="mt-8 mb-8 text-center animate-fade-in">
            <h1 className="text-2xl tracking-tight font-bold text-neutral-900">扩展应用</h1>
            <p className="text-xs text-neutral-500 mt-1">更多系统功能</p>
          </div>

          <div className="grid grid-cols-3 gap-y-6 gap-x-4 shrink-0 justify-items-center">
            {page2Items.map((item) => {
              const globalIndex = launcherItems.findIndex(x => x.id === item.id);
              return renderLauncherItem(item, globalIndex);
            })}
          </div>
        </div>
      </div>
      {/* Pagination Indicators - Sticky Footer */}
      {!isEditingLayout && (
        <div className="shrink-0 w-full flex justify-center py-2 bg-transparent z-20">
          <div className="flex gap-1.5 items-center">
            <button 
              onClick={() => scrollToPage(0)} 
              className={`h-1.5 rounded-full transition-all duration-300 ${currentPage === 0 ? "bg-black w-3 shadow-sm" : "bg-black/20 w-1.5"}`} 
              aria-label="第1页"
            />
            <button 
              onClick={() => scrollToPage(1)} 
              className={`h-1.5 rounded-full transition-all duration-300 ${currentPage === 1 ? "bg-black w-3 shadow-sm" : "bg-black/20 w-1.5"}`} 
              aria-label="第2页"
            />
          </div>
        </div>
      )}

      {/* Bottom Fixed App Bar */}
      <div className="shrink-0 w-full px-5 py-4 bg-white/40 backdrop-blur-xl border-t border-white/20 pb-[env(safe-area-inset-bottom)] relative z-20">
        <div className="grid grid-cols-4 gap-3">
          {/* App 1: Chat */}
          <button
            onClick={() => onOpenApp("chat")}
            className="flex flex-col items-center gap-2 group focus:outline-none"
          >
            <div className="w-13 h-13 bg-black text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all overflow-hidden">
              {getAppIcon('chat', <MessageSquare className="w-5.5 h-5.5 stroke-[1.75]" />)}
            </div>
            <span className="text-[10px] font-bold tracking-tight text-black/60">
              信息
            </span>
          </button>

          {/* App 2: World Book */}
          <button
            onClick={() => onOpenApp("worldbook")}
            className="flex flex-col items-center gap-2 group focus:outline-none"
          >
            <div className="w-13 h-13 bg-white text-black border border-neutral-100 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all overflow-hidden">
              {getAppIcon('worldbook', <BookOpen className="w-5.5 h-5.5 stroke-[1.75]" />)}
            </div>
            <span className="text-[10px] font-bold tracking-tight text-black/60">
              世界书
            </span>
          </button>

          {/* App 3: Character Creator */}
          <button
            onClick={() => onOpenApp("creator")}
            className="flex flex-col items-center gap-2 group focus:outline-none"
          >
            <div className="w-13 h-13 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all overflow-hidden">
              {getAppIcon('creator', <UserPlus className="w-5.5 h-5.5 stroke-[1.75]" />)}
            </div>
            <span className="text-[10px] font-bold tracking-tight text-black/60">
              档案
            </span>
          </button>

          {/* App 4: Settings */}
          <button
            onClick={() => onOpenApp("settings")}
            className="flex flex-col items-center gap-2 group focus:outline-none"
          >
            <div className="w-13 h-13 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all overflow-hidden">
              {getAppIcon('settings', <Settings className="w-5.5 h-5.5 stroke-[1.75]" />)}
            </div>
            <span className="text-[10px] font-bold tracking-tight text-black/60">
              系统设置
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
