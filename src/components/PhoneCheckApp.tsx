import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, MessageCircle, Image, Settings, Calendar, Users, 
  ShoppingBag, FileText, Globe, Search, Battery, Signal, Wifi,
  Plus, Check, Trash2, RefreshCw, Wand2, Loader2, Feather, Sparkles, X,
  ShieldCheck, Clock, Send, CornerDownRight, ThumbsUp, ThumbsDown
} from "lucide-react";
import { Character, AppSettings } from "../types";
import { callLLM, getThreeDataSourcesPrompt } from "../lib/api";
import { CharacterAvatar } from "./CharacterAvatar";
import NotesApp from "./NotesApp";
import { ConfirmModal } from "./ConfirmModal";
import { generateDefaultNpcsForCharacter } from "./CharacterCreatorApp";

interface PhoneCheckAppProps {
  characters: Character[];
  settings?: AppSettings;
  onClose: () => void;
  onGenerateNote?: (character: Character, settings: AppSettings) => Promise<void>;
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

export default function PhoneCheckApp({ characters, settings, onClose, onGenerateNote, isGeneratingMap, loreList = [] }: PhoneCheckAppProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  
  // Active sub-module view: null | 'memos' | 'browser' | 'essays' | 'contacts' | 'shopping'
  const [activeModule, setActiveModule] = useState<string | null>(null);
  
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
      return;
    }

    // 1. Load Memos
    try {
      const savedMemos = localStorage.getItem(`mobile_ai_phone_memos_${selectedCharId}`);
      if (savedMemos) {
        setMemos(JSON.parse(savedMemos));
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
        setSearchHistory(JSON.parse(savedSearches));
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

      setContacts(existingContacts);
    } catch (e) {
      console.error(e);
      setContacts([]);
    }

    // 4. Load Shopping List
    try {
      const savedShopping = localStorage.getItem(`mobile_ai_phone_shopping_${selectedCharId}`);
      if (savedShopping) {
        setShoppingList(JSON.parse(savedShopping));
      } else {
        setShoppingList([]);
      }
    } catch (e) {
      console.error(e);
      setShoppingList([]);
    }
  }, [selectedCharId]);

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
      const prompt = `${dataSourceContext}
请根据以上角色的完整人设、记忆与世界书设定，生成 5 条该角色的最新手机备忘录。
【硬性规则】：
1. 包含 2-3 条『要做的事』（isCompleted: false）和 2-3 条『已做的事』（isCompleted: true）。
2. 内容必须紧密结合该角色的日常行程、性格和当前状态，严禁凭空捏造与角色无关的事实。
3. 每条备忘录下方必须附带一条简短的角色内心感想（15字以内，真情实感或调侃）。
4. 格式必须是严格 JSON 数组，包含 key: content, isCompleted, reflection:
[
  {"content": "...", "isCompleted": false, "reflection": "..."},
  {"content": "...", "isCompleted": true, "reflection": "..."}
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

        setMemos(newMemoList);
        localStorage.setItem(`mobile_ai_phone_memos_${selectedChar.id}`, JSON.stringify(newMemoList));
        localStorage.setItem(`mobile_ai_phone_memo_last_gen_${selectedChar.id}`, Date.now().toString());
        showToast("备忘录更新成功");
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
      const prompt = `${dataSourceContext}
