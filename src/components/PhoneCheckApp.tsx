import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, MessageCircle, Image, Settings, Calendar, Users, 
  ShoppingBag, FileText, Globe, Search, Battery, Signal, Wifi,
  Plus, Check, Trash2, RefreshCw, Wand2, Loader2, Feather, Sparkles, X,
  ShieldCheck, Clock, Send, CornerDownRight, ThumbsUp, ThumbsDown,
  BookOpen, Film
} from "lucide-react";
import { Character, AppSettings } from "../types";
import { callLLM, getThreeDataSourcesPrompt } from "../lib/api";
import { storeMemory } from "../lib/vectorMemory";
import { CharacterAvatar } from "./CharacterAvatar";
import NotesApp from "./NotesApp";
import { ConfirmModal } from "./ConfirmModal";
import { generateDefaultNpcsForCharacter } from "./CharacterCreatorApp";

interface PhoneCheckAppProps {
  characters: Character[];
  settings?: AppSettings;
  onClose: () => void;
  onGenerateNote?: (character: Character, settings: AppSettings) => Promise<void>;
  onUpdateCharacter?: (id: string, updated: Partial<Character>) => void;
  isGeneratingMap?: Record<string, boolean>;
  loreList?: any[];
}

interface MemoItem {
  id: string;
  content: string;
  isCompleted: boolean;
  reflection: string;
  timestamp: number;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  innerThought: string;
  timestamp: number;
  isIncognito: boolean;
}

interface NpcMessage {
  id: string;
  sender: 'npc' | 'character';
  text: string;
  timestamp: number;
}

interface NpcContact {
  id: string;
  name: string;
  relation: string;
  avatar: string;
  messages: NpcMessage[];
}

type ContactNPC = NpcContact;

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  isBought: boolean;
  timestamp: number;
}

interface ReadingItem {
  id: string;
  title: string;
  type: 'movie' | 'novel';
  thoughts: string;
  timestamp: number;
}

