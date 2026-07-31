import React, { useState, useEffect, useRef } from "react";
import { Character, AppSettings, LoreEntry } from "../types";
import { 
  ArrowLeft, Sparkles, Send, Settings as SettingsIcon, Square, Heart, X, 
  BookOpen, Pause, History, Plus, ChevronRight, Trash2, RefreshCw, Loader2,
  Play, Book, FileText, Check, AlertCircle, Edit3, Maximize2, Minimize2
} from "lucide-react";
import { apiChat } from "../lib/api";
import { CharacterAvatar } from "./CharacterAvatar";

interface TheaterAppProps {
  characters: Character[];
  settings: AppSettings;
  activeChatCharId: string | null;
  loreList?: LoreEntry[];
  onClose: () => void;
}

export interface TheaterMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface TheaterSummaryCard {
  id: string;
  rangeText: string;
  startIndex: number;
  endIndex: number;
  startRound: number;
  endRound: number;
  summary: string;
  timestamp: number;
}

export interface ActiveTheaterSession {
  id: string;
  charId: string;
  charName: string;
  worldSetting: string;
  mountedLoreIds: string[];
  minWord: number;
  maxWord: number;
  perspective: 'first' | 'second' | 'third';
  writingTone: 'daily_plain' | 'literary' | 'cold_restrained' | 'warm_soft';
  keywords: string;
  messages: TheaterMessage[];
  summaries?: TheaterSummaryCard[];
  lastUpdated: number;
}

export interface TheaterHistoryCard {
  id: string;
  charId: string;
  charName: string;
  worldSetting: string;
  startTime: number;
  endTime: number;
  messageCount: number;
  summary: string;
  mountedLoreTitles: string[];
  messages: TheaterMessage[];
  summaries?: TheaterSummaryCard[];
}

