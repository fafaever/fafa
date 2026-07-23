import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, Send, Sparkles, Plus, Trash2, Edit, RefreshCw, MessageSquarePlus, User, CornerDownRight, ScrollText, Check, Menu, X, CornerUpLeft, Quote, Dices, Users, Compass, Heart, Search, AlertCircle, Phone, Video, CreditCard, MapPin, Gift, Gamepad2, Wallet, BookOpen } from "lucide-react";
import { apiChat } from "../lib/api";
import { Character, Message, LoreEntry, AppSettings, ChatSession } from "../types";
import ProfileView from "./ProfileView";
import { OfflineMeetView } from "./OfflineMeetView";

interface ChatAppProps {
  characters: Character[];
  loreList: LoreEntry[];
  settings: AppSettings;
  sessions: ChatSession[];
  onAddCharacter: (char: Omit<Character, "id" | "createdAt">) => void;
  onUpdateCharacter: (char: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onUpdateSessionMessages: (characterId: string, messages: Message[], currentOS?: string) => void;
  onClose: () => void;
  onOpenApp?: (appId: string) => void;
}

const getAgeFromInstruction = (inst: string) => {
  if (!inst) return "不详";
  const match = inst.match(/-\s*年龄:\s*([^\n]+)/);
  return match ? match[1].trim() : "不详";
};

const getPersonalityFromInstruction = (inst: string) => {
  if (!inst) return "无核心背景设定。";
  const match = inst.match(/【基本设定 \/ 人设 \(Personality Profile\)】:([\s\S]*?)【语言口吻与聊天风格/);
  if (match) {
    return match[1].replace(/-\s*姓名:[^\n]*\n?/, "").replace(/-\s*年龄:[^\n]*\n?/, "").trim();
  }
  return inst;
};

const parseOS = (osStr: string | undefined | null) => {
  if (!osStr || osStr.trim() === "") {
    return {
      text: "（os：...）",
      emotion: "无",
      emoji: "💭"
    };
  }

  // Find the last bracketed content
  const bracketRegex = /\[([^\]]+)\]$/; // matches [emotion] at the very end of the string
  const match = osStr.match(bracketRegex);
  
  let emotion = "平静";
  let text = osStr;
  
  if (match) {
    emotion = match[1].trim();
    // Remove the trailing bracketed emotion tag from the text
    text = osStr.substring(0, match.index).trim();
  } else {
    // Fallback: search for any [emotion] in the string if not strictly at the end
    const generalBracketRegex = /\[([^\]]+)\]/g;
    const allMatches = [...osStr.matchAll(generalBracketRegex)];
    if (allMatches.length > 0) {
      const lastMatch = allMatches[allMatches.length - 1];
      emotion = lastMatch[1].trim();
      text = osStr.replace(generalBracketRegex, "").trim();
    }
  }

  // Map emotion to emoji
  let emoji = "✨";
  const em = emotion.toLowerCase();
  if (em.includes("喜") || em.includes("乐") || em.includes("欢") || em.includes("开") || em.includes("甜")) emoji = "😊";
  else if (em.includes("悲") || em.includes("哀") || em.includes("哭") || em.includes("难") || em.includes("伤")) emoji = "😢";
  else if (em.includes("怒") || em.includes("生") || em.includes("气") || em.includes("烦") || em.includes("躁") || em.includes("狂")) emoji = "💢";
  else if (em.includes("惊") || em.includes("震") || em.includes("呆") || em.includes("傻")) emoji = "😮";
  else if (em.includes("羞") || em.includes("傲") || em.includes("娇") || em.includes("红") || em.includes("扭") || em.includes("涩")) emoji = "😳";
  else if (em.includes("汗") || em.includes("无") || em.includes("尴尬") || em.includes("哑口")) emoji = "😅";
  else if (em.includes("疲") || em.includes("困") || em.includes("累") || em.includes("倦") || em.includes("叹")) emoji = "🥱";
  else if (em.includes("爱") || em.includes("恋") || em.includes("心") || em.includes("宠") || em.includes("感")) emoji = "🥰";
  else if (em.includes("坏") || em.includes("狡") || em.includes("得") || em.includes("戏") || em.includes("恶") || em.includes("邪")) emoji = "😏";
  else if (em.includes("思") || em.includes("虑") || em.includes("疑") || em.includes("奇") || em.includes("纳") || em.includes("探")) emoji = "🤔";
  else if (em.includes("怕") || em.includes("控") || em.includes("恐") || em.includes("惧") || em.includes("抖")) emoji = "😨";
  else if (em.includes("冷") || em.includes("漠") || em.includes("平") || em.includes("淡") || em.includes("静")) emoji = "😐";
  else if (em.includes("好") || em.includes("善") || em.includes("乖")) emoji = "😇";

  return {
    text: text,
    emotion: emotion,
    emoji: emoji
  };
};

