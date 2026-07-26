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
          { id: "first", title: "第一人称", desc: "用“我”叙述" },
          { id: "second", title: "第二人称", desc: "称呼“你”" },
          { id: "third", title: "第三人称", desc: "“他/她”视角" },
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
          placeholder="最大 (6000)"
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
        const max = Number(maxWord) || 1500;
        if (min < 100 || max < 100 || min > 6000 || max > 6000) {
          alert("字数范围必须在 100 - 6000 之间");
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
  const [maxWord, setMaxWord] = useState<number | "">(1500);
  const [keywords, setKeywords] = useState("");
  const [perspective, setPerspective] = useState<'first' | 'second' | 'third'>('first');
  const [writingTone, setWritingTone] = useState<'daily_plain' | 'literary' | 'cold_restrained' | 'warm_soft'>('daily_plain');

  // Interactive theater states
  const [messages, setMessages] = useState<TheaterMessage[]>([]);
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
  const selectedChar = characters.find(c => c.id === (selectedCharId || activeSession?.charId));

  // Auto-scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

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

  // Sync activeSession changes to localStorage whenever messages or settings change in active session
  const saveCurrentSession = (updatedMessages?: TheaterMessage[], overrideSettings?: Partial<ActiveTheaterSession>) => {
    if (!selectedChar) return;
    const currentMsgs = updatedMessages || messages;
    const sessionObj: ActiveTheaterSession = {
      id: activeSession?.id || `session-${Date.now()}`,
      charId: selectedChar.id,
      charName: selectedChar.name,
      worldSetting: overrideSettings?.worldSetting !== undefined ? overrideSettings.worldSetting : worldSetting,
      mountedLoreIds: overrideSettings?.mountedLoreIds !== undefined ? overrideSettings.mountedLoreIds : mountedLoreIds,
      minWord: Number(overrideSettings?.minWord ?? minWord) || 500,
      maxWord: Number(overrideSettings?.maxWord ?? maxWord) || 1500,
      perspective: overrideSettings?.perspective || perspective,
      writingTone: overrideSettings?.writingTone || writingTone,
      keywords: overrideSettings?.keywords !== undefined ? overrideSettings.keywords : keywords,
      messages: currentMsgs,
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
    setMaxWord(activeSession.maxWord || 1500);
    setPerspective(activeSession.perspective || 'first');
    setWritingTone(activeSession.writingTone || 'daily_plain');
    setKeywords(activeSession.keywords || "");
    setMessages(activeSession.messages || []);
    setView('theater');
    showToast("已继续上次剧场");
  };

  // End and archive current session
  const archiveTheater = async () => {
    if (!selectedChar || messages.length === 0) {
      // Clear session if empty
      setActiveSession(null);
      localStorage.removeItem("active_theater_session");
      setView('menu');
      return;
    }

    const mountedLores = (loreList || []).filter(l => mountedLoreIds.includes(l.id));
    const mountedLoreTitles = mountedLores.map(l => l.title);

    // Get narrative summary snippet
    const firstAssistantMsg = messages.find(m => m.role === 'assistant')?.content || "";
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content || "";
    let summaryText = firstAssistantMsg.slice(0, 100);
    if (lastAssistantMsg && lastAssistantMsg !== firstAssistantMsg) {
      summaryText += " ... " + lastAssistantMsg.slice(-80);
    }
    if (!summaryText) {
      summaryText = worldSetting || "自由演练小剧场";
    }

    const newCard: TheaterHistoryCard = {
      id: `history-${Date.now()}`,
      charId: selectedChar.id,
      charName: selectedChar.name,
      worldSetting: worldSetting || "自由演绎背景",
      startTime: messages[0]?.timestamp || Date.now(),
      endTime: Date.now(),
      messageCount: messages.length,
      summary: summaryText,
      mountedLoreTitles,
      messages: [...messages]
    };

    const newHistory = [newCard, ...theaterHistory];
    setTheaterHistory(newHistory);
    localStorage.setItem("theater_history", JSON.stringify(newHistory));

    // Clear current active session
    setActiveSession(null);
    localStorage.removeItem("active_theater_session");
    setMessages([]);
    setInputText("");
    setView('menu');
    showToast("剧场已结束，已生成卡片归档至历史剧场");
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

  // AI Generation Handler
  const handleGenerateTheater = async (customPrompt?: string, overrideList?: TheaterMessage[], forceStart = false) => {
    if (!selectedChar) return;
    if (isGenerating && !forceStart) return;
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
      const mountedLores = (loreList || []).filter(l => mountedLoreIds.includes(l.id));
      const mountedLoreText = mountedLores.length > 0 
        ? mountedLores.map(l => `【世界书：《${l.title}》】\n关键词：${(l.keys || []).join('、')}\n设定内容：${l.content}`).join('\n\n')
        : '（未挂载世界书）';

      const isOpeningScene = newMessages.length === 0 || (newMessages.length === 1 && newMessages[0].role === 'user' && newMessages[0].content.includes('开场'));

      const systemInstruction = `
你现在正在进行【小剧场独立架空演绎模式】。请严格根据以下背景设定与角色人设进行深度剧场演绎。

【核心背景与生成依据】：
系统已强制读取并整合以下设定作为小剧场生成的背景依据：
1. 【世界设定】：
${worldSetting || '无特定世界设定'}

2. 【已挂载的世界书内容】：
${mountedLoreText}

3. 【参演角色人设】：
${selectedChar.name} - ${selectedChar.description}

【演绎规则与要求】：
- 【强制要求】：必须将上述【世界设定】${mountedLores.length > 0 ? '、【挂载的世界书内容】' : ''}与【角色人设】三者综合作为剧场生成的最高背景依据，确保生成内容完全符合世界观、背景设定与角色性格。
- 内容必须以环境描写、心理描写、动作描写为主，对话为辅，代入感极强。
- 每轮生成字数要求在【${minWord || 500}-${maxWord || 1500}字】左右。
- 【叙述视角】：${perspective === 'first' ? '第一人称（用“我”叙述）' : perspective === 'second' ? '第二人称（称呼“你”）' : '第三人称（“他/她”视角）'}
- 【文风偏好】：${writingTone === 'literary' ? '文艺细腻' : writingTone === 'cold_restrained' ? '冷淡克制' : writingTone === 'warm_soft' ? '温暖柔和' : '日常白描'}
- 【绝对独立】：完全独立于线上普通聊天历史。
${isOpeningScene ? '- 【特别提醒】：现在是故事的第一段开场描写，请直接描绘生动的环境、气氛与情境引入，自然地开启剧情，不要附带无关解释。' : ''}
`;

      let payloadMessages = newMessages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      if (payloadMessages.length === 0) {
        payloadMessages = [{
          role: "user",
          content: "请开始第一段小剧场演绎，结合世界设定和角色人设生成开场描写。"
        }];
      }

      const response = await apiChat({
        messages: payloadMessages,
        character: {
          id: selectedChar.id,
          name: selectedChar.name,
          avatar: selectedChar.avatar || "",
          description: selectedChar.description || "",
          systemInstruction: systemInstruction,
          model: selectedChar.model || "gemini-3.6-flash"
        },
        settings: {
          ...settings,
          apiUrl: settings?.apiUrl || localStorage.getItem("apiUrl") || "",
          apiKey: settings?.apiKey || localStorage.getItem("apiKey") || "",
          model: selectedChar?.model || settings?.model || localStorage.getItem("model") || "gemini-3.6-flash",
          apiFormat: settings?.apiFormat || (localStorage.getItem("apiFormat") as any) || "openai"
        },
        matchedLore: (loreList || []).filter(l => mountedLoreIds.includes(l.id)),
        chatMode: "offline",
        replyLength: "long",
        replyCount: 1,
        mood: "沉浸",
        memories: selectedChar.memories || [],
        isGroup: false,
        temperature: 0.8
      });

      const aiMsg: TheaterMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.text || "...",
        timestamp: Date.now(),
      };

      const finalMsgs = [...newMessages, aiMsg];
      setMessages(finalMsgs);
      saveCurrentSession(finalMsgs);
    } catch (err: any) {
      console.error("[Theater Generation Error]:", err);
      const errMsg = err?.message || (typeof err === "string" ? err : "请求失败");
      const displayMsg = errMsg.includes("API 返回错误") ? errMsg : `API 返回错误：${errMsg}`;
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
    const index = messages.findIndex(m => m.id === targetMsgId);
    if (index === -1) return;

    const targetMsg = messages[index];
    const contextBefore = messages.slice(0, index);

    setIsGenerating(true);
    showToast("正在重新生成该段剧情...");

    try {
      const mountedLores = (loreList || []).filter(l => mountedLoreIds.includes(l.id));
      const mountedLoreText = mountedLores.length > 0 
        ? mountedLores.map(l => `【世界书：《${l.title}》】\n关键词：${(l.keys || []).join('、')}\n设定内容：${l.content}`).join('\n\n')
        : '（未挂载世界书）';

      const isOpeningScene = contextBefore.length === 0;

      const systemInstruction = `
你现在正在进行【小剧场独立架空演绎模式】。请严格根据以下背景设定与角色人设进行深度剧场演绎。

【核心背景与生成依据】：
1. 【世界设定】：${worldSetting || '无特定世界设定'}
2. 【已挂载的世界书内容】：${mountedLoreText}
3. 【参演角色人设】：${selectedChar.name} - ${selectedChar.description}

【演绎规则与要求】：
- 结合上下文重新生成一段【不同角度/不同细节】的全新剧情描写。
- 内容必须以环境描写、心理描写、动作描写为主，对话为辅，代入感极强。
- 每轮生成字数要求在【${minWord || 500}-${maxWord || 1500}字】左右。
- 【叙述视角】：${perspective === 'first' ? '第一人称' : perspective === 'second' ? '第二人称' : '第三人称'}
- 【文风偏好】：${writingTone === 'literary' ? '文艺细腻' : writingTone === 'cold_restrained' ? '冷淡克制' : writingTone === 'warm_soft' ? '温暖柔和' : '日常白描'}
${isOpeningScene ? '- 【特别提醒】：现在是故事的第一段开场描写，请直接描绘生动的环境、气氛与情境引入。' : ''}
`;

      let payloadMessages = contextBefore
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      if (targetMsg.role === 'user') {
        payloadMessages.push({ role: 'user', content: targetMsg.content });
      }

      if (payloadMessages.length === 0) {
        payloadMessages = [{
          role: "user",
          content: "请重新生成一段小剧场演绎的开场描写。"
        }];
      }

      const response = await apiChat({
        messages: payloadMessages,
        character: {
          id: selectedChar.id,
          name: selectedChar.name,
          avatar: selectedChar.avatar || "",
          description: selectedChar.description || "",
          systemInstruction: systemInstruction,
          model: selectedChar.model || "gemini-3.6-flash"
        },
        settings: {
          ...settings,
          apiUrl: settings?.apiUrl || localStorage.getItem("apiUrl") || "",
          apiKey: settings?.apiKey || localStorage.getItem("apiKey") || "",
          model: selectedChar?.model || settings?.model || localStorage.getItem("model") || "gemini-3.6-flash",
          apiFormat: settings?.apiFormat || (localStorage.getItem("apiFormat") as any) || "openai"
        },
        matchedLore: (loreList || []).filter(l => mountedLoreIds.includes(l.id)),
        chatMode: "offline",
        replyLength: "long",
        replyCount: 1,
        mood: "沉浸",
        memories: selectedChar.memories || [],
        isGroup: false,
        temperature: 0.8
      });

      const newAiMsg: TheaterMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.text || "...",
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
      const errMsg = err?.message || "重roll失败";
      showToast(errMsg.includes("API 返回错误") ? errMsg : `API 返回错误：${errMsg}`);
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
      const res = await apiChat({
        messages: [{ role: "user", content: `基于关键词：“${keywords}”，请为你和角色的小剧场生成一段精致丰富的世界观设定与故故事背景。只输出设定正文，不带多余废话。` }],
        character: { id: "generator", name: "生成器", description: "背景生成" },
        settings: {
          ...settings,
          apiUrl: settings?.apiUrl || localStorage.getItem("apiUrl") || "",
          apiKey: settings?.apiKey || localStorage.getItem("apiKey") || "",
          model: settings?.model || localStorage.getItem("model") || "gemini-3.6-flash",
          apiFormat: settings?.apiFormat || (localStorage.getItem("apiFormat") as any) || "openai"
        },
        temperature: 0.7
      });
      if (res && res.text) {
        setWorldSetting(res.text.trim());
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
      maxWord: Number(maxWord) || 1500,
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
          {characters.filter(c => !c.isGroup).map(c => (
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">
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
              <div>{msg.content}</div>

              {/* 剧情卡片 / 消息操作按钮 */}
              <div className={`flex items-center justify-end gap-2.5 mt-3 pt-2 border-t text-[10px] font-medium ${
                msg.role === 'user' ? 'border-neutral-800 text-neutral-300' : 'border-neutral-100 text-neutral-500'
              }`}>
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

      {/* Control Bar & Input Section */}
      <div className="p-3 bg-white border-t border-neutral-200/80 shrink-0 space-y-2">
        <div className="flex items-end gap-2">
          {/* 结束剧场按钮 */}
          <button 
            onClick={() => {
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
            className="p-2.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 mb-0.5"
            title="结束剧场"
          >
            <Square className="w-4 h-4 fill-current" />
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

          {/* AI 发送图标 */}
          <button 
            onClick={() => {
              if (isGenerating) return;
              handleGenerateTheater();
              showToast("触发 AI 下一段描写...");
            }}
            disabled={isGenerating}
            className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 disabled:cursor-not-allowed rounded-xl transition-all active:scale-95 shrink-0 flex items-center justify-center border border-rose-200/60 mb-0.5"
            title={isGenerating ? "正在生成中..." : "AI 续写下一段描写"}
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
    </div>
  );
};