// SetupForm Component
export const SetupForm = ({
  onSave,
  buttonText = "保存设定并开始",
  keywords,
  setKeywords,
  worldSetting,
  setWorldSetting,
  minWord,
  setMinWord,
  maxWord,
  setMaxWord,
  perspective,
  setPerspective,
  writingTone,
  setWritingTone,
  isGenerating,
  generateSetting,
  loreList = [],
  mountedLoreIds,
  setMountedLoreIds
}: {
  onSave: () => void;
  buttonText?: string;
  keywords: string;
  setKeywords: (v: string) => void;
  worldSetting: string;
  setWorldSetting: (v: string) => void;
  minWord: number | "";
  setMinWord: (v: number | "") => void;
  maxWord: number | "";
  setMaxWord: (v: number | "") => void;
  perspective: 'first' | 'second' | 'third';
  setPerspective: (v: 'first' | 'second' | 'third') => void;
  writingTone: 'daily_plain' | 'literary' | 'cold_restrained' | 'warm_soft';
  setWritingTone: (v: 'daily_plain' | 'literary' | 'cold_restrained' | 'warm_soft') => void;
  isGenerating: boolean;
  generateSetting: () => void;
  loreList?: LoreEntry[];
  mountedLoreIds: string[];
  setMountedLoreIds: (ids: string[]) => void;
}) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-xs font-bold text-neutral-600">世界设定关键词</label>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={keywords} 
          onChange={e => setKeywords(e.target.value)} 
          className="flex-1 text-xs bg-neutral-100 rounded-lg p-3 outline-none focus:ring-1 focus:ring-black/20" 
          placeholder="例如：赛博朋克、雨夜、重逢" 
        />
        <button 
          type="button" 
          onClick={generateSetting} 
          disabled={isGenerating} 
          className="p-3 bg-neutral-900 hover:bg-black text-white rounded-lg min-w-[70px] text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>{isGenerating ? "生成" : "AI灵感"}</span>
        </button>
      </div>
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold text-neutral-600">世界设定内容</label>
      <textarea 
        value={worldSetting} 
        onChange={e => setWorldSetting(e.target.value)} 
        className="w-full text-xs bg-neutral-100 rounded-lg p-3 outline-none focus:ring-1 focus:ring-black/20" 
        rows={3} 
        placeholder="请输入当前剧场的世界观背景、故事设定..."
      />
    </div>

    {/* 世界书挂载 Section */}
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-neutral-600 flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          <span>世界书挂载</span>
        </label>
        <span className="text-[10px] text-neutral-400 font-medium">
          {mountedLoreIds.length > 0 ? `已挂载 ${mountedLoreIds.length} 本` : "未挂载"}
        </span>
      </div>
      {loreList && loreList.length > 0 ? (
        <div className="bg-neutral-100 rounded-xl p-2 space-y-1.5 max-h-36 overflow-y-auto">
          {loreList.map(lore => {
            const isChecked = mountedLoreIds.includes(lore.id);
            return (
              <label 
                key={lore.id} 
                className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all border ${isChecked ? 'bg-white border-black shadow-2xs' : 'bg-neutral-50/80 border-transparent hover:bg-neutral-200/50'}`}
              >
                <input 
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMountedLoreIds([...mountedLoreIds, lore.id]);
                    } else {
                      setMountedLoreIds(mountedLoreIds.filter(id => id !== lore.id));
                    }
                  }}
                  className="mt-0.5 rounded text-neutral-900 focus:ring-0 accent-black shrink-0 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-neutral-900 truncate">{lore.title}</span>
                    {lore.keys && lore.keys.length > 0 && (
                      <span className="text-[9px] bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded shrink-0 truncate max-w-[100px]">
                        {lore.keys.join(', ')}
                      </span>
                    )}
                  </div>
                  {lore.content && (
                    <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">{lore.content}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="bg-neutral-100 rounded-xl p-3 text-xs text-neutral-400 text-center font-medium">
          暂无已创建的世界书，可在“世界书”应用中创建后在此挂载
        </div>
      )}
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold text-neutral-600">叙述视角</label>
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: "first", title: "第一人称", desc: "角色“我”/用户“你”" },
          { id: "second", title: "第二人称", desc: "角色姓名/用户“你”" },
          { id: "third", title: "第三人称", desc: "角色与用户均用姓名" },
        ].map((p) => (
          <button 
            key={p.id} 
            type="button" 
            onClick={() => setPerspective(p.id as any)} 
            className={`p-2 rounded-lg text-xs text-left border transition-all ${perspective === p.id ? 'border-black bg-black text-white font-bold' : 'border-neutral-200 bg-neutral-50 text-neutral-700'}`}
          >
            <span className="block">{p.title}</span>
            <span className={`text-[10px] block ${perspective === p.id ? 'text-neutral-300' : 'text-neutral-400'}`}>{p.desc}</span>
          </button>
        ))}
      </div>
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold text-neutral-600">文风偏好</label>
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: "daily_plain", name: "日常白描", desc: "平实叙事" },
          { id: "literary", name: "文艺细腻", desc: "氛围描写" },
          { id: "cold_restrained", name: "冷淡克制", desc: "简练收敛" },
          { id: "warm_soft", name: "温暖柔和", desc: "细节温暖" },
        ].map((t) => (
          <button 
            key={t.id} 
            type="button" 
            onClick={() => setWritingTone(t.id as any)} 
            className={`p-2 rounded-lg text-xs text-left border transition-all ${writingTone === t.id ? 'border-black bg-black text-white font-bold' : 'border-neutral-200 bg-neutral-50 text-neutral-700'}`}
          >
            <span className="block">{t.name}</span>
            <span className={`text-[10px] block ${writingTone === t.id ? 'text-neutral-300' : 'text-neutral-400'}`}>{t.desc}</span>
          </button>
        ))}
      </div>
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold text-neutral-600">每轮生成字数限制</label>
      <div className="flex gap-2 items-center">
        <input 
          type="number" 
          placeholder="最小 (100)"
          value={minWord} 
          onChange={e => setMinWord(e.target.value === "" ? "" : Number(e.target.value))} 
          className="w-full text-xs bg-neutral-100 rounded-lg p-2 outline-none focus:ring-1 focus:ring-black/20" 
        />
        <span className="text-neutral-400">-</span>
        <input 
          type="number" 
          placeholder="最大 (15000)"
          value={maxWord} 
          onChange={e => setMaxWord(e.target.value === "" ? "" : Number(e.target.value))} 
          className="w-full text-xs bg-neutral-100 rounded-lg p-2 outline-none focus:ring-1 focus:ring-black/20" 
        />
      </div>
    </div>

    <button 
      type="button" 
      onClick={() => {
        const min = Number(minWord) || 500;
        const max = Number(maxWord) || 3000;
        if (min < 50 || max < 50 || min > 15000 || max > 15000) {
          alert("字数范围必须在 50 - 15000 之间");
          return;
        }
        if (max < min) {
          alert("最大值不能小于最小值");
          return;
        }
        setMinWord(min);
        setMaxWord(max);
        onSave(); 
      }} 
      className="w-full py-3 bg-black text-white text-xs font-bold rounded-xl active:scale-98 transition-transform shadow-md"
    >
      {buttonText}
    </button>
  </div>
);

export const TheaterApp: React.FC<TheaterAppProps> = ({
  characters,
  settings,
  activeChatCharId,
  loreList = [],
  onClose
}) => {
  // Navigation states: 'menu' (入口), 'char_select' (选角), 'theater' (剧场界面), 'history_list' (历史归档)
  const [view, setView] = useState<'menu' | 'char_select' | 'theater' | 'history_list'>('menu');
  
  // Ongoing theater session
  const [activeSession, setActiveSession] = useState<ActiveTheaterSession | null>(null);
  
  // History archives
  const [theaterHistory, setTheaterHistory] = useState<TheaterHistoryCard[]>([]);
  const [selectedHistoryCard, setSelectedHistoryCard] = useState<TheaterHistoryCard | null>(null);

  // Setup form states
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [worldSetting, setWorldSetting] = useState<string>("");
  const [mountedLoreIds, setMountedLoreIds] = useState<string[]>([]);
  const [minWord, setMinWord] = useState<number | "">(500);
  const [maxWord, setMaxWord] = useState<number | "">(3000);
  const [keywords, setKeywords] = useState("");
  const [perspective, setPerspective] = useState<'first' | 'second' | 'third'>('first');
  const [writingTone, setWritingTone] = useState<'daily_plain' | 'literary' | 'cold_restrained' | 'warm_soft'>('daily_plain');

  // Interactive theater states
  const [messages, setMessages] = useState<TheaterMessage[]>([]);
  const [summaries, setSummaries] = useState<TheaterSummaryCard[]>([]);
  const [showActionPanel, setShowActionPanel] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [inputText, setInputText] = useState("");
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedChar = characters.find(c => c.id === (selectedCharId || activeSession?.charId));

  // Calculate assistant message rounds
  let assistantCounter = 0;
  const messageRounds = new Map<string, number>();
  messages.forEach(m => {
    if (m.role === 'assistant') {
      assistantCounter++;
      messageRounds.set(m.id, assistantCounter);
    }
  });
  const totalRounds = assistantCounter;

  const maxSummarizedRound = summaries.length > 0
    ? Math.max(...summaries.map(s => s.endRound || 0))
    : 0;

  const unsummarizedRounds = Math.max(0, totalRounds - maxSummarizedRound);
  const summarizedRounds = Math.min(totalRounds, maxSummarizedRound);

  // Instant scroll on entering 'theater' view without smooth animation
  useEffect(() => {
    if (view === 'theater' && chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
      requestAnimationFrame(() => {
        if (chatScrollContainerRef.current) {
          chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
        }
      });
    }
  }, [view]);

  // Auto-scroll when messages update (without smooth scroll)
  useEffect(() => {
    if (view === 'theater' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length, isGenerating]);

  // Load active session and history on mount
  useEffect(() => {
    const savedActive = localStorage.getItem("active_theater_session");
    if (savedActive) {
      try {
        const parsed: ActiveTheaterSession = JSON.parse(savedActive);
        setActiveSession(parsed);
      } catch(e) { console.error(e); }
    }

    const savedHistory = localStorage.getItem("theater_history");
    if (savedHistory) {
      try {
        setTheaterHistory(JSON.parse(savedHistory));
      } catch(e) { console.error(e); }
    }
  }, []);

  // Helper 1: Load character memory base
  const getCharacterMemories = (char?: Character): string[] => {
    if (!char) return [];
    const result: string[] = [];
    if (Array.isArray(char.memories)) {
      char.memories.forEach(m => {
        const text = typeof m === 'string' ? m : m?.content;
        if (text && !result.includes(text)) result.push(text);
      });
    }
    try {
      const saved = localStorage.getItem(`mobile_ai_memories_${char.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((m: any) => {
            const text = typeof m === 'string' ? m : m?.content;
            if (text && !result.includes(text)) result.push(text);
          });
        }
      }
    } catch (e) {}

    try {
      const chatSettings = localStorage.getItem(`chat_settings_${char.id}`);
      if (chatSettings) {
        const parsed = JSON.parse(chatSettings);
        if (Array.isArray(parsed?.memories)) {
          parsed.memories.forEach((m: any) => {
            const text = typeof m === 'string' ? m : m?.content;
            if (text && !result.includes(text)) result.push(text);
          });
        }
      }
    } catch (e) {}

    return result;
  };

  // Helper 2: Calculate next 10-turn (or remaining) slice to summarize
  const getUnsummarizedRange = (msgs: TheaterMessage[], existingSummaries: TheaterSummaryCard[]) => {
    const lastEndIndex = existingSummaries && existingSummaries.length > 0 
      ? Math.max(...existingSummaries.map(s => s.endIndex))
      : 0;
    
    const lastEndRound = existingSummaries && existingSummaries.length > 0
      ? Math.max(...existingSummaries.map(s => s.endRound))
      : 0;

    if (lastEndIndex >= msgs.length) {
      return null;
    }

    let roundCount = 0;
    let targetEndIndex = lastEndIndex;

    for (let i = lastEndIndex; i < msgs.length; i++) {
      if (msgs[i].role === 'assistant' || i === msgs.length - 1) {
        roundCount++;
        targetEndIndex = i + 1;
        if (roundCount === 10) {
          break;
        }
      }
    }

    if (roundCount === 0) {
      return null;
    }

    const startRound = lastEndRound + 1;
    const endRound = lastEndRound + roundCount;
    const rangeText = `第 ${startRound} - ${endRound} 段`;

    return {
      startIndex: lastEndIndex,
      endIndex: targetEndIndex,
      startRound,
      endRound,
      rangeText,
      messageSlice: msgs.slice(lastEndIndex, targetEndIndex)
    };
  };

  // Helper 3: Context building rule (summarized cards + unsummarized full text)
  const buildPayloadMessages = (msgs: TheaterMessage[], existingSummaries: TheaterSummaryCard[]) => {
    const payload: { role: "user" | "assistant"; content: string }[] = [];

    if (existingSummaries && existingSummaries.length > 0) {
      const sorted = [...existingSummaries].sort((a, b) => a.startIndex - b.startIndex);
      sorted.forEach(card => {
        payload.push({
          role: "user",
          content: `【剧情前期记忆卡片摘要 (${card.rangeText})】：\n${card.summary}`
        });
      });

      const maxEndIndex = Math.max(...existingSummaries.map(s => s.endIndex));
      const unsummarized = msgs.slice(maxEndIndex);
      unsummarized.forEach(m => {
        if (m.role === 'user') {
          const isQuoted = (m.content.startsWith("“") && m.content.endsWith("”")) || (m.content.startsWith('"') && m.content.endsWith('"'));
          const typeLabel = isQuoted ? "用户说出的台词" : "用户的动作、神态或心理描写（未加双引号，角色无法直接听到内心或原文，只能通过观察外部表现推测）";
          payload.push({ role: 'user', content: `[${typeLabel}]: ${m.content}` });
        } else if (m.role === 'assistant') {
          payload.push({ role: m.role, content: m.content });
        }
      });
    } else {
      msgs.forEach(m => {
        if (m.role === 'user') {
          const isQuoted = (m.content.startsWith("“") && m.content.endsWith("”")) || (m.content.startsWith('"') && m.content.endsWith('"'));
          const typeLabel = isQuoted ? "用户说出的台词" : "用户的动作、神态或心理描写（未加双引号，角色无法直接听到内心或原文，只能通过观察外部表现推测）";
          payload.push({ role: 'user', content: `[${typeLabel}]: ${m.content}` });
        } else if (m.role === 'assistant') {
          payload.push({ role: m.role, content: m.content });
        }
      });
    }

    return payload;
  };

  // Sync activeSession changes to localStorage whenever messages or settings change in active session
  const saveCurrentSession = (updatedMessages?: TheaterMessage[], overrideSettings?: Partial<ActiveTheaterSession>) => {
    if (!selectedChar) return;
    const currentMsgs = updatedMessages || messages;
    const currentSummaries = overrideSettings?.summaries !== undefined ? overrideSettings.summaries : summaries;
    const sessionObj: ActiveTheaterSession = {
      id: activeSession?.id || `session-${Date.now()}`,
      charId: selectedChar.id,
      charName: selectedChar.name,
      worldSetting: overrideSettings?.worldSetting !== undefined ? overrideSettings.worldSetting : worldSetting,
      mountedLoreIds: overrideSettings?.mountedLoreIds !== undefined ? overrideSettings.mountedLoreIds : mountedLoreIds,
      minWord: Number(overrideSettings?.minWord ?? minWord) || 500,
      maxWord: Number(overrideSettings?.maxWord ?? maxWord) || 3000,
      perspective: overrideSettings?.perspective || perspective,
      writingTone: overrideSettings?.writingTone || writingTone,
      keywords: overrideSettings?.keywords !== undefined ? overrideSettings.keywords : keywords,
      messages: currentMsgs,
      summaries: currentSummaries,
      lastUpdated: Date.now()
    };
    setActiveSession(sessionObj);
    localStorage.setItem("active_theater_session", JSON.stringify(sessionObj));
  };

  // Continue an active session
  const resumeActiveSession = () => {
    if (!activeSession) return;
    setSelectedCharId(activeSession.charId);
    setWorldSetting(activeSession.worldSetting || "");
    setMountedLoreIds(activeSession.mountedLoreIds || []);
    setMinWord(activeSession.minWord || 500);
    setMaxWord(activeSession.maxWord || 3000);
    setPerspective(activeSession.perspective || 'first');
    setWritingTone(activeSession.writingTone || 'daily_plain');
    setKeywords(activeSession.keywords || "");
    setMessages(activeSession.messages || []);
    setSummaries(activeSession.summaries || []);
    setView('theater');
    showToast("已继续上次剧场");
  };

  // Continue a history archive card
  const continueHistoryCard = (card: TheaterHistoryCard) => {
    const targetChar = characters.find(c => c.id === card.charId);
    if (!targetChar) {
      showToast("无法找不到参演角色人设");
      return;
    }
    setSelectedCharId(card.charId);
    setWorldSetting(card.worldSetting || "");
    const matchedLoreIds = (loreList || []).filter(l => card.mountedLoreTitles?.includes(l.title)).map(l => l.id);
    setMountedLoreIds(matchedLoreIds);
    setMessages(card.messages || []);
    setSummaries(card.summaries || []);

    const sessionObj: ActiveTheaterSession = {
      id: card.id,
      charId: card.charId,
      charName: card.charName,
      worldSetting: card.worldSetting || "",
      mountedLoreIds: matchedLoreIds,
      minWord: 500,
      maxWord: 3000,
      perspective: 'first',
      writingTone: 'daily_plain',
      keywords: '',
      messages: card.messages || [],
      summaries: card.summaries || [],
      lastUpdated: Date.now()
    };
    setActiveSession(sessionObj);
    localStorage.setItem("active_theater_session", JSON.stringify(sessionObj));

    setView('theater');
    showToast(`已加载《${card.charName}》剧场历史存档`);
  };

  // Handler: Summarize 10 or 20 rounds
  const handleSummarizeByRounds = async (targetRounds: 10 | 20 = 10) => {
    if (!selectedChar || isGenerating) return;

    if (unsummarizedRounds === 0) {
      showToast("当前没有未总结的新剧情轮次");
      return;
    }

    const startRound = maxSummarizedRound + 1;

    let currentAssistantRound = 0;
    let targetEndRound = startRound;
    let startMsgIndex = -1;
    let endMsgIndex = -1;

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === 'assistant') {
        currentAssistantRound++;
        if (currentAssistantRound === startRound) {
          startMsgIndex = (i > 0 && messages[i - 1].role === 'user') ? i - 1 : i;
        }
        if (currentAssistantRound >= startRound && currentAssistantRound <= startRound + targetRounds - 1) {
          targetEndRound = currentAssistantRound;
          endMsgIndex = i + 1;
        }
      }
    }

    if (startMsgIndex === -1 || endMsgIndex === -1) {
      showToast("无法获取未总结的轮次数据");
      return;
    }

    const actualRoundsCount = targetEndRound - startRound + 1;
    const rangeText = `第 ${startRound} - ${targetEndRound} 轮`;

    setIsGenerating(true);
    showToast(`正在对 ${rangeText} 剧情（共 ${actualRoundsCount} 轮）进行精炼总结...`);

    try {
      const sliceMsgs = messages.slice(startMsgIndex, endMsgIndex);
      const sliceText = sliceMsgs
        .map(m => `${m.role === 'user' ? '【用户描写】' : `【${selectedChar.name}】`}: ${m.content}`)
        .join('\n\n');

      const originalLength = sliceText.length;
      const minWords = Math.max(40, Math.round(originalLength * 0.1));
      const maxWords = Math.min(500, Math.round(originalLength * 0.2));

      const prompt = `请将以下小剧场（${rangeText}）的剧情内容压缩总结为一段精练生动的“剧情记忆卡片”。
【严格约束规则】：
1. 提炼核心情节走向、重大事件、角色情感与动机变化、关键要素变动。
2. 字数严格控制在原文总字数的 10% - 20% 之间（原文约 ${originalLength} 字，总结字数需控制在 ${minWords} - ${maxWords} 字左右）。
3. 表达要点清晰、文笔流畅生动。
4. 请直接输出总结正文，切勿附带任何多余的开头或解释说明。

【待总结剧情内容】：
${sliceText}`;

      const apiUrl = localStorage.getItem('apiUrl') || settings?.apiUrl || '';
      const apiKey = localStorage.getItem('apiKey') || settings?.apiKey || '';
      const model = localStorage.getItem('model') || 'gpt-3.5-turbo';
      const temperature = parseFloat(localStorage.getItem('temperature') || String(settings?.temperature) || '0.5');

      if (!apiUrl || !apiKey) {
        showToast('请先在设置页配置 API');
        setIsGenerating(false);
        return;
      }

      const cleanApiUrl = apiUrl.replace(/\/+$/, '');
      let endpoint = cleanApiUrl;
      if (endpoint.endsWith('/chat/completions')) {
        // ok
      } else if (endpoint.endsWith('/v1')) {
        endpoint = endpoint + '/chat/completions';
      } else if (endpoint.includes('/v1/')) {
        endpoint = endpoint + (endpoint.endsWith('/') ? '' : '/') + 'chat/completions';
      } else {
        endpoint = endpoint + '/v1/chat/completions';
      }

      const fetchRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: temperature,
        }),
      });

      if (!fetchRes.ok) {
        const errText = await fetchRes.text().catch(() => '');
        throw new Error(`API 请求失败: ${fetchRes.status} ${errText}`);
      }

      const data = await fetchRes.json();
      const summaryText = data.choices?.[0]?.message?.content?.trim() || "剧情摘要已生成。";

      const newCard: TheaterSummaryCard = {
        id: `summary-${Date.now()}`,
        rangeText,
        startIndex: startMsgIndex,
        endIndex: endMsgIndex,
        startRound,
        endRound: targetEndRound,
        summary: summaryText,
        timestamp: Date.now()
      };

      const updatedSummaries = [...summaries, newCard];
      setSummaries(updatedSummaries);
      saveCurrentSession(messages, { summaries: updatedSummaries });
      setShowSummaryModal(false); // 总结完成后弹窗自动关闭
      showToast(`已成功将 ${rangeText} 压缩总结为剧情记忆卡片！`);
    } catch (err: any) {
      console.error("[Summarize Error]:", err);
      showToast("剧情总结生成失败：" + (err?.message || "网络错误"));
    } finally {
      setIsGenerating(false);
    }
  };

  // End and archive current session
  const archiveTheater = async () => {
    // 决定使用哪些消息和设置。如果当前状态 messages 为空且存在 activeSession，则使用 session 中的数据
    // 这种情况通常发生在用户在主菜单点击“归档”按钮时
    const targetMessages = messages && messages.length > 0 
      ? messages 
      : (activeSession?.messages || []);
      
    const targetChar = selectedChar || characters.find(c => c.id === (selectedCharId || activeSession?.charId));
    const targetWorldSetting = worldSetting || activeSession?.worldSetting || "自由演绎背景";
    const targetSummaries = summaries && summaries.length > 0
      ? summaries
      : (activeSession?.summaries || []);

    if (!targetChar || targetMessages.length === 0) {
      // 如果没有角色或消息，直接清除 session
      setActiveSession(null);
      localStorage.removeItem("active_theater_session");
      setMessages([]);
      setSummaries([]);
      setView('menu');
      return;
    }

    const targetMountedLoreIds = mountedLoreIds && mountedLoreIds.length > 0
      ? mountedLoreIds
      : (activeSession?.mountedLoreIds || []);

    const mountedLores = (loreList || []).filter(l => targetMountedLoreIds.includes(l.id));
    const mountedLoreTitles = mountedLores.map(l => l.title);

    // 生成剧情摘要：优先使用第一句和最后一句 assistant 消息，如果没有则使用 user 消息
    const assistantMsgs = targetMessages.filter(m => m.role === 'assistant');
    const firstMsg = assistantMsgs.length > 0 ? assistantMsgs[0].content : targetMessages[0].content;
    const lastMsg = assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1].content : targetMessages[targetMessages.length - 1].content;
    
    let summaryText = firstMsg.slice(0, 100);
    if (lastMsg && lastMsg !== firstMsg) {
      summaryText += " ... " + lastMsg.slice(-80);
    }
    if (!summaryText || summaryText.trim() === "...") {
      summaryText = targetWorldSetting || "自由演练小剧场";
    }

    const newCard: TheaterHistoryCard = {
      id: `history-${Date.now()}`,
      charId: targetChar.id,
      charName: targetChar.name,
      worldSetting: targetWorldSetting,
      startTime: targetMessages[0]?.timestamp || Date.now(),
      endTime: Date.now(),
      messageCount: targetMessages.length,
      summary: summaryText,
      mountedLoreTitles,
      messages: [...targetMessages],
      summaries: [...targetSummaries]
    };

    const newHistory = [newCard, ...theaterHistory];
    setTheaterHistory(newHistory);
    localStorage.setItem("theater_history", JSON.stringify(newHistory));

    // 清除当前活动会话
    setActiveSession(null);
    localStorage.removeItem("active_theater_session");
    setMessages([]);
    setSummaries([]);
    setWorldSetting("");
    setMountedLoreIds([]);
    setInputText("");
    setView('menu');
    showToast("剧场已结束，已生成剧情卡片归档");
  };

  // Delete history card
  const confirmDeleteHistoryCard = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfirmModal({
      show: true,
      title: "确认删除剧场",
      message: "确定要删除这个剧场吗？删除后不可恢复。",
      onConfirm: () => {
        setConfirmModal(null);
        deleteHistoryCard(id);
      }
    });
  };

  const deleteHistoryCard = (id: string) => {
    const updated = theaterHistory.filter(h => h.id !== id);
    setTheaterHistory(updated);
    localStorage.setItem("theater_history", JSON.stringify(updated));
    if (selectedHistoryCard?.id === id) {
      setSelectedHistoryCard(null);
    }
    showToast("剧场记录已永久删除");
  };

  // Send user message without triggering AI generation
  const handleSendUserMessage = () => {
    if (!inputText.trim()) {
      showToast("请输入描写内容");
      return;
    }
    const text = inputText.trim();
    const userMsg: TheaterMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now()
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    saveCurrentSession(updated);
    setInputText("");
    showToast("已发送行动");
  };

  // Advance plot without user input
  const handleAdvanceTheater = async () => {
    if (!selectedChar || isGenerating) return;
    
    // Check if there are existing messages to continue from
    if (messages.length === 0) {
      handleGenerateTheater("请开始第一段小剧场演绎。");
    } else {
      handleGenerateTheater();
    }
  };

  // AI Generation Handler
  const handleGenerateTheater = async (customPrompt?: string, overrideList?: TheaterMessage[], forceStart = false) => {
    console.log('🔴 小剧场生成函数被调用了！');
    if (!selectedChar) return;
    if (isGenerating && !forceStart) return;

    // Rule 1 & 4: Mandatory check before generation
    if (!worldSetting || !worldSetting.trim()) {
      const errReason = "世界设定缺失";
      showToast(errReason);
      const errorMsgObj: TheaterMessage = {
        id: `err-${Date.now()}`,
        role: "system",
        content: `【生成失败】${errReason}：请先在剧场设定中填写世界观背景设定。`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsgObj]);
      setIsGenerating(false);
      return;
    }

    if (!selectedChar.description || !selectedChar.description.trim()) {
      const errReason = "角色人设未读取";
      showToast(errReason);
      const errorMsgObj: TheaterMessage = {
        id: `err-${Date.now()}`,
        role: "system",
        content: `【生成失败】${errReason}：当前参演角色的性格与人设数据为空。`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsgObj]);
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);

    const baseMessages = overrideList || [...messages];
    const newMessages = [...baseMessages];

    if (customPrompt && customPrompt.trim()) {
      newMessages.push({ 
        id: `user-${Date.now()}`, 
        role: "user", 
        content: customPrompt.trim(), 
        timestamp: Date.now() 
      });
    }

    setMessages(newMessages);

    try {
      const charMemories = getCharacterMemories(selectedChar);
      const memoryText = charMemories.length > 0 
        ? charMemories.map((m, idx) => `${idx + 1}. ${m}`).join('\n')
        : '（暂无角色记忆数据）';

      const mountedLores = (loreList || []).filter(l => mountedLoreIds.includes(l.id));
      const mountedLoreText = mountedLores.length > 0 
        ? mountedLores.map(l => `【世界书：《${l.title}》】\n关键词：${(l.keys || []).join('、')}\n设定内容：${l.content}`).join('\n\n')
        : '（未挂载世界书）';

      const isOpeningScene = newMessages.length === 0 || (newMessages.length === 1 && newMessages[0].role === 'user' && newMessages[0].content.includes('开场'));

      // Perspective rule
      let perspectiveInstruction = "";
      if (perspective === 'first') {
        perspectiveInstruction = `第一人称：角色自称用“我”，称呼用户用“你”。`;
      } else if (perspective === 'second') {
        perspectiveInstruction = `第二人称：角色自称用角色姓名（“${selectedChar.name}”），称呼用户用“你”。`;
      } else {
        perspectiveInstruction = `第三人称：角色使用姓名（“${selectedChar.name}”），称呼用户亦使用姓名。`;
      }

      const systemInstruction = `
你现在正在进行【小剧场独立架空演绎模式】。这是一个纯文学小说/剧本演绎环境。用户是故事的【观看者/旁观者】，而不是对话对象，角色绝对不能对用户说话。

【第一部分：强制读取的底层核心数据（必须全面结合，不可遗漏）】：
1. 【剧场上下文】：已由系统完整加载（包括前期剧情记忆卡片摘要与未总结段落原文）。
2. 【剧场世界设定】：
${worldSetting}

3. 【已挂载的世界书内容】：
${mountedLoreText}

4. 【参演角色人设】：
- 角色姓名：${selectedChar.name}
- 角色性格与背景：${selectedChar.description}
${selectedChar.systemInstruction || ''}

5. 【角色记忆库（强制读取）】：
${memoryText}

6. 【人称规则（最高级别强制，仅对 AI 生成的剧情描述生效）】：
- ${perspectiveInstruction}
- 注意：用户发送的剧情描述不受限制，不影响角色的人称变化。

【第二部分：严格执行的演绎规则与剧情推进逻辑】：
1. 【禁止结局式总结】：
   - 严禁以“结局式总结”收尾。严禁出现诸如“开启了这场不可思议的计划”、“故事到这里就结束了”、“从此再也没有见过”、“转身消失在夜色里再也没回头”等总结性、宣告性或旁白式收尾描写。
   - 严禁跳过剧情直接跳到结果，必须专注于当下的交互过程。

2. 【强制保持“进行中”状态（Turn-Ending Rules）】：
   - 每一段落的末尾必须停留在“正在进行中”的状态，留下明确的推进点（Hook），等待下一轮互动。
   - 推进点示例：
     * 角色做出一个动作后停下（有后续空间的动作，如：他站在晨光里，像是在等你说什么）。
     * 环境出现新变化（如：灯忽然灭了、有人在敲门、远处传来奇怪的声音）。
     * 角色说了一句需要回应的话（如：他停顿了一下，像是在等你开口；或者话说到一半被打断）。
     * 一个新的物品或线索出现（如：你看到窗外有个人影一闪而过；或者桌子上多了一封信）。

3. 【视角统一】：必须严格根据人称规则进行文学描写与叙述。
4. 【用户输入描写规则】：
   - 用户输入的【未加双引号】内容视为动作/神态/心理，角色通过观察推测，而非直接读取。
   - 用户输入的【加双引号】内容视为台词。
5. 【绝对禁止出现 AI 身份】：严禁提及“我是AI”、“加载中”、“服务器”等任何现代科技或AI术语。
6. 【排版与格式】：
   - 对话必须使用全角双引号（“ ”），单独成行。
   - 示例格式：
     他站在窗边，外面的雨刚停。
     “你来了。”
     她推开门，水珠从伞尖滴落。

7. 每轮生成字数要求在【${minWord || 500}-${maxWord || 3000}字】左右。
8. 文风偏好：${writingTone === 'literary' ? '文艺细腻' : writingTone === 'cold_restrained' ? '冷淡克制' : writingTone === 'warm_soft' ? '温暖柔和' : '日常白描'}。
${isOpeningScene ? '- 当前是故事的第一段开场描写，请直接描绘生动的环境、气氛与情境引入，自然地开启剧情，不要附带任何多余解释。' : ''}
`;

      let payloadMessages = buildPayloadMessages(newMessages, summaries);

      if (payloadMessages.length === 0) {
        payloadMessages = [{
          role: "user",
          content: "请开始第一段小剧场演绎，结合世界设定 and 角色人设生成开场描写。"
        }];
      }

      const apiUrl = localStorage.getItem('apiUrl') || settings?.apiUrl || '';
      const apiKey = localStorage.getItem('apiKey') || settings?.apiKey || '';
      const model = localStorage.getItem('model') || selectedChar.model || settings?.model || 'gpt-3.5-turbo';
      const temperature = parseFloat(localStorage.getItem('temperature') || String(settings?.temperature) || '0.8');

      if (!apiUrl || !apiKey) {
        showToast('请先在设置页配置 API');
        return;
      }

      const cleanApiUrl = apiUrl.replace(/\/+$/, '');
      let endpoint = cleanApiUrl;
      if (endpoint.endsWith('/chat/completions')) {
        // already complete
      } else if (endpoint.endsWith('/v1')) {
        endpoint = endpoint + '/chat/completions';
      } else if (endpoint.includes('/v1/')) {
        endpoint = endpoint + (endpoint.endsWith('/') ? '' : '/') + 'chat/completions';
      } else {
        endpoint = endpoint + '/v1/chat/completions';
      }

      const fullMessages = [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        ...payloadMessages.map((m: any) => ({
          role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
          content: m.content || ''
        }))
      ];

      console.log('🔴 小剧场请求URL:', endpoint);
      console.log('🔴 API Key 是否存在:', !!apiKey);

      const fetchRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: fullMessages,
          temperature: temperature,
        }),
      });

      if (!fetchRes.ok) {
        const errText = await fetchRes.text().catch(() => '');
        throw new Error(`API 请求失败: ${fetchRes.status} ${errText}`);
      }

      const data = await fetchRes.json();
      const reply = data.choices?.[0]?.message?.content || '';

      const aiMsg: TheaterMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: reply || "...",
        timestamp: Date.now(),
      };

      const finalMsgs = [...newMessages, aiMsg];
      setMessages(finalMsgs);
      saveCurrentSession(finalMsgs);
    } catch (err: any) {
      console.error("[Theater Generation Error]:", err);
      let errMsg = err?.message || (typeof err === "string" ? err : "请求失败");
      if (errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("aborted")) {
        errMsg = "API 请求超时";
      } else if (!errMsg.includes("API 返回错误") && !errMsg.includes("世界设定缺失") && !errMsg.includes("角色人设未读取")) {
        errMsg = `API 请求超时或网络异常 (${errMsg})`;
      }
      const displayMsg = errMsg.includes("API 返回错误") || errMsg.includes("API 请求超时") ? errMsg : `API 返回错误：${errMsg}`;
      showToast(displayMsg);
      const errorMsgObj: TheaterMessage = {
        id: `err-${Date.now()}`,
        role: "system",
        content: `【生成失败】${displayMsg}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsgObj]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-roll (Regenerate) specific card content
  const handleRerollCard = async (targetMsgId: string) => {
    if (!selectedChar || isGenerating) return;

    // Rule 1 & 4: Mandatory check before generation
    if (!worldSetting || !worldSetting.trim()) {
      const errReason = "世界设定缺失";
      showToast(errReason);
      const errorMsgObj: TheaterMessage = {
        id: `err-${Date.now()}`,
        role: "system",
        content: `【生成失败】${errReason}：请先在剧场设定中填写世界观背景设定。`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsgObj]);
      return;
    }

    if (!selectedChar.description || !selectedChar.description.trim()) {
      const errReason = "角色人设未读取";
      showToast(errReason);
      const errorMsgObj: TheaterMessage = {
        id: `err-${Date.now()}`,
        role: "system",
        content: `【生成失败】${errReason}：当前参演角色的性格与人设数据为空。`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsgObj]);
      return;
    }

    const index = messages.findIndex(m => m.id === targetMsgId);
    if (index === -1) return;

    const targetMsg = messages[index];
    const contextBefore = messages.slice(0, index);

    setIsGenerating(true);
    showToast("正在重新生成该段剧情...");

    try {
      const charMemories = getCharacterMemories(selectedChar);
      const memoryText = charMemories.length > 0 
        ? charMemories.map((m, idx) => `${idx + 1}. ${m}`).join('\n')
        : '（暂无角色记忆数据）';

      const mountedLores = (loreList || []).filter(l => mountedLoreIds.includes(l.id));
      const mountedLoreText = mountedLores.length > 0 
        ? mountedLores.map(l => `【世界书：《${l.title}》】\n关键词：${(l.keys || []).join('、')}\n设定内容：${l.content}`).join('\n\n')
        : '（未挂载世界书）';

      const isOpeningScene = contextBefore.length === 0;

      // Perspective rule
      let perspectiveInstruction = "";
      if (perspective === 'first') {
        perspectiveInstruction = `第一人称：角色自称用“我”，称呼用户用“你”。`;
      } else if (perspective === 'second') {
        perspectiveInstruction = `第二人称：角色自称用角色姓名（“${selectedChar.name}”），称呼用户用“你”。`;
      } else {
        perspectiveInstruction = `第三人称：角色使用姓名（“${selectedChar.name}”），称呼用户亦使用姓名。`;
      }

      const systemInstruction = `
你现在正在进行【小剧场独立架空演绎模式】。这是一个纯文学小说/剧本演绎环境。用户是故事的【观看者/旁观者】，而不是对话对象，角色绝对不能对用户说话。

【第一部分：强制读取的底层核心数据（必须全面结合，不可遗漏）】：
1. 【剧场上下文】：已由系统完整加载（包括前期剧情记忆卡片摘要与未总结段落原文）。
2. 【剧场世界设定】：
${worldSetting}

3. 【已挂载的世界书内容】：
${mountedLoreText}

4. 【参演角色人设】：
- 角色姓名：${selectedChar.name}
- 角色性格与背景：${selectedChar.description}
${selectedChar.systemInstruction || ''}

5. 【角色记忆库（强制读取）】：
${memoryText}

6. 【人称规则（最高级别强制，仅对 AI 生成的剧情描述生效）】：
- ${perspectiveInstruction}
- 注意：用户发送的剧情描述不受限制，不影响角色的人称变化。

【第二部分：严格执行的演绎规则与剧情推进逻辑】：
1. 【禁止结局式总结】：
   - 严禁以“结局式总结”收尾。严禁出现诸如“开启了这场不可思议的计划”、“故事到这里就结束了”、“从此再也没有见过”、“转身消失在夜色里再也没回头”等总结性、宣告性或旁白式收尾描写。
   - 严禁跳过剧情直接跳到结果，必须专注于当下的交互过程。

2. 【强制保持“进行中”状态（Turn-Ending Rules）】：
   - 每一段落的末尾必须停留在“正在进行中”的状态，留下明确的推进点（Hook），等待下一轮互动。
   - 推进点示例：
     * 角色做出一个动作后停下（有后续空间的动作，如：他站在晨光里，像是在等你说什么）。
     * 环境出现新变化（如：灯忽然灭了、有人在敲门、远处传来奇怪的声音）。
     * 角色说了一句需要回应的话（如：他停顿了一下，像是在等你开口；或者话说到一半被打断）。
     * 一个新的物品或线索出现（如：你看到窗外有个人影一闪而过；或者桌子上多了一封信）。

3. 【视角统一】：必须严格根据人称规则进行文学描写与叙述。
4. 【结合上下文重新生成】：请结合上下文重新生成一段【不同角度/不同细节】的全新剧情描写，严禁敷衍。
5. 【绝对禁止出现 AI 身份】：严禁提及“我是AI”、“加载中”、“服务器”等任何现代科技或AI术语。
6. 【排版与格式】：
   - 对话必须使用全角双引号（“ ”），单独成行。
   - 示例格式：
     他站在窗边，外面的雨刚停。
     “你来了。”
     她推开门，水珠从伞尖滴落。

7. 每轮生成字数要求在【${minWord || 500}-${maxWord || 3000}字】左右。
8. 文风偏好：${writingTone === 'literary' ? '文艺细腻' : writingTone === 'cold_restrained' ? '冷淡克制' : writingTone === 'warm_soft' ? '温暖柔和' : '日常白描'}。
${isOpeningScene ? '- 当前是故事的第一段开场描写，请直接描绘生动的环境、气氛与情境引入。' : ''}
`;

      let payloadMessages = buildPayloadMessages(contextBefore, summaries);

      if (targetMsg.role === 'user') {
        payloadMessages.push({ role: 'user', content: targetMsg.content });
      }

      if (payloadMessages.length === 0) {
        payloadMessages = [{
          role: "user",
          content: "请重新生成一段小剧场演绎的开场描写。"
        }];
      }

      const apiUrl = localStorage.getItem('apiUrl') || settings?.apiUrl || '';
      const apiKey = localStorage.getItem('apiKey') || settings?.apiKey || '';
      const model = localStorage.getItem('model') || selectedChar.model || settings?.model || 'gpt-3.5-turbo';
      const temperature = parseFloat(localStorage.getItem('temperature') || String(settings?.temperature) || '0.8');

      if (!apiUrl || !apiKey) {
        showToast('请先在设置页配置 API');
        return;
      }

      const cleanApiUrl = apiUrl.replace(/\/+$/, '');
      let endpoint = cleanApiUrl;
      if (endpoint.endsWith('/chat/completions')) {
        // already complete
      } else if (endpoint.endsWith('/v1')) {
        endpoint = endpoint + '/chat/completions';
      } else if (endpoint.includes('/v1/')) {
        endpoint = endpoint + (endpoint.endsWith('/') ? '' : '/') + 'chat/completions';
      } else {
        endpoint = endpoint + '/v1/chat/completions';
      }

      const fullMessages = [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        ...payloadMessages.map((m: any) => ({
          role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
          content: m.content || ''
        }))
      ];

      console.log('🔴 小剧场请求URL:', endpoint);
      console.log('🔴 API Key 是否存在:', !!apiKey);

      const fetchRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: fullMessages,
          temperature: temperature,
        }),
      });

      if (!fetchRes.ok) {
        const errText = await fetchRes.text().catch(() => '');
        throw new Error(`API 请求失败: ${fetchRes.status} ${errText}`);
      }

      const data = await fetchRes.json();
      const reply = data.choices?.[0]?.message?.content || '';

      const newAiMsg: TheaterMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: reply || "...",
        timestamp: Date.now(),
      };

      let finalMsgs: TheaterMessage[];
      if (targetMsg.role === 'user') {
        if (index + 1 < messages.length && messages[index + 1].role === 'assistant') {
          finalMsgs = [...messages.slice(0, index + 1), newAiMsg, ...messages.slice(index + 2)];
        } else {
          finalMsgs = [...messages.slice(0, index + 1), newAiMsg, ...messages.slice(index + 1)];
        }
      } else {
        finalMsgs = [...contextBefore, newAiMsg, ...messages.slice(index + 1)];
      }

      setMessages(finalMsgs);
      saveCurrentSession(finalMsgs);
      showToast("已重roll生成新剧情");
    } catch (err: any) {
      console.error("[Theater Reroll Error]:", err);
      let errMsg = err?.message || "重roll失败";
      if (errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("aborted")) {
        errMsg = "API 请求超时";
      } else if (!errMsg.includes("API 返回错误")) {
        errMsg = `API 请求超时或网络异常 (${errMsg})`;
      }
      const displayMsg = errMsg.includes("API 返回错误") || errMsg.includes("API 请求超时") ? errMsg : `API 返回错误：${errMsg}`;
      showToast(displayMsg);
      const errorMsgObj: TheaterMessage = {
        id: `err-${Date.now()}`,
        role: "system",
        content: `【生成失败】${displayMsg}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsgObj]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate AI World Setting keyword inspiration
  const generateSetting = async () => {
    if(!keywords.trim()) {
      showToast("请先输入一些关键词");
      return;
    }
    setIsGenerating(true);
    try {
      const apiUrl = localStorage.getItem('apiUrl') || settings?.apiUrl || '';
      const apiKey = localStorage.getItem('apiKey') || settings?.apiKey || '';
      const model = localStorage.getItem('model') || 'gpt-3.5-turbo';
      const temperature = parseFloat(localStorage.getItem('temperature') || String(settings?.temperature) || '0.7');

      if (!apiUrl || !apiKey) {
        showToast('请先在设置页配置 API');
        return;
      }

      const cleanApiUrl = apiUrl.replace(/\/+$/, '');
      let endpoint = cleanApiUrl;
      if (endpoint.endsWith('/chat/completions')) {
        // already complete
      } else if (endpoint.endsWith('/v1')) {
        endpoint = endpoint + '/chat/completions';
      } else if (endpoint.includes('/v1/')) {
        endpoint = endpoint + (endpoint.endsWith('/') ? '' : '/') + 'chat/completions';
      } else {
        endpoint = endpoint + '/v1/chat/completions';
      }

      const fetchRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: `基于关键词：“${keywords}”，请为你和角色的小剧场生成一段精致丰富的世界观设定与故故事背景。只输出设定正文，不带多余废话。` }],
          temperature: temperature,
        }),
      });

      if (!fetchRes.ok) {
        const errText = await fetchRes.text().catch(() => '');
        throw new Error(`API 请求失败: ${fetchRes.status} ${errText}`);
      }

      const data = await fetchRes.json();
      const reply = data.choices?.[0]?.message?.content || '';
      if (reply) {
        setWorldSetting(reply.trim());
        showToast("已自动生成世界设定");
      }
    } catch(e: any) { 
      console.error("[Generate Setting Error]:", e);
      const errMsg = e?.message || "灵感生成失败";
      const displayMsg = errMsg.includes("API 返回错误") ? errMsg : `API 返回错误：${errMsg}`;
      showToast(displayMsg);
    } finally { 
      setIsGenerating(false); 
    }
  };

  // Start new theater creation flow
  const handleStartNewTheaterFlow = (char: Character) => {
    const doCreate = () => {
      setSelectedCharId(char.id);
      setWorldSetting("");
      setMountedLoreIds([]);
      setKeywords("");
      setMessages([]);
      setShowSetupModal(true);
    };

    if (activeSession && activeSession.messages.length > 0) {
      setConfirmModal({
        show: true,
        title: "归档并开始新剧场？",
        message: "当前已有正在进行中的剧场，开始新剧场会自动归档当前剧场至历史，确定继续吗？",
        onConfirm: async () => {
          setConfirmModal(null);
          await archiveTheater();
          doCreate();
        }
      });
    } else {
      doCreate();
    }
  };

  // Confirm setup from setup modal
  const handleConfirmSetup = async () => {
    setIsGenerating(false);
    setShowSetupModal(false);
    setView('theater');
    saveCurrentSession([], {
      worldSetting,
      mountedLoreIds,
      minWord: Number(minWord) || 500,
      maxWord: Number(maxWord) || 3000,
      perspective,
      writingTone,
      keywords
    });

    // Requirement: 点击“更改设定/创建”确认后，进入剧场主界面，AI 自动根据世界设定生成第一段描写内容（开场白）
    showToast("小剧场启动中，正在为您生成第一段开场描写...");
    setTimeout(() => {
      handleGenerateTheater(undefined, [], true);
    }, 100);
  };

  // Confirm edit settings inside active theater
  const handleConfirmEditSettings = () => {
    setConfirmModal({
      show: true,
      title: "确定更改设定吗？",
      message: "更改将在下一轮 AI 回复中生效，确认应用新设定吗？",
      onConfirm: () => {
        setConfirmModal(null);
        setShowSetupModal(false);
        saveCurrentSession();
        showToast("剧场设定已更新");
      }
    });
  };

  /* =========================================================
     VIEW 1: PRIMARY ENTRANCE MENU ('menu')
     ========================================================= */
  if (view === 'menu') {
    return (
      <div className="flex-1 flex flex-col bg-[#F8F6F3] text-neutral-900 h-full w-full select-none relative overflow-hidden">
        {/* Toast Notification */}
        {toast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-xs transition-all animate-fade-in pointer-events-none">
            {toast}
          </div>
        )}

        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-neutral-200/80 shrink-0 shadow-2xs">
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-full active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-base text-neutral-900 tracking-tight">小剧场</span>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Section 1: Active Ongoing Theater (If any) */}
          {activeSession && (
            <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-neutral-800">正在进行中的剧场</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">
                  {new Date(activeSession.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {selectedChar ? (
                  <CharacterAvatar character={selectedChar} mode="real" size={48} />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-600">
                    {activeSession.charName[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-neutral-900 truncate">{activeSession.charName} 的剧场</h4>
                  <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                    {activeSession.worldSetting ? `设定：${activeSession.worldSetting}` : '架空演绎模式'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={resumeActiveSession}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-2xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>继续上一次的剧场</span>
                </button>
                <button
                  onClick={() => {
                    setConfirmModal({
                      show: true,
                      title: "确认归档剧场？",
                      message: "确定要结束并把当前剧场保存到历史卡片吗？",
                      onConfirm: () => {
                        setConfirmModal(null);
                        archiveTheater();
                      }
                    });
                  }}
                  className="px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl text-xs font-bold transition-all"
                  title="结束并保存卡片"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Create New Theater Action */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">剧场创作</span>
            </div>
            <button
              onClick={() => setView('char_select')}
              className="w-full bg-white hover:bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs active:scale-98 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-sm text-neutral-900 block">开始新的剧场</span>
                  <span className="text-[11px] text-neutral-400 block">选择参演角色，独立架空设定</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Section 3: History Archives */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3.5 h-3.5" />
                <span>历史剧场 ({theaterHistory.length})</span>
              </span>
              {theaterHistory.length > 0 && (
                <button
                  onClick={() => setView('history_list')}
                  className="text-xs font-bold text-neutral-600 hover:text-black flex items-center gap-0.5"
                >
                  <span>查看全部</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {theaterHistory.length === 0 ? (
              <div className="bg-white/60 rounded-2xl p-6 text-center border border-dashed border-neutral-200/80">
                <Book className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-neutral-400">暂无归档的历史剧场</p>
                <p className="text-[10px] text-neutral-300 mt-0.5">结束剧场后自动生成剧情卡片保存在这里</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {theaterHistory.slice(0, 3).map((card) => (
                  <div
                    key={card.id}
                    onClick={() => {
                      setSelectedHistoryCard(card);
                      setView('history_list');
                    }}
                    className="bg-white hover:bg-neutral-50 border border-neutral-200/90 rounded-2xl p-3.5 cursor-pointer shadow-2xs transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900">{card.charName} 的剧场</span>
                        <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-medium">
                          {card.messageCount} 轮对话
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-neutral-400">
                          {new Date(card.endTime).toLocaleDateString()}
                        </span>
                        <button
                          onClick={(e) => confirmDeleteHistoryCard(card.id, e)}
                          className="p-1 text-neutral-300 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors"
                          title="删除剧场"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed bg-neutral-50 p-2 rounded-lg italic">
                      “{card.summary}”
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-stone-500 font-normal pt-1 border-t border-neutral-100/80">
                      <span>{new Date(card.endTime || card.startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>共 {card.summary?.length || 0} 字</span>
                      <span>第 {card.messageCount || 0} 轮</span>
                    </div>

                    {card.mountedLoreTitles && card.mountedLoreTitles.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {card.mountedLoreTitles.map((t, idx) => (
                          <span key={idx} className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200/60">
                            📚 {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmModal && confirmModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-fade-in space-y-4">
              <h3 className="font-bold text-sm text-neutral-900">{confirmModal.title}</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">{confirmModal.message}</p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-500 hover:bg-neutral-100"
                >
                  取消
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-black text-white active:scale-95 transition-all shadow-xs"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================
     VIEW 2: CHARACTER SELECTOR ('char_select')
     ========================================================= */
  if (view === 'char_select') {
    return (
      <div className="flex-1 flex flex-col bg-[#F8F6F3] text-neutral-900 h-full w-full select-none relative overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-neutral-200 shrink-0">
          <button onClick={() => setView('menu')} className="p-1 hover:bg-neutral-100 rounded-full active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-base text-neutral-900">选择参演角色</span>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
          {characters.filter(c => !(c as any).isGroup).map(c => (
            <button 
              key={c.id} 
              onClick={() => handleStartNewTheaterFlow(c)} 
              className="bg-white rounded-2xl p-4 border border-neutral-200/80 flex flex-col items-center justify-center gap-2.5 hover:border-black active:scale-95 transition-all shadow-2xs group"
            >
              <CharacterAvatar character={c} mode="real" size={56} />
              <div className="text-center">
                <span className="font-bold text-xs text-neutral-900 block group-hover:text-black">{c.name}</span>
                <span className="text-[10px] text-neutral-400 line-clamp-1 block mt-0.5">{c.description}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Setup Modal */}
        {showSetupModal && selectedChar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative animate-fade-in max-h-[85vh] overflow-y-auto">
              <button 
                onClick={() => { setShowSetupModal(false); setView('char_select'); }}
                className="absolute right-4 top-4 p-1.5 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2.5 mb-4 pr-8">
                <CharacterAvatar character={selectedChar} mode="real" size={32} />
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">与 {selectedChar.name} 开启小剧场</h3>
                  <p className="text-[10px] text-neutral-400">独立架空设定与故事起航</p>
                </div>
              </div>

              <SetupForm 
                onSave={handleConfirmSetup} 
                buttonText="确定设定并开始剧场"
                keywords={keywords}
                setKeywords={setKeywords}
                worldSetting={worldSetting}
                setWorldSetting={setWorldSetting}
                minWord={minWord}
                setMinWord={setMinWord}
                maxWord={maxWord}
                setMaxWord={setMaxWord}
                perspective={perspective}
                setPerspective={setPerspective}
                writingTone={writingTone}
                setWritingTone={setWritingTone}
                isGenerating={isGenerating}
                generateSetting={generateSetting}
                loreList={loreList}
                mountedLoreIds={mountedLoreIds}
                setMountedLoreIds={setMountedLoreIds}
              />
            </div>
          </div>
        )}

        {/* Confirm Modal */}
        {confirmModal && confirmModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
            <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-fade-in space-y-4">
              <h3 className="font-bold text-sm text-neutral-900">{confirmModal.title}</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">{confirmModal.message}</p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-500 hover:bg-neutral-100"
                >
                  取消
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-black text-white active:scale-95 transition-all shadow-xs"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================
     VIEW 3: HISTORY ARCHIVES LIST ('history_list')
     ========================================================= */
  if (view === 'history_list') {
    return (
      <div className="flex-1 flex flex-col bg-[#F8F6F3] text-neutral-900 h-full w-full select-none relative overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-neutral-200 shrink-0">
          <button onClick={() => setView('menu')} className="p-1 hover:bg-neutral-100 rounded-full active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-base text-neutral-900">历史剧场存档</span>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {theaterHistory.length === 0 ? (
            <div className="bg-white/60 rounded-2xl p-8 text-center border border-dashed border-neutral-200">
              <Book className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-neutral-400">暂无历史归档卡片</p>
            </div>
          ) : (
            theaterHistory.map(card => (
              <div 
                key={card.id}
                className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">{card.charName} 的剧场</h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      归档时间：{new Date(card.endTime).toLocaleString()} · 共 {card.messageCount} 轮
                    </p>
                  </div>
                  <button
                    onClick={(e) => confirmDeleteHistoryCard(card.id, e)}
                    className="p-1.5 text-neutral-300 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors"
                    title="删除记录"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {card.worldSetting && (
                  <div className="text-[11px] bg-neutral-100 p-2 rounded-lg text-neutral-700">
                    <span className="font-bold">【背景】</span>{card.worldSetting}
                  </div>
                )}

                <div className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 italic">
                  “{card.summary}”
                </div>
                <div className="flex items-center gap-3 text-[10px] text-stone-500 font-normal pt-1 border-t border-neutral-100/80">
                  <span>{new Date(card.endTime || card.startTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>共 {card.summary?.length || 0} 字</span>
                  <span>第 {card.messageCount || 0} 轮</span>
                </div>

                {card.mountedLoreTitles && card.mountedLoreTitles.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <span className="text-[10px] text-neutral-400">挂载世界书:</span>
                    {card.mountedLoreTitles.map((t, idx) => (
                      <span key={idx} className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200/60">
                        📚 {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Actions: Continue and Delete */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => continueHistoryCard(card)}
                    className="flex-1 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-2xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-white" />
                    <span>继续</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => confirmDeleteHistoryCard(card.id, e)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all border border-red-200/60"
                    title="删除记录"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除</span>
                  </button>
                </div>

                <button
                  onClick={() => setSelectedHistoryCard(selectedHistoryCard?.id === card.id ? null : card)}
                  className="w-full py-1.5 text-[11px] font-bold text-neutral-600 hover:text-black border-t border-neutral-100 flex items-center justify-center gap-1 transition-colors"
                >
                  <span>{selectedHistoryCard?.id === card.id ? "收起剧场实录" : "查看剧场对话实录"}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${selectedHistoryCard?.id === card.id ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded Messages Log */}
                {selectedHistoryCard?.id === card.id && (
                  <div className="pt-2 space-y-2 border-t border-neutral-100 max-h-60 overflow-y-auto">
                    {card.messages.map((m, idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-neutral-900 text-white ml-6' : 'bg-neutral-100 text-neutral-800 mr-6'}`}>
                        <span className="text-[10px] opacity-60 block font-bold mb-1">{m.role === 'user' ? '你' : card.charName}</span>
                        {m.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  /* =========================================================
     VIEW 4: MAIN THEATER SCREEN ('theater')
     ========================================================= */
  return (
    <div className="flex-1 flex flex-col bg-[#F8F6F3] text-neutral-900 h-full w-full overflow-hidden select-none relative">
      {/* Floating Toast Notification */}
      {toast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-xs transition-all animate-fade-in pointer-events-none">
          {toast}
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200/80 shrink-0 shadow-2xs">
        <button 
          onClick={() => {
            saveCurrentSession();
            setView('menu');
            showToast("剧场进度已保存");
          }} 
          className="p-1 hover:bg-neutral-100 rounded-full active:scale-90 transition-all text-neutral-700"
          title="返回菜单（进度自动保存）"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="font-bold text-sm text-neutral-900 tracking-tight">
          {selectedChar?.name} 的剧场
        </span>

        <button 
          onClick={() => setShowSetupModal(true)} 
          className="p-1 hover:bg-neutral-100 rounded-full active:scale-90 transition-all text-neutral-700"
          title="剧场设定"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">
        {summaries.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3 shadow-2xs space-y-1.5 mb-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>已生成 {summaries.length} 张剧情记忆卡片</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSummaryModal(true)}
                className="text-[11px] text-amber-800 hover:text-amber-950 underline font-medium"
              >
                查看卡片列表
              </button>
            </div>
            <p className="text-[10px] text-amber-800/80 line-clamp-2 leading-relaxed">
              最新 ({summaries[summaries.length - 1].rangeText})：{summaries[summaries.length - 1].summary}
            </p>
          </div>
        )}

        {messages.length === 0 && !isGenerating && (
          <div className="text-center py-12 px-6">
            <div className="w-12 h-12 rounded-full bg-neutral-200/60 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-neutral-500 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-neutral-700">剧场准备完成</p>
            <p className="text-[11px] text-neutral-400 mt-1">您可以输入描述并发送，或点击右下角爱心图标让 AI 展开描写</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-2xl max-w-[88%] text-xs leading-relaxed shadow-2xs ${
              msg.role === 'user' 
                ? 'bg-neutral-900 text-white rounded-tr-none' 
                : 'bg-white border border-neutral-200/80 text-neutral-800 rounded-tl-none font-sans'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-neutral-100 text-[10px] text-stone-400 select-none">
                  <span className="font-medium">第 {messageRounds.get(msg.id) || 1} 轮</span>
                  {summaries.some(s => {
                    const r = messageRounds.get(msg.id) || 0;
                    return r >= (s.startRound || 0) && r <= (s.endRound || 0);
                  }) && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold border border-amber-200/50">
                      已总结
                    </span>
                  )}
                </div>
              )}

              <div className="whitespace-pre-wrap">
                {msg.content.split('\n').map((line, i) => {
                  if (!line) return <div key={i} className="h-2"></div>;
                  const parts = line.split(/(“[^”]*”)/g);
                  return (
                    <div key={i} className="min-h-[1.25em]">
                      {parts.map((part, j) => 
                        part.startsWith('“') && part.endsWith('”') 
                          ? <span key={j} className="italic opacity-90">{part}</span> 
                          : <span key={j}>{part}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 剧情卡片 / 消息操作按钮 */}
              <div className={`flex items-center justify-between gap-2.5 mt-3 pt-2 border-t text-[10px] font-medium ${
                msg.role === 'user' ? 'border-neutral-800 text-neutral-300' : 'border-neutral-100 text-neutral-500'
              }`}>
                {msg.role === 'assistant' ? (
                  <span className="text-[10px] text-neutral-400 font-mono">共 {msg.content.length} 字</span>
                ) : (
                  <span></span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      show: true,
                      title: msg.role === 'user' ? "删除该条消息？" : "删除该段剧情？",
                      message: "确定要删除这条消息吗？该操作无法撤销。",
                      onConfirm: () => {
                        setConfirmModal(null);
                        const updated = messages.filter(m => m.id !== msg.id);
                        setMessages(updated);
                        saveCurrentSession(updated);
                        showToast(msg.role === 'user' ? "已删除该条消息" : "已删除该段剧情");
                      }
                    });
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all active:scale-95 ${
                    msg.role === 'user'
                      ? 'hover:bg-neutral-800 text-neutral-300 hover:text-red-400'
                      : 'hover:bg-neutral-100 text-neutral-500 hover:text-red-600'
                  }`}
                  title="删除"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>删除</span>
                </button>

                {msg.role === 'user' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText(msg.content);
                      if (msg.content.length > 50 || msg.content.includes('\n')) {
                        setIsInputExpanded(true);
                      }
                      showToast("已将消息内容返回输入框，可修改后发送");
                      setTimeout(() => {
                        textareaRef.current?.focus();
                      }, 50);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded transition-all active:scale-95 hover:bg-neutral-800 text-neutral-300 hover:text-white"
                    title="编辑此条消息（内容返回输入框）"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>编辑</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRerollCard(msg.id)}
                    disabled={isGenerating}
                    className="flex items-center gap-1 px-2 py-0.5 rounded transition-all active:scale-95 disabled:opacity-50 hover:bg-neutral-100 text-neutral-600 hover:text-black"
                    title="重新生成此段剧情"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>重roll</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {unsummarizedRounds >= 10 && (
          <div className="flex items-center justify-between gap-2 py-2 px-3 text-stone-600 text-[10px] font-medium bg-amber-50/90 rounded-xl my-2 border border-amber-200/80 shadow-2xs animate-fade-in">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>已满 {unsummarizedRounds} 轮未总结剧情，可进行总结</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-2xs shrink-0"
            >
              去总结
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="flex justify-start animate-fade-in">
            <div className="py-2.5 px-4 rounded-2xl bg-white border border-neutral-200 text-xs text-neutral-800 rounded-tl-none flex items-center gap-1.5 shadow-2xs font-medium">
              <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action Panel Sliding Out above input */}
      {showActionPanel && (
        <div className="bg-white border-t border-neutral-200/90 p-3 shadow-lg animate-fade-in space-y-2 border-b shrink-0 z-20">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 px-1 pb-1 border-b border-neutral-100">
            <span>小剧场功能扩展</span>
            <button 
              type="button" 
              onClick={() => setShowActionPanel(false)}
              className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* 选项 1：推进剧情 */}
            <button
              type="button"
              onClick={() => {
                setShowActionPanel(false);
                handleAdvanceTheater();
              }}
              disabled={isGenerating}
              className="p-3 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 rounded-xl text-left flex flex-col gap-1 transition-all active:scale-98 disabled:opacity-50 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
                <span className="font-bold text-xs text-blue-950 group-hover:text-black">推进剧情</span>
              </div>
              <p className="text-[10px] text-blue-700/80 leading-tight">
                AI 将根据当前情境自动推进下一段剧情描写
              </p>
            </button>

            {/* 选项 2：结束该剧场并生成卡片存档 */}
            <button
              type="button"
              onClick={() => {
                setShowActionPanel(false);
                setConfirmModal({
                  show: true,
                  title: "结束剧场？",
                  message: "确定要结束当前剧场吗？系统将生成剧情卡片并归档至历史列表中。",
                  onConfirm: () => {
                    setConfirmModal(null);
                    archiveTheater();
                  }
                });
              }}
              className="p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-xl text-left flex flex-col gap-1 transition-all active:scale-98 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
                  <Square className="w-3.5 h-3.5 fill-current" />
                </div>
                <span className="font-bold text-xs text-neutral-900 group-hover:text-black">结束剧场并存档</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-tight">
                结束当前剧场，生成剧情卡片归档到历史剧场
              </p>
            </button>

            {/* 选项 3：总结 */}
            <button
              type="button"
              onClick={() => {
                setShowActionPanel(false);
                setShowSummaryModal(true);
              }}
              disabled={isGenerating}
              className="p-3 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80 rounded-xl text-left flex flex-col gap-1 transition-all active:scale-98 disabled:opacity-50 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs text-amber-950 group-hover:text-black">剧情总结</span>
              </div>
              <p className="text-[10px] text-amber-700/80 leading-tight">
                {unsummarizedRounds > 0 
                  ? `目前共有 ${unsummarizedRounds} 轮未总结剧情` 
                  : "查看剧情总结记忆卡片列表"}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Control Bar & Input Section */}
      <div className="p-3 bg-white border-t border-neutral-200/80 shrink-0 space-y-2">
        <div className="flex items-end gap-2">
          {/* 输入框左侧“总结”图标按钮 */}
          <button 
            type="button"
            onClick={() => setShowSummaryModal(true)}
            className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 mb-0.5 border relative ${
              showSummaryModal 
                ? 'bg-amber-600 text-white border-amber-700' 
                : 'text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-200/80'
            }`}
            title="剧情总结"
          >
            <FileText className="w-4 h-4" />
            {unsummarizedRounds >= 10 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </button>

          {/* 输入框（支持内容多时自适应展开与手动展开/收起） */}
          <div className="flex-1 relative flex flex-col bg-neutral-100 rounded-2xl border border-neutral-200/70 focus-within:border-neutral-400 focus-within:bg-white transition-all overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-1.5 pb-0.5 text-[10px] text-neutral-400 select-none">
              <span className="font-medium text-neutral-500">
                {isInputExpanded ? "展开模式 (Shift+Enter换行)" : "描写行动 (Shift+Enter换行)"}
              </span>
              <button
                type="button"
                onClick={() => setIsInputExpanded(!isInputExpanded)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-neutral-500 hover:text-black hover:bg-neutral-200/60 transition-colors"
                title={isInputExpanded ? "收起输入框" : "展开输入框"}
              >
                {isInputExpanded ? (
                  <>
                    <Minimize2 className="w-3 h-3" />
                    <span>收起</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3" />
                    <span>展开</span>
                  </>
                )}
              </button>
            </div>

            <textarea 
              ref={textareaRef}
              value={inputText} 
              onChange={e => {
                setInputText(e.target.value);
                if (e.target.value.length > 80 || e.target.value.includes('\n')) {
                  if (!isInputExpanded) setIsInputExpanded(true);
                }
              }} 
              rows={isInputExpanded ? 4 : 2}
              className={`w-full text-xs bg-transparent px-3 py-1 outline-none resize-none leading-relaxed transition-all ${
                isInputExpanded ? "max-h-48 overflow-y-auto" : "max-h-20 overflow-y-auto"
              }`}
              placeholder="描写你的行动或回应..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isGenerating && inputText.trim()) {
                    handleSendUserMessage();
                  }
                }
              }}
            />
          </div>

          {/* 用户发送按钮 */}
          <button 
            onClick={() => handleSendUserMessage()}
            disabled={isGenerating || !inputText.trim()}
            className="p-2.5 bg-neutral-900 text-white hover:bg-black disabled:opacity-30 rounded-xl transition-all active:scale-95 shrink-0 flex items-center justify-center shadow-2xs mb-0.5"
            title="发送用户行动"
          >
            <Send className="w-4 h-4" />
          </button>

          {/* AI 推进剧情按钮 */}
          <button 
            onClick={() => {
              if (isGenerating) return;
              handleAdvanceTheater();
              showToast("正在推进剧情...");
            }}
            disabled={isGenerating}
            className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 disabled:cursor-not-allowed rounded-xl transition-all active:scale-95 shrink-0 flex items-center justify-center border border-rose-200/60 mb-0.5"
            title={isGenerating ? "正在生成中..." : "推进剧情 (AI 续写)"}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
            ) : (
              <Heart className="w-4 h-4 fill-current" />
            )}
          </button>
        </div>
      </div>

      {/* Setup / Settings Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative animate-fade-in max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setShowSetupModal(false)}
              className="absolute right-4 top-4 p-1.5 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-base mb-4 text-neutral-900">修改剧场设定</h3>
            
            <SetupForm 
              onSave={handleConfirmEditSettings} 
              buttonText="更改设定"
              keywords={keywords}
              setKeywords={setKeywords}
              worldSetting={worldSetting}
              setWorldSetting={setWorldSetting}
              minWord={minWord}
              setMinWord={setMinWord}
              maxWord={maxWord}
              setMaxWord={setMaxWord}
              perspective={perspective}
              setPerspective={setPerspective}
              writingTone={writingTone}
              setWritingTone={setWritingTone}
              isGenerating={isGenerating}
              generateSetting={generateSetting}
              loreList={loreList}
              mountedLoreIds={mountedLoreIds}
              setMountedLoreIds={setMountedLoreIds}
            />
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-fade-in space-y-4">
            <h3 className="font-bold text-sm text-neutral-900">{confirmModal.title}</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-500 hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-black text-white active:scale-95 transition-all shadow-xs"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Memory Summary Cards Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-4 shadow-xl border border-neutral-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-neutral-900">剧情总结与记忆卡片</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSummaryModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rounds Overview Bar */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 my-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-stone-100 shadow-2xs">
                <div className="text-[10px] text-stone-400 font-medium">总轮数</div>
                <div className="text-sm font-bold text-stone-800 mt-0.5">{totalRounds}</div>
              </div>
              <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 shadow-2xs">
                <div className="text-[10px] text-amber-700 font-medium">未总结轮数</div>
                <div className="text-sm font-bold text-amber-900 mt-0.5">{unsummarizedRounds}</div>
              </div>
              <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/60 shadow-2xs">
                <div className="text-[10px] text-emerald-700 font-medium">已总结轮数</div>
                <div className="text-sm font-bold text-emerald-900 mt-0.5">{summarizedRounds}</div>
              </div>
            </div>

            {/* Summarize Action Buttons */}
            <div className="mb-3 space-y-1.5">
              <div className="text-[11px] font-bold text-stone-600">选择总结轮数：</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSummarizeByRounds(10)}
                  disabled={isGenerating || unsummarizedRounds === 0}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>总结 10 轮</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSummarizeByRounds(20)}
                  disabled={isGenerating || unsummarizedRounds === 0}
                  className="py-2.5 px-3 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>总结 20 轮</span>
                </button>
              </div>
              {unsummarizedRounds === 0 && (
                <div className="text-[10px] text-stone-400 text-center pt-0.5">目前无新推进的未总结剧情轮次</div>
              )}
            </div>

            <div className="text-[11px] font-bold text-stone-600 mb-1.5 pt-2 border-t border-stone-100 flex items-center justify-between">
              <span>已归档总结卡片 ({summaries.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {summaries.length === 0 ? (
                <div className="text-center py-6 text-neutral-400 text-xs">
                  暂无剧情总结卡片，点击上方按钮可将未总结的剧情压缩生成记忆卡片。
                </div>
              ) : (
                summaries.map((card, idx) => (
                  <div key={card.id || idx} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 border-b border-amber-200/40 pb-1">
                      <span>卡片 {idx + 1}</span>
                    </div>
                    <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap pt-0.5">
                      {card.summary}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-stone-500 font-normal pt-1.5 border-t border-amber-200/40">
                      <span>{new Date(card.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>共 {card.summary?.length || 0} 字</span>
                      <span>{card.rangeText || (card.startRound && card.endRound && card.startRound !== card.endRound ? `第 ${card.startRound}-${card.endRound} 轮` : `第 ${card.endRound || idx + 1} 轮`)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
