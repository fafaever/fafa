import React, { useState, useEffect, useRef } from "react";
import { Character, AppSettings } from "../types";
import { ArrowLeft, Sparkles, Send, BookOpen, RefreshCw, X } from "lucide-react";
import { apiChat } from "../lib/api";

interface TheaterAppProps {
  characters: Character[];
  settings: AppSettings;
  activeChatCharId: string | null;
  onClose: () => void;
}

export interface TheaterMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export const TheaterApp: React.FC<TheaterAppProps> = ({
  characters,
  settings,
  activeChatCharId,
  onClose
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(
    activeChatCharId || characters.find(c => !c.isGroup)?.id || null
  );
  const selectedChar = characters.find(c => c.id === selectedCharId);

  // Settings state
  const [worldSetting, setWorldSetting] = useState<string>("");
  const [wordLimitRange, setWordLimitRange] = useState<string>("");
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [messages, setMessages] = useState<TheaterMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync settings/messages when selectedCharId changes
  useEffect(() => {
    if (selectedCharId) {
      const savedWorld = localStorage.getItem(`theater_world_setting_${selectedCharId}`) || "这是一个充满未知与命运交织的奇幻架空世界。";
      const savedLimit = localStorage.getItem(`theater_word_limit_${selectedCharId}`) || "200-600字";
      setWorldSetting(savedWorld);
      setWordLimitRange(savedLimit);

      try {
        const savedMsgs = localStorage.getItem(`theater_messages_${selectedCharId}`);
        setMessages(savedMsgs ? JSON.parse(savedMsgs) : []);
      } catch {
        setMessages([]);
      }
    }
  }, [selectedCharId]);

  const saveMessages = (msgs: TheaterMessage[]) => {
    setMessages(msgs);
    if (selectedCharId) {
      localStorage.setItem(`theater_messages_${selectedCharId}`, JSON.stringify(msgs));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Generate theater content
  const handleGenerateTheater = async (customPrompt?: string, forceNewList?: boolean) => {
    if (!selectedChar || isGenerating) return;
    setIsGenerating(true);
    setApiError(null);

    const newMessages = forceNewList ? [] : [...messages];
    if (customPrompt && !forceNewList) {
      const userMsg: TheaterMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: customPrompt,
        timestamp: Date.now(),
      };
      newMessages.push(userMsg);
      saveMessages(newMessages);
    }

    try {
      const systemInstruction = `
你现在正在进行【小剧场独立架空演绎模式】。
- 【核心原则】：内容必须以环境描写、心理描写、动作描写为主，对话为辅（描写占比70%以上，细腻宏大、富有文学感）。
- 【世界背景设定】：${worldSetting}
- 【字数限制】：每轮生成字数要求在【${wordLimitRange}】左右，描写生动细腻，代入感极强。
- 【角色人设】：
  姓名：${selectedChar.name}
  背景：${selectedChar.description}
  性格与风格：${selectedChar.systemInstruction || ""}
- 【绝对独立】：完全独立于线上聊天记忆，不提及任何现代手机聊天痕迹，直接沉浸于架空剧情演绎。
`;

      const apiMessages = newMessages.map(m => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }]
      }));

      if (apiMessages.length === 0) {
        apiMessages.push({
          role: "user",
          parts: [{ text: "【系统提示】：开启小剧场。请根据世界背景设定与角色人设，撰写精彩的开场白或场景描写。" }]
        });
      }

      const response = await apiChat({
        messages: apiMessages,
        character: {
          name: selectedChar.name,
          description: selectedChar.description,
          systemInstruction: systemInstruction,
        },
        settings: settings,
        chatMode: "offline",
        replyLength: "long",
        replyCount: 1,
      });

      const aiText = response.text || "（四周是一片沉静的迷雾，风穿过古老的树林，空气中弥漫着未知的气息...）";
      const aiMsg: TheaterMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: aiText,
        timestamp: Date.now(),
      };

      saveMessages([...newMessages, aiMsg]);
    } catch (err: any) {
      console.error("Theater generation error:", err);
      setApiError(err.message || "生成失败，请检查API配置");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSettingsAndGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCharId) {
      localStorage.setItem(`theater_world_setting_${selectedCharId}`, worldSetting);
      localStorage.setItem(`theater_word_limit_${selectedCharId}`, wordLimitRange);
    }
    setShowSetupModal(false);
    
    // Clear previous story, and generate a brand-new narrative from scratch
    saveMessages([]);
    handleGenerateTheater(undefined, true);
  };

  if (!selectedChar) {
    return (
      <div className="flex-1 flex flex-col bg-[#F8F6F3] text-stone-900 font-sans h-full w-full select-none">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-100 shrink-0 shadow-sm z-10 relative">
          <button onClick={onClose} className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-base text-stone-800">小剧场</span>
          <div className="w-9" />
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-stone-400 text-xs">
          请先添加或选择一个角色
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F8F6F3] text-stone-900 font-sans h-full w-full overflow-hidden select-none relative">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-100 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-100 border border-stone-200">
              {selectedChar.avatar.startsWith("http") ? (
                <img src={selectedChar.avatar} alt={selectedChar.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm">{selectedChar.avatar}</div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <select
                  value={selectedCharId || ""}
                  onChange={(e) => setSelectedCharId(e.target.value)}
                  className="bg-transparent font-bold text-xs text-stone-900 outline-none cursor-pointer hover:underline border-none p-0 pr-1.5"
                >
                  {characters.filter(c => !c.isGroup).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="font-bold text-xs text-stone-900">· 小剧场</span>
              </div>
              <span className="text-[9px] text-stone-400 font-mono truncate max-w-[140px]">{worldSetting}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSetupModal(true)}
            className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            title="生成 / 设置小剧场"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>生成</span>
          </button>
        </div>
      </div>

      {/* Main Story Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-[#F8F6F3]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-stone-800 mb-1">开启独立架空小剧场</h3>
            <p className="text-xs text-stone-500 max-w-xs mb-6 leading-relaxed">
              点击右上角【生成】按钮配置世界背景与字数，沉浸于以环境描写与文学基调为主的平行世界演绎。
            </p>
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-black transition-all"
            >
              配置并生成小剧场
            </button>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col w-full my-2 animate-fade-in ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {msg.role === "user" ? (
                <div className="max-w-[85%] bg-stone-900 text-white px-4 py-3 rounded-2xl rounded-tr-none text-xs leading-relaxed font-sans shadow-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[90%] bg-white border border-stone-200/80 text-stone-800 px-5 py-4 rounded-2xl rounded-tl-none text-xs leading-relaxed font-sans shadow-sm space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-400 pb-1 border-b border-stone-100">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span className="font-bold text-stone-700">{selectedChar.name} · 场景演绎</span>
                  </div>
                  <div className="whitespace-pre-wrap font-serif text-[13px] leading-loose text-stone-700">
                    {msg.content}
                  </div>
                </div>
              )}
              <span className="text-[9px] font-mono text-stone-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex items-center gap-2 bg-white border border-stone-200 p-3 rounded-2xl w-fit shadow-sm animate-pulse">
            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
            <span className="text-xs font-medium text-stone-600">正在构思与演绎中...</span>
          </div>
        )}

        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-mono">
            错误: {apiError}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-stone-200 shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputText.trim() && !isGenerating) {
              const text = inputText;
              setInputText("");
              handleGenerateTheater(text);
            }
          }}
          placeholder="输入你的行动或与角色对话..."
          className="flex-1 text-xs bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-stone-400 transition-all text-stone-800"
        />
        <button
          type="button"
          onClick={() => {
            if (inputText.trim() && !isGenerating) {
              const text = inputText;
              setInputText("");
              handleGenerateTheater(text);
            }
          }}
          disabled={!inputText.trim() || isGenerating}
          className="w-10 h-10 bg-stone-900 hover:bg-black disabled:bg-stone-200 text-white rounded-xl flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm"
          title="发送 / 推进剧情"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Setup / Generate Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-stone-900">小剧场设定与生成</h3>
              </div>
              <button onClick={() => setShowSetupModal(false)} className="p-1 text-stone-400 hover:text-stone-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettingsAndGenerate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                  <span>世界设定 (World Background)</span>
                  <span className="text-[10px] text-stone-400 font-normal">自定义架空背景</span>
                </label>
                <textarea
                  value={worldSetting}
                  onChange={(e) => setWorldSetting(e.target.value)}
                  rows={3}
                  placeholder="例如：这是一个魔法与剑的奇幻世界，人类与龙族共存..."
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:border-stone-400 transition-all resize-none text-stone-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                  <span>每轮字数限制 (Word Limit Range)</span>
                  <span className="text-[10px] text-stone-400 font-normal">引导 AI 描写篇幅</span>
                </label>
                <input
                  type="text"
                  value={wordLimitRange}
                  onChange={(e) => setWordLimitRange(e.target.value)}
                  placeholder="例如：100-800字 或 300字左右"
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-stone-400 transition-all text-stone-800"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>保存设定并生成</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