请根据以上角色的完整人设、记忆与世界书设定，生成 6-8 条最新的浏览器搜索历史词条及内心想法。
【规则】：
1. 搜索词条要贴合角色近期关注的事物、生活琐事或隐藏小心思。
2. 每条附带该角色搜索此词条时的【内心真实想法】（15字以内，可爱/真实/严谨）。
3. 只有当搜索内容是角色【不想让别人知道】的隐秘心思、尴尬问题或特殊设定时，才标记为无痕模式 (isIncognito: true)。普通搜索直接标记为 false。
4. 输出为严格 JSON 数组，格式：
[
  {"query": "搜索词条", "innerThought": "内心想法", "isIncognito": boolean},
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
        const newBatch: SearchHistoryItem[] = parsed.map((item: any, idx: number) => ({
          id: `search-${Date.now()}-${idx}`,
          query: item.query || "搜索词条",
          innerThought: item.innerThought || "只是随便查查…",
          timestamp: Date.now() - idx * 300000,
          isIncognito: item.isIncognito === true
        }));

        // Combine with previous history, keeping max 20
        const combined = [...newBatch, ...searchHistory];
        const trimmed = combined.slice(0, 20);

        setSearchHistory(trimmed);
        localStorage.setItem(`mobile_ai_phone_searches_${selectedChar.id}`, JSON.stringify(trimmed));
        showToast("已生成新的搜索记录");
      } else {
        throw new Error("解析失败");
      }
    } catch (e) {
      console.error(e);
      showToast("搜索历史生成失败，请检查API配置或稍后重试");
    } finally {
      setIsGeneratingSearch(false);
    }
  };

  const handleOpenSearchBox = () => {
    setShowSearchModal(true);
  };

  // ----------------------------------------------------
  // 4. CONTACTS & NPC DIALOGUES FEATURE (联系人)
  // ----------------------------------------------------
  const handleInitNpcContacts = async () => {
    if (!selectedChar) return;

    // 1. 获取角色绑定的 NPC 列表 (若未设定则使用默认依据人设推导的NPC)
    const boundNpcs = (selectedChar.boundNpcs && selectedChar.boundNpcs.length > 0)
      ? selectedChar.boundNpcs
      : generateDefaultNpcsForCharacter(selectedChar.name, selectedChar.description || "", "");

    const contactsMap = new Map<string, ContactNPC>(contacts.map(c => [c.name, c]));

    // 检查是否所有绑定的 NPC 都已经生成了至少一轮对话
    const allHaveDialogues = boundNpcs.length > 0 && boundNpcs.every(npc => {
      const existing = contactsMap.get(npc.name);
      return existing && existing.messages && existing.messages.length > 0;
    });

    const sessionGenKey = `mobile_ai_phone_npc_rounds_${selectedChar.id}`;
    const completedRounds = Number(localStorage.getItem(sessionGenKey) || "0");

    // 机制准则 2 & 3：如果所有 NPC 对话均已生成完毕且无新话题可续，显示“暂无新对话”提示
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

【选中的 3-5 个 NPC 及历史对话】：
${npcsPromptText}

【NPC 对话续接与更新准则】：
1. 如果该 NPC 暂无历史对话：请生成 3-5 条两人初次或日常聊天的生活对话。
2. 如果该 NPC 已有历史对话：
   - 【连贯续写】：若上文话题尚未完成，请接着上文继续生成 3-6 条新对话，保持上下文语气连贯。
   - 【开启新话题】：若上文话题已自然结束（如问候结束、事情说完），请开启一个符合两者社交身份的全新生活/工作话题，开始新一轮对话。
3. 请输出严格纯 JSON 数组格式（不要包含 Markdown 代码块）：
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
            messages: [...updatedContacts[targetIndex].messages, ...newMsgs]
          };
        } else {
          updatedContacts.push({
            id: `npc-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
            name: item.name || "NPC朋友",
            relation: item.relation || "朋友",
            avatar: item.avatar || "💬",
            bio: "",
            messages: newMsgs
          });
        }
      });

      setContacts(updatedContacts);
      localStorage.setItem(`mobile_ai_phone_contacts_${selectedChar.id}`, JSON.stringify(updatedContacts));
      localStorage.setItem(sessionGenKey, String(completedRounds + 1));
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
          messages: [...npc.messages, ...newMsgs]
        };

        const updatedList = contacts.map(c => c.id === npc.id ? updatedNpc : c);
        setContacts(updatedList);
        localStorage.setItem(`mobile_ai_phone_contacts_${selectedChar.id}`, JSON.stringify(updatedList));
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
      const prompt = `${dataSourceContext}
请根据以上角色的完整人设、记忆与世界书设定，自动生成 6-8 个购物清单条目。
【规则】：
1. 包含『要买的』和『已买的』状态。
2. 内容必须紧密结合该角色的日常行程、性格和当前状态。
3. 格式请输出严格 JSON 数组：
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
        const trimmed = combined.slice(0, 20);

        setShoppingList(trimmed);
        localStorage.setItem(`mobile_ai_phone_shopping_${selectedChar.id}`, JSON.stringify(trimmed));
        showToast("购物清单更新成功");
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

  const modules = [
    { name: "联系人", icon: <MessageCircle className="w-6 h-6 text-[#1A1A1A]" />, id: "contacts" },
    { name: "备忘录", icon: <FileText className="w-6 h-6 text-[#1A1A1A]" />, id: "memos" },
    { name: "随笔", icon: <Feather className="w-6 h-6 text-[#1A1A1A]" />, id: "essays" },
    { name: "购物清单", icon: <ShoppingBag className="w-6 h-6 text-[#1A1A1A]" />, id: "shopping" },
  ];

  // ----------------------------------------------------
  // SCREEN 1: CHARACTER SELECTION (If no character picked)
  // ----------------------------------------------------
  if (!selectedCharId) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#F5F3F0]  text-[#1A1A1A]">
        <div className="flex items-center p-4 border-b border-neutral-200/50 bg-white/60 backdrop-blur-md">
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm active:scale-95 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="flex-1 text-center  text-lg font-bold">查手机</h2>
          <div className="w-9" />
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <p className="text-xs text-[#A8A39A] text-center mb-6  italic">选择你想翻看哪位角色的手机秘密...</p>
          <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto">
            {characters.map(char => (
              <button 
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className="bg-white/80 p-4 rounded-2xl border border-neutral-200/60 shadow-sm hover:shadow-md flex flex-col items-center gap-3 group active:scale-95 transition-all"
              >
                <CharacterAvatar character={char} mode="real" size={64} className="border-2 border-white shadow-md group-hover:border-neutral-900/10 transition-colors" />
                <div className="text-center">
                  <span className=" text-sm font-bold text-neutral-900 block">{char.name}</span>
                  <span className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">{char.description || "全能AI角色"}</span>
                </div>
              </button>
            ))}
            {characters.length === 0 && (
              <div className="col-span-2 text-center text-xs text-neutral-400 py-12">
                暂无可查手机的角色，请先在主页创建角色
              </div>
            )}
          </div>
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
          <button onClick={() => setActiveModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
            <ChevronLeft className="w-5 h-5" />
          </button>
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
          <button onClick={() => setActiveModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
            <ChevronLeft className="w-5 h-5" />
          </button>
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
            <span>最近搜索记录 ({searchHistory.length}/20)</span>
            <span>自动保留最近20条</span>
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
          <button onClick={() => setActiveModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
            <ChevronLeft className="w-5 h-5" />
          </button>
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
            <span>最近购物清单 ({shoppingList.length}/20)</span>
            <span>自动保留最近20条</span>
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
          <button onClick={() => setActiveModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
            <ChevronLeft className="w-5 h-5" />
          </button>
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
            onClick={handleOpenSearchBox}
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

      {/* 2. WEBSITE SEARCH MODAL (Triggered by Top Search Bar) */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F5F3F0] rounded-3xl p-5 w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-neutral-700" />
                <span className=" font-bold text-sm text-neutral-900">
                  {selectedChar?.name} 的最近搜索历史 ({searchHistory.length}/20)
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