export default function PhoneCheckApp({ characters, settings, onClose, onGenerateNote, onUpdateCharacter, isGeneratingMap, loreList = [] }: PhoneCheckAppProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  
  // Active sub-module view: null | 'memos' | 'browser' | 'essays' | 'contacts' | 'shopping'
  const [activeModule, setActiveModule] = useState<string | null>(null);
  
  // Confirm Modal state
  const [showClearConfirm, setShowClearConfirm] = useState<{show: boolean, type: string | null}>({show: false, type: null});

  // Search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isGeneratingSearch, setIsGeneratingSearch] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Memos state
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [isGeneratingMemos, setIsGeneratingMemos] = useState(false);
  const [memoCooldownTimer, setMemoCooldownTimer] = useState<number>(0); // remaining seconds
  const [memoToast, setMemoToast] = useState<string | null>(null);

  // Shopping List state
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [isGeneratingShopping, setIsGeneratingShopping] = useState(false);
  const [shoppingToast, setShoppingToast] = useState<string | null>(null);

  // Reading / Watching state
  const [readingList, setReadingList] = useState<ReadingItem[]>([]);
  const [isGeneratingReading, setIsGeneratingReading] = useState(false);

  // Contacts / NPC state
  const [contacts, setContacts] = useState<NpcContact[]>([]);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [isGeneratingNpcs, setIsGeneratingNpcs] = useState(false);
  const [isContinuingNpcChat, setIsContinuingNpcChat] = useState(false);

  // General Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const selectedChar = characters.find(c => c.id === selectedCharId);

  const getCharacterLores = () => {
    if (!selectedChar) return [];
    const activeLore = (loreList || []).filter((l: any) => l.enabled !== false);
    return activeLore.filter((l: any) => !l.characterIds || l.characterIds.length === 0 || l.characterIds.includes(selectedChar.id));
  };

  // Load data when selected character changes (Default to empty [] if no saved data)
  useEffect(() => {
    if (!selectedCharId) {
      setMemos([]);
      setSearchHistory([]);
      setContacts([]);
      setSelectedNpcId(null);
      setActiveModule(null);
      setReadingList([]);
      setShoppingList([]);
      return;
    }

    // 1. Load Memos
    try {
      const savedMemos = localStorage.getItem(`mobile_ai_phone_memos_${selectedCharId}`);
      if (savedMemos) {
        setMemos(JSON.parse(savedMemos).slice(0, 30));
      } else {
        setMemos([]);
      }
    } catch (e) {
      console.error(e);
      setMemos([]);
    }

    // 2. Load Searches
    try {
      const savedSearches = localStorage.getItem(`mobile_ai_phone_searches_${selectedCharId}`);
      if (savedSearches) {
        setSearchHistory(JSON.parse(savedSearches).slice(0, 30));
      } else {
        setSearchHistory([]);
      }
    } catch (e) {
      console.error(e);
      setSearchHistory([]);
    }

    // 3. Load Contacts & NPC chats
    try {
      const savedContacts = localStorage.getItem(`mobile_ai_phone_contacts_${selectedCharId}`);
      let existingContacts: ContactNPC[] = savedContacts ? JSON.parse(savedContacts) : [];

      if (selectedChar?.boundNpcs && selectedChar.boundNpcs.length > 0) {
        const boundContacts: ContactNPC[] = selectedChar.boundNpcs.map((npc) => ({
          id: npc.id || `contact-${npc.name}`,
          name: npc.name,
          avatar: npc.avatar || "💬",
          relation: npc.relationship || "朋友",
          messages: [],
        }));

        const existingNames = new Set(existingContacts.map((c) => c.name));
        boundContacts.forEach((bc) => {
          if (!existingNames.has(bc.name)) {
            existingContacts.push(bc);
          }
        });
      }

      // Enforce 30 messages limit per contact
      existingContacts = existingContacts.map(c => ({
        ...c,
        messages: c.messages.slice(-30)
      }));

      setContacts(existingContacts);
    } catch (e) {
      console.error(e);
      setContacts([]);
    }

    // 4. Load Shopping List
    try {
      const savedShopping = localStorage.getItem(`mobile_ai_phone_shopping_${selectedCharId}`);
      if (savedShopping) {
        setShoppingList(JSON.parse(savedShopping).slice(0, 30));
      } else {
        setShoppingList([]);
      }
    } catch (e) {
      console.error(e);
      setShoppingList([]);
    }

    // 5. Load Reading List
    try {
      const savedReading = localStorage.getItem(`mobile_ai_phone_reading_${selectedCharId}`);
      if (savedReading) {
        setReadingList(JSON.parse(savedReading).slice(0, 30));
      } else {
        setReadingList([]);
      }
    } catch (e) {
      console.error(e);
      setReadingList([]);
    }
  }, [selectedCharId, characters]);

  // Helper to aggregate context from all phone modules for deduplication
  const getPhoneModulesContext = () => {
    if (!selectedCharId) return "";
    
    // Notes/Essays from localStorage
    let essayTitles = "";
    try {
      const savedNotes = localStorage.getItem(`mobile_ai_notes_${selectedCharId}`);
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        essayTitles = notes.slice(0, 5).map((n: any) => n.text.slice(0, 30)).join("、");
      }
    } catch(e){}

    const memoTitles = memos.slice(0, 15).map(m => m.content).join("、");
    const searchQueries = searchHistory.slice(0, 15).map(s => s.query).join("、");
    const shoppingItems = shoppingList.slice(0, 15).map(s => s.name).join("、");
    const readingTitles = readingList.slice(0, 15).map(r => r.title).join("、");
    const contactSummaries = contacts.slice(0, 5).map(c => {
      const lastMsg = c.messages.length > 0 ? c.messages[c.messages.length - 1].text : "暂无对话";
      return `${c.name}: ${lastMsg.slice(0, 30)}`;
    }).join(" | ");

    return `
--- 【手机模块已有记录 (72小时内去重参考)】 ---
- 最近随笔内容：${essayTitles || "无"}
- 备忘录事项：${memoTitles || "无"}
- 搜索历史：${searchQueries || "无"}
- 购物清单：${shoppingItems || "无"}
- 阅读/观看：${readingTitles || "无"}
- 最近联系人对话：${contactSummaries || "无"}
`;
  };

  const getRecentChatContext = () => {
    // In a real app we'd pass sessions, here we'll try to find from localStorage
    try {
      const savedSessions = localStorage.getItem("mobile_ai_sessions");
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions);
        const session = sessions.find((s: any) => s.characterId === selectedCharId);
        if (session && session.messages) {
          return session.messages.slice(-10).map((m: any) => `${m.role === 'user' ? '用户' : selectedChar?.name}: ${m.content}`).join("\n");
        }
      }
    } catch(e){}
    return "暂无最近聊天记录。";
  };

  const handleClearData = (type: string) => {
    if (!selectedCharId) return;

    switch (type) {
      case 'memos':
        setMemos([]);
        localStorage.removeItem(`mobile_ai_phone_memos_${selectedCharId}`);
        break;
      case 'browser':
        setSearchHistory([]);
        localStorage.removeItem(`mobile_ai_phone_searches_${selectedCharId}`);
        break;
      case 'contacts':
        setContacts([]);
        localStorage.removeItem(`mobile_ai_phone_contacts_${selectedCharId}`);
        break;
      case 'shopping':
        setShoppingList([]);
        localStorage.removeItem(`mobile_ai_phone_shopping_${selectedCharId}`);
        break;
      case 'reading':
        setReadingList([]);
        localStorage.removeItem(`mobile_ai_phone_reading_${selectedCharId}`);
        break;
    }
    showToast("内容已清空");
    setShowClearConfirm({ show: false, type: null });
  };

  const injectNpcChatToMemory = (npcName: string, relation: string, newMessages: NpcMessage[]) => {
    if (!selectedChar || !onUpdateCharacter) return;
    
    // Only take the last 5 messages to keep the snippet concise
    const recentMessages = newMessages.slice(-5);
    const chatSnippet = recentMessages.map(m => `${m.sender === 'npc' ? npcName : selectedChar.name}: ${m.text}`).join("\n");
    const memoryTag = `[手机记录] 与联系人 ${npcName} (${relation}) 的对话记录`;
    const newEntry = `${memoryTag}：\n${chatSnippet}`;
    
    // Remove any existing entries for this same NPC to avoid duplicates
    const otherMemories = (selectedChar.memories || []).filter(m => !m.startsWith(memoryTag));
    const updatedMemories = [...otherMemories, newEntry];
    
    onUpdateCharacter(selectedChar.id, { memories: updatedMemories });
    storeMemory(selectedChar.id, newEntry, "查手机");
  };

  // Cooldown countdown tick for Memos
  useEffect(() => {
    if (!selectedCharId) return;
    const checkCooldown = () => {
      const lastGenStr = localStorage.getItem(`mobile_ai_phone_memo_last_gen_${selectedCharId}`);
      if (lastGenStr) {
        const lastGen = Number(lastGenStr);
        const elapsed = Date.now() - lastGen;
        const cooldownMs = 300000; // 5 minutes cooldown
        if (elapsed < cooldownMs) {
          setMemoCooldownTimer(Math.ceil((cooldownMs - elapsed) / 1000));
        } else {
          setMemoCooldownTimer(0);
        }
      } else {
        setMemoCooldownTimer(0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [selectedCharId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // ----------------------------------------------------
  // 1. MEMOS FEATURE (备忘录)
  // ----------------------------------------------------
  const handleGenerateMemos = async () => {
    if (!selectedChar) return;

    // Check cooldown
    if (memoCooldownTimer > 0) {
      const mins = Math.ceil(memoCooldownTimer / 60);
      setMemoToast(`备忘录短期内不可重复生成，还需等待 ${mins} 分钟`);
      setTimeout(() => setMemoToast(null), 3000);
      return;
    }

    setIsGeneratingMemos(true);
    try {
      const dataSourceContext = getThreeDataSourcesPrompt(selectedChar, selectedChar.memories, getCharacterLores());
      const phoneContext = getPhoneModulesContext();
      const chatContext = getRecentChatContext();

      const prompt = `你是角色：${selectedChar.name}。
${dataSourceContext}

【最近聊天记录】：
${chatContext}

${phoneContext}

请生成 5 条最新的手机备忘录。
【去重与生成准则】：
1. **模块去重与视角差异**：检查【手机模块已有记录】和【最近聊天记录】。如果某个事件已在随笔、对话或搜索中出现，备忘录应从“待办事项”或“简短记录”的角度切入（如“周六看牙医”），避免直接照搬其他模块的详细描述。
2. **禁止重复主题**：72小时内已有的主题严禁再次作为新内容核心。
3. **数据源延伸**：基于人设兴趣或聊天话题延伸出自然的生活变化（如开始做某事、想去某地），严禁直接照搬人设背景文字。
4. **格式**：包含 2-3 条『要做的事』（isCompleted: false）和 2-3 条『已做的事』（isCompleted: true）。每条附带 15 字以内内心感想。

格式要求严格 JSON 数组：
[
  {"content": "...", "isCompleted": false, "reflection": "..."},
  ...
]`;

      const responseText = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, [
        { role: "user", content: prompt }
      ]);

      let jsonStr = responseText;
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const newMemoList: MemoItem[] = parsed.map((item: any, idx: number) => ({
          id: `memo-${Date.now()}-${idx}`,
          content: item.content || "备忘事项",
          isCompleted: !!item.isCompleted,
          reflection: item.reflection || "心里暗暗记下了。",
          timestamp: Date.now() - idx * 600000
        }));

        const combined = [...newMemoList, ...memos].slice(0, 30);
        setMemos(combined);
        localStorage.setItem(`mobile_ai_phone_memos_${selectedChar.id}`, JSON.stringify(combined));
        localStorage.setItem(`mobile_ai_phone_memo_last_gen_${selectedChar.id}`, Date.now().toString());
        showToast("备忘录更新成功");
        
        try {
           storeMemory(selectedChar.id, `查手机-备忘录：\n${newMemoList.map(m => m.content).join('\n')}`, "查手机");
        } catch(e) {}
      } else {
        throw new Error("格式解析失败");
      }
    } catch (e) {
      console.error(e);
      showToast("备忘录生成失败，请检查API配置或稍后重试");
    } finally {
      setIsGeneratingMemos(false);
    }
  };


  // ----------------------------------------------------
  // 2. SEARCH HISTORY FEATURE (网站搜索)
  // ----------------------------------------------------
  const handleGenerateSearchHistory = async () => {
    if (!selectedChar) return;
    setIsGeneratingSearch(true);

    try {
      const dataSourceContext = getThreeDataSourcesPrompt(selectedChar, selectedChar.memories, getCharacterLores());
      const existingQueries = searchHistory.slice(0, 10).map(h => h.query).join("、");
      
      const prompt = `${dataSourceContext}
请根据以上角色的完整人设、记忆与世界书设定，生成 6-8 条最新的浏览器搜索历史词条及内心想法。

【最近聊天记录】：
${getRecentChatContext()}

${getPhoneModulesContext()}

【去重与生成准则】：
1. **模块去重与视角差异**：搜索词条应体现“角色看的内容”或“查资料”，与随笔或备忘录区分开。如果某个事件已在其他模块出现，搜索应是关于该事件的延伸（如“周六看牙医”对应搜索“牙医诊所哪家好”）。
2. **禁止重复主题**：参考已有的搜索记录主题。72小时内已有的主题严禁再次作为新内容核心。
3. **数据源延伸**：基于人设兴趣或聊天话题延伸出自然的生活变化，禁止直接照搬人设背景中的内容。

【格式规则】：
1. 每条附带该角色搜索此词条时的【内心真实想法】（15字以内）。
2. 只有当搜索内容是角色隐秘心思或特殊设定时，才标记为无痕模式 (isIncognito: true)。普通搜索标记为 false。
3. 输出为严格 JSON 数组，格式：
[
  {"query": "搜索词条", "innerThought": "内心想法", "isIncognito": boolean},
  ...
]
`;

      if (settings && (settings.apiKey || settings.apiUrl)) {
        const responseText = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [
          { role: "user", content: prompt }
        ]);

        let jsonStr = responseText;
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const newBatch: SearchHistoryItem[] = parsed.map((item: any, idx: number) => ({
            id: `search-${Date.now()}-${idx}`,
            query: item.query || "搜索词条",
            innerThought: item.innerThought || "内心真实想法",
            timestamp: Date.now() - idx * 600000,
            isIncognito: item.isIncognito === true
          }));

          const combined = [...newBatch, ...searchHistory].slice(0, 30);
          setSearchHistory(combined);
          localStorage.setItem(`mobile_ai_phone_searches_${selectedChar.id}`, JSON.stringify(combined));
          localStorage.setItem(`mobile_ai_phone_search_last_gen_${selectedChar.id}`, Date.now().toString());
          showToast("搜索历史已更新");
          try {
             storeMemory(selectedChar.id, `查手机-搜索记录：\n${newBatch.map(s => s.query).join('\n')}`, "查手机");
          } catch(e) {}
        }
      }
    } catch (e) {
      console.error(e);
      showToast("搜索历史生成失败");
    } finally {
      setIsGeneratingSearch(false);
    }
  };


  // ----------------------------------------------------
  // 3. NPC CONTACTS (联系人对话)
  // ----------------------------------------------------
  const handleInitNpcContacts = async () => {
    if (!selectedChar) return;

    // 1. 获取角色绑定的 NPC 列表 (若未设定则使用默认依据人设推导的NPC)
    const boundNpcs = (selectedChar.boundNpcs && selectedChar.boundNpcs.length > 0)
      ? selectedChar.boundNpcs
      : generateDefaultNpcsForCharacter(selectedChar.name, selectedChar.description || "", "");

    const contactsMap = new Map<string, ContactNPC>(contacts.map(c => [c.name, c]));

    // 2. 检查当日生成额度 (可选)
    const sessionGenKey = `npc_gen_rounds_${selectedChar.id}_${new Date().toDateString()}`;
    const completedRounds = Number(localStorage.getItem(sessionGenKey) || "0");
    const allHaveDialogues = boundNpcs.every(n => contactsMap.has(n.name) && (contactsMap.get(n.name)?.messages?.length || 0) > 0);

    if (allHaveDialogues && completedRounds >= 2) {
      showToast("暂无新对话");
      return;
    }

    setIsGeneratingNpcs(true);

    try {
      // 机制准则 1：从角色绑定的 NPC 列表中随机选取 3-5 个 NPC
      const countToSelect = Math.min(boundNpcs.length, Math.floor(Math.random() * 3) + 3); // 3 - 5
      const shuffledNpcs = [...boundNpcs].sort(() => 0.5 - Math.random());
      const selectedNpcsToGen = shuffledNpcs.slice(0, countToSelect);

      const npcsPromptText = selectedNpcsToGen.map(n => {
        const existing = contactsMap.get(n.name);
        const historyMsgs = (existing && existing.messages && existing.messages.length > 0)
          ? existing.messages.slice(-8).map(m => `${m.sender === 'npc' ? n.name : selectedChar.name}: ${m.text}`).join("\n")
          : "(暂无历史对话)";
        return `NPC姓名: "${n.name}", 关系身份: "${n.relationship || '朋友'}", 简介: "${n.description || ''}", Emoji: "${n.avatar || '💬'}"
历史对话记录:
${historyMsgs}`;
      }).join("\n---\n");

      const prompt = `你是一个二次元手机聊天对话生成助手。
请为角色【${selectedChar.name}】与其【${selectedNpcsToGen.length} 个绑定的 NPC 好友】生成或续接聊天对话记录。

【角色人设与背景】：
${selectedChar.description}

【最近聊天记录 (数据源参考)】：
${getRecentChatContext()}

${getPhoneModulesContext()}

【选中的 3-5 个 NPC 及历史对话】：
${npcsPromptText}

【NPC 对话续接与更新准则】：
1. **模块去重与视角差异**：对话应侧重于“角色与他人的互动”，表达方式要口语化。如果某个事件已在随笔或备忘录中提及，对话中应以“聊起这件事”的方式出现，严禁重复描述。
2. **禁止重复主题**：72小时内已有的主题严禁再次作为新内容核心。
3. **数据源延伸**：根据角色兴趣延伸出新话题，产生自然的生活变化。严禁直接照搬人设背景。
4. **NPC 对话规则**：
   - 如果该 NPC 暂无历史对话：请生成 3-5 条两人初次或日常聊天的生活对话。
   - 如果该 NPC 已有历史对话：接着上文继续生成 3-6 条新对话或开启全新生活话题。
   - 消息数量上限为 30 条。超出时系统会自动删除最早记录。

请输出严格纯 JSON 数组格式：
[
  {
    "name": "NPC姓名",
    "relation": "关系身份",
    "avatar": "Emoji",
    "messages": [
      {"sender": "npc", "text": "消息内容"},
      {"sender": "character", "text": "消息内容"}
    ]
  }
]`;

      let generatedResults: any[] = [];

      if (settings && (settings.apiKey || settings.apiUrl)) {
        const responseText = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [
          { role: "user", content: prompt }
        ]);

        let jsonStr = responseText;
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length >= 1) {
          generatedResults = parsed;
        }
      }

      // Offline fallback
      if (generatedResults.length === 0) {
        generatedResults = selectedNpcsToGen.map(n => {
          const existing = contactsMap.get(n.name);
          const hasHistory = existing && existing.messages && existing.messages.length > 0;
          return {
            name: n.name,
            relation: n.relationship || "朋友",
            avatar: n.avatar || "💬",
            messages: hasHistory
              ? [
                  { sender: "npc", text: "对了，上次说的那个事情进展如何啦？" },
                  { sender: "character", text: "很顺利呀！比预期的还要好～" },
                  { sender: "npc", text: "太棒啦，找机会聚聚庆祝一下！" }
                ]
              : [
                  { sender: "npc", text: "最近怎么样呀？好久没联系了～" },
                  { sender: "character", text: "还不错，最近稍微有点忙，你呢？" },
                  { sender: "npc", text: "我也还行！周末有空一起喝咖啡。" }
                ]
          };
        });
      }

      // 更新联系人与对话列表
      const updatedContacts = [...contacts];
      generatedResults.forEach((item: any) => {
        const targetIndex = updatedContacts.findIndex(c => c.name === item.name);
        const newMsgs: NpcMessage[] = Array.isArray(item.messages) ? item.messages.map((m: any, mIdx: number) => ({
          id: `m-${Date.now()}-${Math.random().toString(36).substring(2,6)}-${mIdx}`,
          sender: m.sender === 'character' ? 'character' : 'npc',
          text: m.text || "消息",
          timestamp: Date.now() - (item.messages.length - mIdx) * 60000
        })) : [];

        if (targetIndex >= 0) {
          updatedContacts[targetIndex] = {
            ...updatedContacts[targetIndex],
            relation: item.relation || updatedContacts[targetIndex].relation,
            avatar: item.avatar || updatedContacts[targetIndex].avatar,
            messages: [...updatedContacts[targetIndex].messages, ...newMsgs].slice(-30)
          };
        } else {
          updatedContacts.push({
            id: `npc-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
            name: item.name || "NPC朋友",
            relation: item.relation || "朋友",
            avatar: item.avatar || "💬",
            bio: "",
            messages: newMsgs.slice(-30)
          });
        }
      });

      setContacts(updatedContacts);
      localStorage.setItem(`mobile_ai_phone_contacts_${selectedChar.id}`, JSON.stringify(updatedContacts));
      localStorage.setItem(sessionGenKey, String(completedRounds + 1));
      
      // Memory injection
      generatedResults.forEach((item: any) => {
        const newMsgsForThisNpc = Array.isArray(item.messages) ? item.messages : [];
        if (newMsgsForThisNpc.length > 0) {
          injectNpcChatToMemory(item.name, item.relation || "朋友", newMsgsForThisNpc as any);
        }
      });

      showToast(`✨ 已随机选择 ${selectedNpcsToGen.length} 个 NPC 成功生成/续接对话！`);
    } catch (e) {
      console.error(e);
      showToast("NPC 对话生成失败，请稍后重试");
    } finally {
      setIsGeneratingNpcs(false);
    }
  };

  const handleContinueNpcChat = async (npc: ContactNPC) => {
    if (!selectedChar) return;

    // 检查该 NPC 消息是否过于丰富或话题已满
    if (npc.messages.length >= 30) {
      showToast("暂无新对话");
      return;
    }

    setIsContinuingNpcChat(true);

    try {
      const recentHistory = npc.messages.slice(-8).map(m => `${m.sender === 'npc' ? npc.name : selectedChar.name}: ${m.text}`).join("\n");
      const prompt = `角色【${selectedChar.name}】与 NPC【${npc.name}（${npc.relation}）】正在聊天。
【最近对话记录】：
${recentHistory}

【规则】：
1. 若上文话题尚未完成，请【接着上文续写 6-12 条自然连贯的对话】。
2. 若上文话题已自然结束（如问候结束、事情说完），请【开启一个新的日常生活/工作话题】，开始新一轮对话。
格式要求严格 JSON 数组：
[
  {"sender": "npc", "text": "对话内容"},
  {"sender": "character", "text": "对话内容"}
]`;

      const responseText = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, [
        { role: "user", content: prompt }
      ]);

      let jsonStr = responseText;
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const now = Date.now();
        const newMsgs: NpcMessage[] = parsed.map((item: any, idx: number) => ({
          id: `m-cont-${now}-${idx}`,
          sender: item.sender === 'character' ? 'character' : 'npc',
          text: item.text || "...",
          timestamp: now + idx * 30000
        }));

        const updatedNpc = {
          ...npc,
          messages: [...npc.messages, ...newMsgs].slice(-30)
        };

        const updatedList = contacts.map(c => c.id === npc.id ? updatedNpc : c);
        setContacts(updatedList);
        localStorage.setItem(`mobile_ai_phone_contacts_${selectedChar.id}`, JSON.stringify(updatedList));
        
        // Memory injection
        injectNpcChatToMemory(npc.name, npc.relation, newMsgs);

        showToast(`已成功续写 ${newMsgs.length} 条新对话`);
      } else {
        throw new Error("生成失败");
      }
    } catch (e) {
      // Fallback continuation
      const fallbackMsgs = getFallbackNpcContinuation(selectedChar.name, npc);
      const updatedNpc = {
        ...npc,
        messages: [...npc.messages, ...fallbackMsgs]
      };
      const updatedList = contacts.map(c => c.id === npc.id ? updatedNpc : c);
      setContacts(updatedList);
      localStorage.setItem(`mobile_ai_phone_contacts_${selectedChar.id}`, JSON.stringify(updatedList));
      showToast(`已生成 ${fallbackMsgs.length} 条新对话`);
    } finally {
      setIsContinuingNpcChat(false);
    }
  };

  const handleGenerateShoppingList = async () => {
    if (!selectedChar) return;
    setIsGeneratingShopping(true);

    try {
      const dataSourceContext = getThreeDataSourcesPrompt(selectedChar, selectedChar.memories, getCharacterLores());
      const phoneContext = getPhoneModulesContext();
      const chatContext = getRecentChatContext();

      const prompt = `你是角色：${selectedChar.name}。
${dataSourceContext}

【最近聊天记录】：
${chatContext}

${phoneContext}

自动生成 6-8 个购物清单条目。
【去重与生成准则】：
1. **模块去重与视角差异**：购物清单应体现角色的消费需求或欲望。如果随笔提到某个爱好，清单里可以出现相关的器材购买（如“随笔提到喜欢画画”，清单里出现“买颜料”）。
2. **禁止重复主题**：72小时内已有的主题严禁再次作为新内容核心。
3. **数据源延伸**：基于人设兴趣或聊天话题延伸出自然的生活变化（如开始做某事、想去某地），禁止直接照搬人设背景中的内容。
4. **格式**：包含『要买的』和『已买的』。

格式请输出严格 JSON 数组：
[
  {"name": "商品名称", "quantity": "数量或备注", "isBought": boolean}
]`;

      const responseText = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, [
        { role: "user", content: prompt }
      ]);

      let jsonStr = responseText;
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const newBatch: ShoppingItem[] = parsed.map((item: any, idx: number) => ({
          id: `shop-${Date.now()}-${idx}`,
          name: item.name || "商品",
          quantity: item.quantity || "1份",
          isBought: !!item.isBought,
          timestamp: Date.now() - idx * 300000
        }));

        const combined = [...newBatch, ...shoppingList];
        const trimmed = combined.slice(0, 30);

        setShoppingList(trimmed);
        localStorage.setItem(`mobile_ai_phone_shopping_${selectedChar.id}`, JSON.stringify(trimmed));
        showToast("购物清单更新成功");
        
        try {
           storeMemory(selectedChar.id, `查手机-购物清单：\n${newBatch.map(s => s.name).join('\n')}`, "查手机");
        } catch(e) {}
      } else {
        throw new Error("解析失败");
      }
    } catch (e) {
      console.error(e);
      showToast("购物清单生成失败");
    } finally {
      setIsGeneratingShopping(false);
    }
  };

  const handleGenerateReadingList = async () => {
    if (!selectedChar) return;
    setIsGeneratingReading(true);

    try {
      const dataSourceContext = getThreeDataSourcesPrompt(selectedChar, selectedChar.memories, getCharacterLores());
      const phoneContext = getPhoneModulesContext();
      const chatContext = getRecentChatContext();

      const prompt = `你是角色：${selectedChar.name}。
${dataSourceContext}

【最近聊天记录】：
${chatContext}

${phoneContext}

生成 6-8 条该角色最近观看的电影或阅读的小说记录。
【去重与生成准则】：
1. **模块去重与视角差异**：阅读物应侧重于“角色看的内容”或“专业学习”，与随笔的感性思考区分开。阅读物是素材来源，随笔是心路历程。
2. **禁止重复主题**：72小时内已有的主题严禁再次作为新内容核心。
3. **数据源延伸**：基于人设兴趣或聊天话题延伸出自然的生活变化（如最近对某个领域产生兴趣），禁止直接照搬人设背景中的内容。
4. **格式**：包含 "title", "type" (movie/novel), "thoughts" (15-40字，第一人称口吻)。

格式必须是严格的 JSON 数组：
[
  {"title": "《...》", "type": "movie", "thoughts": "..."},
  ...
]`;

      const responseText = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, [
        { role: "user", content: prompt }
      ]);

      let jsonStr = responseText;
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const newBatch: ReadingItem[] = parsed.map((item: any, idx: number) => ({
          id: `read-${Date.now()}-${idx}`,
          title: item.title || "《未知作品》",
          type: item.type === "movie" ? "movie" : "novel",
          thoughts: item.thoughts || "留下了独特的感想...",
          timestamp: Date.now() - idx * 3600000
        }));

        const combined = [...newBatch, ...readingList];
        const trimmed = combined.slice(0, 30);

        setReadingList(trimmed);
        localStorage.setItem(`mobile_ai_phone_reading_${selectedChar.id}`, JSON.stringify(trimmed));
        showToast("阅读物更新成功");
        
        try {
           storeMemory(selectedChar.id, `查手机-阅读书影音：\n${newBatch.map(s => s.title).join('\n')}`, "查手机");
        } catch(e) {}
      } else {
        throw new Error("解析失败");
      }
    } catch (e) {
      console.error(e);
      showToast("阅读物生成失败");
    } finally {
      setIsGeneratingReading(false);
    }
  };

  const modules = [
    { name: "联系人", icon: <MessageCircle className="w-6 h-6 text-[#1A1A1A]" />, id: "contacts" },
    { name: "备忘录", icon: <FileText className="w-6 h-6 text-[#1A1A1A]" />, id: "memos" },
    { name: "随笔", icon: <Feather className="w-6 h-6 text-[#1A1A1A]" />, id: "essays" },
    { name: "购物清单", icon: <ShoppingBag className="w-6 h-6 text-[#1A1A1A]" />, id: "shopping" },
    { name: "阅读物", icon: <BookOpen className="w-6 h-6 text-[#1A1A1A]" />, id: "reading" },
  ];

  // ----------------------------------------------------
  // SCREEN 1: CHARACTER SELECTION (If no character picked)
  // ----------------------------------------------------
  if (!selectedCharId) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#F5F3F0] text-[#1A1A1A] animate-fade-in">
        {/* Status Bar */}
        <div className="px-5 pt-3 flex justify-between items-center text-[10px] text-[#A8A39A] font-medium shrink-0">
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

        <div className="flex items-center p-4 mt-2">
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm active:scale-95 transition-all">
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-neutral-900">查手机</h2>
            <p className="text-[10px] text-[#A8A39A] italic">隐私窥视模式</p>
          </div>
          <div className="w-9" />
        </div>
        
        <div className="flex-1 px-6 pt-4 pb-8 overflow-y-auto">
          <div className="mb-10 text-center">
            <div className="inline-block px-4 py-1.5 bg-white/40 backdrop-blur-sm rounded-full text-[11px] text-[#A8A39A] shadow-sm mb-4">
              ✨ 共有 {characters.length} 个角色可供翻看
            </div>
            <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">你想看谁的秘密？</h1>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-8 max-w-sm mx-auto">
            {characters.map(char => (
              <button 
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className="flex flex-col items-center gap-3 group"
              >
                <div className="relative">
                  <CharacterAvatar character={char} mode="real" size={80} className="border-4 border-white shadow-xl group-hover:scale-105 transition-all duration-300" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-neutral-900 block group-hover:text-black transition-colors">{char.name}</span>
                  <span className="text-[10px] text-neutral-400 font-medium bg-white/60 px-2 py-0.5 rounded-full mt-1 inline-block">
                    已开启同步
                  </span>
                </div>
              </button>
            ))}
          </div>

          {characters.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 border border-neutral-100">
                <Search className="w-8 h-8 text-neutral-300" />
              </div>
              <p className="text-xs text-neutral-400">暂无可查手机的角色</p>
              <p className="text-[10px] text-neutral-300 mt-1">请先在主页创建或召唤一个角色</p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-6 text-center">
          <p className="text-[10px] text-[#BFBAB2] leading-relaxed">
            * 提示：查手机功能通过模拟手机镜像获取角色实时心声与生活记录。<br/>
            所有内容均由 AI 结合人设与对话历史实时生成。
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-VIEW 1: MEMOS (备忘录)
  // ----------------------------------------------------
  if (activeModule === 'memos') {
    const todoMemos = memos.filter(m => !m.isCompleted);
    const doneMemos = memos.filter(m => m.isCompleted);

    return (
      <div className="flex-1 flex flex-col h-full bg-[#F5F3F0]  text-[#1A1A1A] relative overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="h-14 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button onClick={() => setActiveModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowClearConfirm({ show: true, type: 'memos' })}
              className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition active:scale-95"
              title="清空备忘录"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <span className=" font-bold text-sm text-neutral-900">
            {selectedChar?.name}的备忘录
          </span>
          <button 
            onClick={handleGenerateMemos}
            disabled={isGeneratingMemos}
            className="flex items-center gap-1 text-xs font-bold bg-neutral-900 text-white px-2.5 py-1.5 rounded-full hover:bg-black active:scale-95 transition-all disabled:opacity-50"
            title="刷新型备忘录"
          >
            {isGeneratingMemos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{isGeneratingMemos ? "生成中" : "刷新"}</span>
          </button>
        </div>

        {/* Cooldown / Info Notification */}
        {memoToast && (
          <div className="bg-amber-50 text-amber-800 text-xs px-4 py-2 border-b border-amber-200/60 flex items-center gap-2 animate-fade-in">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{memoToast}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Section 1: 要做的事 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                📌 待办事项 ({todoMemos.length})
              </span>
            </div>

            <div className="space-y-2.5">
              {todoMemos.map(memo => (
                <div 
                  key={memo.id} 
                  className="bg-white p-3.5 rounded-2xl border border-neutral-200/70 shadow-xs transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded border-2 border-neutral-300 mt-0.5 flex items-center justify-center shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-900 font-medium leading-relaxed">
                        {memo.content}
                      </p>
                      {/* 角色感想 (小字，暖灰色) */}
                      <p className="text-[11px] text-[#A8A39A] italic mt-1.5  border-t border-neutral-100 pt-1">
                        💭 感想：{memo.reflection}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {todoMemos.length === 0 && (
                <div className="text-center py-6 text-xs text-neutral-400 bg-white/40 rounded-2xl border border-dashed border-neutral-200">
                  当前没有未完成的事项
                </div>
              )}
            </div>
          </div>

          {/* Section 2: 已做的事 (划掉标记) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                ✅ 已完成事项 ({doneMemos.length})
              </span>
            </div>

            <div className="space-y-2.5">
              {doneMemos.map(memo => (
                <div 
                  key={memo.id} 
                  className="bg-white/60 p-3.5 rounded-2xl border border-neutral-200/50 shadow-xs transition-all opacity-80"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded bg-neutral-900 text-white mt-0.5 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Strikethrough for Completed Tasks */}
                      <p className="text-xs text-neutral-400 font-medium leading-relaxed line-through decoration-neutral-400 decoration-1">
                        {memo.content}
                      </p>
                      {/* 角色感想 (小字，暖灰色) */}
                      <p className="text-[11px] text-[#A8A39A] italic mt-1.5  border-t border-neutral-100 pt-1">
                        💭 感想：{memo.reflection}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {doneMemos.length === 0 && (
                <div className="text-center py-4 text-xs text-neutral-400">
                  尚无已划掉的完成事项
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-VIEW 2: WEBSITE SEARCH / BROWSER (网站搜索)
  // ----------------------------------------------------
  if (activeModule === 'browser') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#F5F3F0]  text-[#1A1A1A] relative overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="h-14 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button onClick={() => setActiveModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowClearConfirm({ show: true, type: 'browser' })}
              className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition active:scale-95"
              title="清空搜索记录"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <span className=" font-bold text-sm text-neutral-900">
            {selectedChar?.name}的浏览器搜索记录
          </span>
          <button 
            onClick={handleGenerateSearchHistory}
            disabled={isGeneratingSearch}
            className="flex items-center gap-1 text-xs font-bold bg-neutral-900 text-white px-2.5 py-1.5 rounded-full hover:bg-black active:scale-95 transition-all disabled:opacity-50"
          >
            {isGeneratingSearch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>生成新历史</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] text-[#A8A39A] px-1 flex items-center justify-between">
            <span>最近搜索记录 ({searchHistory.length}/30)</span>
            <span>自动保留最近30条</span>
          </div>

          <div className="space-y-2.5">
            {searchHistory.map((item) => (
              <div 
                key={item.id}
                className="bg-white p-3.5 rounded-2xl border border-neutral-200/70 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.isIncognito ? (
                      <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200/60">
                        🔒 无痕搜索
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100/60">
                        🔍 搜索
                      </span>
                    )}
                    <span className="text-xs font-bold text-neutral-900">{item.query}</span>
                  </div>
                </div>

                {/* 角色对搜索词条的内心想法 (小字，暖灰色) */}
                <p className="text-[11px] text-[#A8A39A] italic  border-t border-neutral-100 pt-1.5 leading-relaxed">
                  💭 内心想法：{item.innerThought}
                </p>
              </div>
            ))}

            {searchHistory.length === 0 && (
              <div className="text-center py-12 text-xs text-neutral-400">
                暂无搜索记录，点击右上角“生成新历史”
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-VIEW 5: SHOPPING LIST (购物清单)
  // ----------------------------------------------------
  if (activeModule === 'shopping') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#F5F3F0]  text-[#1A1A1A] relative overflow-hidden animate-fade-in">
        <div className="h-14 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button onClick={() => setActiveModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowClearConfirm({ show: true, type: 'shopping' })}
              className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition active:scale-95"
              title="清空购物清单"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <span className=" font-bold text-sm text-neutral-900">
            {selectedChar?.name}的购物清单
          </span>
          <button 
            onClick={handleGenerateShoppingList}
            disabled={isGeneratingShopping}
            className="flex items-center gap-1 text-xs font-bold bg-neutral-900 text-white px-2.5 py-1.5 rounded-full hover:bg-black active:scale-95 transition-all disabled:opacity-50"
          >
            {isGeneratingShopping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>生成新清单</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] text-[#A8A39A] px-1 flex items-center justify-between">
            <span>最近购物清单 ({shoppingList.length}/30)</span>
            <span>自动保留最近30条</span>
          </div>

          <div className="space-y-2.5">
            {shoppingList.map((item) => (
              <div 
                key={item.id}
                className={`p-3.5 rounded-2xl border shadow-xs space-y-2 ${item.isBought ? 'bg-white/60 border-neutral-200/50 opacity-80' : 'bg-white border-neutral-200/70'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 ${item.isBought ? 'bg-neutral-900 border-neutral-900 flex items-center justify-center' : 'border-neutral-300'}`}>
                      {item.isBought && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    <span className={`text-xs font-bold ${item.isBought ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>{item.name}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">{item.quantity}</span>
                </div>
              </div>
            ))}

            {shoppingList.length === 0 && (
              <div className="text-center py-12 text-xs text-neutral-400">
                暂无购物清单，点击右上角“生成新清单”
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-VIEW 6: READING & WATCHING (阅读物)
  // ----------------------------------------------------
  if (activeModule === 'reading') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#F5F3F0] text-[#1A1A1A] relative overflow-hidden animate-fade-in">
        <div className="h-14 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button onClick={() => setActiveModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowClearConfirm({ show: true, type: 'reading' })}
              className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition active:scale-95"
              title="清空阅读物"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <span className="font-bold text-sm text-neutral-900">
            {selectedChar?.name}的阅读物
          </span>
          <button 
            onClick={handleGenerateReadingList}
            disabled={isGeneratingReading}
            className="flex items-center gap-1 text-xs font-bold bg-neutral-900 text-white px-2.5 py-1.5 rounded-full hover:bg-black active:scale-95 transition-all disabled:opacity-50"
          >
            {isGeneratingReading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>生成记录</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] text-[#A8A39A] px-1 flex items-center justify-between">
            <span>最近观看与阅读记录 ({readingList.length}/30)</span>
            <span>自动保留最近30条</span>
          </div>

          <div className="space-y-3">
            {readingList.map((item) => (
              <div 
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-neutral-200/60 shadow-xs flex items-start gap-3"
              >
                <div className="mt-0.5 p-2 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-600">
                  {item.type === 'movie' ? <Film className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-neutral-900 truncate">
                      {item.title}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold select-none whitespace-nowrap ${
                      item.type === 'movie' 
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                    }`}>
                      {item.type === 'movie' ? '电影' : '小说'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 italic mt-1.5 leading-relaxed bg-neutral-50/50 p-2 rounded-xl border border-neutral-100/40">
                    "{item.thoughts}"
                  </p>
                </div>
              </div>
            ))}

            {readingList.length === 0 && (
              <div className="text-center py-12 text-xs text-neutral-400">
                暂无阅读或观看记录，点击右上角“生成记录”
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-VIEW 3: ESSAYS / NOTES (随笔 - 移至查手机功能内)
  // ----------------------------------------------------
  if (activeModule === 'essays') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#F5F3F0] relative overflow-hidden animate-fade-in">
        <NotesApp 
          characters={characters}
          settings={settings || { apiUrl: "", apiKey: "", model: "", apiPresets: [], activePresetId: "" }}
          onClose={() => setActiveModule(null)}
          onGenerateNote={onGenerateNote || (async () => {})}
          isGeneratingMap={isGeneratingMap || {}}
          forcedCharId={selectedCharId}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-VIEW 4: CONTACTS & NPC CHATS (联系人)
  // ----------------------------------------------------
  if (activeModule === 'contacts') {
    // If viewing single NPC chat
    if (selectedNpcId) {
      const npc = contacts.find(c => c.id === selectedNpcId);
      if (!npc) {
        setSelectedNpcId(null);
        return null;
      }

      return (
        <div className="flex-1 flex flex-col h-full bg-[#F5F3F0]  text-[#1A1A1A] relative overflow-hidden animate-fade-in">
          {/* NPC Chat Header */}
          <div className="h-14 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 flex items-center justify-between px-3 shrink-0 sticky top-0 z-10">
            <button onClick={() => setSelectedNpcId(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center">
              <span className="font-bold text-xs text-neutral-900">{npc.name}</span>
              <span className="text-[10px] text-neutral-400">{npc.relation}</span>
            </div>
            <button 
              onClick={() => handleContinueNpcChat(npc)}
              disabled={isContinuingNpcChat}
              className="flex items-center gap-1 text-[11px] font-bold bg-neutral-900 text-white px-2.5 py-1.5 rounded-full hover:bg-black active:scale-95 transition-all disabled:opacity-50"
            >
              {isContinuingNpcChat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              <span>{isContinuingNpcChat ? "生成中" : "续写对话"}</span>
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="text-center text-[10px] text-neutral-400 my-2">
              —— {selectedChar?.name} 与 {npc.name} 的消息记录 ——
            </div>

            {npc.messages.map((msg) => {
              const isChar = msg.sender === 'character';
              return (
                <div 
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isChar ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className="shrink-0">
                    <CharacterAvatar 
                      character={isChar ? selectedChar : undefined} 
                      avatar={isChar ? (selectedChar?.chatAvatar || selectedChar?.avatar) : npc.avatar} 
                      name={isChar ? selectedChar?.name : npc.name} 
                      size={32} 
                      className="border border-neutral-200/80 shadow-2xs" 
                    />
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    isChar 
                      ? 'bg-neutral-900 text-white rounded-tr-none' 
                      : 'bg-white text-neutral-900 border border-neutral-200/70 shadow-2xs rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {npc.messages.length === 0 && (
              <div className="text-center py-10 text-xs text-neutral-400">
                暂无对话内容，点击右上角“续写对话”生成8-20条新对话
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="p-3 bg-white/80 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-500">
            <span className="text-[11px] text-[#A8A39A]">每轮可生成 8-20 条关于该 NPC 与角色的后续互动</span>
            <button 
              onClick={() => handleContinueNpcChat(npc)}
              disabled={isContinuingNpcChat}
              className="px-3 py-1 bg-black text-white rounded-lg text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
            >
              续写 8-20 条对话
            </button>
          </div>
        </div>
      );
    }

    // NPC List View
    return (
      <div className="flex-1 flex flex-col h-full bg-[#F5F3F0]  text-[#1A1A1A] relative overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="h-14 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button onClick={() => setActiveModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowClearConfirm({ show: true, type: 'contacts' })}
              className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-lg transition active:scale-95"
              title="清空联系人对话"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <span className=" font-bold text-sm text-neutral-900">
            {selectedChar?.name}的联系人
          </span>
          <button 
            onClick={handleInitNpcContacts}
            disabled={isGeneratingNpcs}
            className="flex items-center gap-1 text-xs font-bold bg-neutral-900 text-white px-2.5 py-1.5 rounded-full hover:bg-black active:scale-95 transition-all disabled:opacity-50"
            title="随机选取 3-5 个绑定 NPC 生成/续写对话"
          >
            {isGeneratingNpcs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{isGeneratingNpcs ? "生成中" : "生成 NPC 对话"}</span>
          </button>
        </div>

        {/* NPC List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="text-[11px] text-[#A8A39A] px-1 mb-2">
            点击 NPC 查看与 {selectedChar?.name} 的私密聊天记录及后续对话：
          </div>

          {contacts.map((npc) => {
            const lastMsg = npc.messages.length > 0 ? npc.messages[npc.messages.length - 1].text : "暂无新消息";
            return (
              <button
                key={npc.id}
                onClick={() => setSelectedNpcId(npc.id)}
                className="w-full bg-white p-3.5 rounded-2xl border border-neutral-200/70 shadow-2xs hover:border-neutral-300 flex items-center gap-3 text-left transition-all active:scale-[0.99]"
              >
                <div className="w-11 h-11 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xl shrink-0">
                  {npc.avatar || "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-900">{npc.name}</span>
                    <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                      {npc.relation}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 truncate mt-1">
                    {lastMsg}
                  </p>
                </div>
              </button>
            );
          })}

          {contacts.length === 0 && (
            <div className="text-center py-12 text-xs text-neutral-400">
              暂无联系人，点击右上角根据人设自动生成 NPC
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN PHONE CHECK DESKTOP (Selected Character's Phone)
  // ----------------------------------------------------
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F3F0] relative overflow-hidden  text-[#1A1A1A]">
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

      {/* Time & Weather Header */}
      <div className="flex flex-col items-center justify-center py-6 shrink-0 relative">
        <button 
          onClick={() => setSelectedCharId(null)}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/50 backdrop-blur-sm rounded-full shadow-sm active:scale-95 transition-all z-10"
        >
          <ChevronLeft className="w-5 h-5 text-[#A8A39A]" />
        </button>
        <div className=" italic font-normal text-[#A8A39A] text-4xl tracking-tight mb-1">{formatTime(currentTime)}</div>
        <div className="flex items-center gap-2 text-[#A8A39A]  italic text-sm">
          <span>{formatDate(currentTime)}</span>
          <span className="mx-1">|</span>
          <span>晴 28°C</span>
        </div>
      </div>

      {/* Requirement 2: Top Search Bar for Browser Search History */}
      <div className="px-6 mb-6">
        <div className="relative">
          <button 
            onClick={() => setActiveModule('browser')}
            className="w-full bg-white/70 backdrop-blur-md border border-neutral-200/60 rounded-xl py-2.5 px-4 flex items-center justify-between text-neutral-500 text-xs shadow-2xs hover:bg-white transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2 text-neutral-400">
              <Search className="w-4 h-4 text-neutral-600" />
              <span>搜索无痕浏览词条与内心想法...</span>
            </div>
            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
              {searchHistory.length} 条记录
            </span>
          </button>
        </div>
      </div>

      {/* App Modules Grid */}
      <div className="flex-1 px-6 overflow-y-auto pb-20">
        <div className="grid grid-cols-4 gap-y-8 gap-x-4">
          {modules.map((mod) => (
            <button 
              key={mod.id} 
              onClick={() => setActiveModule(mod.id)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-white/50 group-hover:scale-105 transition-transform active:scale-95">
                {mod.icon}
              </div>
              <span className=" text-[11px] font-medium text-[#1A1A1A]">{mod.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="mt-auto px-6 py-4 flex flex-col items-center gap-1 border-t border-neutral-200/20">
        <div className="flex items-center gap-2">
          <CharacterAvatar character={selectedChar} mode="real" size={32} className="border border-white shadow-sm" />
          <span className=" italic text-xs text-[#A8A39A]">{selectedChar?.name}的手机</span>
        </div>
        <div className="text-[10px] text-[#BFBAB2] ">
          存储空间：已用 32.8GB / 64GB
        </div>
      </div>

      <ConfirmModal
        isOpen={showClearConfirm.show}
        title="确认清空内容"
        message="确定要清空所有内容吗？此操作不可撤销。"
        onConfirm={() => showClearConfirm.type && handleClearData(showClearConfirm.type)}
        onCancel={() => setShowClearConfirm({ show: false, type: null })}
      />

      {/* 2. WEBSITE SEARCH MODAL (Triggered by Top Search Bar) */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F5F3F0] rounded-3xl p-5 w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-neutral-700" />
                <span className=" font-bold text-sm text-neutral-900">
                  {selectedChar?.name} 的最近搜索历史 ({searchHistory.length}/30)
                </span>
              </div>
              <button onClick={() => setShowSearchModal(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-neutral-200/60">
              <span className="text-[11px] text-neutral-500">再次点击将生成新搜索词条，旧记录仍保留</span>
              <button
                onClick={handleGenerateSearchHistory}
                disabled={isGeneratingSearch}
                className="flex items-center gap-1 text-xs font-bold bg-neutral-900 text-white px-3 py-1.5 rounded-lg hover:bg-black active:scale-95 transition-all disabled:opacity-50 shrink-0"
              >
                {isGeneratingSearch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>生成新历史</span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {searchHistory.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-neutral-200/60 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    {item.isIncognito ? (
                      <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                        🔒 无痕搜索
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        🔍 搜索
                      </span>
                    )}
                    <span className="text-xs font-bold text-neutral-900">{item.query}</span>
                  </div>

                  {/* 角色对搜索词条的内心想法 (小字，暖灰色) */}
                  <p className="text-[11px] text-[#A8A39A] italic  border-t border-neutral-100 pt-1 leading-relaxed">
                    💭 内心想法：{item.innerThought}
                  </p>
                </div>
              ))}

              {searchHistory.length === 0 && (
                <div className="text-center py-8 text-xs text-neutral-400">
                  暂无历史搜索，点击上方按钮一键生成
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowSearchModal(false)}
              className="w-full bg-white hover:bg-neutral-100 text-neutral-700 py-2.5 rounded-xl text-xs font-bold border border-neutral-200"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl z-[200] animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// FALLBACK GENERATORS FOR AI PRESERVATION
// ----------------------------------------------------
function getFallbackMemos(name: string): MemoItem[] {
  return [
    {
      id: `memo-${Date.now()}-1`,
      content: `提醒${name}晚点准备明天的工作/学习资料`,
      isCompleted: false,
      reflection: "记性不太好，写在备忘录里省得又忘了。",
      timestamp: Date.now() - 3600000 * 2
    },
    {
      id: `memo-${Date.now()}-2`,
      content: "把上次借的书归还给图书角",
      isCompleted: false,
      reflection: "感觉最近需要好好梳理一下头绪了。",
      timestamp: Date.now() - 3600000 * 5
    },
    {
      id: `memo-${Date.now()}-3`,
      content: "回复关于周末行程安排的确认消息",
      isCompleted: false,
      reflection: "希望能有个轻松惬意的周末吧。",
      timestamp: Date.now() - 3600000 * 8
    },
    {
      id: `memo-${Date.now()}-4`,
      content: "给家里的那盆小绿植浇水",
      isCompleted: true,
      reflection: "还好今天顺便浇了，生机勃勃的很好看。",
      timestamp: Date.now() - 3600000 * 24
    },
    {
      id: `memo-${Date.now()}-5`,
      content: "整理桌面上散乱的文件和便签纸",
      isCompleted: true,
      reflection: "看着收拾干净的桌面，心情好了一点。",
      timestamp: Date.now() - 3600000 * 30
    }
  ];
}

function getFallbackSearches(name: string): SearchHistoryItem[] {
  const pool = [
    { query: "如何表达对一个人的关心不显得唐突", thought: "只是想了解一下，绝对不是特别在意…" },
    { query: "适合两个人安静聊天的隐蔽咖啡馆推荐", thought: "下次有机会可以一起去坐坐。" },
    { query: "深夜睡不着觉有哪些快速助眠的方法", thought: "最近晚上脑子里总是乱糟糟的。" },
    { query: "手工烘焙曲奇饼干的新手成功率高食谱", thought: "要是做成功了可以拿给ta尝尝。" },
    { query: "近期上映的口碑电影和评分排行", thought: "找个时间看看有没有感兴趣的。" },
    { query: "怎样判断一个人说的话是真心还是客套", thought: "有时候真的搞不懂ta的心思。" },
    { query: "养猫新手需要准备哪些基础用品", thought: "路过公园看到的那只小橘猫太可爱了。" },
    { query: "雨天适合听的舒缓音乐歌单推荐", thought: "下雨天窝在家里听歌最舒服了。" }
  ];

  const count = 6;
  return pool.slice(0, count).map((item, idx) => ({
    id: `search-${Date.now()}-${idx}`,
    query: item.query,
    innerThought: item.thought,
    timestamp: Date.now() - idx * 1800000,
    isIncognito: true
  }));
}

function getFallbackNpcs(name: string): NpcContact[] {
  return [
    {
      id: `npc-${Date.now()}-1`,
      name: "林哲",
      relation: "同系学长 / 朋友",
      avatar: "🧑‍💻",
      messages: [
        { id: "m1", sender: "npc", text: "这周末的研讨会材料你准备好了吗？", timestamp: Date.now() - 7200000 },
        { id: "m2", sender: "character", text: "差不多了，还在修改最后两页演示文稿。", timestamp: Date.now() - 3600000 },
        { id: "m3", sender: "npc", text: "行，遇到不懂的随时发消息问我！", timestamp: Date.now() - 1800000 }
      ]
    },
    {
      id: `npc-${Date.now()}-2`,
      name: "苏阿姨",
      relation: "社区小书店店主",
      avatar: "👩‍🌾",
      messages: [
        { id: "m1", sender: "npc", text: "你上次预订的那本绝版摄影集到货啦！", timestamp: Date.now() - 14400000 },
        { id: "m2", sender: "character", text: "真的吗！太好了，我这周末过去拿！", timestamp: Date.now() - 10000000 },
        { id: "m3", sender: "npc", text: "帮你留好在桌子上了，不用急。", timestamp: Date.now() - 9000000 }
      ]
    },
    {
      id: `npc-${Date.now()}-3`,
      name: "陈教练",
      relation: "球馆教练",
      avatar: "🧢",
      messages: [
        { id: "m1", sender: "npc", text: "这周三晚上的场地帮你预订好了。", timestamp: Date.now() - 28800000 },
        { id: "m2", sender: "character", text: "收到！准时到场。", timestamp: Date.now() - 25000000 }
      ]
    },
    {
      id: `npc-${Date.now()}-4`,
      name: "陆小清",
      relation: "社团学妹",
      avatar: "👩‍🎨",
      messages: [
        { id: "m1", sender: "npc", text: "学姐/学长，海报草稿我已经发你邮箱啦！", timestamp: Date.now() - 86400000 },
        { id: "m2", sender: "character", text: "排版很棒！色彩可以稍微暗一点点更符合主题。", timestamp: Date.now() - 80000000 },
        { id: "m3", sender: "npc", text: "明白，我这就去微调一下！", timestamp: Date.now() - 75000000 }
      ]
    }
  ];
}

function getFallbackNpcContinuation(charName: string, npc: NpcContact): NpcMessage[] {
  const topics = [
    [
      { sender: "npc" as const, text: "对了，上次聊到的那个新想法，你觉得怎么样？" },
      { sender: "character" as const, text: "我觉得可以尝试结合一下新的交互形式，效果应该不错。" },
      { sender: "npc" as const, text: "听起来挺有意思的，具体细则我们找时间见面详谈。" },
      { sender: "character" as const, text: "好啊，周五下午我有空。" },
      { sender: "npc" as const, text: "那就定在老地方咖啡馆见。" },
      { sender: "character" as const, text: "没问题，我把草案打印好带过去。" },
      { sender: "npc" as const, text: "顺便帮你带杯拿铁？" },
      { sender: "character" as const, text: "哈哈好意心领啦，我自己点就行。" },
      { sender: "npc" as const, text: "那到时候见！" },
      { sender: "character" as const, text: "周五见！" }
    ],
    [
      { sender: "npc" as const, text: "今天路过那家花店，看到满天星在打折。" },
      { sender: "character" as const, text: "是吗？我正想买束花放在书桌上呢。" },
      { sender: "npc" as const, text: "帮你顺手买了一小束，晚点给你送过去？" },
      { sender: "character" as const, text: "太贴心了！我等会儿请你吃冰淇淋！" },
      { sender: "npc" as const, text: "成交！半小时后楼下见。" },
      { sender: "character" as const, text: "好嘞，我先收拾一下房间。" },
      { sender: "npc" as const, text: "慢慢来，不急。" },
      { sender: "character" as const, text: "到了发消息给我哦。" },
      { sender: "npc" as const, text: "OK！" },
      { sender: "character" as const, text: "待会见！" }
    ]
  ];

  const chosen = topics[Math.floor(Math.random() * topics.length)];
  const now = Date.now();
  return chosen.map((item, idx) => ({
    id: `m-cont-${now}-${idx}`,
    sender: item.sender,
    text: item.text,
    timestamp: now + idx * 60000
  }));
}
