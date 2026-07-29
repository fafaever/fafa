import React, { useState, useEffect, useMemo } from "react";
import { Trash2, Share2, ChevronDown, ChevronRight, Check, Wand2, Loader2, X, Zap, Settings } from "lucide-react";
import { Character, Memory, AppSettings, ChatSession, ExtractionSettings } from "../types";
import { apiChat, performVectorRetrieval, VectorRetrievedDoc } from "../lib/api";

interface MemoryManagerProps {
  character: Character;
  settings: AppSettings;
  sessions: ChatSession[];
  vectorMemoryEnabled?: boolean;
  onUpdateCharacter?: (id: string, updated: Partial<Character>) => void;
}

export function MemoryManager({ character, settings, sessions, vectorMemoryEnabled = false, onUpdateCharacter }: MemoryManagerProps) {
  const [activeLayer, setActiveLayer] = useState<1 | 2 | 3>(1);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  
  const [extractionTime, setExtractionTime] = useState(character.extractionSettings?.dailyExtractionTime || "23:00");
  const [showTimeSettings, setShowTimeSettings] = useState(false);

  // Vector memory search states
  const [searchQuery, setSearchQuery] = useState("");
  const [vectorResults, setVectorResults] = useState<VectorRetrievedDoc[]>([]);
  const [isSearchingVector, setIsSearchingVector] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Trigger vector search
  const handleVectorSearch = async (queryToSearch = searchQuery) => {
    setIsSearchingVector(true);
    setHasSearched(true);
    try {
      const results = await performVectorRetrieval(character.id, queryToSearch, settings);
      setVectorResults(results);
    } catch (e) {
      console.error("Vector search error in UI:", e);
    } finally {
      setIsSearchingVector(false);
    }
  };

  // Auto-run search when vector mode is active or when character ID changes
  useEffect(() => {
    if (vectorMemoryEnabled) {
      handleVectorSearch("");
    } else {
      setHasSearched(false);
      setVectorResults([]);
      setSearchQuery("");
    }
  }, [vectorMemoryEnabled, character.id]);

  useEffect(() => {
    const savedMemories = localStorage.getItem(`mobile_ai_memories_${character.id}`);
    const parsed = savedMemories ? JSON.parse(savedMemories) : [];
    setMemories(parsed);
    
    // Check if we should auto-extract based on time
    checkAutoExtraction(parsed);
  }, [character.id]);

  const checkAutoExtraction = (currentMemories: Memory[]) => {
    const now = new Date();
    const [h, m] = extractionTime.split(':').map(Number);
    const targetTime = new Date();
    targetTime.setHours(h, m, 0, 0);

    // If current time is after target time and we haven't extracted today
    if (now >= targetTime) {
      const lastExtracted = character.extractionSettings?.lastExtractionTimestamp || 0;
      const lastDate = new Date(lastExtracted);
      lastDate.setHours(0,0,0,0);
      const todayDate = new Date();
      todayDate.setHours(0,0,0,0);

      if (lastDate.getTime() < todayDate.getTime()) {
        extractMemories(currentMemories, true);
      }
    }
  };

  const extractMemories = async (currentMemories: Memory[], isAuto = false) => {
    const charSession = sessions.find(s => s.characterId === character.id);
    if (!charSession) return;

    const lastExtracted = character.extractionSettings?.lastExtractionTimestamp || 0;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    // We want messages from the last 24h, but only those AFTER the last extraction to avoid duplicates
    // However, the rule says "extract past 24h memories". 
    // If we haven't extracted for 2 days, "past 24h" only gets the most recent day.
    // If we extracted 1 hour ago, "past 24h" would overlap 23 hours.
    // The instruction "仅提取过去 24 小时内尚未提取过的内容" means we should filter messages by timestamp > lastExtracted AND timestamp > oneDayAgo.
    
    const startTime = Math.max(lastExtracted, oneDayAgo);
    const recentMessages = charSession.messages.filter(m => m.timestamp > startTime);

    if (recentMessages.length < 5) {
      if (!isAuto) alert("暂无足够的新对话内容进行提取（需至少 5 条新消息）。");
      return; 
    }

    setIsExtracting(true);
    try {
      const dialogueText = recentMessages.map(m => `${m.role === 'user' ? '用户' : character.name}: ${m.content}`).join('\n');
      const prompt = `你是一个长期记忆提取助手。请根据以下最近 24 小时的对话内容，进行客观的第三人称总结。
要求：
1. 提取出关键事件、重要信息、用户分享的内容、角色的心理变化。
2. 仅保留重要事实，自动过滤日常琐碎内容（如“吃了没”、“在干嘛”）。
3. 格式为第三人称陈述句，客观概括，不要包含角色对用户的直接说话内容。
4. 保持简洁，不要包含任何开场白或解释语。

对话内容：
${dialogueText}`;

      const response = await apiChat({
        character: character || { id: "memory-assistant", name: "记忆助手", description: "记忆提取专家" },
        messages: [{ role: "user", content: prompt }],
        settings,
        isBackground: true,
        systemInstruction: "你是一个专业的记忆提取专家，擅长从对话中提炼关键事实。"
      });

      if (response.text) {
        const newMemory: Memory = {
          id: `ext-${Date.now()}`,
          characterId: character.id,
          text: response.text.trim(),
          timestamp: Date.now(),
          layer: 1,
          source: isAuto ? "系统自动提取" : "手动提取",
          sourceDialogue: dialogueText.slice(0, 500)
        };
        const updated = [newMemory, ...currentMemories];
        setMemories(updated);
        localStorage.setItem(`mobile_ai_memories_${character.id}`, JSON.stringify(updated));

        // Update last extraction timestamp
        if (onUpdateCharacter) {
          onUpdateCharacter(character.id, {
            extractionSettings: {
              ...(character.extractionSettings || {}),
              lastExtractionTimestamp: Date.now(),
              dailyExtractionTime: extractionTime
            }
          });
        }
      }
    } catch (error) {
      console.error("Extraction error:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const deleteMemory = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    setMemories(updated);
    localStorage.setItem(`mobile_ai_memories_${character.id}`, JSON.stringify(updated));
  };

  const shareToLayer1 = (memory: Memory) => {
    const updated = memories.map(m => 
      m.id === memory.id ? { ...m, layer: 1, isShared: true, source: `来自${m.source || '剧情'}` } : m
    );
    setMemories(updated);
    localStorage.setItem(`mobile_ai_memories_${character.id}`, JSON.stringify(updated));
  };

  const simplifyMemories = async () => {
    if (selectedIds.length === 0) return;
    setIsSimplifying(true);
    try {
      const targets = memories.filter(m => selectedIds.includes(m.id)).sort((a, b) => a.timestamp - b.timestamp);
      const combinedText = targets.map(m => m.text).join('\n---\n');
      
      const prompt = `请将以下多段记忆内容浓缩为一段精华摘要。
要求：
1. 压缩比例：压缩为原总字数的 10%-20%。
2. 仅保留关键事件、重要信息、情绪节点。
3. 自动过滤日常琐碎内容（如“吃了没”、“在干嘛”等）。
4. 语言精炼，信息完整，不要包含任何开场白。

记忆内容：
${combinedText}`;

      const response = await apiChat({
        character: character || { id: "memory-assistant", name: "记忆助手", description: "记忆压缩专家" },
        messages: [{ role: "user", content: prompt }],
        settings,
        isBackground: true,
        systemInstruction: "你是一个记忆压缩专家，擅长在保持信息完整的前提下极致浓缩文字。"
      });

      if (response.text) {
        const newText = response.text.trim();
        const startTimestamp = targets[0].timestamp;
        const endTimestamp = targets[targets.length - 1].timestamp;
        
        const startDate = new Date(startTimestamp);
        const endDate = new Date(endTimestamp);
        const dateTag = `${startDate.getMonth()+1}.${startDate.getDate()}-${endDate.getMonth()+1}.${endDate.getDate()}`;

        const simplifiedMemory: Memory = {
          id: `simplified-${Date.now()}`,
          characterId: character.id,
          text: newText,
          timestamp: endTimestamp,
          layer: 1,
          source: dateTag,
          isSimplified: true
        };

        const updated = [
          simplifiedMemory,
          ...memories.filter(m => !selectedIds.includes(m.id))
        ];
        setMemories(updated);
        localStorage.setItem(`mobile_ai_memories_${character.id}`, JSON.stringify(updated));
        setIsSelecting(false);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error("Simplify error:", error);
    } finally {
      setIsSimplifying(false);
    }
  };

  const groupedMemories = useMemo(() => {
    const layer1 = memories.filter(m => m.layer === 1);
    const groups: Record<string, Memory[]> = {};
    
    layer1.forEach(m => {
      const date = new Date(m.timestamp);
      const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.timestamp - a.timestamp);
    });

    return Object.keys(groups)
      .sort((a, b) => {
        const [y1, m1] = a.replace('年', '-').replace('月', '').split('-').map(Number);
        const [y2, m2] = b.replace('年', '-').replace('月', '').split('-').map(Number);
        return y2 * 100 + m2 - (y1 * 100 + m1);
      })
      .map(key => ({ key, memories: groups[key] }));
  }, [memories]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const tabClass = (layer: 1 | 2 | 3) => 
    `pb-2 text-sm transition-all relative ${activeLayer === layer ? "text-neutral-900 font-bold" : "text-neutral-400"}`;

  const handleUpdateTime = (time: string) => {
    setExtractionTime(time);
    if (onUpdateCharacter) {
      onUpdateCharacter(character.id, {
        extractionSettings: {
          ...(character.extractionSettings || {}),
          dailyExtractionTime: time
        }
      });
    }
    setShowTimeSettings(false);
  };

  if (vectorMemoryEnabled) {
    return (
      <div className="flex flex-col h-full bg-[#F5F3F0]">
        <div className="bg-white p-3 border-b border-neutral-100 flex gap-2 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVectorSearch()}
            placeholder="输入搜索词进行语义模糊检索..."
            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-black transition-all font-sans"
          />
          <button
            onClick={() => handleVectorSearch()}
            disabled={isSearchingVector}
            className="bg-black hover:bg-neutral-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
          >
            {isSearchingVector ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "检索"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 font-sans mb-1">
            🎯 <strong>向量检索中：</strong>已根据您的提取范围（
            {character.extractionSettings?.vectorScope?.online?.enabled ? "线上、" : ""}
            {character.extractionSettings?.vectorScope?.story?.enabled ? "剧情、" : ""}
            {character.extractionSettings?.vectorScope?.other?.enabled ? "其他" : ""}
            ）开启语义模糊匹配。
          </div>

          {isSearchingVector && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500 font-sans">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-800" />
              <span className="text-xs">正在计算语义相关度评分...</span>
            </div>
          )}

          {!isSearchingVector && vectorResults.length === 0 && (
            <div className="text-center py-16 text-neutral-400 text-xs font-sans">
              {hasSearched ? "未找到符合语义的记忆碎片 🔍" : "请在上方输入任意词句，开始高维语义检索"}
            </div>
          )}

          {!isSearchingVector && vectorResults.length > 0 && (
            <div className="space-y-3">
              {vectorResults.map((doc, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex flex-col gap-2 hover:border-neutral-300 transition-all group animate-in fade-in duration-200">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] bg-[#F5F3F0] text-stone-600 font-bold px-2 py-0.5 rounded-full">
                          {doc.source}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(doc.timestamp).toLocaleString("zh-CN", { hour12: false })}
                        </span>
                      </div>
                      <p className="text-[14px] leading-relaxed text-neutral-800 font-light pt-1">
                        {doc.text}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {Math.round(doc.score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F3F0]">
      <div className="flex justify-around bg-white border-b border-neutral-100 pt-3">
        {[1, 2, 3].map((l) => (
          <button key={l} className={tabClass(l as any)} onClick={() => setActiveLayer(l as any)}>
            {l === 1 ? "核心记忆" : l === 2 ? "剧情记忆" : "即时记忆"}
            {activeLayer === l && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 mx-auto w-8" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeLayer === 1 && (
          <div className="space-y-4">
            {/* Extraction Controls */}
            <div className="flex gap-2">
              <button 
                onClick={() => extractMemories(memories)}
                disabled={isExtracting}
                className="flex-1 bg-white border border-neutral-200 py-2.5 rounded-xl flex items-center justify-center gap-2 text-[12px] font-bold text-neutral-800 active:scale-95 transition-all disabled:opacity-50"
              >
                {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                立即提取记忆
              </button>
              <button 
                onClick={() => setShowTimeSettings(!showTimeSettings)}
                className="px-4 bg-white border border-neutral-200 rounded-xl flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-all active:scale-95"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {showTimeSettings && (
              <div className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-800">每日自动提取时间</span>
                  <input 
                    type="time" 
                    value={extractionTime} 
                    onChange={(e) => setExtractionTime(e.target.value)}
                    className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs outline-none"
                  />
                </div>
                <button 
                  onClick={() => handleUpdateTime(extractionTime)}
                  className="w-full bg-black text-white text-[11px] font-bold py-2 rounded-lg"
                >
                  保存设置
                </button>
              </div>
            )}

            {isExtracting && (
              <div className="bg-white/50 p-3 rounded-lg border border-neutral-100 flex items-center justify-center gap-2 text-xs text-neutral-500 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> 正在处理 24h 内记忆提取...
              </div>
            )}

            {groupedMemories.length === 0 && !isExtracting && (
              <div className="text-center py-12 text-neutral-400 text-sm">暂无核心记忆，可尝试手动提取</div>
            )}

            {groupedMemories.map(group => (
              <div key={group.key} className="space-y-2">
                <button 
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center gap-2 text-[#A8A39A] italic text-sm py-1"
                >
                  {expandedGroups.includes(group.key) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {group.key}
                </button>
                
                {expandedGroups.includes(group.key) && (
                  <div className="space-y-3 pl-2 border-l-2 border-neutral-100 ml-2">
                    {group.memories.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => isSelecting && !m.isSimplified && toggleSelect(m.id)}
                        className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${isSelecting && !m.isSimplified ? "cursor-pointer" : ""} ${selectedIds.includes(m.id) ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-100"} ${m.isSimplified ? "border-dashed border-neutral-300" : ""}`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[11px] text-[#BFBAB2] font-medium">{new Date(m.timestamp).toLocaleDateString()}</span>
                              <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${m.isSimplified ? "bg-black text-white" : "bg-neutral-50 text-[#BFBAB2] border border-neutral-100"}`}>
                                {m.source}
                              </span>
                              {m.isSimplified && <span className="text-[10px] text-neutral-400 font-medium">已简化合并</span>}
                            </div>
                            <p className="text-[15px] leading-relaxed text-[#1A1A1A] font-light">{m.text}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {isSelecting && !m.isSimplified && (
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedIds.includes(m.id) ? "bg-neutral-900 border-neutral-900" : "border-neutral-300"}`}>
                                {selectedIds.includes(m.id) && <Check className="w-3 h-3 text-white" />}
                              </div>
                            )}
                            {!isSelecting && (
                              <button onClick={(e) => { e.stopPropagation(); deleteMemory(m.id); }} className="p-1 hover:bg-neutral-50 rounded transition-colors group">
                                <Trash2 className="w-4 h-4 text-neutral-200 group-hover:text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeLayer === 2 && (
          <div className="space-y-3">
             {memories.filter(m => m.layer === 2).length === 0 && (
               <div className="text-center py-12 text-neutral-400 text-sm">暂无剧情记忆</div>
             )}
             {memories.filter(m => m.layer === 2).map(m => (
               <div key={m.id} className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex justify-between items-start group">
                  <div className="flex-1">
                    <p className="text-[15px] leading-relaxed text-[#1A1A1A] font-light">{m.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-[#BFBAB2] ">{new Date(m.timestamp).toLocaleString()}</span>
                      <span className="text-[11px] text-[#BFBAB2] ">来源: {m.source}</span>
                      {m.isShared ? <span className="text-[10px] text-green-500 font-bold">已同步到核心记忆</span> : <span className="text-[10px] text-neutral-400">未同步</span>}
                    </div>
                  </div>
                  {!m.isShared && (
                    <button 
                      onClick={() => shareToLayer1(m)}
                      className="ml-3 p-2 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
                      title="同步到核心记忆"
                    >
                      <Share2 className="w-4 h-4 text-neutral-500" />
                    </button>
                  )}
               </div>
             ))}
          </div>
        )}

        {activeLayer === 3 && (
          <div className="space-y-3">
             {sessions.find(s => s.characterId === character.id)?.messages.slice(-15).reverse().map((msg, i) => (
               <div key={i} className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-neutral-900">{msg.role === 'user' ? '你' : character.name}</span>
                    <span className="text-[10px] text-[#BFBAB2]">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[14px] text-[#1A1A1A] font-light line-clamp-3">{msg.content}</p>
               </div>
             ))}
             {!sessions.find(s => s.characterId === character.id) && (
               <div className="text-center py-12 text-neutral-400 text-sm">暂无即时对话记录</div>
             )}
          </div>
        )}
      </div>

      {activeLayer === 1 && (
        <div className="p-4 bg-white border-t border-neutral-100 shrink-0">
          {!isSelecting ? (
            <button 
              onClick={() => setIsSelecting(true)}
              className="w-full bg-white border border-neutral-200 py-3 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold text-[#1A1A1A] hover:bg-neutral-50 transition-all active:scale-95"
            >
              <Wand2 className="w-4 h-4" /> 批量简化记忆
            </button>
          ) : (
            <div className="flex gap-3">
              <button 
                onClick={() => { setIsSelecting(false); setSelectedIds([]); }}
                className="flex-1 bg-neutral-100 py-3 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold text-neutral-600 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" /> 取消
              </button>
              <button 
                onClick={simplifyMemories}
                disabled={selectedIds.length === 0 || isSimplifying}
                className="flex-[2] bg-neutral-900 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-black/10"
              >
                {isSimplifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {isSimplifying ? "正在简化中..." : `开始简化 (${selectedIds.length}条)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