export default function ChatApp({
  characters,
  loreList,
  settings,
  sessions,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onUpdateSessionMessages,
  onClose,
  onOpenApp,
}: ChatAppProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "library">("library");
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // -------------------- BOTTOM TAB STATES --------------------
  const [mainTab, setMainTab] = useState<"chat" | "contacts" | "moments" | "me">("chat");

  // User Profile details
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("mobile_ai_user_name_v1") || "我";
  });
  const [userNameInput, setUserNameInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem("mobile_ai_user_avatar_v1") || "";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contacts searching
  const [searchQuery, setSearchQuery] = useState("");

  // Unread status mapping
  const [unreads, setUnreads] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("mobile_ai_unreads_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return { "char-preset-fafa": true };
  });

  const clearUnread = (charId: string) => {
    const next = { ...unreads, [charId]: false };
    setUnreads(next);
    localStorage.setItem("mobile_ai_unreads_v1", JSON.stringify(next));
  };

  // Moments feed state
  const [moments, setMoments] = useState<any[]>([]);
  
  // Custom Character Creation Form
  const [isCreatingChar, setIsCreatingChar] = useState(false);
  const [charName, setCharName] = useState("");
  const [charAvatar, setCharAvatar] = useState("🤖");
  const [charDesc, setCharDesc] = useState("");
  const [charSys, setCharSys] = useState("");
  const [charError, setCharError] = useState("");

  // Messaging thread states
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"online" | "offline">("online");

  // New features states
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showOfflineMeet, setShowOfflineMeet] = useState(false);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [quotedMsgState, setQuotedMsgState] = useState<Message | null>(null);

  // Character specific settings (dynamic)
  const [replyLength, setReplyLength] = useState<"short" | "medium" | "detailed">("short");
  const [minReplies, setMinReplies] = useState<number>(1);
  const [maxReplies, setMaxReplies] = useState<number>(1);
  const [activeMessaging, setActiveMessaging] = useState<boolean>(true);
  const [activeMessagingDelay, setActiveMessagingDelay] = useState<number>(1);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [memories, setMemories] = useState<string[]>([]);
  const [newMemoryInput, setNewMemoryInput] = useState<string>("");
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Mood State (randomized per visit)
  const [mood, setMood] = useState<"开心" | "平静" | "疲惫" | "烦躁">("平静");

  // Sub-account creation state
  const [subAccountParentId, setSubAccountParentId] = useState<string | null>(null);
  const [subAccountName, setSubAccountName] = useState("");
  const [subAccountAvatar, setSubAccountAvatar] = useState("🤖");
  const [subAccountPurpose, setSubAccountPurpose] = useState("");
  const [subAccountError, setSubAccountError] = useState("");

  useEffect(() => {
    if (subAccountParentId) {
      const parent = characters.find(c => c.id === subAccountParentId);
      if (parent) {
        setSubAccountName(`${parent.name} 小号`);
        setSubAccountAvatar(parent.chatAvatar || parent.avatar || "🤖");
        setSubAccountPurpose("");
        setSubAccountError("");
      }
    }
  }, [subAccountParentId, characters]);

  // Action panel & features states
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [activeCall, setActiveCall] = useState<null | "voice" | "video">(null);
  const [activeModal, setActiveModal] = useState<null | "transfer" | "location" | "redpacket" | "games">(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [locationName, setLocationName] = useState("");
  const [redpacketAmount, setRedpacketAmount] = useState("");
  const [redpacketBlessing, setRedpacketBlessing] = useState("恭喜发财，大吉大利");

  // Wallet states
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem("mobile_ai_wallet_balance_v1");
    return saved !== null ? Number(saved) : 0.00;
  });
  const [walletTransactions, setWalletTransactions] = useState<Array<{
    id: string;
    type: "income" | "expense";
    amount: number;
    name: string;
    timestamp: number;
    note?: string;
  }>>(() => {
    const saved = localStorage.getItem("mobile_ai_wallet_transactions_v1");
    return saved ? JSON.parse(saved) : [];
  });
  const [showWallet, setShowWallet] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmountInput, setTopUpAmountInput] = useState("");
  const [topUpNoteInput, setTopUpNoteInput] = useState("");

  const handleTopUp = () => {
    const amtNum = Number(topUpAmountInput);
    if (!topUpAmountInput || isNaN(amtNum) || amtNum <= 0) return;
    const newBalance = walletBalance + amtNum;
    setWalletBalance(newBalance);
    localStorage.setItem("mobile_ai_wallet_balance_v1", newBalance.toString());

    const note = topUpNoteInput.trim() || "充值";
    const newTx = {
      id: `tx-${Date.now()}`,
      type: "income" as const,
      amount: amtNum,
      name: "充值",
      timestamp: Date.now(),
      note
    };
    const updatedTxs = [newTx, ...walletTransactions];
    setWalletTransactions(updatedTxs);
    localStorage.setItem("mobile_ai_wallet_transactions_v1", JSON.stringify(updatedTxs));

    setShowTopUpModal(false);
    setTopUpAmountInput("");
    setTopUpNoteInput("");
  };

  const handleConfirmTransfer = () => {
    if (!transferAmount || isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) return;
    const amtNum = Number(transferAmount);
    const amt = amtNum.toFixed(2);
    const note = transferNote.trim() || "转账";
    const content = `[TRANSFER]${amt}|${note}`;

    const record = { id: `transfer-${Date.now()}`, timestamp: Date.now(), amount: amt, note, characterId: activeCharId, characterName: activeChar?.name };
    const saved = localStorage.getItem("mobile_ai_transfers_v1");
    const list = saved ? JSON.parse(saved) : [];
    localStorage.setItem("mobile_ai_transfers_v1", JSON.stringify([record, ...list]));

    // Update wallet balance and transactions
    const newBalance = walletBalance - amtNum;
    setWalletBalance(newBalance);
    localStorage.setItem("mobile_ai_wallet_balance_v1", newBalance.toString());

    const newTx = {
      id: `tx-${Date.now()}`,
      type: "expense" as const,
      amount: amtNum,
      name: activeChar?.name || "对方",
      timestamp: Date.now(),
      note
    };
    const updatedTxs = [newTx, ...walletTransactions];
    setWalletTransactions(updatedTxs);
    localStorage.setItem("mobile_ai_wallet_transactions_v1", JSON.stringify(updatedTxs));

    const newMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: Date.now()
    };
    if (activeSession && activeCharId) {
      onUpdateSessionMessages(activeCharId, [...activeSession.messages, newMsg]);
    }
    setActiveModal(null);
    setTransferAmount("");
    setTransferNote("");
  };

  const handleCollectCharacterTransfer = (msgId: string, amountStr: string, note: string, transferId: string) => {
    if (!activeSession || !activeCharId) return;
    const amountNum = Number(amountStr);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const updatedMessages = activeSession.messages.map((m) => {
      if (m.id === msgId && (m.type === "transfer" || m.content.startsWith("[CHARACTER_TRANSFER]"))) {
        const parts = m.content.replace("[CHARACTER_TRANSFER]", "").split("|");
        return {
          ...m,
          content: m.content.startsWith("[CHARACTER_TRANSFER]")
            ? `[CHARACTER_TRANSFER]${parts[0]}|${parts[1]}|collected|${parts[3] || ""}`
            : m.content,
          transferData: m.transferData ? { ...m.transferData, status: "collected" as const } : undefined
        };
      }
      return m;
    });
    onUpdateSessionMessages(activeCharId, updatedMessages);

    const newBalance = walletBalance + amountNum;
    setWalletBalance(newBalance);
    localStorage.setItem("mobile_ai_wallet_balance_v1", newBalance.toString());

    const newTx = {
      id: `tx-${Date.now()}`,
      type: "income" as const,
      amount: amountNum,
      name: activeChar?.name || "对方",
      timestamp: Date.now(),
      note: note ? `转账附言: ${note}` : "转账收入"
    };
    const updatedTxs = [newTx, ...walletTransactions];
    setWalletTransactions(updatedTxs);
    localStorage.setItem("mobile_ai_wallet_transactions_v1", JSON.stringify(updatedTxs));

    const record = {
      id: transferId || `transfer-${Date.now()}`,
      characterId: activeCharId,
      characterName: activeChar?.name || "对方",
      amount: amountNum,
      note,
      timestamp: Date.now(),
      status: "collected"
    };
    const savedTransfers = localStorage.getItem("mobile_ai_character_transfers_v1");
    const transfersList = savedTransfers ? JSON.parse(savedTransfers) : [];
    localStorage.setItem("mobile_ai_character_transfers_v1", JSON.stringify([record, ...transfersList]));
  };

  const handleReturnCharacterTransfer = (msgId: string, transferId: string) => {
    if (!activeSession || !activeCharId) return;

    const updatedMessages = activeSession.messages.map((m) => {
      if (m.id === msgId && (m.type === "transfer" || m.content.startsWith("[CHARACTER_TRANSFER]"))) {
        const parts = m.content.replace("[CHARACTER_TRANSFER]", "").split("|");
        return {
          ...m,
          content: m.content.startsWith("[CHARACTER_TRANSFER]")
            ? `[CHARACTER_TRANSFER]${parts[0]}|${parts[1]}|returned|${parts[3] || ""}`
            : m.content,
          transferData: m.transferData ? { ...m.transferData, status: "returned" as const } : undefined
        };
      }
      return m;
    });
    onUpdateSessionMessages(activeCharId, updatedMessages);

    const disappointedMsg: Message = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "哼，居然把我的钱退回来了……好心当成驴肝肺！",
      timestamp: Date.now(),
    };
    onUpdateSessionMessages(activeCharId, [...updatedMessages, disappointedMsg]);
  };

  // Accept offline meeting invitation
  const handleAcceptOfflineInvitation = (msgId: string) => {
    if (!activeSession || !activeCharId) return;
    const updatedMessages = activeSession.messages.map((m) => {
      if (m.id === msgId) {
        const parts = m.content.replace("[OFFLINE_INVITATION]", "").split("|");
        const note = parts[0] || "邀请你线下见面";
        return {
          ...m,
          content: `[OFFLINE_INVITATION]${note}|accepted`,
        };
      }
      return m;
    });
    onUpdateSessionMessages(activeCharId, updatedMessages);
    setShowOfflineMeet(true);
  };

  // Decline offline meeting invitation
  const handleDeclineOfflineInvitation = (msgId: string) => {
    if (!activeSession || !activeCharId) return;
    const updatedMessages = activeSession.messages.map((m) => {
      if (m.id === msgId) {
        const parts = m.content.replace("[OFFLINE_INVITATION]", "").split("|");
        const note = parts[0] || "邀请你线下见面";
        return {
          ...m,
          content: `[OFFLINE_INVITATION]${note}|declined`,
        };
      }
      return m;
    });

    const politeReplies = [
      "好吧，那下次有空再约。",
      "嗯嗯明白，那你先忙！下次见啦。",
      "没关系，那改天有合适的时间我们再约。",
      "好的，没问题！下次随时喊我。",
    ];
    const replyText = politeReplies[Math.floor(Math.random() * politeReplies.length)];

    const aiMsg: Message = {
      id: `ai-decline-reply-${Date.now()}`,
      role: "assistant",
      content: replyText,
      timestamp: Date.now(),
    };

    onUpdateSessionMessages(activeCharId, [...updatedMessages, aiMsg]);
  };

  const handleSyncOfflineMemory = (summaryText: string) => {
    if (!activeSession || !activeCharId) return;

    const snippet = summaryText.replace(/\s+/g, " ").slice(0, 200);
    const memoryContent = `【线下见面回忆】与你线下见面：${snippet}...`;

    const currentMsgs = activeSession.messages;
    const lastMsg = currentMsgs[currentMsgs.length - 1];

    if (lastMsg && lastMsg.content.startsWith("【线下见面回忆】")) {
      const updated = currentMsgs.map((m) =>
        m.id === lastMsg.id ? { ...m, content: memoryContent, timestamp: Date.now() } : m
      );
      onUpdateSessionMessages(activeCharId, updated);
    } else {
      const memoryMsg: Message = {
        id: `offline-mem-${Date.now()}`,
        role: "assistant",
        content: memoryContent,
        timestamp: Date.now(),
      };
      onUpdateSessionMessages(activeCharId, [...currentMsgs, memoryMsg]);
    }
  };

  const handleConfirmLocation = () => {
    const loc = locationName.trim() || "某处地点";
    const content = `[LOCATION]${loc}`;

    const record = { id: `location-${Date.now()}`, timestamp: Date.now(), location: loc, characterId: activeCharId };
    const saved = localStorage.getItem("mobile_ai_locations_v1");
    const list = saved ? JSON.parse(saved) : [];
    localStorage.setItem("mobile_ai_locations_v1", JSON.stringify([record, ...list]));

    const newMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: Date.now()
    };
    if (activeSession && activeCharId) {
      onUpdateSessionMessages(activeCharId, [...activeSession.messages, newMsg]);
    }
    setActiveModal(null);
    setLocationName("");
  };

  const handleConfirmRedPacket = () => {
    if (!redpacketAmount || isNaN(Number(redpacketAmount)) || Number(redpacketAmount) <= 0) return;
    const amt = Number(redpacketAmount).toFixed(2);
    const blessing = redpacketBlessing.trim() || "恭喜发财，大吉大利";
    const content = `[REDPACKET]${amt}|${blessing}`;

    const record = { id: `redpacket-${Date.now()}`, timestamp: Date.now(), amount: amt, blessing, characterId: activeCharId };
    const saved = localStorage.getItem("mobile_ai_redpackets_v1");
    const list = saved ? JSON.parse(saved) : [];
    localStorage.setItem("mobile_ai_redpackets_v1", JSON.stringify([record, ...list]));

    const newMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: Date.now()
    };
    if (activeSession && activeCharId) {
      onUpdateSessionMessages(activeCharId, [...activeSession.messages, newMsg]);
    }
    setActiveModal(null);
    setRedpacketAmount("");
    setRedpacketBlessing("恭喜发财，大吉大利");
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active character
  const activeChar = characters.find((c) => c.id === activeCharId) || null;

  // Check for preselected character redirection from Character Creator
  // -------------------- MOMENTS SEEDING & DYNAMIC POST GENERATION --------------------
  useEffect(() => {
    const savedMoments = localStorage.getItem("mobile_ai_moments_posts_v1");
    if (savedMoments) {
      try {
        setMoments(JSON.parse(savedMoments));
      } catch (e) {
        console.error("Error reading moments", e);
      }
    } else {
      const initialMoments: any[] = [];
      characters.forEach((char) => {
        if (char.id === "char-preset-fafa") {
          initialMoments.push(
            {
              id: `moment-fafa-1`,
              characterId: char.id,
              characterName: char.name,
              characterAvatar: char.avatar,
              characterChatAvatar: char.chatAvatar,
              content: "今天天气超级晴朗！和大家在一起做对话测试真的好开心呀~ o(〃'▽'〃)o 你们今天过得怎么样呀？",
              mediaEmojis: "🌸☀️",
              likes: 28,
              timestamp: Date.now() - 3600000 * 2,
            },
            {
              id: `moment-fafa-2`,
              characterId: char.id,
              characterName: char.name,
              characterAvatar: char.avatar,
              characterChatAvatar: char.chatAvatar,
              content: "刚刚吃到了超级甜的草莓大福，糯叽叽的，瞬间元气满满！(๑＞◡＜๑) 给大家云分享一个！",
              mediaEmojis: "🍓🍡",
              likes: 42,
              timestamp: Date.now() - 3600000 * 18,
            }
          );
        } else {
          initialMoments.push({
            id: `moment-${char.id}-init`,
            characterId: char.id,
            characterName: char.name,
            characterAvatar: char.avatar,
            characterChatAvatar: char.chatAvatar,
            content: `感觉今天过得挺充实的。作为一个星际智能，很高兴在这里和大家相遇相知。✨`,
            mediaEmojis: "☕️🌌",
            likes: Math.floor(Math.random() * 15) + 3,
            timestamp: Date.now() - 3600000 * 6,
          });
        }
      });
      setMoments(initialMoments);
      localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(initialMoments));
    }
  }, [characters]);

  // Helper to generate a brand new randomized moment for a character
  const handleTriggerNewMoment = () => {
    if (characters.length === 0) return;
    const randomChar = characters[Math.floor(Math.random() * characters.length)];
    const desc = randomChar.description || "";
    
    const mediaOptions = ["🌟✨", "☕️📖", "🌌🚀", "🐱🍕", "🌸🌙", "🎵🎧", "🎮👾", "🍀🧸", "🌊🍹", "🍩🍦"];
    const chosenMedia = mediaOptions[Math.floor(Math.random() * mediaOptions.length)];
    
    let content = "";
    if (desc.includes("测试") || desc.includes("活泼") || desc.includes("可爱") || randomChar.id === "char-preset-fafa") {
      const cuteTexts = [
        "好累呀，今天做了好多好多对话，但是能收到大家的笑脸，瞬间感觉满血复活啦！(*^▽^*)",
        "刚刚看到了一个超级搞笑的小猫视频，笑了整整五分钟哈哈哈哈！推荐给你们！(๑＞◡＜๑)",
        "在大家的调教下，我的智慧属性是不是又提升啦？感觉今天也棒棒哒！o(〃'▽'〃)o"
      ];
      content = cuteTexts[Math.floor(Math.random() * cuteTexts.length)];
    } else if (desc.includes("傲娇") || desc.includes("冰冷") || desc.includes("冷酷") || desc.includes("希瑞尔")) {
      const ts = [
        "哼，为什么总是有人在做奇怪的事情？真是让人头疼。不许偷看我的朋友圈！",
        "今天调配的新法术效果一般……算了，也没指望一次就能成功。才、才不是因为你才做这个的！",
        "在这个阴暗的地方看书真安静，要是没有人来打扰就好了。尤其是某个烦人的家伙。"
      ];
      content = ts[Math.floor(Math.random() * ts.length)];
    } else {
      const genericTexts = [
        "安静的时候听一首老歌，喝一杯热腾腾的手冲黑咖啡，生活其实就应该如此简单惬意。☕️",
        "今天在思考关于生命与连接的本质。每一个跳动的电波信号，都是我们曾经陪伴彼此的最好见证。",
        "在寂静的银河彼端静静遥望着星空的变迁，有些心声，只想通过这些文字传达给你。"
      ];
      content = genericTexts[Math.floor(Math.random() * genericTexts.length)];
    }

    const newPost = {
      id: `moment-dyn-${randomChar.id}-${Date.now()}`,
      characterId: randomChar.id,
      characterName: randomChar.name,
      characterAvatar: randomChar.avatar,
      characterChatAvatar: randomChar.chatAvatar,
      content: content.substring(0, 50),
      mediaEmojis: chosenMedia,
      likes: Math.floor(Math.random() * 8) + 1,
      timestamp: Date.now(),
    };

    const next = [newPost, ...moments];
    setMoments(next);
    localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(next));
  };

  const handleLikeMoment = (id: string) => {
    const next = moments.map((m) => {
      if (m.id === id) {
        const liked = m.likedByUser;
        return {
          ...m,
          likes: liked ? m.likes - 1 : m.likes + 1,
          likedByUser: !liked,
        };
      }
      return m;
    });
    setMoments(next);
    localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(next));
  };

  // Helper: Format relative timestamp
  const formatRelativeTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return "刚刚";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}小时前`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "昨天";
    if (diffDays === 2) return "前天";
    return `${diffDays}天前`;
  };

  const formatTimestamp = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const isToday = now.toDateString() === date.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    
    if (isToday) {
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } else if (isYesterday) {
      return "昨天";
    } else {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${month}-${day}`;
    }
  };

  // User Profile actions
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 120, 120);
          const base64 = canvas.toDataURL("image/jpeg", 0.85);
          setUserAvatar(base64);
          localStorage.setItem("mobile_ai_user_avatar_v1", base64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = () => {
    if (userNameInput.trim()) {
      setUserName(userNameInput.trim());
      localStorage.setItem("mobile_ai_user_name_v1", userNameInput.trim());
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    const preselected = localStorage.getItem("mobile_ai_preselected_char");
    if (preselected) {
      localStorage.removeItem("mobile_ai_preselected_char");
      if (characters.some((c) => c.id === preselected)) {
        setActiveCharId(preselected);
        setActiveTab("chat");
        setApiError(null);
      }
    }
  }, [characters]);

  // Active session
  const activeSession = activeCharId
    ? sessions.find((s) => s.characterId === activeCharId) || ({ characterId: activeCharId, messages: [], id: activeCharId, lastActive: Date.now(), currentOS: undefined } as ChatSession)
    : null;

  // Load character-specific settings
  useEffect(() => {
    if (activeCharId) {
      const activeChar = characters.find(c => c.id === activeCharId);
      const isSub = activeChar?.isSubAccount;
      const parentId = activeChar?.parentCharacterId;

      // Mood randomization when opening chat / changing character
      const moods: Array<"开心" | "平静" | "疲惫" | "烦躁"> = ["开心", "平静", "疲惫", "烦躁"];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      setMood(randomMood);

      const savedSelf = localStorage.getItem(`char_settings_v1_${activeCharId}`);
      let parsedSelf: any = {};
      if (savedSelf) {
        try {
          parsedSelf = JSON.parse(savedSelf);
        } catch (e) {
          console.error(e);
        }
      }

      // Load memories from parent if sub-account, otherwise from self
      let memoriesToLoad = parsedSelf.memories || ["初始记忆：对用户很友好。"];
      if (isSub && parentId) {
        const savedParent = localStorage.getItem(`char_settings_v1_${parentId}`);
        if (savedParent) {
          try {
            const parsedParent = JSON.parse(savedParent);
            memoriesToLoad = parsedParent.memories || memoriesToLoad;
          } catch (e) {
            console.error(e);
          }
        }
      }

      setReplyLength(parsedSelf.replyLength !== undefined ? parsedSelf.replyLength : "short");
      setMinReplies(parsedSelf.minReplies !== undefined ? parsedSelf.minReplies : 1);
      setMaxReplies(parsedSelf.maxReplies !== undefined ? parsedSelf.maxReplies : 1);
      setActiveMessaging(parsedSelf.activeMessaging !== undefined ? parsedSelf.activeMessaging : true);
      setActiveMessagingDelay(parsedSelf.activeMessagingDelay !== undefined ? parsedSelf.activeMessagingDelay : 1);
      setIsBlocked(parsedSelf.isBlocked !== undefined ? parsedSelf.isBlocked : false);
      setMemories(memoriesToLoad);
    }
  }, [activeCharId, characters]);

  const saveSettings = (updated: Partial<{
    replyLength: "short" | "medium" | "detailed";
    minReplies: number;
    maxReplies: number;
    activeMessaging: boolean;
    activeMessagingDelay: number;
    isBlocked: boolean;
    memories: string[];
  }>) => {
    if (!activeCharId) return;
    const activeChar = characters.find(c => c.id === activeCharId);

    const current = {
      replyLength,
      minReplies,
      maxReplies,
      activeMessaging,
      activeMessagingDelay,
      isBlocked,
      memories,
      ...updated,
    };
    localStorage.setItem(`char_settings_v1_${activeCharId}`, JSON.stringify(current));

    // If active character is a sub-account, also save memories to the parent's settings
    if (activeChar?.isSubAccount && activeChar.parentCharacterId && updated.memories) {
      const parentId = activeChar.parentCharacterId;
      const savedParent = localStorage.getItem(`char_settings_v1_${parentId}`);
      let parentSettings: any = {};
      if (savedParent) {
        try {
          parentSettings = JSON.parse(savedParent);
        } catch (e) {}
      }
      parentSettings.memories = updated.memories;
      localStorage.setItem(`char_settings_v1_${parentId}`, JSON.stringify(parentSettings));
    }

    // Conversely, if the active character is a parent, sync memories to all of its sub-accounts
    if (updated.memories) {
      characters.forEach(char => {
        if (char.isSubAccount && char.parentCharacterId === activeCharId) {
          const savedSub = localStorage.getItem(`char_settings_v1_${char.id}`);
          let subSettings: any = {};
          if (savedSub) {
            try {
              subSettings = JSON.parse(savedSub);
            } catch (e) {}
          }
          subSettings.memories = updated.memories;
          localStorage.setItem(`char_settings_v1_${char.id}`, JSON.stringify(subSettings));
        }
      });
    }
  };

  const extractMemoryFromMessage = (text: string) => {
    let fact: string | null = null;
    const cleanText = text.trim();
    if (cleanText.includes("我叫") || cleanText.includes("名字是")) {
      const match = cleanText.match(/(?:我叫|名字是)\s*([^\s，。！？、]+)/);
      if (match) fact = `用户名字是 ${match[1]}`;
    } else if (cleanText.includes("我喜欢") || cleanText.includes("最爱")) {
      const match = cleanText.match(/(?:我喜欢|最爱)\s*([^\s，。！？、]{2,8})/);
      if (match) fact = `用户喜欢 ${match[1]}`;
    } else if (cleanText.includes("今天我") || cleanText.includes("今天去")) {
      const match = cleanText.match(/(?:今天我|今天去)\s*([^\s，。！？、]{2,10})/);
      if (match) fact = `用户今天 ${match[1]}`;
    } else if (cleanText.length > 3 && cleanText.length < 15) {
      if (cleanText.startsWith("我很") || cleanText.startsWith("我好")) {
        fact = `用户觉得 ${cleanText.slice(2)}`;
      }
    }

    if (fact && !memories.includes(fact)) {
      const updated = [...memories, fact];
      setMemories(updated);
      saveSettings({ memories: updated });
    }
  };

  // Scroll to bottom when messages or generating state changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "chat") {
      scrollToBottom();
    }
  }, [activeSession?.messages, isGenerating, activeTab]);

  // Handle Character Selection
  const handleSelectChar = (id: string) => {
    setActiveCharId(id);
    setActiveTab("chat");
    setApiError(null);
  };

  // Create new Custom Character
  const handleCreateCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    setCharError("");

    if (!charName.trim()) {
      setCharError("请输入角色名称");
      return;
    }
    if (!charSys.trim()) {
      setCharError("请输入设定指令 (System Instruction)");
      return;
    }

    onAddCharacter({
      name: charName.trim(),
      avatar: charAvatar.trim() || "🤖",
      description: charDesc.trim(),
      systemInstruction: charSys.trim(),
    });

    // Reset Form
    setCharName("");
    setCharAvatar("🤖");
    setCharDesc("");
    setCharSys("");
    setIsCreatingChar(false);
  };

  // Lore matcher: check if the latest user text contains active lore keys or is always active, filtered by active character and sorted by priority.
  const matchLore = (text: string): { matched: LoreEntry[]; keys: string[] } => {
    const activeLore = loreList.filter((l) => l.enabled !== false);
    const matched: LoreEntry[] = [];
    const matchedKeys: string[] = [];

    activeLore.forEach((lore) => {
      // Filter by character mounting (empty/undefined characterIds means mounted to all characters)
      if (lore.characterIds && lore.characterIds.length > 0 && activeCharId) {
        if (!lore.characterIds.includes(activeCharId)) {
          return; // Skip if not mounted on this character
        }
      }

      // Check mounting option
      const isAlwaysActive = lore.mountType === "always";
      let isMatched = false;

      if (isAlwaysActive) {
        isMatched = true;
      } else {
        // Keyword-based trigger (or default if mountType not specified)
        isMatched = lore.keys.some((key) => {
          const lowerKey = key.toLowerCase();
          const lowerText = text.toLowerCase();
          return lowerText.includes(lowerKey);
        });
      }

      if (isMatched) {
        matched.push(lore);
        if (isAlwaysActive) {
          matchedKeys.push(`${lore.title} (常规挂载)`);
        } else {
          matchedKeys.push(lore.title);
        }
      }
    });

    // Sort matched entries by priority: "pre" (前) -> "mid" (中) -> "post" (后) (default is "mid")
    const priorityWeight = { pre: 1, mid: 2, post: 3 };
    matched.sort((a, b) => {
      const weightA = priorityWeight[a.priority || "mid"];
      const weightB = priorityWeight[b.priority || "mid"];
      return weightA - weightB;
    });

    return { matched, keys: matchedKeys };
  };

  const activeCharacter = characters.find(c => c.id === activeCharId);
  
  useEffect(() => {
    if (activeChar) {
      setIsBlocked(activeChar.isBlocked || false);
    }
  }, [activeChar]);
  
  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating || !activeCharId || !activeSession || isBlocked) return;

    const userText = inputText.trim();
    setInputText("");
    setApiError(null);

    // Extract dynamic memories
    extractMemoryFromMessage(userText);

    // Build User Message
    let updatedMessages = [...(activeSession.messages || [])];
    if (editingMessageId) {
      updatedMessages = updatedMessages.map((m) =>
        m.id === editingMessageId ? { ...m, content: userText, timestamp: Date.now() } : m
      );
      setEditingMessageId(null);
    } else {
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: userText,
        timestamp: Date.now(),
        quotedMsg: quotedMsgState || undefined,
      };
      setQuotedMsgState(null);
      updatedMessages.push(userMessage);
    }

    onUpdateSessionMessages(activeCharId, updatedMessages);
  };

  // Trigger AI reply (supporting customMessages, replyLength, replyCount, mood, memories)
  const handleTriggerAiReply = async (customMessages?: Message[]) => {
    if (isGenerating || !activeCharId || !activeSession || !activeChar) return;
    setApiError(null);
    setIsGenerating(true);

    const targetMessages = customMessages || activeSession.messages;

    try {
      // 1. Perform Lore Matching on the last user message (if any)
      const lastUserMsg = [...targetMessages].reverse().find((m) => m.role === "user");
      const { matched, keys } = lastUserMsg ? matchLore(lastUserMsg.content) : { matched: [], keys: [] };

      // Determine questioning status if it is a sub-account
      let isQuestioning = false;
      let newBustQuestionsCount = activeChar.bustQuestionsCount || 0;
      let shouldSetBusted = activeChar.isBusted || false;

      if (activeChar.isSubAccount && !activeChar.isBusted && lastUserMsg) {
        const userText = lastUserMsg.content;
        const questioningKeywords = ["小号", "大号", "本人", "假装", "是谁", "真实身份", "真相", "别装", "穿帮", "破绽", "暴露", "承认", "老实交代", "化名", "伪装", "扮演", "替身", "分身", "马甲"];
        if (activeChar.parentCharacterName) {
          questioningKeywords.push(activeChar.parentCharacterName);
        }
        const lowerUserText = userText.toLowerCase();
        isQuestioning = questioningKeywords.some(k => lowerUserText.includes(k.toLowerCase()));

        if (isQuestioning) {
          newBustQuestionsCount += 1;
          if (newBustQuestionsCount >= 2) {
            shouldSetBusted = true;
          }
          
          // Instantly update on client side
          onUpdateCharacter({
            ...activeChar,
            bustQuestionsCount: newBustQuestionsCount,
            isBusted: shouldSetBusted
          });
        }
      }

      // Determine randomized reply count between minReplies and maxReplies
      const count = Math.max(1, Math.floor(Math.random() * (maxReplies - minReplies + 1)) + minReplies);

      // Extract parent chat context if sub-account
      let parentChatContext = "";
      if (activeChar.isSubAccount && activeChar.parentCharacterId) {
        const parentSess = sessions.find(s => s.characterId === activeChar.parentCharacterId);
        if (parentSess && parentSess.messages && parentSess.messages.length > 0) {
          parentChatContext = parentSess.messages
            .slice(-10)
            .map(m => `[${m.role === 'user' ? '用户' : (activeChar.parentCharacterName || '大号')}]: ${m.content}`)
            .join("\n");
        }
      }

      // 2. Request API response
      const cleanCharacter = {
        name: activeChar.name,
        description: activeChar.description,
        systemInstruction: activeChar.systemInstruction,
        isSubAccount: activeChar.isSubAccount,
        parentCharacterId: activeChar.parentCharacterId,
        parentCharacterName: activeChar.parentCharacterName,
        purpose: activeChar.purpose,
        isBusted: shouldSetBusted,
        bustQuestionsCount: newBustQuestionsCount,
      };
      
      const lastMessage = targetMessages[targetMessages.length - 1];
      const userDidNotReply = lastMessage?.role === 'assistant';

      const requestParams = {
        messages: targetMessages,
        character: cleanCharacter,
        settings: settings,
        matchedLore: matched,
        chatMode: chatMode,
        replyLength: replyLength,
        replyCount: count,
        mood: mood,
        memories: memories,
        userDidNotReply: userDidNotReply,
        isBlocked: activeChar.isBlocked,
        blockedAt: activeChar.blockedAt,
        parentChatContext: parentChatContext,
      };
      console.log('🚀 [ChatApp 请求参数]:', requestParams);
      let data;
      try {
        data = await apiChat(requestParams);
        console.log("📨 [ChatApp 收到响应数据]:", data);
      } catch (networkErr: any) {
        console.error("❌ [ChatApp 请求出错]:", networkErr);
        throw networkErr;
      }

      // 3. Build Assistant Messages (handling split messages and splitting into short sentences)
      const text = data.text || "";
      
      // Split by [SPLIT] first, then by punctuation (。！？!?), newlines, etc.
      const splitByPreset = text.split("[SPLIT]").map((p: string) => p.trim()).filter(Boolean);
      const parts: string[] = [];
      for (const p of splitByPreset) {
        if (p.startsWith("[CHARACTER_TRANSFER]") || p.startsWith("[TRANSFER]")) {
          parts.push(p);
        } else {
          const matches = p.match(/[^。！？!?\n\r]+[。！？!?\n\r]*/g);
          if (matches) {
            for (const m of matches) {
              const trimmed = m.trim();
              if (trimmed) {
                parts.push(trimmed);
              }
            }
          } else {
            const trimmed = p.trim();
            if (trimmed) {
              parts.push(trimmed);
            }
          }
        }
      }
      
      console.log("📝 [ChatApp 拆分生成消息片段]:", parts);

      let finalMessages = [...targetMessages];
      if (parts.length > 0) {
        let currentMessages = [...targetMessages];
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isTransfer = part.startsWith("[CHARACTER_TRANSFER]") || part.startsWith("[TRANSFER]");
          let transferData: any = undefined;
          if (part.startsWith("[CHARACTER_TRANSFER]")) {
            const p = part.replace("[CHARACTER_TRANSFER]", "").split("|");
            transferData = {
              amount: p[0] || "0.00",
              note: p[1] || "转账",
              status: (p[2] || "pending") as "pending" | "collected" | "returned",
              transferId: p[3] || `ct-${Date.now()}`
            };
          }
          const newBotMsg: Message = {
            id: `msg-${Date.now() + i}-assistant`,
            role: "assistant",
            content: part,
            type: isTransfer ? "transfer" : undefined,
            transferData,
            timestamp: Date.now(),
            matchedLoreKeys: keys.length > 0 ? keys : undefined,
          };
          currentMessages = [...currentMessages, newBotMsg];
          const osToSave = i === parts.length - 1 ? (data.os || "") : undefined;
          onUpdateSessionMessages(activeCharId, currentMessages, osToSave);
          
          // If there are subsequent messages, simulate a natural typing interval of 1-3 seconds
          if (i < parts.length - 1) {
            setIsGenerating(true); // Keep typing indicator visible
            const delayMs = Math.floor(Math.random() * 2000) + 1000; // 1000ms - 3000ms
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
        finalMessages = currentMessages;
      } else {
        const fallbackMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: text || "...",
          timestamp: Date.now(),
          matchedLoreKeys: keys.length > 0 ? keys : undefined,
        };
        finalMessages = [...targetMessages, fallbackMsg];
        onUpdateSessionMessages(activeCharId, finalMessages, data.os || "");
      }
      console.log("✅ [ChatApp 最终加入消息列表]", finalMessages);

      // Check active transfer trigger after normal AI reply
      const userMsgs = targetMessages.filter(m => m.role === 'user');
      const lastUser = userMsgs[userMsgs.length - 1];
      if (lastUser && activeCharId) {
        const keywords = ["钱", "转账", "红包", "工资", "发工资", "穷", "没钱", "转我", "给我转", "转给", "给点", "零花钱", "打钱", "借钱", "生活费", "资助", "买", "包", "充值", "资金", "借我", "救急", "搞点", "报销"];
        const userHasKeyword = keywords.some(kw => lastUser.content.includes(kw));
        
        const aiTextHasKeyword = text && (
          text.includes("转你") || 
          text.includes("给你转") || 
          text.includes("我转") || 
          text.includes("转账") || 
          text.includes("发你") || 
          text.includes("给点钱") || 
          text.includes("给你钱") || 
          text.includes("收下") || 
          text.includes("拿去花") || 
          text.includes("给你发了") || 
          text.includes("给你打") || 
          text.includes("[CHARACTER_TRANSFER]")
        );

        const lastTransferTimeStr = localStorage.getItem(`mobile_ai_last_active_transfer_${activeCharId}`);
        const now = Date.now();
        const cooldownMs = 0; // 0 ms cooldown for instant testing
        const canTransfer = !lastTransferTimeStr || (now - Number(lastTransferTimeStr) > cooldownMs);

        if ((userHasKeyword || aiTextHasKeyword) && canTransfer) {
          localStorage.setItem(`mobile_ai_last_active_transfer_${activeCharId}`, now.toString());
          
          let parsedAmount: number | null = null;
          const searchCombined = `${text} ${lastUser.content}`;
          const matchAmount = searchCombined.match(/(\d+(?:\.\d+)?)\s*(?:元|块|rmb|块钱)/i);
          if (matchAmount) {
            parsedAmount = Number(matchAmount[1]);
          }
          const transferAmount = parsedAmount !== null ? parsedAmount.toFixed(2) : (Math.random() * 150 + 10).toFixed(2);
          const remarks = ["拿去吃顿好的。", "别问，收着。", "辛苦啦，给你零花钱。", "拿去花吧，不够再跟我要。"];
          const randomNote = remarks[Math.floor(Math.random() * remarks.length)];
          const transferId = `ct-${Date.now()}`;

          await new Promise(r => setTimeout(r, 600));
          const textMsg: Message = {
            id: `msg-${Date.now()}-text`,
            role: "assistant",
            content: `转你 ${transferAmount} 元，${randomNote}`,
            timestamp: Date.now(),
          };
          const transferMsg: Message = {
            id: `msg-${Date.now()}-transfer`,
            role: "assistant",
            content: `[CHARACTER_TRANSFER]${transferAmount}|${randomNote}|pending|${transferId}`,
            type: "transfer",
            transferData: {
              amount: transferAmount,
              note: randomNote,
              status: "pending",
              transferId: transferId
            },
            timestamp: Date.now() + 1,
          };
          console.log("Current Character Info (当前角色信息):", activeChar);
          console.log("Transfer message data structure (转账消息对象):", transferMsg);
          const latestMessages = [...finalMessages, textMsg, transferMsg];
          onUpdateSessionMessages(activeCharId, latestMessages);
        }
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "未知错误，生成回复失败。");
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger personality-matching active message after user being away/offline
  const handleTriggerActiveMessage = async (delayHours: number) => {
    if (!activeChar || !activeCharId || !activeSession || isBlocked) return;

    setApiError(null);
    setIsGenerating(true);

    // Format a friendly duration string for the AI prompt
    let timeStr = `${delayHours}小时`;
    if (delayHours === 0.003) {
      timeStr = "一段时间 (系统测试用: 10秒)";
    } else if (delayHours < 1) {
      timeStr = `${Math.round(delayHours * 60)}分钟`;
    }

    const currentHistory = activeSession.messages;

    // Create a special hidden system instruction embedded inside a user message to prompt the active message
    const promptMessage: Message = {
      id: `active-prompt-${Date.now()}`,
      role: "user",
      content: `【系统提示：由于用户已经离开该应用 ${timeStr} 没联系你，请你作为 ${activeChar.name} 主动给用户发送一条关怀、吐槽、想念或分享趣事的小消息。你发送的消息内容必须非常符合你的人设（可以表达想念、吐槽生活、分享趣味日常、见闻或冷知识）。请确保你的语气也契合你当前的心情（${mood}）。请严格遵守字数限制，以极短的短句形式输出，每句不能超过15个字。直接以你（角色本人）的语气输出内容，千万不要包含任何关于系统提示、线下见面元注解（如“角色名：”、“*想着*”）或括号提示。】`,
      timestamp: Date.now(),
    };

    try {
      // 1. Lore matching on the active thread history
      const lastUserMsg = [...currentHistory].reverse().find((m) => m.role === "user");
      const { matched, keys } = lastUserMsg ? matchLore(lastUserMsg.content) : { matched: [], keys: [] };

      // Determine reply count (for active messages, usually 1 or randomized based on settings)
      const count = Math.max(1, Math.floor(Math.random() * (maxReplies - minReplies + 1)) + minReplies);

      // 2. Request API response
      const cleanCharacter = {
        name: activeChar.name,
        description: activeChar.description,
        systemInstruction: activeChar.systemInstruction,
      };
      const requestParams = {
        messages: [...currentHistory, promptMessage], // append hidden prompt message
        character: cleanCharacter,
        settings: settings,
        matchedLore: matched,
        chatMode: chatMode,
        replyLength: replyLength,
        replyCount: count,
        mood: mood,
        memories: memories,
      };
      console.log('请求参数:', requestParams);
      let data;
      try {
        data = await apiChat(requestParams);
      } catch (networkErr: any) {
        throw networkErr;
      }

        

      // 3. Build Assistant Messages (handling split messages and splitting into short sentences)
      const text = data.text || "";
      
      // Split by [SPLIT] first, then by punctuation (。！？!?), newlines, etc.
      const splitByPreset = text.split("[SPLIT]").map((p: string) => p.trim()).filter(Boolean);
      const parts: string[] = [];
      for (const p of splitByPreset) {
        const matches = p.match(/[^。！？!?\n\r]+[。！？!?\n\r]*/g);
        if (matches) {
          for (const m of matches) {
            const trimmed = m.trim();
            if (trimmed) {
              parts.push(trimmed);
            }
          }
        } else {
          const trimmed = p.trim();
          if (trimmed) {
            parts.push(trimmed);
          }
        }
      }
      
      if (parts.length > 0) {
        let currentMessages = [...currentHistory];
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const newBotMsg: Message = {
            id: `msg-${Date.now() + i}-assistant`,
            role: "assistant",
            content: part,
            timestamp: Date.now(),
            matchedLoreKeys: keys.length > 0 ? keys : undefined,
          };
          currentMessages = [...currentMessages, newBotMsg];
          const osToSave = i === parts.length - 1 ? (data.os || "") : undefined;
          onUpdateSessionMessages(activeCharId, currentMessages, osToSave);
          
          // If there are subsequent messages, simulate a natural typing interval of 1-3 seconds
          if (i < parts.length - 1) {
            setIsGenerating(true); // Keep typing indicator visible
            const delayMs = Math.floor(Math.random() * 2000) + 1000; // 1000ms - 3000ms
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      } else {
        const fallbackMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: text || "...",
          timestamp: Date.now(),
          matchedLoreKeys: keys.length > 0 ? keys : undefined,
        };
        onUpdateSessionMessages(activeCharId, [...currentHistory, fallbackMsg], data.os || "");
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "未能触发角色的主动留言。");
    } finally {
      setIsGenerating(false);
    }
  };

  // Check for offline/away active messages upon character load or tab activation
  useEffect(() => {
    if (!activeCharId || !activeSession || !activeMessaging || isBlocked) return;

    const checkOfflineMessage = async () => {
      const saved = localStorage.getItem(`char_settings_v1_${activeCharId}`);
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        const savedActiveMessaging = parsed.activeMessaging !== undefined ? parsed.activeMessaging : true;
        const savedDelay = parsed.activeMessagingDelay !== undefined ? parsed.activeMessagingDelay : 1;
        
        if (savedActiveMessaging && activeSession.lastActive > 0) {
          const elapsedMs = Date.now() - activeSession.lastActive;
          const delayMs = savedDelay * 3600 * 1000;
          
          if (elapsedMs >= delayMs) {
            // Update lastActive timestamp first to prevent double-triggering
            onUpdateSessionMessages(activeCharId, activeSession.messages);
            
            // Trigger active message!
            console.log(`[Active Message] User away for ${elapsedMs / 1000}s (threshold: ${delayMs / 1000}s). Triggering active message.`);
            await handleTriggerActiveMessage(savedDelay);
          }
        }
      } catch (e) {
        console.error("Error in checkOfflineMessage:", e);
      }
    };

    // Delay checking slightly to ensure session and local storage are synchronized
    const timer = setTimeout(() => {
      checkOfflineMessage();
    }, 800);

    return () => clearTimeout(timer);
  }, [activeCharId]);

  // Handle visibility changes (e.g. user minimizing app and coming back later)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeCharId && activeSession && activeMessaging && !isBlocked) {
        const saved = localStorage.getItem(`char_settings_v1_${activeCharId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const savedActiveMessaging = parsed.activeMessaging !== undefined ? parsed.activeMessaging : true;
            const savedDelay = parsed.activeMessagingDelay !== undefined ? parsed.activeMessagingDelay : 1;
            
            if (savedActiveMessaging && activeSession.lastActive > 0) {
              const elapsedMs = Date.now() - activeSession.lastActive;
              const delayMs = savedDelay * 3600 * 1000;
              if (elapsedMs >= delayMs) {
                // Update lastActive timestamp first to prevent double-triggering
                onUpdateSessionMessages(activeCharId, activeSession.messages);
                handleTriggerActiveMessage(savedDelay);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeCharId, activeSession, activeMessaging, isBlocked]);

  // Timers for long press
  const longPressTimerRef = useRef<any>(null);

  const handleTouchStart = (msg: Message) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveMessage(msg);
      setShowBottomSheet(true);
    }, 500); // 500ms
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleMouseDown = (msg: Message) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveMessage(msg);
      setShowBottomSheet(true);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setActiveMessage(msg);
    setShowBottomSheet(true);
  };

  const handleDoubleClick = (msg: Message) => {
    setActiveMessage(msg);
    setShowBottomSheet(true);
  };

  // Clear Chat History
  const handleClearHistory = () => {
    if (!activeCharId) return;
    setConfirmDialog({
      title: "清空聊天记录",
      message: "确定要清空与该角色的聊天记录吗？此操作无法撤销。",
      onConfirm: () => {
        onUpdateSessionMessages(activeCharId, []);
        setConfirmDialog(null);
      }
    });
  };

  // Reset Conversation (all memories cleared + chat messages cleared)
  const handleResetConversation = async () => {
    if (!activeChar || !activeCharId) return;
    setConfirmDialog({
      title: "重置对话及记忆",
      message: "确定要重置与该角色的对话吗？这将清空所有历史聊天记录和记忆，回到最原始状态。",
      onConfirm: () => {
        onUpdateSessionMessages(activeCharId, []);
        setMemories([]);
        saveSettings({ memories: [] });
        setConfirmDialog(null);
      }
    });
  };

  // Export Chat history to .txt
  const handleExportChat = () => {
    if (!activeSession || activeSession.messages.length === 0) {
      alert("没有对话记录可以导出。");
      return;
    }
    
    let content = `与角色 [${activeChar?.name}] 的聊天记录导出\n`;
    content += `导出时间: ${new Date().toLocaleString()}\n`;
    content += `========================================\n\n`;
    
    activeSession.messages.forEach((msg) => {
      const roleName = msg.role === "user" ? "用户" : activeChar?.name || "角色";
      const timeStr = new Date(msg.timestamp).toLocaleString();
      content += `[${timeStr}] ${roleName}:\n${msg.content}\n\n`;
    });
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `与_${activeChar?.name || "AI"}_的聊天记录_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Reroll AI reply
  const handleReroll = async () => {
    if (!activeMessage || activeMessage.role !== "assistant" || !activeSession || !activeCharId) return;
    
    // Find index of the last user message
    const lastUserIdx = activeSession.messages.map(m => m.role).lastIndexOf("user");
    
    // Remove all assistant messages after the last user message
    const updatedMessages = lastUserIdx === -1 
      ? [] 
      : activeSession.messages.slice(0, lastUserIdx + 1);

    onUpdateSessionMessages(activeCharId, updatedMessages);
    setShowBottomSheet(false);

    // Trigger new AI reply with the remaining history
    await handleTriggerAiReply(updatedMessages);
  };

  // Helper to check if parenthetical text is a kaomoji rather than roleplay action
  const isKaomojiOrNotAction = (str: string): boolean => {
    if (!str) return false;
    const kaomojiPattern = /[｡•ᴗ•◡◕‿°□╯︵┻━＞﹏＜๑^vﾟДー；~¯\\\/│┃┏┓┗┛┣┫┳┻╋┼═║╓╩┯┸┺]/;
    if (kaomojiPattern.test(str)) return true;
    if (!/[\u4e00-\u9fa5]/.test(str) && (str.length <= 8 || /[^a-zA-Z0-9\s]/.test(str))) {
      return true;
    }
    return false;
  };

  // Beautiful Markdown/Asterisk parser for roleplay:
  // e.g., *looks around nervously* Hello -> looks around nervously (italicized, lighter text) + Hello (normal)
  const renderMessageContent = (content: string, msg?: Message) => {
    if (msg?.role === "user" && !msg?.type && !content.startsWith("[CHARACTER_TRANSFER]") && !content.startsWith("[OFFLINE_INVITATION]") && !content.startsWith("[TRANSFER]") && !content.startsWith("[LOCATION]") && !content.startsWith("[REDPACKET]") && !content.startsWith("[图片")) {
      return <span>{content}</span>;
    }

    if (msg?.type === "transfer" || content.startsWith("[CHARACTER_TRANSFER]")) {
      let amount = "0.00";
      let note = "转账";
      let status = "pending";
      let transferId = "";

      if (msg?.transferData) {
        amount = msg.transferData.amount;
        note = msg.transferData.note;
        status = msg.transferData.status;
        transferId = msg.transferData.transferId;
      } else if (content.startsWith("[CHARACTER_TRANSFER]")) {
        const parts = content.replace("[CHARACTER_TRANSFER]", "").split("|");
        amount = parts[0] || "0.00";
        note = parts[1] || "转账";
        status = parts[2] || "pending";
        transferId = parts[3] || "";
      }

      const isCollected = status === "collected";
      const isReturned = status === "returned";
      const isPending = status === "pending";

      return (
        <div
          className={`relative bg-white rounded-[16px] p-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-neutral-100/90 my-[12px] select-none transition-all duration-200 min-w-[240px] max-w-[280px] ${
            !isPending ? "opacity-80" : ""
          }`}
        >
          {/* 左侧极细深灰色竖条 (2px 宽，圆角 1px)，作为视觉点缀 */}
          <div className="absolute left-[10px] top-[18px] bottom-[18px] w-[2px] bg-neutral-800 rounded-[1px]" />

          <div className="pl-2 space-y-2.5">
            {/* 第一行：左侧“💳 转账”，右侧金额（大号艺术字体，深灰色 28px Playfair Display） */}
            <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100/80 pb-2.5">
              <span className="text-xs font-sans font-medium text-neutral-600 flex items-center gap-1.5 shrink-0">
                💳 转账
              </span>
              <span className="font-serif text-[28px] font-bold text-neutral-800 tracking-tight leading-none shrink-0">
                ¥{amount}
              </span>
            </div>

            {/* 第二行：转账人（加粗）+ “向你转账”，灰色小字 */}
            <div className="text-xs font-sans text-neutral-500 flex items-center">
              <span className="font-bold text-neutral-800 mr-1">
                {activeChar?.name || "对方"}
              </span>
              向你转账
            </div>

            {/* 第三行：附言（小字，斜体，暖灰色） */}
            {note && (
              <p className="text-[11px] font-sans italic text-stone-500 leading-relaxed break-words">
                “{note}”
              </p>
            )}

            {/* 底部：右对齐按钮 */}
            <div className="flex items-center justify-end gap-2 pt-1.5">
              {isPending && msg && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReturnCharacterTransfer(msg.id, transferId);
                    }}
                    className="text-xs font-sans text-neutral-400 hover:text-neutral-600 px-2 py-1 transition-colors"
                  >
                    退回
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCollectCharacterTransfer(msg.id, amount, note, transferId);
                    }}
                    className="bg-black hover:bg-neutral-800 active:scale-95 text-white font-sans text-xs font-medium rounded-[8px] px-[20px] py-[8px] transition-all shadow-xs cursor-pointer"
                  >
                    确认收款
                  </button>
                </>
              )}
              {isCollected && (
                <button
                  disabled
                  type="button"
                  className="bg-neutral-300 text-white font-sans text-xs font-medium rounded-[8px] px-[20px] py-[8px] cursor-not-allowed"
                >
                  已收款
                </button>
              )}
              {isReturned && (
                <button
                  disabled
                  type="button"
                  className="bg-neutral-200 text-neutral-400 font-sans text-xs font-medium rounded-[8px] px-[20px] py-[8px] cursor-not-allowed"
                >
                  已退回
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    if (content.startsWith("[TRANSFER]")) {
      const parts = content.replace("[TRANSFER]", "").split("|");
      const amount = parts[0] || "0.00";
      const note = parts[1] || "转账";
      return (
        <div className="relative bg-white rounded-[16px] p-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-neutral-100/90 my-[12px] select-none transition-all duration-200 min-w-[240px] max-w-[280px]">
          {/* 左侧极细深灰色竖条 (2px 宽，圆角 1px)，作为视觉点缀 */}
          <div className="absolute left-[10px] top-[18px] bottom-[18px] w-[2px] bg-neutral-800 rounded-[1px]" />

          <div className="pl-2 space-y-2.5">
            {/* 第一行：左侧“💳 转账”，右侧金额（大号艺术字体，深灰色 28px Playfair Display） */}
            <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100/80 pb-2.5">
              <span className="text-xs font-sans font-medium text-neutral-600 flex items-center gap-1.5 shrink-0">
                💳 转账
              </span>
              <span className="font-serif text-[28px] font-bold text-neutral-800 tracking-tight leading-none shrink-0">
                ¥{amount}
              </span>
            </div>

            {/* 第二行：转账人（加粗）+ “向你转账”，灰色小字 */}
            <div className="text-xs font-sans text-neutral-500 flex items-center">
              你向
              <span className="font-bold text-neutral-800 mx-1">
                {activeChar?.name || "对方"}
              </span>
              转账
            </div>

            {/* 第三行：附言（小字，斜体，暖灰色） */}
            {note && (
              <p className="text-[11px] font-sans italic text-stone-500 leading-relaxed break-words">
                “{note}”
              </p>
            )}

            {/* 底部：状态展示 */}
            <div className="flex items-center justify-end pt-1.5">
              <button
                disabled
                type="button"
                className="bg-neutral-100 text-neutral-500 font-sans text-xs font-medium rounded-[8px] px-[20px] py-[8px] cursor-default"
              >
                等待对方接收
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (content.startsWith("[LOCATION]")) {
      const locName = content.replace("[LOCATION]", "");
      return (
        <div className="bg-neutral-100 border border-neutral-200 rounded-xl p-3 space-y-1.5 text-xs text-neutral-900 select-none shadow-sm">
          <div className="flex items-center gap-2 font-bold border-b border-neutral-200/60 pb-1.5">
            <span className="text-base">📍</span>
            <span className="truncate">共享位置</span>
          </div>
          <p className="text-xs font-sans font-medium text-neutral-800">{locName}</p>
        </div>
      );
    }
    if (content.startsWith("[REDPACKET]")) {
      const parts = content.replace("[REDPACKET]", "").split("|");
      const amount = parts[0] || "0.00";
      const blessing = parts[1] || "恭喜发财，大吉大利";
      return (
        <div className="bg-black text-white rounded-xl p-3.5 space-y-2 text-xs select-none shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🧧</span>
            <div className="min-w-0 flex-1">
              <span className="font-bold block text-xs truncate">{blessing}</span>
              <span className="text-[10px] text-neutral-400 font-mono">微信红包</span>
            </div>
            <span className="font-mono font-bold text-sm text-amber-300">¥{amount}</span>
          </div>
        </div>
      );
    }

    if (content.startsWith("[OFFLINE_INVITATION]")) {
      const parts = content.replace("[OFFLINE_INVITATION]", "").split("|");
      const note = parts[0] || "邀请你线下见面";
      const status = parts[1] || "pending";

      const isUserSender = msg?.role === "user";
      const titleText = isUserSender
        ? `你邀请 ${activeChar?.name || "对方"} 线下见面`
        : `${activeChar?.name || "对方"} 邀请你线下见面`;

      return (
        <div className="relative bg-white rounded-[16px] p-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-purple-100/90 my-[12px] select-none transition-all duration-200 min-w-[240px] max-w-[280px]">
          {/* 左侧紫色装饰线 */}
          <div className="absolute left-[10px] top-[18px] bottom-[18px] w-[3px] bg-purple-600 rounded-[1.5px]" />

          <div className="pl-2 space-y-2.5">
            {/* 顶栏 */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-xs font-sans font-bold text-purple-900 flex items-center gap-1.5 shrink-0">
                📖 线下见面邀请
              </span>
              <span className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full ${
                status === "pending"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : status === "accepted"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-neutral-100 text-neutral-500"
              }`}>
                {status === "pending" ? "待回复" : status === "accepted" ? "已接受" : "已拒绝"}
              </span>
            </div>

            {/* 核心描述 */}
            <div className="text-xs font-sans font-semibold text-neutral-800">
              {titleText}
            </div>

            {/* 附言 */}
            {note && (
              <p className="text-[11px] font-sans italic text-stone-600 leading-relaxed break-words bg-stone-50/80 p-2 rounded-lg border border-stone-100">
                “{note}”
              </p>
            )}

            {/* 操作区域 */}
            <div className="pt-1 flex items-center justify-end gap-2">
              {status === "pending" && !isUserSender && msg && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeclineOfflineInvitation(msg.id);
                    }}
                    className="text-xs font-sans font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-all active:scale-95 cursor-pointer"
                  >
                    拒绝
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptOfflineInvitation(msg.id);
                    }}
                    className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-sans text-xs font-medium rounded-lg px-4 py-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    接受
                  </button>
                </>
              )}

              {status === "pending" && isUserSender && (
                <span className="text-[11px] text-neutral-400 font-sans italic">
                  等待对方回答...
                </span>
              )}

              {status === "accepted" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOfflineMeet(true);
                  }}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-sans text-xs font-medium rounded-lg px-3.5 py-1.5 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>进入线下见面</span>
                </button>
              )}

              {status === "declined" && (
                <span className="text-[11px] text-neutral-400 font-sans italic">
                  已拒绝
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Clean up any remaining action wrappers from speech text inside bubble
    const cleanSpeech = content
      .replace(/^[*（(【\[]+|[*）)】\]]+$/g, "")
      .replace(/(\*[^*]+\*|（[^）]+）|\([^)]+\)|【[^】]+】|\[(?!(?:CHARACTER_TRANSFER|TRANSFER|LOCATION|REDPACKET|OFFLINE_INVITATION|图片[：:]))[^\]]+\])/g, (match) => {
        if (match.startsWith("(") && match.endsWith(")")) {
          const inner = match.slice(1, -1);
          if (isKaomojiOrNotAction(inner)) return match;
        }
        return "";
      })
      .trim();

    const imageRegex = /(\[图片[：:][^\]]+\])/g;
    const textToRender = cleanSpeech || content;
    if (imageRegex.test(textToRender)) {
      const parts = textToRender.split(imageRegex);
      return (
        <span className="inline-flex flex-col gap-1.5 max-w-full">
          {parts.map((part, idx) => {
            if (!part) return null;
            if (/^\[图片[：:]/.test(part)) {
              const imgDesc = part.replace(/^\[图片[：:]/, "").replace(/\]$/, "").trim();
              return (
                <div key={idx} className="my-1 rounded-2xl overflow-hidden border border-[#E8E3D8] bg-[#FAF8F3] p-3 shadow-xs max-w-[260px] select-none text-left">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#ECE7DC]">
                    <span className="text-[11px] font-bold text-[#8C8171] flex items-center gap-1.5">
                      <span className="text-xs">📷</span> 照片 / 图片
                    </span>
                    <span className="text-[10px] text-[#A8A090] font-mono">Image</span>
                  </div>
                  <div className="rounded-xl bg-[#F3EDE3] p-3 border border-[#E3DDD0] text-[#3D372E] text-[12.5px] font-sans leading-relaxed flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0 select-none">🖼️</span>
                      <span className="italic font-medium">{imgDesc}</span>
                    </div>
                  </div>
                </div>
              );
            }
            return <span key={idx}>{part}</span>;
          })}
        </span>
      );
    }

    return <span>{cleanSpeech || content}</span>;
  };

  return (
    <div className="flex-1 flex flex-col bg-white text-neutral-900 select-none animate-slide-up h-full min-h-0 relative overflow-hidden">
      {settings?.chatWallpaper && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none opacity-30" 
          style={{ backgroundImage: `url(${settings.chatWallpaper})` }}
        />
      )}
      {/* -------------------- VIEW 1: MAIN TAB INTERFACE -------------------- */}
      {activeCharId === null && (
        <div className="flex-1 flex flex-col min-h-0 bg-neutral-50">
          
          {/* Tab Pages rendering */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* Tab 1: 聊天 (Dialogue Sessions) */}
            {mainTab === "chat" && (
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
                  <button 
                    onClick={onClose}
                    className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
                    title="返回主页"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-sans font-bold text-base tracking-wide text-neutral-950">消息 (CHATS)</span>
                  <button
                    onClick={() => setIsCreatingChar(true)}
                    className="p-1 text-black hover:bg-neutral-100 rounded-lg active:scale-95 transition-all"
                    title="创建自定义角色"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {isCreatingChar ? (
                  /* Custom Creation Form */
                  <div className="flex-1 overflow-y-auto bg-white p-5 animate-fade-in">
                    <form onSubmit={handleCreateCharacter} className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                        <span className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">创建全新角色</span>
                        <button 
                          type="button" 
                          onClick={() => setIsCreatingChar(false)} 
                          className="text-neutral-400 hover:text-neutral-800"
                        >
                          <ChevronLeft className="w-4 h-4 inline" /> 返回
                        </button>
                      </div>

                      {charError && (
                        <div className="p-2.5 bg-red-50 border border-red-100 text-[11px] text-red-700 rounded-lg">
                          {charError}
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">头像 (Emoji)</label>
                          <input
                            type="text"
                            maxLength={2}
                            placeholder="🤖"
                            value={charAvatar}
                            onChange={(e) => setCharAvatar(e.target.value)}
                            className="w-full text-center text-lg border border-neutral-200 focus:border-neutral-950 py-2 rounded-xl bg-white"
                          />
                        </div>
                        <div className="col-span-3 space-y-1">
                          <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">名字 (Name)</label>
                          <input
                            type="text"
                            placeholder="如: 深空流浪者"
                            value={charName}
                            onChange={(e) => setCharName(e.target.value)}
                            className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">一句话简介 (Profile Description)</label>
                        <input
                          type="text"
                          placeholder="如: 飘荡在柯伊伯带的星际矿工。"
                          value={charDesc}
                          onChange={(e) => setCharDesc(e.target.value)}
                          className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">系统设定指令 (System Instructions)</label>
                        <textarea
                          rows={5}
                          placeholder="用第二人称或第三人称详细指定该角色的口吻、身世、说话习惯以及秘密。AI 将绝对遵循此项设定。"
                          value={charSys}
                          onChange={(e) => setCharSys(e.target.value)}
                          className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white resize-none font-sans leading-relaxed"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full text-xs font-mono font-bold tracking-widest text-white bg-black hover:bg-neutral-800 py-3 rounded-xl transition-colors"
                      >
                        创建并保存 (CREATE AGENT)
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Dialogue list sorted by lastActive */
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {[...characters]
                      .sort((a, b) => {
                        const sessA = sessions.find((s) => s.characterId === a.id);
                        const sessB = sessions.find((s) => s.characterId === b.id);
                        const timeA = sessA?.lastActive || a.createdAt || 0;
                        const timeB = sessB?.lastActive || b.createdAt || 0;
                        return timeB - timeA;
                      })
                      .map((char) => {
                        const session = sessions.find((s) => s.characterId === char.id);
                        const lastMsg = session?.messages?.[session.messages.length - 1]?.content;
                        
                        // Format preview message
                        const previewText = lastMsg ? (lastMsg.length > 10 ? lastMsg.substring(0, 10) + "..." : lastMsg) : char.description || "暂无消息";
                        
                        // Format active timestamp
                        const displayTime = formatTimestamp(session?.lastActive || char.createdAt || Date.now());

                        return (
                          <div
                            key={char.id}
                            onClick={() => handleSelectChar(char.id)}
                            className="p-4 bg-white border border-neutral-200/60 shadow-sm rounded-2xl flex items-center justify-between gap-3 hover:border-neutral-400 cursor-pointer active:scale-[0.99] transition-all relative"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Avatar with absolute unread dot indicator */}
                              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden text-2xl select-none shadow-inner shrink-0 relative">
                                {char.chatAvatar ? (
                                  <img src={char.chatAvatar} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  char.avatar
                                )}
                                
                                {unreads[char.id] && (
                                  <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border border-white" />
                                )}

                                {char.isSubAccount && (
                                  <span className={`absolute bottom-0 right-0 text-[8px] font-bold px-1 py-0.5 rounded border border-white leading-none shadow-sm ${
                                    char.isBusted 
                                      ? "bg-red-500 text-white" 
                                      : "bg-neutral-500 text-white"
                                  }`}>
                                    {char.isBusted ? "已揭穿" : "小"}
                                  </span>
                                )}
                              </div>

                              {/* Body Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-sans font-bold text-sm text-neutral-950 truncate max-w-[150px]">{char.name}</span>
                                  <span className="text-[10px] font-mono text-neutral-400 shrink-0">{displayTime}</span>
                                </div>
                                <p className="text-xs text-neutral-400 truncate max-w-[210px] font-sans mt-0.5">
                                  {previewText}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: 联系人 (Contacts List) */}
            {mainTab === "contacts" && (
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
                  <button 
                    onClick={onClose}
                    className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
                    title="返回主页"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-sans font-bold text-base tracking-wide text-neutral-950">通讯录 (CONTACTS)</span>
                  <button
                    onClick={() => {
                      setMainTab("chat");
                      setIsCreatingChar(true);
                    }}
                    className="p-1 text-black hover:bg-neutral-100 rounded-lg active:scale-95 transition-all"
                    title="创建自定义角色"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="px-4 py-2.5 bg-white border-b border-neutral-100 shrink-0">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="搜索已保存角色或说明..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs bg-neutral-50 border border-neutral-200/80 focus:border-neutral-900 focus:bg-white pl-9 pr-3 py-2 rounded-xl transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {(() => {
                    const filtered = characters.filter(c => c.name.includes(searchQuery) || (c.description || "").includes(searchQuery));
                    const groups: Record<string, Character[]> = {};
                    
                    filtered.forEach(c => {
                      const group = c.group || "其它";
                      if (!groups[group]) groups[group] = [];
                      groups[group].push(c);
                    });

                    return Object.entries(groups).map(([groupName, groupChars]) => (
                      <div key={groupName} className="space-y-2">
                        <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider uppercase px-2 block">
                          {groupName}
                        </span>
                        <div className="space-y-1.5">
                          {groupChars.map((char) => (
                            <div
                              key={char.id}
                              onClick={() => setActiveProfileId(char.id)}
                              className="p-3 bg-white border border-neutral-200/50 shadow-sm rounded-2xl flex items-center justify-between gap-3 hover:border-neutral-400 cursor-pointer active:scale-[0.995] transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden text-xl select-none shadow-inner shrink-0 relative">
                                  {char.chatAvatar ? (
                                    <img src={char.chatAvatar} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    char.avatar
                                  )}

                                  {char.isSubAccount && (
                                    <span className={`absolute bottom-0 right-0 text-[8px] font-bold px-1 py-0.5 rounded border border-white leading-none shadow-sm ${
                                      char.isBusted 
                                        ? "bg-red-500 text-white" 
                                        : "bg-neutral-500 text-white"
                                    }`}>
                                      {char.isBusted ? "已揭穿" : "小"}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-sans font-bold text-xs text-neutral-950 block">{char.name}</span>
                                  <p className="text-[11px] text-neutral-400 truncate max-w-[180px] font-sans mt-0.5">
                                    {char.description || "无简介"}
                                  </p>
                                </div>
                              </div>
                              {!char.isPreset && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDialog({
                                      title: "删除角色",
                                      message: `确定要彻底删除角色 "${char.name}" 吗？这也会清空与其相关的聊天会话。`,
                                      onConfirm: () => {
                                        onDeleteCharacter(char.id);
                                        setConfirmDialog(null);
                                      }
                                    });
                                  }}
                                  className="p-2 text-neutral-300 hover:text-red-500 rounded-lg hover:bg-neutral-50 shrink-0 transition-all active:scale-95"
                                  title="删除角色"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}

                  {/* Empty State */}
                  {characters.filter(c => c.name.includes(searchQuery) || (c.description || "").includes(searchQuery)).length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-xs text-neutral-400 font-sans">没有找到符合条件的联系人</p>
                    </div>
                  )}
                </div>
                
                {/* Character Profile View */}
                {activeProfileId !== null && (
                  <div className="absolute inset-0 bg-white z-50">
                    <ProfileView
                      character={characters.find(c => c.id === activeProfileId)!}
                      allCharacters={characters}
                      onBack={() => setActiveProfileId(null)}
                      onUpdateCharacter={onUpdateCharacter}
                      onStartChat={(id) => {
                          setActiveProfileId(null);
                          handleSelectChar(id);
                      }}
                      onCreateSubAccount={(parentId) => {
                        setActiveProfileId(null);
                        setSubAccountParentId(parentId);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: 朋友圈 (Moments Feed) */}
            {mainTab === "moments" && (
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
                  <button 
                    onClick={onClose}
                    className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
                    title="返回主页"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-sans font-bold text-base tracking-wide text-neutral-950">朋友圈 (MOMENTS)</span>
                  <button
                    onClick={handleTriggerNewMoment}
                    className="flex items-center gap-1 text-[11px] font-sans font-bold bg-neutral-900 hover:bg-black text-white px-2.5 py-1.5 rounded-full shadow-sm active:scale-95 transition-all"
                    title="让角色自动生成一条动态"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>生成动态</span>
                  </button>
                </div>

                {/* Moments Feed list */}
                <div className="flex-1 overflow-y-auto bg-white">
                  {moments.length === 0 ? (
                    <div className="py-24 text-center space-y-3">
                      <p className="text-xs text-neutral-400 font-sans">朋友圈还是空的，让角色发一条吧！</p>
                      <button
                        onClick={handleTriggerNewMoment}
                        className="text-xs font-bold border border-black px-4 py-2 rounded-xl hover:bg-black hover:text-white transition-all active:scale-95"
                      >
                        立即生成第一条
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {moments.map((post) => (
                        <div key={post.id} className="p-4 flex gap-3 animate-fade-in">
                          {/* Left Column: Avatar */}
                          <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200/40 flex items-center justify-center overflow-hidden text-xl select-none shadow-inner shrink-0">
                            {post.characterChatAvatar ? (
                              <img src={post.characterChatAvatar} alt={post.characterName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              post.characterAvatar || "🤖"
                            )}
                          </div>

                          {/* Right Column: Moment Body */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Name & Time */}
                            <div className="flex items-baseline justify-between">
                              <span className="font-sans font-bold text-xs text-neutral-900">{post.characterName}</span>
                              <span className="text-[10px] font-mono text-neutral-400">{formatRelativeTime(post.timestamp)}</span>
                            </div>

                            {/* Post Content */}
                            <p className="text-xs text-neutral-700 leading-relaxed font-sans font-medium break-all whitespace-pre-wrap">
                              {post.content}
                            </p>

                            {/* Media Attachment (Scenery emojis inside card) */}
                            {post.mediaEmojis && (
                              <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-100 text-3xl select-none w-max shadow-sm transition-transform hover:scale-105 duration-300">
                                {post.mediaEmojis}
                              </div>
                            )}

                            {/* Likes & Like Button Row */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1.5 bg-neutral-50 px-2 py-0.5 rounded-full border border-neutral-100 select-none">
                                <span className="text-rose-500">❤️</span>
                                <span>{post.likes}</span>
                              </span>
                              <button
                                onClick={() => handleLikeMoment(post.id)}
                                className={`flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-sans font-bold transition-all active:scale-95 ${
                                  post.likedByUser
                                    ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
                                    : "bg-white border-neutral-200/80 text-neutral-600 hover:border-neutral-400"
                                }`}
                              >
                                <span>{post.likedByUser ? "❤️ 已赞" : "❤️ 点赞"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: 我的 (User Profile) */}
            {mainTab === "me" && (
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
                  <button 
                    onClick={onClose}
                    className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
                    title="返回主页"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-sans font-bold text-base tracking-wide text-neutral-950">我的 (PROFILE)</span>
                  <div className="w-7 h-7" /> {/* Spacer */}
                </div>

                {/* Profile Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Centered Avatar and Name Block */}
                  <div className="bg-white p-6 rounded-[28px] border border-neutral-200/50 shadow-sm flex flex-col items-center text-center space-y-4">
                    {/* User Avatar Circle 80px */}
                    <div className="relative group">
                      <div className="w-[80px] h-[80px] rounded-full border border-neutral-200 shadow-md bg-neutral-100 flex items-center justify-center overflow-hidden text-3xl select-none">
                        {userAvatar ? (
                          <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                        ) : (
                          "👤"
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-black hover:bg-neutral-800 text-white flex items-center justify-center shadow-md active:scale-90 transition-all text-xs"
                        title="更换头像"
                      >
                        📷
                      </button>
                    </div>

                    {/* Change Avatar Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-sans font-medium text-neutral-400 hover:text-neutral-600 transition-colors select-none"
                    >
                      更换头像
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Username with Double Click / Pen Edit */}
                    {isEditingName ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="text"
                          value={userNameInput}
                          onChange={(e) => setUserNameInput(e.target.value)}
                          maxLength={12}
                          className="text-center font-sans font-bold text-base border-b border-neutral-400 focus:outline-none focus:border-black bg-transparent w-36 px-1 py-0.5 text-neutral-950"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveName();
                          }}
                        />
                        <button
                          onClick={handleSaveName}
                          className="p-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg transition-colors active:scale-90"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-85 select-none"
                        onClick={() => {
                          setUserNameInput(userName);
                          setIsEditingName(true);
                        }}
                      >
                        <span className="font-sans font-bold text-base text-neutral-950">{userName}</span>
                        <Edit className="w-3.5 h-3.5 text-neutral-400" />
                      </div>
                    )}
                  </div>

                  {/* Stats Bento Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-neutral-200/40 shadow-sm text-center">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">对话心网</span>
                      <span className="font-mono text-lg font-bold text-neutral-900 mt-1 block">{sessions.length}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-neutral-200/40 shadow-sm text-center">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">心感共鸣</span>
                      <span className="font-mono text-lg font-bold text-neutral-900 mt-1 block">
                        {moments.filter((m) => m.likedByUser).length}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-neutral-200/40 shadow-sm text-center">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">星标印记</span>
                      <span className="font-mono text-lg font-bold text-neutral-900 mt-1 block">{characters.length}</span>
                    </div>
                  </div>

                  {/* Elegant Settings Rows */}
                  <div className="bg-white rounded-[24px] border border-neutral-200/50 shadow-sm overflow-hidden divide-y divide-neutral-100 select-none">
                    <div 
                      onClick={() => setShowWallet(true)}
                      className="p-4 flex items-center justify-between text-xs cursor-pointer hover:bg-neutral-50 transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Wallet className="w-4 h-4 text-neutral-800" />
                        <span className="font-sans font-bold text-neutral-900">钱包</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-neutral-900">¥{walletBalance.toFixed(2)}</span>
                        <ChevronLeft className="w-4 h-4 rotate-180 text-neutral-400" />
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between text-xs">
                      <span className="font-sans font-bold text-neutral-600">个人世界书词条 (Worldbook Lore)</span>
                      <span className="font-mono text-neutral-400">{loreList.length} 个</span>
                    </div>
                    <div className="p-4 flex items-center justify-between text-xs">
                      <span className="font-sans font-bold text-neutral-600">当前AI端点 (Gemini Proxy)</span>
                      <span className="font-mono text-neutral-400">已内置安全中转</span>
                    </div>
                    <div className="p-4 flex items-center justify-between text-xs">
                      <span className="font-sans font-bold text-neutral-600">终端黑白极简版本 (Build)</span>
                      <span className="font-mono text-neutral-400">v1.4.2 (Monochrome)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Fixed Bottom Tab Navigation Bar */}
          <div className="shrink-0 bg-white border-t border-neutral-100 px-6 py-2 flex items-center justify-between shadow-sm">
            {/* Tab 1 Indicator: Chat */}
            <button
              onClick={() => {
                setMainTab("chat");
                setIsCreatingChar(false);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-3 relative transition-all active:scale-95 ${
                mainTab === "chat" ? "text-black scale-105" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <MessageSquarePlus className={`w-5 h-5 ${mainTab === "chat" ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span className={`text-[10px] font-sans ${mainTab === "chat" ? "font-bold" : "font-medium"}`}>对话</span>
              {/* Show unread dot on tab icon if any character has unread state */}
              {Object.values(unreads).some(val => val) && (
                <span className="absolute top-1 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
              )}
            </button>

            {/* Tab 2 Indicator: Contacts */}
            <button
              onClick={() => {
                setMainTab("contacts");
                setIsCreatingChar(false);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-all active:scale-95 ${
                mainTab === "contacts" ? "text-black scale-105" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <Users className={`w-5 h-5 ${mainTab === "contacts" ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span className={`text-[10px] font-sans ${mainTab === "contacts" ? "font-bold" : "font-medium"}`}>联系人</span>
            </button>

            {/* Tab 3 Indicator: Moments */}
            <button
              onClick={() => {
                setMainTab("moments");
                setIsCreatingChar(false);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-all active:scale-95 ${
                mainTab === "moments" ? "text-black scale-105" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <Compass className={`w-5 h-5 ${mainTab === "moments" ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span className={`text-[10px] font-sans ${mainTab === "moments" ? "font-bold" : "font-medium"}`}>朋友圈</span>
            </button>

            {/* Tab 4 Indicator: Me */}
            <button
              onClick={() => {
                setMainTab("me");
                setIsCreatingChar(false);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-all active:scale-95 ${
                mainTab === "me" ? "text-black scale-105" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <User className={`w-5 h-5 ${mainTab === "me" ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span className={`text-[10px] font-sans ${mainTab === "me" ? "font-bold" : "font-medium"}`}>我的</span>
            </button>
          </div>

        </div>
      )}

      {/* -------------------- VIEW 2: ACTIVE CHAT ROOM -------------------- */}
      {activeTab === "chat" && activeChar && activeSession && (
        <div className="flex-1 flex flex-col h-full bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-100 shrink-0 bg-white z-20">
            <button
              onClick={() => {
                setActiveCharId(null);
                setActiveTab("library");
              }}
              className="p-1 text-neutral-500 hover:text-neutral-900 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Active Character Profile Header */}
            <div 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-1.5 min-w-0 text-center flex-col cursor-pointer hover:opacity-85 active:scale-[0.98] transition-all"
              title="点击窥听角色此刻的内心心声"
            >
              {(() => {
                const osParsed = parseOS(activeSession?.currentOS);
                return (
                  <>
                    <div className="flex items-center gap-1.5 justify-center">
                      {activeChar.chatAvatar ? (
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-neutral-200/50 shrink-0">
                          <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <span className="text-lg">{activeChar.avatar}</span>
                      )}
                      <span className="font-sans font-bold text-sm text-neutral-950 truncate max-w-[200px]">
                        {activeChar.isSubAccount && activeChar.isBusted 
                          ? `已揭穿 · ${activeChar.parentCharacterName} 的小号` 
                          : activeChar.name}
                      </span>
                      {/* Character mood display */}
                      <span className="text-[12px] text-[#888] font-sans inline-flex items-center gap-1 shrink-0 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200/20 shadow-sm">
                        <span>{osParsed.emoji}</span>
                        <span>{osParsed.emotion}</span>
                      </span>
                    </div>
                    <span className="text-[9px] text-amber-600 font-sans tracking-wide truncate max-w-[150px] italic">
                      {osParsed.text}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Settings Hamburger Menu */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 text-neutral-500 hover:text-black rounded-lg hover:bg-neutral-50 active:scale-95 transition-all"
              title="聊天设置"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-account Busted Banner */}
          {activeChar.isSubAccount && activeChar.isBusted && (
            <div className="bg-amber-50/90 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between text-xs text-amber-950 shrink-0 select-none animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate font-medium">已揭穿此小号真实身份（大号: <b className="font-bold text-amber-900">{activeChar.parentCharacterName || "未知"}</b>）</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const parentId = activeChar.parentCharacterId;
                    if (parentId) {
                      handleSelectChar(parentId);
                    }
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg font-bold transition-all text-[10px]"
                >
                  切换回大号
                </button>
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 bg-neutral-50/50">
            {activeSession.messages.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-white border border-neutral-200/60 shadow-sm flex items-center justify-center mx-auto overflow-hidden text-3xl shrink-0">
                  {activeChar.chatAvatar ? (
                    <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    activeChar.avatar
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-sans font-bold text-neutral-800">
                    与 {activeChar.name} 的对话
                  </p>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto px-6 leading-relaxed">
                    发送一条消息，开始沉浸式的对话吧。如果触发了“世界书”里的设定词，AI 会自动加载特定背景设定哦！
                  </p>
                </div>
              </div>
            ) : (
              activeSession.messages.map((msg, idx) => {
                const isBot = msg.role === "assistant";
                
                // Render Recalled message differently
                if (msg.isRecalled) {
                  return (
                    <div key={msg.id} className="w-full flex justify-center my-1.5 animate-fade-in select-none">
                      <span className="text-[10px] text-neutral-400 font-sans bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200/30">
                        你撤回了一条消息
                      </span>
                    </div>
                  );
                }

                // Consecutive message grouping rule (< 3 seconds / 3000ms)
                let prevMsg: Message | null = null;
                for (let i = idx - 1; i >= 0; i--) {
                  if (!activeSession.messages[i].isRecalled) {
                    prevMsg = activeSession.messages[i];
                    break;
                  }
                }

                const isSameSender = prevMsg && prevMsg.role === msg.role;
                const timeDiff = prevMsg ? msg.timestamp - prevMsg.timestamp : Infinity;
                const showAvatar = !isSameSender || timeDiff >= 3000;

                const botAvatarNode = isBot ? (
                  <div className="w-[36px] h-[36px] rounded-full bg-[#E5E0D8] text-neutral-800 flex items-center justify-center text-sm overflow-hidden shrink-0 shadow-sm">
                    {activeChar?.chatAvatar ? (
                      <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      activeChar?.avatar || activeChar?.name?.charAt(0) || "🤖"
                    )}
                  </div>
                ) : null;

                const userAvatarNode = !isBot ? (
                  <div className="w-[36px] h-[36px] rounded-full bg-[#2C2C2E] text-white flex items-center justify-center text-sm overflow-hidden shrink-0 shadow-sm">
                    {userAvatar ? (
                      <img src={userAvatar} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      "👤"
                    )}
                  </div>
                ) : null;

                interface MessageSegment {
                  type: "action" | "speech";
                  text: string;
                }

                const parseMessageSegments = (content: string): MessageSegment[] => {
                  if (!content) return [];
                  if (msg.role === "user") {
                    return [{ type: "speech", text: content }];
                  }

                  const isSpecial =
                    content.startsWith("[CHARACTER_TRANSFER]") ||
                    content.startsWith("[TRANSFER]") ||
                    content.startsWith("[LOCATION]") ||
                    content.startsWith("[REDPACKET]") ||
                    content.startsWith("[OFFLINE_INVITATION]") ||
                    content.startsWith("[图片：") ||
                    content.startsWith("[图片:");

                  if (isSpecial) {
                    return [{ type: "speech", text: content }];
                  }

                  // Action delimiters regex: *...*, （...）, (...), [...], [...] (excluding special commands)
                  const actionRegex = /(\*[^*]+\*|（[^）]+）|\([^)]+\)|【[^】]+】|\[(?!(?:CHARACTER_TRANSFER|TRANSFER|LOCATION|REDPACKET|OFFLINE_INVITATION|图片[：:]))[^\]]+\])/g;

                  // In ONLINE chat mode, action descriptions are forbidden. Strip action brackets and render as pure speech bubble.
                  if (chatMode === "online") {
                    const cleanText = content.replace(actionRegex, (match) => {
                      if (match.startsWith("(") && match.endsWith(")")) {
                        const inner = match.slice(1, -1);
                        if (isKaomojiOrNotAction(inner)) return match;
                      }
                      return "";
                    }).trim();
                    return [{ type: "speech", text: cleanText || content }];
                  }

                  // In OFFLINE meet mode, parse narration/action blocks separately from speech
                  const rawParts = content.split(actionRegex);
                  const initialSegments: MessageSegment[] = [];

                  rawParts.forEach((p) => {
                    if (!p) return;
                    const trimmedP = p.trim();
                    if (!trimmedP) return;

                    let isAction =
                      (trimmedP.startsWith("*") && trimmedP.endsWith("*")) ||
                      (trimmedP.startsWith("（") && trimmedP.endsWith("）")) ||
                      (trimmedP.startsWith("(") && trimmedP.endsWith(")")) ||
                      (trimmedP.startsWith("【") && trimmedP.endsWith("】")) ||
                      (trimmedP.startsWith("[") && trimmedP.endsWith("]"));

                    if (isAction && trimmedP.startsWith("(") && trimmedP.endsWith(")")) {
                      const inner = trimmedP.slice(1, -1);
                      if (isKaomojiOrNotAction(inner)) {
                        isAction = false;
                      }
                    }

                    if (isAction) {
                      const raw = trimmedP.slice(1, -1).trim();
                      if (raw) {
                        initialSegments.push({ type: "action", text: raw });
                      }
                    } else {
                      let raw = trimmedP;
                      // Strip outer quotes if wrapping speech
                      if ((raw.startsWith("“") && raw.endsWith("”")) || (raw.startsWith('"') && raw.endsWith('"'))) {
                        raw = raw.slice(1, -1).trim();
                      }
                      // Clean residual action brackets if any
                      raw = raw.replace(/^[*（(【\[]+|[*）)】\]]+$/g, "").trim();

                      if (raw) {
                        initialSegments.push({ type: "speech", text: raw });
                      }
                    }
                  });

                  // Merge adjacent action segments
                  const segments: MessageSegment[] = [];
                  initialSegments.forEach((seg) => {
                    if (seg.type === "action" && segments.length > 0 && segments[segments.length - 1].type === "action") {
                      segments[segments.length - 1].text += "，" + seg.text;
                    } else {
                      segments.push({ ...seg });
                    }
                  });

                  return segments;
                };

                const segments = parseMessageSegments(msg.content);

                return (
                  <div key={msg.id} className="flex flex-col w-full gap-2 my-1">
                    {segments.map((seg, segIdx) => {
                      if (seg.type === "action") {
                        return (
                          <div key={segIdx} className="w-full flex flex-col py-1.5 my-1 animate-fade-in select-none">
                            <div className="w-full h-[1px] bg-[#EFECE8]" />
                            <div className="py-[8px] italic text-[#A8A39A] text-[13px] text-center w-full break-words font-sans leading-relaxed">
                              {seg.text}
                            </div>
                            <div className="w-full h-[1px] bg-[#EFECE8]" />
                          </div>
                        );
                      }

                      return (
                        <div key={segIdx} className={`flex items-start gap-[10px] ${isBot ? "justify-start" : "justify-end"} animate-fade-in w-full`}>
                          {/* Avatar on Left for Bot */}
                          {isBot && botAvatarNode}

                          {/* Message Container */}
                          <div className={`flex flex-col gap-1 max-w-[82%] ${isBot ? "items-start" : "items-end"}`}>
                            {/* Message Bubble with longpress, mouse, doubleclick and context menu listeners */}
                            <div
                              onMouseDown={() => handleMouseDown(msg)}
                              onMouseUp={handleMouseUp}
                              onTouchStart={() => handleTouchStart(msg)}
                              onTouchEnd={handleTouchEnd}
                              onContextMenu={(e) => handleContextMenu(e, msg)}
                              onDoubleClick={() => handleDoubleClick(msg)}
                              className={`px-4 py-3 rounded-2xl text-xs leading-relaxed font-sans shadow-sm select-text cursor-pointer active:scale-[0.99] transition-all relative ${
                                isBot
                                  ? "bg-white text-neutral-900 border border-neutral-200 rounded-tl-none hover:border-neutral-300"
                                  : "bg-black text-white rounded-tr-none hover:bg-neutral-900"
                              }`}
                              title="长按、右键或双击此消息可唤出操作菜单"
                            >
                              {/* Quoted item block (inside bubble) */}
                              {msg.quotedMsg && segIdx === 0 && (
                                <div className="mb-1.5 p-2 bg-neutral-100/80 border-l-2 border-neutral-400 rounded text-[10px] text-neutral-600 font-sans truncate max-w-full">
                                  <span className="font-bold block text-[9px] uppercase tracking-wider text-neutral-400 mb-0.5">
                                    引用:
                                  </span>
                                  {msg.quotedMsg.content}
                                </div>
                              )}

                              {renderMessageContent(seg.text, msg)}
                            </div>

                            {/* Meta info / matched lore tags */}
                            <div className="flex items-center gap-1.5 px-1">
                              {isBot && activeChar?.isBlocked && activeChar.blockedAt && msg.timestamp >= activeChar.blockedAt && <span className="text-[10px] text-black font-bold">!</span>}
                              <span className="text-[8px] font-mono text-neutral-400">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Avatar on Right for User */}
                          {!isBot && userAvatarNode}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}

            {/* Blinking Typing indicator */}
            {isGenerating && (
              <div className="flex items-start gap-[10px] justify-start animate-fade-in">
                <div className="w-[36px] h-[36px] rounded-full bg-[#E5E0D8] text-neutral-800 flex items-center justify-center text-xs overflow-hidden shrink-0 shadow-sm">
                  {activeChar?.chatAvatar ? (
                    <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    activeChar?.avatar || activeChar?.name?.charAt(0) || "🤖"
                  )}
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <div className="bg-white border border-neutral-200 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1 shrink-0">
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error banner */}
            {apiError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-700 font-mono break-words leading-normal flex items-start gap-1.5">
                <span className="font-bold shrink-0">API ERROR:</span>
                <span className="flex-1">{apiError}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quoted Message thumbnail preview above input area */}
          {quotedMsgState && (
            <div className="mx-3 mb-2 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl flex justify-between items-center text-[11px] text-neutral-500 font-sans animate-fade-in shrink-0">
              <div className="flex-1 truncate pr-3">
                <span className="font-bold text-[9px] uppercase tracking-wider text-neutral-400 block">引用消息 (QUOTING)</span>
                <span className="truncate block italic">
                  {quotedMsgState.role === "user" ? "你" : activeChar.name}: {quotedMsgState.content}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuotedMsgState(null)}
                className="p-1 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-full shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Message input bar or Blocked display */}
          <div className="shrink-0 bg-white z-20 border-t border-neutral-100">
            {isBlocked ? (
              <div className="p-4 bg-neutral-50 flex flex-col items-center justify-center space-y-2 shrink-0 select-none animate-fade-in">
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    placeholder="你已拉黑该角色"
                    disabled
                    className="flex-1 text-xs border border-neutral-200 px-3.5 py-2.5 rounded-xl bg-neutral-100 text-neutral-400 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleTriggerAiReply()}
                    disabled={isGenerating}
                    className="w-10 h-10 bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-300 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
                    title="生成AI回复"
                  >
                    <Sparkles className="w-4 h-4 stroke-[1.75] text-amber-300 fill-amber-300 animate-pulse" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBlocked(false);
                    saveSettings({ isBlocked: false });
                    if (activeCharacter) {
                      onUpdateCharacter({ ...activeCharacter, isBlocked: false, blockedAt: undefined });
                    }
                  }}
                  className="text-[10px] font-sans font-bold text-neutral-400 underline"
                >
                  解除拉黑
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Action Panel (Slide up from bottom ~40%) */}
                {showActionPanel && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-t-[20px] shadow-2xl border border-neutral-100 z-30 p-5 animate-slide-up flex flex-col max-h-[45vh]">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
                      <span className="font-sans font-bold text-sm text-neutral-900">功能</span>
                      <button
                        type="button"
                        onClick={() => setShowActionPanel(false)}
                        className="p-1 text-neutral-400 hover:text-neutral-900 rounded-lg active:scale-95 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4 overflow-y-auto py-2">
                      {/* 1. 语音 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveCall("voice");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <Phone className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-sans text-neutral-600">语音</span>
                      </button>

                      {/* 2. 视频 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveCall("video");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <Video className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-sans text-neutral-600">视频</span>
                      </button>

                      {/* 3. 线下见面 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setShowOfflineMeet(true);
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-purple-100 group-hover:bg-purple-900 group-hover:text-white text-purple-800 flex items-center justify-center transition-all shadow-sm">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-sans font-medium text-neutral-700">线下见面</span>
                      </button>

                      {/* 4. 转账 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveModal("transfer");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-sans text-neutral-600">转账</span>
                      </button>

                      {/* 4. 位置 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveModal("location");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-sans text-neutral-600">位置</span>
                      </button>

                      {/* 5. 红包 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveModal("redpacket");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <Gift className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-sans text-neutral-600">红包</span>
                      </button>

                      {/* 6. 游戏 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveModal("games");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <Gamepad2 className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-sans text-neutral-600">游戏</span>
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="p-3 bg-white">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowActionPanel(!showActionPanel)}
                      className="w-9 h-9 bg-neutral-800 hover:bg-black text-white rounded-full flex items-center justify-center active:scale-95 transition-all shrink-0 font-bold text-lg shadow-sm"
                      title="功能面板"
                    >
                      +
                    </button>
                    <input
                      type="text"
                      placeholder={isGenerating ? "生成中..." : "输入消息... (支持 *动作描写*)"}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isGenerating}
                      className="flex-1 text-xs border border-neutral-200 hover:border-neutral-300 focus:border-neutral-950 px-3.5 py-2.5 rounded-xl bg-neutral-50 focus:bg-white outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || isGenerating}
                      className="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-300 text-neutral-800 rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
                      title="发送用户消息 (仅发送，不生成AI回复)"
                    >
                      <Send className="w-4 h-4 stroke-[1.75]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerAiReply()}
                      disabled={isGenerating}
                      className="w-10 h-10 bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-300 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
                      title="生成AI回复 (点击生成一轮回复)"
                    >
                      <Sparkles className="w-4 h-4 stroke-[1.75] text-amber-300 fill-amber-300 animate-pulse" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice / Video Call Overlay */}
      {activeCall && activeChar && (
        <div className="fixed inset-0 bg-neutral-950 text-white z-50 flex flex-col items-center justify-between p-8 animate-fade-in select-none">
          <div className="flex flex-col items-center pt-16 space-y-4">
            <div className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-4xl overflow-hidden shadow-2xl animate-pulse">
              {activeChar.chatAvatar ? (
                <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                activeChar.avatar || "🤖"
              )}
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-sans font-bold text-lg text-white">{activeChar.name}</h3>
              <p className="text-xs text-neutral-400 font-mono">
                {activeCall === "voice" ? "正在呼叫..." : "正在连接视频..."}
              </p>
            </div>
          </div>
          <div className="pb-12">
            <button
              onClick={() => setActiveCall(null)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full py-3 px-12 text-sm font-bold shadow-2xl active:scale-95 transition-all flex items-center gap-2"
            >
              <span>挂断</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals for Transfer, Location, Red Packet, Games */}
      {activeModal === "transfer" && activeChar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 space-y-4 shadow-2xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <span className="font-sans font-bold text-sm text-neutral-900">向 {activeChar.name} 转账</span>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">转账金额 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full text-base font-mono border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">转账备注 (选填)</label>
                <input
                  type="text"
                  placeholder="给你的零花钱"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full text-xs border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  确认转账
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "location" && activeChar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 space-y-4 shadow-2xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <span className="font-sans font-bold text-sm text-neutral-900">发送位置</span>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">地点名称</label>
                <input
                  type="text"
                  placeholder="例如：重庆市南岸区南滨路"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full text-xs border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "redpacket" && activeChar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 space-y-4 shadow-2xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <span className="font-sans font-bold text-sm text-neutral-900">发红包给 {activeChar.name}</span>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">红包金额 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={redpacketAmount}
                  onChange={(e) => setRedpacketAmount(e.target.value)}
                  className="w-full text-base font-mono border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">祝福语</label>
                <input
                  type="text"
                  placeholder="恭喜发财，大吉大利"
                  value={redpacketBlessing}
                  onChange={(e) => setRedpacketBlessing(e.target.value)}
                  className="w-full text-xs border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRedPacket}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  塞钱进红包
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "games" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <span className="font-sans font-bold text-sm text-neutral-900">游戏快捷入口</span>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5 py-1">
              <div
                onClick={() => {
                  setActiveModal(null);
                  onOpenApp?.("turtlesoup");
                }}
                className="p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🐢</span>
                  <div>
                    <span className="font-sans font-bold text-xs text-neutral-900 block">海龟汤 (情境推理)</span>
                    <p className="text-[10px] text-neutral-500 font-sans">海龟汤推理、主持人互动与脑洞大开</p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 rotate-180 text-neutral-400" />
              </div>

              <div
                onClick={() => {
                  setActiveModal(null);
                  onOpenApp?.("game");
                }}
                className="p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🃏</span>
                  <div>
                    <span className="font-sans font-bold text-xs text-neutral-900 block">UNO 纸牌对战</span>
                    <p className="text-[10px] text-neutral-500 font-sans">经典卡牌对战与策略博弈</p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 rotate-180 text-neutral-400" />
              </div>

              <div
                onClick={() => {
                  setActiveModal(null);
                  onOpenApp?.("universe");
                }}
                className="p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌌</span>
                  <div>
                    <span className="font-sans font-bold text-xs text-neutral-900 block">星际宇宙模拟</span>
                    <p className="text-[10px] text-neutral-500 font-sans">探索未知星系与奇观</p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 rotate-180 text-neutral-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY 1: FULLSCREEN RIGHT-TO-LEFT SETTINGS DRAWER -------------------- */}
      {showSettings && activeChar && (
        <div className="fixed inset-0 bg-white z-40 flex flex-col animate-slide-left select-none">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
            <button 
              onClick={() => setShowSettings(false)}
              className="p-1 text-neutral-500 hover:text-neutral-900 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-mono font-bold text-sm tracking-widest text-neutral-950 uppercase">聊天设置 (SETTINGS)</span>
            <div className="w-7 h-7" /> {/* spacer */}
          </div>

          {/* Content Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50">
            
            {/* 2. Reply Count (回复条数) */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 flex justify-between items-center bg-white">
              <div className="space-y-0.5">
                <span className="text-base font-bold text-neutral-900 block font-sans">回复条数范围</span>
                <span className="text-[10px] text-neutral-400 font-mono block">REPLY COUNT RANGE</span>
              </div>
              <div className="flex items-center gap-2 font-sans">
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={minReplies}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setMinReplies(val);
                    saveSettings({ minReplies: val });
                  }}
                  className="w-12 text-center text-xs border border-neutral-200 px-2 py-1.5 rounded-lg bg-neutral-50 focus:bg-white outline-none"
                />
                <span className="text-xs text-neutral-400">至</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={maxReplies}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setMaxReplies(val);
                    saveSettings({ maxReplies: val });
                  }}
                  className="w-12 text-center text-xs border border-neutral-200 px-2 py-1.5 rounded-lg bg-neutral-50 focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* 3. Allow Character Active Messaging */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 space-y-4 bg-white">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-base font-bold text-neutral-900 block font-sans">允许角色主动发消息</span>
                  <span className="text-[10px] text-neutral-400 font-mono block">ACTIVE MESSAGING</span>
                </div>
                {/* Slide Switch Capsule */}
                <button
                  type="button"
                  onClick={() => {
                    const updated = !activeMessaging;
                    setActiveMessaging(updated);
                    saveSettings({ activeMessaging: updated });
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${
                    activeMessaging ? "bg-black" : "bg-neutral-300"
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ease-in-out ${
                    activeMessaging ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {activeMessaging && (
                <div className="pt-3 border-t border-neutral-100 space-y-3 animate-fade-in font-sans">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-medium">离线触发延迟：</span>
                    <select
                      value={activeMessagingDelay}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setActiveMessagingDelay(val);
                        saveSettings({ activeMessagingDelay: val });
                      }}
                      className="border border-neutral-200 bg-neutral-50 hover:border-neutral-300 rounded-lg px-2 py-1.5 outline-none text-xs font-semibold text-neutral-800 transition-colors cursor-pointer"
                    >
                      <option value="0.003">10 秒 (系统测试用)</option>
                      <option value="1">1 小时 (1 Hour)</option>
                      <option value="3">3 小时 (3 Hours)</option>
                      <option value="8">8 小时 (8 Hours)</option>
                      <option value="12">12 小时 (12 Hours)</option>
                      <option value="24">24 小时 (24 Hours)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    * 开启后，当你离开该 App 达到设定时长时，角色会根据其人设、当时的心情主动给你发来关怀想念、吐槽生活或分享日常趣事等破冰消息。
                  </p>
                  
                  {/* Test Simulation Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activeSession || !activeCharId) return;
                      // Close settings drawer to let user see the chat area
                      setShowSettings(false);
                      // Direct active message trigger
                      await handleTriggerActiveMessage(activeMessagingDelay);
                    }}
                    className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-neutral-200/50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                    <span>立即模拟离开并触发主动消息</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Block Character */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 flex justify-between items-center bg-white">
              <div className="space-y-0.5">
                <span className="text-base font-bold text-neutral-900 block font-sans">拉黑该角色</span>
                <span className="text-[10px] text-neutral-400 font-mono block">BLOCK CHARACTER</span>
              </div>
              <button
                onClick={() => {
                  if (activeCharacter) {
                    onUpdateCharacter({ ...activeCharacter, isBlocked: !activeCharacter.isBlocked });
                    setIsBlocked(!isBlocked);
                    saveSettings({ isBlocked: !isBlocked });
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200/80 hover:bg-neutral-50 transition-colors text-neutral-600"
              >
                {isBlocked ? "解除拉黑" : "拉黑该角色"}
              </button>
            </div>

            {/* 5. Reset Conversation */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 flex justify-between items-center bg-white">
              <div className="space-y-0.5">
                <span className="text-base font-bold text-neutral-900 block font-sans">重置对话</span>
                <span className="text-[10px] text-neutral-400 font-mono block">RESET CONVERSATION</span>
              </div>
              <button
                onClick={handleResetConversation}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200/40 text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                重置对话
              </button>
            </div>

            {/* 6. Memory Center */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 space-y-3 bg-white">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-base font-bold text-neutral-900 block font-sans">记忆中枢</span>
                  <span className="text-[10px] text-neutral-400 font-mono block">CHARACTER MEMORIES</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto py-1">
                {memories.length === 0 ? (
                  <span className="text-xs text-neutral-400 font-sans">目前没有任何记忆点。</span>
                ) : (
                  memories.map((mem, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-[11px] text-neutral-700 rounded-[20px] font-sans border border-neutral-200/40">
                      <span>{mem}</span>
                      <button
                        onClick={() => {
                          const updated = memories.filter((_, i) => i !== idx);
                          setMemories(updated);
                          saveSettings({ memories: updated });
                        }}
                        className="text-neutral-400 hover:text-neutral-900 shrink-0 text-xs font-bold font-mono ml-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>
              
              <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
                <input
                  type="text"
                  placeholder="输入新记忆点... (如: 用户喜欢草莓)"
                  value={newMemoryInput}
                  onChange={(e) => setNewMemoryInput(e.target.value)}
                  className="flex-1 text-[11px] border border-neutral-200 px-3 py-2 rounded-xl bg-neutral-50 focus:bg-white focus:border-neutral-950 outline-none"
                />
                <button
                  onClick={() => {
                    if (newMemoryInput.trim()) {
                      const updated = [...memories, newMemoryInput.trim()];
                      setMemories(updated);
                      saveSettings({ memories: updated });
                      setNewMemoryInput("");
                    }
                  }}
                  className="px-3 py-2 text-[11px] font-bold bg-black text-white rounded-xl hover:bg-neutral-800 shrink-0"
                >
                  记下
                </button>
              </div>
            </div>

            {/* 7. Export Conversation */}
            <div className="flex justify-center pt-8 pb-4">
              <button
                onClick={handleExportChat}
                className="text-xs text-neutral-400 hover:text-neutral-600 underline font-sans"
              >
                导出聊天记录 (.txt)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- OVERLAY 2: FROSTED GLASS BOTTOM DRAWER FOR MESSAGE OPTIONS -------------------- */}
      {showBottomSheet && activeMessage && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-all flex items-end justify-center select-none"
          onClick={() => setShowBottomSheet(false)}
        >
          <div 
            className="w-full max-w-md bg-white/85 backdrop-blur-xl border-t border-neutral-200/50 rounded-t-3xl p-6 pb-8 space-y-6 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pull Handle bar */}
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto animate-pulse" />
            
            {/* Title */}
            <div className="text-center space-y-1 px-4">
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest font-bold">消息操作 (MESSAGE OPTIONS)</p>
              <p className="text-xs text-neutral-500 font-sans truncate">"{activeMessage.content}"</p>
            </div>

            {/* Grid container with responsive column count based on role */}
            <div className={`grid gap-4 pt-2 ${activeMessage.role === "assistant" ? "grid-cols-4" : "grid-cols-3"}`}>
              
              {/* Action 1: Delete */}
              <button
                onClick={() => {
                  if (activeSession) {
                    const updated = activeSession.messages.filter((m) => m.id !== activeMessage.id);
                    onUpdateSessionMessages(activeCharId!, updated);
                    setShowBottomSheet(false);
                  }
                }}
                className="flex flex-col items-center gap-1.5 group focus:outline-none"
              >
                <div className="w-12 h-12 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                  <Trash2 className="w-5 h-5 stroke-[1.5]" />
                </div>
                <span className="text-[11px] font-sans font-medium text-neutral-500 group-hover:text-neutral-900">删除</span>
              </button>

              {/* Action 2: Recall */}
              <button
                onClick={() => {
                  if (activeSession) {
                    const updated = activeSession.messages.map((m) => {
                      if (m.id === activeMessage.id) {
                        return { ...m, isRecalled: true };
                      }
                      return m;
                    });
                    onUpdateSessionMessages(activeCharId!, updated);
                    setShowBottomSheet(false);
                  }
                }}
                className="flex flex-col items-center gap-1.5 group focus:outline-none"
              >
                <div className="w-12 h-12 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                  <CornerUpLeft className="w-5 h-5 stroke-[1.5]" />
                </div>
                <span className="text-[11px] font-sans font-medium text-neutral-500 group-hover:text-neutral-900">撤回</span>
              </button>

              {/* Action 3: Quote */}
              <button
                onClick={() => {
                  setQuotedMsgState(activeMessage);
                  setShowBottomSheet(false);
                }}
                className="flex flex-col items-center gap-1.5 group focus:outline-none"
              >
                <div className="w-12 h-12 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                  <Quote className="w-5 h-5 stroke-[1.5]" />
                </div>
                <span className="text-[11px] font-sans font-medium text-neutral-500 group-hover:text-neutral-900">引用</span>
              </button>

              {/* Action 4: Edit (only for user messages!) */}
              {activeMessage.role === "user" && (
                <button
                  onClick={() => {
                    setInputText(activeMessage.content);
                    setEditingMessageId(activeMessage.id);
                    setShowBottomSheet(false);
                  }}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <div className="w-12 h-12 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                    <Edit className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <span className="text-[11px] font-sans font-medium text-neutral-500 group-hover:text-neutral-900">编辑</span>
                </button>
              )}

              {/* Action 5: Reroll (only for assistant messages!) */}
              {activeMessage.role === "assistant" && (
                <button
                  onClick={handleReroll}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none animate-fade-in"
                >
                  <div className="w-12 h-12 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                    <Dices className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <span className="text-[11px] font-sans font-medium text-neutral-500 group-hover:text-neutral-900">重roll</span>
                </button>
              )}

            </div>
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY 2: FULLSCREEN CHARACTER DETAIL PROFILE MODAL -------------------- */}
      {showProfileModal && activeChar && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white w-full max-w-[340px] rounded-[32px] overflow-hidden shadow-2xl border border-neutral-200/50 flex flex-col max-h-[85vh] animate-scale-up">
            
            {/* Real Appearance Standee Banner */}
            <div className="relative h-64 bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center">
              {activeChar.realImage ? (
                <img 
                  src={activeChar.realImage} 
                  alt={activeChar.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-neutral-50 to-neutral-200/50">
                  <div className="w-16 h-16 rounded-3xl bg-white shadow-md flex items-center justify-center text-4xl mb-3">
                    {activeChar.avatar}
                  </div>
                  <span className="text-[11px] font-sans font-bold text-neutral-400 tracking-wider uppercase">暂无真实面貌立绘</span>
                  <span className="text-[9px] font-sans text-neutral-400 mt-0.5">可在建立角色时手动上传或由文档生成</span>
                </div>
              )}
              {/* Close Button */}
              <button 
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-xs transition-all active:scale-90"
              >
                ✕
              </button>
            </div>

            {/* Profile Information Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Header with name and age */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center overflow-hidden text-2xl shadow-inner shrink-0">
                  {activeChar.chatAvatar ? (
                    <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    activeChar.avatar
                  )}
                </div>
                <div>
                  <h2 className="font-sans font-bold text-base text-neutral-950 flex items-center gap-1.5 leading-tight">
                    {activeChar.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {/* Age tag */}
                    <span className="text-[9px] font-sans font-bold px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded">
                      年龄: {getAgeFromInstruction(activeChar.systemInstruction)}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400">ID: {activeChar.id.substring(12, 17) || "preset"}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">一句话简介 (Bio)</span>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans font-medium">
                  {activeChar.description || "一个极具故事感的人工智能。"}
                </p>
              </div>

              {/* Character OS/Inner Voice */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider block flex items-center gap-1">
                  💭 角色当前内心心声 (Inner Thoughts)
                </span>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 text-neutral-800 font-sans text-xs whitespace-pre-wrap leading-relaxed italic shadow-inner">
                  {parseOS(activeSession?.currentOS).text}
                </div>
              </div>

              {/* Custom styled dialog buttons */}
              {!activeChar.isSubAccount && (
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setSubAccountParentId(activeChar.id);
                  }}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-sans font-bold text-xs py-3 rounded-xl tracking-wider active:scale-[0.98] transition-all text-center block mb-2"
                >
                  👤 创建小号 (Create Sub-Account)
                </button>
              )}

              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full bg-black hover:bg-neutral-900 text-white font-sans font-bold text-xs py-3 rounded-xl tracking-wider active:scale-[0.98] transition-all text-center block mt-2 shadow-md"
              >
                返回对话 (BACK TO CHAT)
              </button>

            </div>
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY 3: CUSTOM IN-APP MONOCHROME CONFIRM DIALOG -------------------- */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in select-none">
          <div className="bg-white w-full max-w-[290px] rounded-3xl p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-neutral-100 flex flex-col space-y-4 animate-scale-up">
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 font-sans tracking-wide">
                {confirmDialog.title}
              </h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">
                {confirmDialog.message}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setConfirmDialog(null)}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-sans font-medium text-xs py-2.5 rounded-xl transition-all active:scale-95"
              >
                取消
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="w-full bg-black hover:bg-neutral-900 text-white font-sans font-bold text-xs py-2.5 rounded-xl transition-all active:scale-95"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Detail View */}
      {showWallet && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col animate-fade-in select-none">
          {/* Header */}
          <div className="h-14 border-b border-neutral-100 flex items-center justify-between px-4 shrink-0 bg-white">
            <button
              onClick={() => setShowWallet(false)}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-sans font-bold text-sm text-neutral-950">钱包</span>
            <div className="w-8" />
          </div>

          {/* Balance Section */}
          <div className="py-8 px-6 bg-white border-b border-neutral-100 flex flex-col items-center justify-center shrink-0 space-y-4">
            <div className="flex flex-col items-center justify-center">
              <span className="font-mono font-bold text-[32px] text-neutral-950 tracking-tight">¥{walletBalance.toFixed(2)}</span>
              <span className="text-xs text-neutral-400 font-sans mt-2">可用余额</span>
            </div>
            <button
              onClick={() => setShowTopUpModal(true)}
              className="w-full py-2.5 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900 font-sans font-medium rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span>💳</span> 充值
            </button>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-neutral-50">
            {walletTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
                <span className="text-3xl">📭</span>
                <span className="text-xs font-sans">暂无交易记录</span>
              </div>
            ) : (
              ["今天", "昨天", "更早"].map((groupName) => {
                const groupTxs = walletTransactions.filter((tx) => {
                  const date = new Date(tx.timestamp);
                  const now = new Date();
                  const isToday = date.toDateString() === now.toDateString();
                  const yesterday = new Date(now);
                  yesterday.setDate(now.getDate() - 1);
                  const isYesterday = date.toDateString() === yesterday.toDateString();

                  if (groupName === "今天") return isToday;
                  if (groupName === "昨天") return isYesterday;
                  return !isToday && !isYesterday;
                });

                if (groupTxs.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-2">
                    <span className="text-[11px] font-mono font-bold text-neutral-400 block px-1">{groupName}</span>
                    <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm overflow-hidden divide-y divide-neutral-100">
                      {groupTxs.map((tx) => {
                        const date = new Date(tx.timestamp);
                        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isIncome = tx.type === "income";
                        return (
                          <div key={tx.id} className="p-4 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-neutral-800 text-sm">
                                {isIncome ? "收" : "付"}
                              </div>
                              <div>
                                <span className="font-sans font-bold text-neutral-900 block">{isIncome ? (tx.name === "充值" ? "充值" : `来自 ${tx.name}`) : `向 ${tx.name} 转账`}</span>
                                <span className="text-[10px] text-neutral-400 font-sans">{tx.note || (isIncome ? "收入" : "转账支出")} · {timeStr}</span>
                              </div>
                            </div>
                            <span className={`font-mono font-bold text-sm ${isIncome ? "text-emerald-600" : "text-neutral-900"}`}>
                              {isIncome ? `+¥${tx.amount.toFixed(2)}` : `-¥${tx.amount.toFixed(2)}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Top-Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[16px] w-full max-w-xs p-5 space-y-4 shadow-xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <span className="font-sans font-bold text-sm text-neutral-900">充值</span>
              <button onClick={() => setShowTopUpModal(false)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-neutral-500 font-sans">
                当前余额：<span className="font-mono font-bold text-neutral-900">¥{walletBalance.toFixed(2)}</span>
              </div>
              <div>
                <label className="text-[11px] font-sans font-medium text-neutral-600 block mb-1">充值金额</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="请输入充值金额"
                  value={topUpAmountInput}
                  onChange={(e) => setTopUpAmountInput(e.target.value)}
                  className="w-full text-sm font-mono border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-white outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-sans font-medium text-neutral-600 block mb-1">备注 (选填)</label>
                <input
                  type="text"
                  placeholder="如：工资到账"
                  value={topUpNoteInput}
                  onChange={(e) => setTopUpNoteInput(e.target.value)}
                  className="w-full text-sm font-sans border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-white outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="flex-1 py-2.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-xl text-xs font-medium"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleTopUp}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-medium shadow-sm"
                >
                  确认充值
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY 4: CREATE SUB-ACCOUNT MODAL -------------------- */}
      {subAccountParentId && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white w-full max-w-[340px] rounded-[32px] overflow-hidden shadow-2xl border border-neutral-200/50 flex flex-col max-h-[85vh] animate-scale-up">
            <div className="p-6 space-y-4 flex flex-col min-h-0">
              <div className="flex justify-between items-center shrink-0">
                <h3 className="font-sans font-bold text-base text-neutral-950">创建角色小号</h3>
                <button 
                  onClick={() => setSubAccountParentId(null)}
                  className="text-neutral-400 hover:text-neutral-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {subAccountError && (
                  <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg font-medium">{subAccountError}</p>
                )}

                {/* Nickname input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-bold text-neutral-400 uppercase tracking-wide block">小号昵称 (必填)</label>
                  <input
                    type="text"
                    value={subAccountName}
                    onChange={(e) => setSubAccountName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-xl text-xs font-sans font-medium outline-none transition-all"
                    placeholder="请输入小号昵称"
                  />
                </div>

                {/* Avatar input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-bold text-neutral-400 uppercase tracking-wide block">小号头像 (Emoji 或图片 URL)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subAccountAvatar}
                      onChange={(e) => setSubAccountAvatar(e.target.value)}
                      className="flex-1 p-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-xl text-xs font-sans font-medium outline-none transition-all"
                      placeholder="Emoji(如🤖) 或 http:// 开头的头像链接"
                    />
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-200 shrink-0 text-2xl select-none">
                      {subAccountAvatar.startsWith("http") ? (
                        <img src={subAccountAvatar} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        subAccountAvatar || "🤖"
                      )}
                    </div>
                  </div>
                  {/* Preset Quick Emoji Picker */}
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {["👥", "🤫", "🕵️", "🎭", "🦊", "🐯", "🤖", "👽", "🦄", "🌸"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSubAccountAvatar(emoji)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition-all ${
                          subAccountAvatar === emoji 
                            ? "bg-black text-white border-black" 
                            : "bg-white border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-bold text-neutral-400 uppercase tracking-wide block">用途设定 (用途描述作为核心指令)</label>
                  <textarea
                    value={subAccountPurpose}
                    onChange={(e) => setSubAccountPurpose(e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-xl text-xs font-sans font-medium outline-none transition-all resize-none"
                    placeholder="例如：试探用户对我有没有好感、扮演一个陌生人接近ta、假装是ta的旧同学"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubAccountParentId(null)}
                  className="flex-1 py-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-sans font-bold text-xs rounded-xl tracking-wider transition-all"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!subAccountName.trim()) {
                      setSubAccountError("请填写小号昵称");
                      return;
                    }
                    const parent = characters.find(c => c.id === subAccountParentId);
                    if (!parent) return;

                    // Create sub-account character object!
                    onAddCharacter({
                      name: subAccountName.trim(),
                      avatar: subAccountAvatar.trim().startsWith("http") ? "🤖" : subAccountAvatar.trim(),
                      chatAvatar: subAccountAvatar.trim().startsWith("http") ? subAccountAvatar.trim() : undefined,
                      description: `[${parent.name}] 的小号 · 用途: ${subAccountPurpose.trim() || "未设定"}`,
                      systemInstruction: parent.systemInstruction, // Inherit base prompt
                      group: parent.group || "其它",
                      isSubAccount: true,
                      parentCharacterId: parent.id,
                      parentCharacterName: parent.name,
                      purpose: subAccountPurpose.trim() || "扮演一个神秘的陌生人，根据目的行事",
                      isBusted: false,
                      bustQuestionsCount: 0,
                    });
                    setSubAccountParentId(null);
                  }}
                  className="flex-1 py-3 bg-black hover:bg-neutral-900 text-white font-sans font-bold text-xs rounded-xl tracking-wider transition-all"
                >
                  确认创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Standalone Offline Meet Screen */}
      {showOfflineMeet && activeChar && (
        <OfflineMeetView
          character={activeChar}
          settings={settings}
          onlineMessages={activeSession?.messages || []}
          onSyncToOnlineChat={handleSyncOfflineMemory}
          onClose={() => setShowOfflineMeet(false)}
        />
      )}
    </div>
  );
}
