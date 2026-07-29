import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, MessageCircle, User, Sparkles, X, Compass, Mail, 
  MessageSquare, Plus, Skull, Smartphone, Heart as HeartIcon, 
  RefreshCw, Send, CornerDownRight, Loader2, Bookmark, Camera, Edit2, Check,
  ThumbsUp, ThumbsDown, Share2, Trash2, Edit3, Copy, RotateCcw
} from "lucide-react";
import { Character, AppSettings, LoreEntry } from "../types";
import { apiChat, callLLM, showGlobalToast } from "../lib/api";
import { CharacterAvatar } from "./CharacterAvatar";
import { ConfirmModal } from "./ConfirmModal";

interface Board {
  id: string;
  name: string;
  keywords?: string;
  description: string;
  icon: 'love' | 'skull' | 'phone' | 'plus';
  commentRequirement?: string;
}

interface ForumComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: number;
  floor: number;
  likes?: number;
  dislikes?: number;
  isLiked?: boolean;
  isRecalled?: boolean;
  isOpUpdate?: boolean;
  replyTo?: {
    floor: number;
    authorName: string;
    content: string;
  };
}

interface ForumPost {
  id: string;
  boardId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  tag: string;
  timestamp: number;
  likes: number;
  dislikes?: number;
  isLiked?: boolean;
  comments: ForumComment[];
  chatLogs?: any[];
}

interface PrivateMessage {
  id: string;
  sender: 'user' | 'contact';
  text: string;
  timestamp: number;
}

interface PrivateContact {
  id: string;
  name: string;
  avatar: string;
  isNpc: boolean;
  character?: Character;
  subtitle?: string;
  lastMsg?: string;
  lastTime?: number;
}

interface ForumAppProps {
  characters: Character[];
  settings: AppSettings;
  loreList?: LoreEntry[];
  onClose: () => void;
}

// Built-in fixed NPCs for forum
interface ForumUserNPC {
  id: string;
  name: string;
  avatarSeed: string;
}

const FIXED_NPCS: ForumUserNPC[] = [
  { id: "npc-1", name: "吃瓜第一线", avatarSeed: "npc-cat-line" },
  { id: "npc-2", name: "路过的社畜", avatarSeed: "npc-dog-line" },
  { id: "npc-3", name: "沉思的线条花", avatarSeed: "npc-flower-line" },
  { id: "npc-4", name: "夜猫子阿怪", avatarSeed: "npc-bear-line" },
  { id: "npc-5", name: "冲浪高手张三", avatarSeed: "npc-star-line" },
];

const DEFAULT_LINE_HANDLES = [
  "线条小野猫", "抓水母的熊", "深海沉思者", "赛博打工人",
  "冷酷线条人", "深夜吃瓜狂", "修仙阿怪", "线条狗勾",
  "微醺小白兔", "幽灵吃货", "高冷咖啡师", "冲浪咸鱼"
];

// Deterministic Luntan Avatar Selector
const getLuntanAvatar = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = (Math.abs(hash) % 17) + 1;
  const numStr = index.toString().padStart(2, '0');
  return `/images/luntan/luntan_${numStr}.jpg`;
};

// Helper to detect horror / supernatural boards
const isHorrorBoard = (board?: Board | null): boolean => {
  if (!board) return false;
  const name = board.name || "";
  const desc = board.description || "";
  const kw = board.keywords || "";
  return board.icon === 'skull' || 
    board.id === 'board-2' ||
    name.includes("恐怖") || name.includes("灵异") || name.includes("怪谈") || name.includes("悬疑") || name.includes("鬼") ||
    desc.includes("恐怖") || desc.includes("灵异") || desc.includes("悬疑") ||
    kw.includes("恐怖") || kw.includes("灵异") || kw.includes("悬疑");
};

// Helper to detect found phone boards
const isFoundPhoneBoard = (_board?: Board | null): boolean => {
  return false;
};

// Helper to detect "不可以涩涩" boards
const isSeseBoard = (board?: Board | null): boolean => {
  if (!board) return false;
  return board.id === 'board-1' || board.name === '不可以涩涩' || (board.description || "").includes('涩涩');
};

// Helper to validate horror / supernatural content keywords
const isContentHorrorThemed = (content: string): boolean => {
  if (!content) return false;
  const horrorKeywords = [
    "鬼", "灵异", "诡异", "恐怖", "影子", "死", "尸", "阴风", "血", "梦魇", "荒郊", 
    "废弃", "诅咒", "都市传说", "怪异", "脚步声", "噩梦", "镜子", "压床", "老宅", 
    "邪门", "招魂", "纸钱", "寒意", "不祥", "背脊发凉", "幻觉", "邪灵", "地缚灵", 
    "红衣服", "坟", "太平间", "停尸间", "祭祀", "怪谈", "不解之谜", "中邪", "阴森",
    "索命", "怨灵", "幽灵", "惊悚", "毛骨悚然", "噩兆"
  ];
  
  const forbiddenPureRomance = [
    "爱的人要离开", "离开我了", "分手", "失恋", "我不爱你", "爱上你", "白月光", 
    "纸短情长", "谈恋爱", "撕心裂肺的爱", "感情伤痛", "他不要我了", "她不要我了"
  ];
  
  const hasHorrorKw = horrorKeywords.some(kw => content.includes(kw));
  const hasForbiddenRomance = forbiddenPureRomance.some(kw => content.includes(kw));

  return hasHorrorKw && !hasForbiddenRomance;
};

// Initial Default Posts adhering to the rules
// Helper to collect all currently used nicknames across the forum
const getAllUsedNicknames = (posts: ForumPost[] = [], privateContacts: PrivateContact[] = [], currentUserNickname?: string): Set<string> => {
  const set = new Set<string>();

  if (currentUserNickname && currentUserNickname.trim()) {
    set.add(currentUserNickname.trim());
  }

  FIXED_NPCS.forEach(npc => set.add(npc.name.trim()));

  try {
    const stored = localStorage.getItem("mobile_ai_forum_char_profiles");
    if (stored) {
      const profiles = JSON.parse(stored);
      Object.values(profiles).forEach((p: any) => {
        if (p.forumName) set.add(p.forumName.trim());
      });
    }
  } catch (e) {}

  posts.forEach(p => {
    if (p.authorName) set.add(p.authorName.trim());
    p.comments.forEach(c => {
      if (c.authorName) set.add(c.authorName.trim());
    });
  });

  privateContacts.forEach(c => {
    if (c.name) set.add(c.name.trim());
  });

  return set;
};

// Ensure a candidate nickname is strictly unique
const makeUniqueNickname = (candidate: string, usedSet: Set<string>): string => {
  let name = candidate.trim() || "匿名用户";
  if (!usedSet.has(name)) return name;

  let counter = 2;
  while (usedSet.has(`${name}_${counter}`) || usedSet.has(`${name}${counter}`)) {
    counter++;
  }
  return `${name}_${counter}`;
};

// Retrieve or generate persistent character forum profile
const getOrInitCharForumProfile = (char: Character, usedSet?: Set<string>): { forumName: string; avatar: string } => {
  let profiles: Record<string, { forumName: string; avatarSeed: string }> = {};
  try {
    const stored = localStorage.getItem("mobile_ai_forum_char_profiles");
    if (stored) profiles = JSON.parse(stored);
  } catch (e) {}

  if (profiles[char.id]) {
    const forumAvatar = char.realImage || char.avatar;
    const isImage = typeof forumAvatar === 'string' && (forumAvatar.startsWith('data:') || forumAvatar.startsWith('http') || forumAvatar.startsWith('/'));
    
    return {
      forumName: profiles[char.id].forumName,
      avatar: isImage ? forumAvatar : getLuntanAvatar(profiles[char.id].forumName)
    };
  }

  let hash = 0;
  for (let i = 0; i < char.id.length; i++) {
    hash = char.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  let defaultHandle = DEFAULT_LINE_HANDLES[Math.abs(hash) % DEFAULT_LINE_HANDLES.length];
  if (usedSet) {
    defaultHandle = makeUniqueNickname(defaultHandle, usedSet);
  }
  const avatarSeed = `line-avatar-${char.id}`;

  const newProfile = {
    forumName: defaultHandle,
    avatarSeed: avatarSeed
  };

  profiles[char.id] = newProfile;
  try {
    localStorage.setItem("mobile_ai_forum_char_profiles", JSON.stringify(profiles));
  } catch (e) {}

  return {
    forumName: newProfile.forumName,
    avatar: getLuntanAvatar(newProfile.forumName)
  };
};

const saveCharForumNickname = (charId: string, nickname: string) => {
  let profiles: Record<string, { forumName: string; avatarSeed: string }> = {};
  try {
    const stored = localStorage.getItem("mobile_ai_forum_char_profiles");
    if (stored) profiles = JSON.parse(stored);
  } catch (e) {}

  profiles[charId] = {
    forumName: nickname,
    avatarSeed: profiles[charId]?.avatarSeed || `line-avatar-${charId}`
  };
  try {
    localStorage.setItem("mobile_ai_forum_char_profiles", JSON.stringify(profiles));
  } catch (e) {}
};

export function ForumApp({ characters, settings, loreList = [], onClose }: ForumAppProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'profile'>('public');
  const [activeBoardId, setActiveBoardId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("mobile_ai_forum_last_board_id");
      if (saved && saved !== 'board-3') return saved;
    } catch (e) {}
    return "board-1";
  });

  useEffect(() => {
    if (activeBoardId) {
      localStorage.setItem("mobile_ai_forum_last_board_id", activeBoardId);
    }
  }, [activeBoardId]);

  // User Profile State (Avatar, Nickname, Bookmarks)
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem("mobile_ai_forum_user_avatar") || getLuntanAvatar("用户");
  });
  const [userNickname, setUserNickname] = useState<string>(() => {
    return localStorage.getItem("mobile_ai_forum_user_nickname") || "用户";
  });
  const [userBookmarks, setUserBookmarks] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("mobile_ai_forum_user_bookmarks");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [tempNickname, setTempNickname] = useState(userNickname);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResetAndRegenerateForum = () => {
    setConfirmDialog({
      title: "彻底重置论坛",
      message: "确定要清空所有论坛帖子、评论、私信以及发帖昵称绑定吗？重置后将为您重新生成初始内容。",
      onConfirm: async () => {
        setConfirmDialog(null);
        
        // Clear all state
        setPosts([]);
        setPrivateContacts([]);
        
        // Clear all relevant localStorage
        localStorage.removeItem("mobile_ai_forum_posts");
        localStorage.removeItem("mobile_ai_forum_contacts");
        localStorage.removeItem("mobile_ai_forum_char_profiles");
        localStorage.removeItem("mobile_ai_forum_user_bookmarks");
        
        // Remove DM messages
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith("mobile_ai_forum_dm_msgs_")) {
            localStorage.removeItem(key);
          }
        });

        showToast("论坛已重置，正在为您重新生成帖子...");
        
        // Short delay to ensure state updates or just ignore state and use empty for generation
        setTimeout(async () => {
          // Generate 2 posts for each of the first 3 boards
          for (const board of boards.slice(0, 3)) {
            await handleGeneratePosts(board.id, 2, []);
          }
          showToast("✨ 论坛已成功重置并生成全新内容");
        }, 500);
      }
    });
  };

  // My Profile Section sub-tab
  const [profileSection, setProfileSection] = useState<'posts' | 'bookmarks' | 'comments'>('posts');

  // Board Edit State
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [boardEditName, setBoardEditName] = useState("");
  const [boardEditKeywords, setBoardEditKeywords] = useState("");
  const [boardEditDesc, setBoardEditDesc] = useState("");
  const [isGeneratingBoardDesc, setIsGeneratingBoardDesc] = useState(false);

  const [boards, setBoards] = useState<Board[]>(() => {
    try {
      const saved = localStorage.getItem("mobile_ai_forum_boards");
      if (saved) {
        const parsed: Board[] = JSON.parse(saved);
        const filtered = parsed.filter(b => b.id !== 'board-3' && b.name !== '捡手机文学');
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {}
    return [
      { id: 'board-1', name: '不可以涩涩', icon: 'love', description: '轻松有趣的“涩涩”生活吐槽、戒涩挑战失败记录与暧昧期互动脑洞。', keywords: '日常吐槽, 脑洞, 冷知识' },
      { id: 'board-2', name: '深夜食堂', icon: 'skull', description: '恐怖灵异故事分享与求助，涵盖真实灵异事件、所闻恐怖故事、身边异常求助与原创脑洞怪谈。', keywords: '悬疑, 灵异, 故事' },
    ];
  });

  const [posts, setPosts] = useState<ForumPost[]>(() => {
    try {
      const saved = localStorage.getItem("mobile_ai_forum_posts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p: ForumPost) => p.boardId !== 'board-3');
        }
      }
    } catch (e) {}
    return [];
  });
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  // Long press / Action menu for user comments
  const [activeCommentMenu, setActiveCommentMenu] = useState<{ comment: ForumComment, x: number, y: number } | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // User Manual Post State
  const [isUserPostModalOpen, setIsUserPostModalOpen] = useState(false);
  const [userPostBoardId, setUserPostBoardId] = useState("");
  const [userPostTag, setUserPostTag] = useState("日常");
  const [userPostContent, setUserPostContent] = useState("");

  // Reply Input & Threaded Reply State in Post Detail
  const [replyText, setReplyText] = useState("");
  const [replyingToComment, setReplyingToComment] = useState<ForumComment | null>(null);

  // AI Post / Comment Gen Settings & Progress
  const [postGenCount, setPostGenCount] = useState<number>(3);
  const [commentGenCount, setCommentGenCount] = useState<number>(3);
  
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [postGenProgressText, setPostGenProgressText] = useState("");
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);
  const [isGeneratingOpUpdate, setIsGeneratingOpUpdate] = useState(false);
  const [isGeneratingOpInteract, setIsGeneratingOpInteract] = useState(false);
  const [isUserOpUpdate, setIsUserOpUpdate] = useState(false);
  const [showOpOnly, setShowOpOnly] = useState(false);

  // Private Messages Directory & Chat State
  const [privateContacts, setPrivateContacts] = useState<PrivateContact[]>(() => {
    try {
      const stored = localStorage.getItem("mobile_ai_forum_private_contacts");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [isGeneratingPrivateRequest, setIsGeneratingPrivateRequest] = useState(false);
  const [activePrivateContact, setActivePrivateContact] = useState<PrivateContact | null>(null);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateInputText, setPrivateInputText] = useState("");
  const [isContactTyping, setIsContactTyping] = useState(false);
  const privateChatEndRef = useRef<HTMLDivElement>(null);

  // Save posts, boards, and private contacts to localStorage
  useEffect(() => {
    if (posts.length > 0 || boards.length > 0) {
      localStorage.setItem("mobile_ai_forum_posts", JSON.stringify(posts));
      localStorage.setItem("mobile_ai_forum_boards", JSON.stringify(boards));
    }
  }, [posts, boards]);

  useEffect(() => {
    localStorage.setItem("mobile_ai_forum_private_contacts", JSON.stringify(privateContacts));
  }, [privateContacts]);

  // Load config
  useEffect(() => {
    const pCount = localStorage.getItem("mobile_ai_forum_p_count");
    if (pCount) setPostGenCount(parseInt(pCount, 10));
    const cCount = localStorage.getItem("mobile_ai_forum_c_count");
    if (cCount) setCommentGenCount(parseInt(cCount, 10));
  }, []);

  // Toggle Post Bookmark
  const toggleBookmark = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated: string[];
    if (userBookmarks.includes(postId)) {
      updated = userBookmarks.filter(id => id !== postId);
    } else {
      updated = [...userBookmarks, postId];
    }
    setUserBookmarks(updated);
    localStorage.setItem("mobile_ai_forum_user_bookmarks", JSON.stringify(updated));
  };

  // Avatar Upload Handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("图片文件过大，请选择 3MB 以内的图片");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUserAvatar(reader.result);
        localStorage.setItem("mobile_ai_forum_user_avatar", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  // Share Modal & Comment Edit State
  const [shareModalData, setShareModalData] = useState<{ type: 'post' | 'comment'; itemContent: string; postId: string; commentId?: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");

  // Save Custom Nickname with Uniqueness Enforcement
  const handleSaveNickname = () => {
    const trimmed = tempNickname.trim();
    if (!trimmed) {
      setIsEditingNickname(false);
      return;
    }
    if (trimmed === userNickname) {
      setIsEditingNickname(false);
      return;
    }

    const usedNicknames = getAllUsedNicknames(posts, privateContacts, userNickname);
    if (usedNicknames.has(trimmed)) {
      alert("该昵称已被使用，请换一个");
      return;
    }

    setUserNickname(trimmed);
    localStorage.setItem("mobile_ai_forum_user_nickname", trimmed);
    setIsEditingNickname(false);
    showToast("昵称修改成功");
  };

  // Open Board Edit Modal
  const openEditBoardModal = (board: Board | null) => {
    setEditingBoard(board);
    if (board) {
      setBoardEditName(board.name || "");
      setBoardEditKeywords(board.keywords || "");
      setBoardEditDesc(board.description || "");
    } else {
      setBoardEditName("");
      setBoardEditKeywords("");
      setBoardEditDesc("");
    }
    setIsEditingBoard(true);
  };
  const handleAiGenerateBoardDesc = async () => {
    if (!boardEditName.trim()) {
      alert("请先填写板块名称！");
      return;
    }
    setIsGeneratingBoardDesc(true);
    try {
      const prompt = `你是一个创意的网络论坛板块策划助手。
板块名称：${boardEditName.trim()}
${boardEditKeywords.trim() ? `关键词：${boardEditKeywords.trim()}` : ""}
请根据板块名称${boardEditKeywords.trim() ? "和关键词" : ""}，为该板块生成一段生动详细、有特色的内容设定与方向说明（80-200字）。请直接输出设定文本内容，不要包含标题或额外说明。`;

      const response = await apiChat({
        messages: [{ role: "user", content: prompt }],
        character: { id: "board-assistant", name: "论坛策划助手", description: "论坛策划" } as any,
        settings
      });

      if (response && response.text) {
        setBoardEditDesc(response.text.trim());
      }
    } catch (e) {
      console.error("生成板块设定失败:", e);
      alert("AI 生成板块内容设定失败，请稍后重试。");
    } finally {
      setIsGeneratingBoardDesc(false);
    }
  };

  const handleSaveBoard = (boardData: { id: string; name: string; keywords?: string; description: string; icon: Board['icon'] }) => {
    if (editingBoard) {
      setBoards(boards.map(b => b.id === boardData.id ? { ...b, ...boardData } : b));
    } else {
      setBoards([...boards, { ...boardData, id: `board-${Date.now()}` }]);
    }
    setIsEditingBoard(false);
    setEditingBoard(null);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const resolvePostGenRange = (minS: string, maxS: string) => {
    let min = parseInt(minS, 10);
    let max = parseInt(maxS, 10);

    if (isNaN(min)) min = 1;
    if (isNaN(max)) max = 3;

    min = Math.max(1, Math.min(8, min));
    max = Math.max(1, Math.min(8, max));

    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }

    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    return { count, min, max, minStr: min.toString(), maxStr: max.toString() };
  };

  const saveConfig = (minS: string, maxS: string, c: number, boardId?: string, loreIds?: string[]) => {
    setGenMinStr(minS);
    setGenMaxStr(maxS);
    setCommentGenCount(c);
    localStorage.setItem("mobile_ai_forum_p_min", minS);
    localStorage.setItem("mobile_ai_forum_p_max", maxS);
    localStorage.setItem("mobile_ai_forum_c_count", c.toString());
    if (boardId) {
      localStorage.setItem("mobile_ai_forum_gen_board", boardId);
    }
    if (loreIds) {
      localStorage.setItem("mobile_ai_forum_gen_lores", JSON.stringify(loreIds));
    }
  };

  // AI Post Gen Modal State
  const [selectedLoreIds, setSelectedLoreIds] = useState<string[]>([]);
  const [isGeneratingPostsModalOpen, setIsGeneratingPostsModalOpen] = useState(false);
  const [genBoardId, setGenBoardId] = useState<string>('');
  const [genMinStr, setGenMinStr] = useState<string>(() => {
    return localStorage.getItem("mobile_ai_forum_p_min") || "1";
  });
  const [genMaxStr, setGenMaxStr] = useState<string>(() => {
    return localStorage.getItem("mobile_ai_forum_p_max") || "3";
  });

  const handleOpenGenModal = (bId?: string) => {
    const savedBoardId = localStorage.getItem("mobile_ai_forum_gen_board");
    let savedLores: string[] = [];
    try {
      const parsedLores = JSON.parse(localStorage.getItem("mobile_ai_forum_gen_lores") || "[]");
      if (Array.isArray(parsedLores)) {
        savedLores = parsedLores;
      }
    } catch (e) {}

    const targetId = bId || savedBoardId || activeBoardId || boards[0]?.id || '';
    setGenBoardId(targetId);
    setGenMinStr(localStorage.getItem("mobile_ai_forum_p_min") || "1");
    setGenMaxStr(localStorage.getItem("mobile_ai_forum_p_max") || "3");
    setSelectedLoreIds(savedLores);
    setPostGenProgressText("");
    setIsGeneratingPostsModalOpen(true);
  };

  const checkIsPostTooSimilar = (newContent: string, existingList: ForumPost[]): boolean => {
    const cleanWords = (text: string) => {
      return text.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’。，、？！；：]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 1);
    };

    const newWords = new Set(cleanWords(newContent));
    if (newWords.size === 0) return false;

    for (const post of existingList) {
      const postWords = cleanWords(post.content);
      if (postWords.length === 0) continue;

      let intersectionSize = 0;
      for (const w of postWords) {
        if (newWords.has(w)) {
          intersectionSize++;
        }
      }

      const unionSize = newWords.size + postWords.length - intersectionSize;
      if (unionSize > 0) {
        const similarity = intersectionSize / unionSize;
        if (similarity > 0.3) { // 30% overlap threshold
          return true;
        }
      }
    }
    return false;
  };

  const handleGeneratePosts = async (boardId: string, count: number, loreIds: string[]) => {
    if (characters.length === 0) {
      alert("请先创建至少一个角色，再进行 AI 生成帖子！");
      return;
    }
    if (isGeneratingPosts) return;
    
    if (!settings.apiUrl || !settings.apiKey) {
      alert("请先在设置页配置 API 地址和 API Key，否则无法生成帖子！");
      return;
    }

    setIsGeneratingPosts(true);
    showToast("后台正在生成帖子，完成后将通知您...");
    
    // Perform generation in background
    setTimeout(async () => {
      try {
        const board = boards.find(b => b.id === boardId) || boards[0];
        const selectedLores = loreList.filter(l => loreIds.includes(l.id));
        const loreContent = selectedLores.map(l => `【${l.title}】:\n${l.content}`).join("\n\n");
        const isHorror = isHorrorBoard(board);
        
        const existingPostsList = posts.filter(p => p.boardId === boardId);
        const existingSummaries = existingPostsList.length > 0 
          ? `【当前板块已有的帖子概要（生成新帖子时，主题、事情经过、故事切入点绝对不能与这些相似，必须完全独立、具有新鲜感和独特设定）：】\n${existingPostsList.slice(-10).map((p, idx) => `${idx + 1}. 作者: ${p.authorName}, 帖子前80字: "${p.content.slice(0, 80)}..."`).join("\n")}`
          : "【当前板块尚无帖子，请首发新颖独特的倾诉主题。】";
        
        const generatedPosts: ForumPost[] = [];
        for (let i = 0; i < count; i++) {
          // 50% chance character, 50% chance NPC
          const useNpc = Math.random() < 0.5;
          let authorId = "";
          let authorName = "";
          let authorAvatar = "";
          let activeChar: Character | null = null;

          if (!useNpc) {
            activeChar = characters[Math.floor(Math.random() * characters.length)];
            authorId = activeChar.id;
            const profile = getOrInitCharForumProfile(activeChar);
            authorName = profile.forumName;
            authorAvatar = getLuntanAvatar(authorName);
          } else {
            const npc = FIXED_NPCS[Math.floor(Math.random() * FIXED_NPCS.length)];
            authorId = npc.id;
            authorName = npc.name;
            authorAvatar = getLuntanAvatar(npc.name);
          }

          let validParsed: any = null;
          let attempts = 0;

          while (!validParsed && attempts < 3) {
            attempts++;
            // ... (rest of the generation logic)
            let boardRequirementNotice = "";
            const isFoundPhone = isFoundPhoneBoard(board);
            const isSese = isSeseBoard(board);

            if (isHorror) {
              boardRequirementNotice = `
  --- 【深夜食堂（恐怖/灵异）板块特别硬性规则（最高优先级）】 ---
  1. 本板块必须是【恐怖灵异题材】，包含以下四种类型之一：
     · 亲身经历的灵异事件（标题或内容必须标注【真实】）
     · 听别人说过的恐怖故事/传闻（标题或内容标注【真实】或【脑洞】）
     · 自己察觉周围有诡异不对劲现象来论坛发帖求助（如异响、怪异影迹、异样感觉等）
     · 原创编造的毛骨悚然的故事/都市怪谈（标题或内容必须标注【脑洞】）
  2. 【风格与代入感】：
     · 极其注重身临其境的代入感！描述具体的场景细节（发生时间、环境氛围、光线触感、声音细节、当下的紧张与恐惧心理），让读者感同身受。
  3. 【标签与标题规则】：
     · 真实经历/传闻类：帖子 title 或正文开头必须包含“【真实】”，tag 设为 "真实"。
     · 编造故事类：帖子 title 或正文开头必须包含“【脑洞】”，tag 设为 "脑洞"。
     · 示例标题：“【真实】昨晚在老家后山看到的怪事…”、“【脑洞】千万不要在深夜打开这扇门…”
  4. 【悬念与留白】：
     · 故事可以不讲完，留下让人细思极恐的悬念或未完待续（例如“等等，走廊里好像有脚步声，我去看看…”或“大家帮我看看照片后台里的黑影是什么”），引发评论区推测热议！
  5. 【绝对禁止】：严禁生成任何日常情感纠纷、恋爱伤感讨论或普通日常生活杂谈。
  6. 请在 JSON 中输出 "isHorrorTheme": true，以及 "title"（包含【真实】或【脑洞】）、"tag"（"真实"或"脑洞"）和 "content"。
  `;
            } else if (isFoundPhone) {
              boardRequirementNotice = `--- 【捡手机文学板块特别硬性规则（最高优先级）】 ---
  1. 本板块帖子必须是虚构的聊天记录，以“捡到了 [某人] 的手机”为标题。
  2. 题材不限（搞笑、日常、悬疑、恋爱均可），核心是通过角色A与角色B（或多人）的聊天对话推动剧情。
  3. 内容风格：日常口语化对话，可包含语气词、表情符号（用文字描述）、时间戳等细节，符合角色的设定。
  4. 【必须在 JSON 中输出 "isFoundPhone": true 以及 "title"（如“捡到了 [某人] 的手机”），还有 "chatLogs" 数组（不可省略，不少于6条）。】
  5. "chatLogs" 的格式要求：每个元素是 { "sender": "发送者昵称", "time": "14:30", "content": "消息内容", "isRight": true 或 false (true代表手机主人，false代表对方) }。`;
            } else if (isSese) {
              boardRequirementNotice = `--- 【不可以涩涩板块特别硬性规则（最高优先级）】 ---
  1. 本板块聚焦轻松有趣的“涩涩”相关生活吐槽、搞笑记录与互动脑洞。
  2. 【绝对禁止】：严禁包含日常情感求助、严肃心理倾诉或严肃性教育科普内容。
  3. 帖子选题必须围绕以下三个核心方向之一进行创作：
     · “挑战失败”日常记录：角色或NPC分享自己或身边人尝试戒“涩涩”/控制心动/忍住亲密冲动却宣告失败的搞笑经历，语气轻松自嘲、幽默解压。
     · 有趣冷知识：关于两性关系、亲密互动、恋爱心理的搞笑有趣冷知识或生活细节观察。
     · 约会/互动脑洞：有趣的情侣互动方式、暧昧期的小套路、令人怦然心动或爆笑的脑洞设想。
  4. 语言与氛围：
     · 内容必须100%符合角色自身人设，语言自然口语化，展现真实生动的日常情绪，氛围轻松搞笑解压。
     · 绝不进行严肃说教、道德批判或沉重的情感求助。`;
            }

            const generalRequirementNotice = `
  --- 【论坛帖子通用语气与生成规则（最高优先级）】 ---
  1. 【统一第一人称视角】：所有帖子必须 100% 统一使用第一人称视角（“我”）进行叙述，严禁第三人称！
  2. 【绝对杜绝重复主题和同质套路】：
     - 【禁止重复发生相同的琐碎日常事件】！如果你是多次发帖，或看到已有其他帖子，必须改变你的发帖主题、表达切入点和叙事角度（例如：你可以倾诉秘密心声、吐槽某人、提问寻求帮助、分享脑洞创想、记录一个诡异而滑稽的真实尴尬瞬间、讲述一段特别的回忆等，严禁全员套用相同的套路）。
  3. 【角色人设决定发帖开头（绝对禁忌：严禁千篇一律开头）】：
     - 绝不能每条帖子开头都用“家人们”。必须根据你所属的发帖角色性格/人设特征来决定开场白与语气：
       · 【活泼外向型/元气型角色】：可以使用“家人们”、“友友们”、“大家听我说”、“呜呜呜有人在吗”等高亲和力、热情的互联网开场白。
       · 【温和内敛型/温柔型/治愈型角色】：开场必须柔和委婉、略带迟疑，可使用“那个…”、“嗯…”、“其实有件事想说…”、“不知道该怎么说…”等，决不能大喊大叫或使用“家人们”。
       · 【高冷型/傲娇型/沉稳型角色】：直接陈述事件或核心问题，【绝不能加任何套近乎的开场白或多余的互联网语气词】（直接开始描述事情，如：“今天遇到一件极其荒谬的事。”）。
       · 【NPC成员】：也必须根据其人名/ presumed 性格特征来进行开场，杜绝全员千篇一律“家人们”开局。
  4. 【内容必须100%忠实于角色完整人设】：
     - 生成的帖子内容、讲述的言行、爱好、习惯、日常困扰、秘密心声都必须与该角色的完整性格、背景人设高度一致，严禁凭空捏造、杜绝生硬凑合。
     - 【温柔/优雅/知性角色绝对禁止使用恶俗、低俗、露骨、下流网络热梗或带偏激癖好的词汇】：严禁使用如“超级M”、“卑微是最好的嫁妆”、“专属小狗”、“舔狗”等完全割裂人设的词。
     - 在生成前，必须深入分析该角色的性格描述、行为风格、人设卡片，确保发布的事件和倾诉的内容完美贴合其本身设定。
  5. 【口语化叙事与语气自然委婉化】：
     - 帖子语言必须像普通人在社交媒体真实发帖倾诉一样，有角色强烈的个人特色，“见字如面”。
     - 严禁为了刻意追求“论坛感”而一律套用过度网络化、低级庸俗、露骨粗浅的网络词汇或万能模版。
     - 即使发帖内容发布在偏敏感板块（如“Xp分享”、“深夜树洞”），也必须用符合该角色独特设定（如：傲娇、羞涩、温柔等）的极其隐晦、委婉、甚至可爱或克制的方式进行真诚地心理陈述，绝不能出现低俗、露骨直白的词句。
  6. 【个人心理感受与当下反应】：
     - 必须加入个人心理感受、情绪变化和当下真实反应。
  7. 【详细经过与字数要求】：必须详细描述事件完整经过，包含【时间、地点、事件起因、经过、细节和感受】，正文【字数绝对不少于 150 字】（推荐 180 ~ 380 字）。
  8. 【绝对禁止动作描写（最高红线）】：帖子正文中绝对禁止出现任何动作描写（如“他笑了一下”、“她低下头”、“拍了拍对方的肩膀”等）。内容仅限于纯文字表达，不包含任何描述肢体动作、神态行为的词句。
  `;

            const prompt = activeChar ? `你是角色：${activeChar.name}。简介：${activeChar.description}。
  ${loreContent ? `以下是本次生成挂载的世界观设定：\n${loreContent}\n` : ""}
  论坛板块：${board?.name}。板块简介/方向：${board?.description}。
  
  ${existingSummaries}
  
  ${generalRequirementNotice}
  ${boardRequirementNotice}
  
  请扮演该角色并以其口吻，在匿名论坛的该板块下发布一篇详细的论坛帖子。帖子必须使用第一人称“我”，用符合该角色性格特色的口吻口语化自然叙述。活泼外向的角色可以加生动的互动语气，高冷或内敛的角色要保持其高冷或温柔、克制的叙述腔调，避免千篇一律地使用相同的网络套话，字数绝对不少于150字。
  同时，请为该角色生成一个不包含原名“${activeChar.name}”的论坛匿名网名（4-8字，如“深夜听风者”、“赛博咸鱼”）。
  
  要求输出严格的 JSON 格式：
  {
    ${isHorror ? `"isHorrorTheme": true,` : ""}
    "forumNickname": "论坛匿名网名",
    "title": "${isHorror ? "【真实】或【脑洞】开头的吸引人标题" : "标题"}",
    "tag": "${isHorror ? "真实" : isSese ? "脑洞" : "日常"}",
    "content": "第一人称自然口语化叙述的详细帖子正文（不少于150字，以该角色本身的口吻和人设开头，符合其专属性格与人设，像该角色本人在发帖倾诉，包含时间、地点、起因经过细节、当下情绪反应与该性格特有的自然叙事或互动，拒绝千篇一律的网梗或套话）"
  }` : `你是一个网络论坛NPC成员“${authorName}”。
  论坛板块：${board?.name}。板块方向：${board?.description}。
  
  ${existingSummaries}
  
  ${generalRequirementNotice}
  ${boardRequirementNotice}
  
  请在该板块发布一篇符合板块氛围的详细帖子。帖子必须使用第一人称“我”，口语化自然接地气，根据NPC名字或预设的某种性格类型（例如傲娇、随性、温柔等）选择合适独特的语气和开场，字数绝对不少于150字。
  
  要求输出严格的 JSON 格式：
  {
    ${isHorror ? `"isHorrorTheme": true,` : ""}
    "title": "${isHorror ? "【真实】或【脑洞】开头的吸引人标题" : "标题"}",
    "tag": "${isHorror ? "真实" : isSese ? "脑洞" : "日常"}",
    "content": "第一人称自然口语化叙述的详细帖子正文（不少于150字，以符合该NPC设定的方式开头与叙述，包含时间、地点、起因经过细节、当下情绪反应，杜绝千篇一律）"
  }`;

            const response = await apiChat({ 
              messages: [{ role: "user", content: prompt }], 
              character: activeChar || { id: "npc", name: authorName, description: "论坛NPC" } as any,
              memories: activeChar?.memories || [],
              matchedLore: selectedLores,
              settings, 
              systemInstruction: "你是一个严格按照规则输出JSON的API。" 
            });
            const responseText = response.text || "";
            
            let parsed = null;
            try {
              const jsonMatch = responseText.match(/\{[\s\S]*\}/);
              parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
            } catch (e) {
              console.error("Failed to parse forum post JSON", e);
            }

            if (parsed) {
              if (isFoundPhone && parsed.isFoundPhone) {
                 validParsed = {
                   ...parsed,
                   content: parsed.content || "[聊天记录]",
                   isFoundPhone: true,
                   title: parsed.title || "捡到了手机",
                   chatLogs: parsed.chatLogs || []
                 };
                 break;
              }
              if (parsed.content) {
                const text = parsed.content.trim();
                const hasFirstPerson = text.includes("我");
                const isHorrorValid = !isHorror || (parsed.isHorrorTheme !== false && isContentHorrorThemed(text));
                const isLengthOk = text.length >= 120;
                const isTooSimilar = checkIsPostTooSimilar(text, [...posts, ...generatedPosts]);

                if ((hasFirstPerson && isHorrorValid && isLengthOk && !isTooSimilar) || attempts >= 3) {
                  validParsed = parsed;
                }
              }
            }
          }

          if (validParsed && validParsed.content) {
            const usedNicknames = getAllUsedNicknames(posts, privateContacts, userNickname);
            if (activeChar && validParsed.forumNickname) {
              const uniqueName = makeUniqueNickname(validParsed.forumNickname, usedNicknames);
              authorName = uniqueName;
              usedNicknames.add(uniqueName);
              saveCharForumNickname(activeChar.id, uniqueName);
              authorAvatar = getLuntanAvatar(authorName); // Update avatar to match new nickname
            } else if (!activeChar) {
              authorName = makeUniqueNickname(authorName, usedNicknames);
              usedNicknames.add(authorName);
              authorAvatar = getLuntanAvatar(authorName); // Update avatar to match new nickname
            }

            const newPost: ForumPost = {
              id: Date.now().toString() + "-" + i + "-" + Math.random().toString(36).substr(2, 4),
              boardId: board.id,
              authorId: authorId,
              authorName: authorName,
              authorAvatar: authorAvatar,
              title: validParsed.title || (isHorror ? (validParsed.tag?.includes('脑洞') ? '【脑洞】恐怖故事' : '【真实】深夜怪事') : '匿名帖子'),
              content: validParsed.content,
              tag: validParsed.tag || (isHorror ? "真实" : "日常"),
              timestamp: Date.now(),
              likes: Math.floor(Math.random() * 20),
              dislikes: 0,
              comments: []
            };
            
            try {
              const initialComments = await generateCommentsInternal(newPost, "3 到 6");
              newPost.comments = initialComments;
            } catch(err) {
              console.error("Failed to generate initial comments", err);
            }
            
            generatedPosts.push(newPost);
          }
        }
        
        if (generatedPosts.length > 0) {
          setPosts(prev => [...generatedPosts, ...prev]);
          const msg = `✨ 帖子已生成完成（新增了 ${generatedPosts.length} 篇新帖子）！`;
          showGlobalToast(msg);
        }
      } catch (e) {
        console.error(e);
        showGlobalToast("AI 生成帖子出错，请稍后重试。");
      } finally {
        setIsGeneratingPosts(false);
        setIsGeneratingPostsModalOpen(false);
        setPostGenProgressText("");
        setSelectedLoreIds([]);
      }
    }, 100);
  };
  
  // Post Actions: Like, Dislike, Delete
  const handleLikePost = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = !p.isLiked;
        const currentLikes = p.likes || 0;
        const newLikes = isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
        const updated = { ...p, likes: newLikes, isLiked };
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(updated);
        }
        return updated;
      }
      return p;
    }));
  };

  const handleDislikePost = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const updated = { ...p, dislikes: (p.dislikes || 0) + 1 };
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(updated);
        }
        return updated;
      }
      return p;
    }));
  };

  const handleDeletePost = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmDialog({
      title: "删除帖子",
      message: "确定要删除此帖吗？删除后不可恢复",
      onConfirm: () => {
        const postToDelete = posts.find(p => p.id === postId);
        if (postToDelete) {
          characters.forEach(char => {
            const memKey = `mobile_ai_memories_${char.id}`;
            const memStr = localStorage.getItem(memKey);
            if (memStr) {
              try {
                const mems = JSON.parse(memStr);
                const filtered = mems.filter((m: any) => m.text !== postToDelete.content && !m.text.includes(postToDelete.content.substring(0, Math.min(20, postToDelete.content.length))));
                if (filtered.length !== mems.length) {
                  localStorage.setItem(memKey, JSON.stringify(filtered));
                }
              } catch (err) {}
            }
          });
        }
        
        setPosts(prev => prev.filter(p => p.id !== postId));
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(null);
        }
        showToast("帖子已成功删除");
        setTimeout(() => setConfirmDialog(null), 10);
      }
    });
  };

  // Comment Actions: Like, Dislike, Recall, Edit, Delete, Copy
  const handleLikeComment = (commentId: string) => {
    if (!selectedPost) return;
    const updatedComments = selectedPost.comments.map(c => {
      if (c.id === commentId) {
        const isLiked = !c.isLiked;
        const currentLikes = c.likes || 0;
        const newLikes = isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
        return { ...c, likes: newLikes, isLiked };
      }
      return c;
    });
    const updatedPost = { ...selectedPost, comments: updatedComments };
    setSelectedPost(updatedPost);
    setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
  };

  const handleDislikeComment = (commentId: string) => {
    if (!selectedPost) return;
    const updatedComments = selectedPost.comments.map(c => {
      if (c.id === commentId) {
        return { ...c, dislikes: (c.dislikes || 0) + 1 };
      }
      return c;
    });
    const updatedPost = { ...selectedPost, comments: updatedComments };
    setSelectedPost(updatedPost);
    setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
  };

  const handleRecallComment = (commentId: string) => {
    if (!selectedPost) return;
    // 50% probability show "已撤回" mark, 50% remove from UI
    const showRecallMark = Math.random() < 0.5;
    let updatedComments;
    if (showRecallMark) {
      updatedComments = selectedPost.comments.map(c => c.id === commentId ? { ...c, isRecalled: true } : c);
    } else {
      updatedComments = selectedPost.comments.filter(c => c.id !== commentId);
    }
    const updatedPost = { ...selectedPost, comments: updatedComments };
    setSelectedPost(updatedPost);
    setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
    showToast("评论已撤回");
  };

  const handleSaveEditComment = (commentId: string) => {
    if (!selectedPost) return;
    if (!editingCommentText.trim()) {
      showToast("评论内容不能为空");
      return;
    }
    const updatedComments = selectedPost.comments.map(c => c.id === commentId ? { ...c, content: editingCommentText.trim() } : c);
    const updatedPost = { ...selectedPost, comments: updatedComments };
    setSelectedPost(updatedPost);
    setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
    setEditingCommentId(null);
    setEditingCommentText("");
    showToast("评论修改已保存");
  };

  const handleDeleteComment = (commentId: string) => {
    if (!selectedPost) return;
    setConfirmDialog({
      title: "删除评论",
      message: "确定要永久删除此评论吗？",
      onConfirm: () => {
        const updatedComments = selectedPost.comments.filter(c => c.id !== commentId);
        const updatedPost = { ...selectedPost, comments: updatedComments };
        setSelectedPost(updatedPost);
        setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
        showToast("评论已永久删除");
        setConfirmDialog(null);
      }
    });
  };

  const handleCopyComment = (content: string) => {
    try {
      navigator.clipboard.writeText(content);
      showToast("已复制内容到剪贴板");
    } catch (e) {
      showToast("复制失败");
    }
  };

  // Share Post or Comment to AI Character
  const handleShareToCharacter = (char: Character) => {
    if (!shareModalData) return;

    const usedNicknames = getAllUsedNicknames(posts, privateContacts, userNickname);
    const profile = getOrInitCharForumProfile(char, usedNicknames);
    const shareLabel = shareModalData.type === 'post' ? '帖子' : '评论';
    const textToShare = `[论坛${shareLabel}分享] "${shareModalData.itemContent}"`;

    const existingContact = privateContacts.find(c => c.character?.id === char.id);
    let contactId = existingContact ? existingContact.id : `private-char-${char.id}-${Date.now()}`;

    if (!existingContact) {
      const newContact = {
        id: contactId,
        name: profile.forumName,
        avatar: profile.avatar,
        isNpc: false,
        character: char,
        subtitle: `角色: ${char.name}`,
        lastMsg: textToShare,
        lastTime: Date.now()
      };
      setPrivateContacts(prev => [newContact, ...prev]);
    } else {
      setPrivateContacts(prev => prev.map(c => c.id === contactId ? { ...c, lastMsg: textToShare, lastTime: Date.now() } : c));
    }

    const msgKey = `mobile_ai_forum_dm_msgs_${contactId}`;
    let existingMsgs = [];
    try {
      const stored = localStorage.getItem(msgKey);
      if (stored) existingMsgs = JSON.parse(stored);
    } catch (e) {}

    const shareMsg = {
      id: `msg-share-${Date.now()}`,
      sender: 'user',
      text: textToShare,
      timestamp: Date.now()
    };

    localStorage.setItem(msgKey, JSON.stringify([...existingMsgs, shareMsg]));
    showToast(`已成功分享给角色【${char.name}】`);
    setShareModalData(null);
  };

  const generateCommentsInternal = async (post: ForumPost, countRange: string): Promise<ForumComment[]> => {
    const charInfos = characters.map(char => {
      const profile = getOrInitCharForumProfile(char);
      return {
        id: char.id,
        forumName: profile.forumName,
        description: char.description,
        systemInstruction: char.systemInstruction
      };
    });

    const npcInfos = FIXED_NPCS.map(npc => ({
      id: npc.id,
      name: npc.name,
      description: "匿名热心网友"
    }));

    const existingCommentsFormatted = post.comments.length > 0
      ? post.comments.filter(c => !c.isRecalled).map(c => `[已有评论 floor: #${c.floor}, 作者: ${c.authorName}]内容: "${c.content}"`).join("\n")
      : "（暂无现有评论）";

    const currentBoard = boards.find(b => b.id === post.boardId);
    const isSese = isSeseBoard(currentBoard);
    const isHorror = isHorrorBoard(currentBoard);

    const prompt = `你是匿名社交论坛模拟引擎。你的任务是根据给定的帖子内容、已有评论和可选角色池，批量生成一组数量在 ${countRange} 条之间的互动评论，并以 JSON 数组格式输出。

--- 【帖子信息】 ---
版块名称: "${currentBoard?.name || ""}"
版块设定与方向: "${currentBoard?.description || ""}"
${isHorror ? "【深夜食堂（恐怖/灵异）板块评论特别氛围】：当前帖子属于恐怖/灵异题材。评论区互动请结合帖文悬念与恐怖氛围进行：1) 猜测故事后续发展或悬念真相；2) 分享自身或身边人遇到的类似真实诡异经历；3) 质疑故事真实性（如“楼主细思极恐，是不是编的？”、“求后续！写得也太真了吧”）；4) 补充细节或推理分析（如“仔细看帖子里提到的细节…”）。" : isSese ? "【不可以涩涩板块特别氛围】：当前帖子属于轻松搞笑解压的“不可以涩涩”板块。评论互动请保持轻松自嘲、爆笑吐槽、接梗或分享同感脑洞，绝不进行严肃说教、道德批判或沉重心理劝导。" : ""}
楼主名字: "${post.authorName}"
帖子正文: "${post.content}"
帖子点赞数: ${post.likes || 0}
帖子当前评论数: ${post.comments.length}

--- 【角色池 (Character Pool)】 ---
以下是论坛的可选发帖角色（如果评论作者为他们之一，请使用对应的 id 和 forumName）：
${JSON.stringify(charInfos, null, 2)}

--- 【NPC 角色池 (NPC Pool)】 ---
以下是论坛固定的 NPC 角色（如果选择这些 NPC 发言，使用对应的 id 和 name）：
${JSON.stringify(npcInfos, null, 2)}

以及以下备用网名（可以作为普通 NPC 用户）：
${JSON.stringify(DEFAULT_LINE_HANDLES)}

--- 【评论生成核心机制（必须严格执行！）】 ---
1. 【动态条数 (${countRange}条)】：
   根据帖子的点赞数和话题热度（如恐怖、日常、XP倾诉、树洞吐槽等），动态决定生成的总评论条数。条数必须在 ${countRange} 条之间。

2. 【构建多层对话链 (Dialogue Chains)】：
   - 严禁每个评论都是独立发表的观点！
   - 评论之间必须产生相互回复和吐槽。每条评论要么回复帖子（楼主），要么回复之前已有的评论，要么回复刚刚在数组中生成的更早的评论。
   - 形成多条深入的回复树/对话链（例如：评论 A 对帖子发表看法 -> 评论 B 回复 A 的看法 -> 评论 C 针对 B 表达不同意见 -> 评论 D 出来吐槽 B 和 C -> 评论 E 又跑出来解答 A 之前的疑问）。

3. 【角色专属语言风格 (Persona Styling)】：
   当选择角色池中的特定角色发表评论时，他的内容和语气必须完全符合他的人设类型。并且我们将人设语气划分为三类：
   - 活泼型角色 (如活泼话唠、猫咪女孩、元气少年等)：强烈好奇心，多使用追问细节的问句，语气亢奋，多用感叹号（!）和问号（?）。例如：“哇塞真的吗？！求细节！你当时怎么想的呀？”。
   - 高冷型角色 (如高冷、内敛、克制、傲娇等)：用语极其简短、高傲、冷酷。不带多余情绪，少用或不用多余表情/标点。例如：“建议报警。” “无聊。” “純屬自找。”。
   - 温和型角色 (如温柔、成熟、治愈、大姐姐等)：提供补充解释、安抚情绪、科普背景或理性的善意建议。常使用波浪号（~）或平和的省略号。例如：“楼主别太难过，其实这也是难免的~ 下次注意就好啦。”。

4. 【NPC 插话与搞笑吐槽】：
   - 固定 NPC 或普通网友要善于插话、吐槽其他角色的观点，或者在评论区带节奏、玩梗、当吃瓜群众。
   - 吐槽要生动有趣，有真正的网民讨论感。例如：“楼上的傲娇退退退，什么都建议报警笑死我了。” “前排围观，这楼里的讨论比原帖还精彩。”。

5. 【绝对禁止动作描写（最高红线）】：
   - 论坛评论中绝对禁止出现任何动作描写（如“他笑了一下”、“她低下头”、“拍了拍对方的肩膀”等）。内容仅限于纯文字表达，不包含任何描述肢体动作、神态行为的词句。
   - 如果需要表达情绪，请通过文字直接陈述感受（如：“我笑死了”、“哈哈哈哈哈”），绝对不能通过动作描写。

6. 【其他绝对禁止】：
   - 严禁机械在句尾使用句号！多使用自然口语（无标点）、波浪号~、感叹号!、问号?或省略号...。
   - 不要千篇一律开头。
   - 输出必须是严格的合法的 JSON 数组，不包含任何 Markdown 代码块包裹（如 json 格式等）或其他文字说明。

--- 【已有评论列表】 ---
${existingCommentsFormatted}

--- 【输出 JSON 格式要求】 ---
请仅输出一个 JSON 数组，数组中的每个元素必须符合以下格式：
[
  {
    "authorId": "选用的角色 id（如 char-xxx）或 npc-xxx，或者普通网民使用 'npc-random'",
    "authorName": "角色对应的 forumName，如果是 FIXED_NPC 使用其 name，如果是普通网民则从备用网名中随机挑选一个，或者你自己根据人设生成一个新潮匿名网名",
    "content": "评论文本正文（10-60字，口语化，强烈的人设口吻或网民讨论风格，绝对执行句尾标点规范，不带句号）",
    "replyToType": "post" 或 "existing_comment" 或 "generated_index",
    "replyToValue": 如果是 post 则为 null；如果是 existing_comment，则填已有评论的 floor 数值（如有）；如果是 generated_index，则填当前正在生成的数组中被回复的那条评论的 0 索引 index（必须严格小于当前评论自身的索引 index）
  }
]`;

    const responseText = await callLLM(
      settings.apiUrl,
      settings.apiKey,
      settings.model,
      [{ role: "user", content: prompt }],
      0.85
    );

    const trimmed = (responseText || "").trim();
    let generatedSpecs = [];
    try {
      const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
      generatedSpecs = JSON.parse(jsonMatch ? jsonMatch[0] : trimmed);
    } catch (e) {
      console.error("Failed to parse AI interactive comments JSON", e);
      return [];
    }

    if (!Array.isArray(generatedSpecs) || generatedSpecs.length === 0) {
      return [];
    }

    const newComments: ForumComment[] = [];
    const usedNicknames = getAllUsedNicknames(posts, privateContacts, userNickname);

    for (let i = 0; i < generatedSpecs.length; i++) {
      const spec = generatedSpecs[i];
      const specAuthorId = spec.authorId;
      
      let finalAuthorName = spec.authorName || "普通网友";
      let finalAuthorAvatar = "";
      
      const char = characters.find(ch => ch.id === specAuthorId);
      if (char) {
        const profile = getOrInitCharForumProfile(char);
        finalAuthorName = profile.forumName;
        finalAuthorAvatar = profile.avatar;
      } else {
        const npc = FIXED_NPCS.find(n => n.id === specAuthorId);
        if (npc) {
          finalAuthorName = npc.name;
          finalAuthorAvatar = getLuntanAvatar(npc.name);
        } else {
          finalAuthorName = makeUniqueNickname(finalAuthorName, usedNicknames);
          usedNicknames.add(finalAuthorName);
          finalAuthorAvatar = getLuntanAvatar(finalAuthorName);
        }
      }
      
      let replyToObj: any = undefined;
      if (spec.replyToType === "existing_comment") {
        const existingC = post.comments.find(c => c.floor === spec.replyToValue);
        if (existingC) {
          replyToObj = {
            floor: existingC.floor,
            authorName: existingC.authorName,
            content: existingC.content.length > 30 ? existingC.content.slice(0, 30) + "..." : existingC.content
          };
        }
      } else if (spec.replyToType === "generated_index" && typeof spec.replyToValue === "number" && spec.replyToValue >= 0 && spec.replyToValue < i) {
        const targetGenerated = newComments[spec.replyToValue];
        if (targetGenerated) {
          replyToObj = {
            floor: targetGenerated.floor,
            authorName: targetGenerated.authorName,
            content: targetGenerated.content.length > 30 ? targetGenerated.content.slice(0, 30) + "..." : targetGenerated.content
          };
        }
      }
      
      const nextFloor = post.comments.length + newComments.length + 1;
      
      newComments.push({
        id: Date.now().toString() + "-gen-" + i + "-" + Math.random().toString(36).substr(2, 4),
        authorId: specAuthorId || `npc-random-${i}`,
        authorName: finalAuthorName,
        authorAvatar: finalAuthorAvatar,
        content: spec.content,
        timestamp: Date.now() + i * 10,
        floor: nextFloor,
        replyTo: replyToObj,
        likes: Math.floor(Math.random() * 8),
        dislikes: 0
      });
    }

    if (newComments.length > 0) {
      if (post.authorId !== 'user') {
        let opChar = characters.find(ch => ch.id === post.authorId);
        let opName = post.authorName;
        let opDesc = opChar ? opChar.description : "论坛NPC用户";
        
        const commentsToConsider = newComments.filter(c => c.authorId !== post.authorId);
        if (commentsToConsider.length > 0) {
          const opReplyPrompt = `你现在是该论坛帖子的楼主。
楼主角色名字：${opName}
${opChar ? `楼主角色设定：${opDesc}` : ""}
原帖内容：“${post.content}”

以下是评论区里的新评论列表：
${commentsToConsider.map((c, idx) => `[评论编号 ${idx + 1}] floor: #${c.floor || (post.comments.length + idx + 1)}, 作者: ${c.authorName}, 内容: "${c.content}"`).join('\n')}

请根据你的人设性格，选择性地决定回复其中某些评论。不需要每条都回复：
- 如果你是一个活泼、热情、话唠、爱社交的角色，你应该多回复几条评论（比如 3-5 条）。
- 如果你是一个高冷、冷漠、内敛、克制、安静的角色，你应该回复得极少或不回复（比如 0-1 条）。
- 其他性格则中等（1-2 条）。
请用你的口吻和第一人称“我”写回复。

请严格返回以下格式 of JSON 数组（如果决定不回复任何评论，返回空数组 []）：
[
  {
    "commentIndex": 评论编号数字,
    "replyContent": "你的角色口吻回复内容"
  }
]`;

          try {
            const opResponse = await apiChat({
              messages: [{ role: "user", content: opReplyPrompt }],
              character: opChar || { id: "npc", name: opName, description: opDesc } as any,
              settings,
              systemInstruction: "你是一个严格按照规则输出JSON数组的API。"
            });
            
            const opResponseText = (opResponse.text || "").trim();
            let opParsed = [];
            try {
              const jsonMatch = opResponseText.match(/\[[\s\S]*\]/);
              opParsed = JSON.parse(jsonMatch ? jsonMatch[0] : opResponseText);
            } catch (e) {
              console.error("Failed to parse OP replies JSON", e);
            }

            if (Array.isArray(opParsed) && opParsed.length > 0) {
              opParsed.forEach((rep) => {
                const idx = rep.commentIndex - 1;
                const replyContent = rep.replyContent;
                if (idx >= 0 && idx < commentsToConsider.length && replyContent) {
                  const targetComment = commentsToConsider[idx];
                  newComments.push({
                    id: Date.now().toString() + "-op-reply-" + Math.random().toString(36).substr(2, 4),
                    authorId: post.authorId,
                    authorName: post.authorName,
                    authorAvatar: post.authorAvatar,
                    content: replyContent,
                    timestamp: Date.now() + 500 + Math.random() * 50,
                    floor: post.comments.length + newComments.length + 1,
                    replyTo: {
                      floor: targetComment.floor || 0,
                      authorName: targetComment.authorName,
                      content: targetComment.content.length > 30 ? targetComment.content.slice(0, 30) + "..." : targetComment.content
                    }
                  });
                }
              });
            }
          } catch (errOp) {
            console.error("OP interaction reply error:", errOp);
          }
        }
      }
    }
    return newComments;
  };

  const handleGenerateComments = async (post: ForumPost) => {
    if (isGeneratingComments || characters.length === 0) return;
    setIsGeneratingComments(true);
    
    try {
      const newComments = await generateCommentsInternal(post, "15 到 20");
      if (newComments.length === 0) {
        alert("AI 评论生成失败或格式解析失败，请重试。");
        return;
      }
      const updatedPost = { ...post, comments: [...post.comments, ...newComments] };
      setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));
      if (selectedPost && selectedPost.id === post.id) {
        setSelectedPost(updatedPost);
      }
    } catch (e) {
      console.error(e);
      alert("生成出错：" + (e)?.message);
    } finally {
      setIsGeneratingComments(false);
    }
  };

    // Generate subsequent OP Update (story progress)
  const handleGenerateOpUpdate = async (post: ForumPost) => {
    if (isGeneratingOpUpdate || post.authorId === 'user') return;
    setIsGeneratingOpUpdate(true);
    try {
      let opChar = characters.find(ch => ch.id === post.authorId);
      let opName = post.authorName;
      let opDesc = opChar ? opChar.description : "论坛NPC用户";

      const prompt = `你现在是该论坛帖子的楼主。
楼主角色名字：${opName}
${opChar ? `楼主角色设定：${opDesc}` : ""}
原帖内容：“${post.content}”

已有回复列表：
${post.comments.filter(c => !c.isRecalled).map(c => `#${c.floor} @${c.authorName}: ${c.content}`).join('\n')}

请根据之前发布的内容和网友评论，以楼主第一人称发布一篇后续更新内容（例如事件的新进展、补充细节、回应大家的疑问等）（100-250字）。
要求用楼主符合性格设定的独特口吻进行更新，情感真实接地气，不要有AI味或敷衍感。直接输出更新正文纯文本，不要包含任何Markdown包裹或修饰。`;

      const response = await apiChat({
        messages: [{ role: "user", content: prompt }],
        character: opChar || { id: "npc", name: opName, description: opDesc } as any,
        settings,
        matchedLore: loreList,
      });

      const cleanText = (response.text || "").trim();
      if (cleanText) {
        const newComment: ForumComment = {
          id: `op-update-${Date.now()}`,
          authorId: post.authorId,
          authorName: post.authorName,
          authorAvatar: post.authorAvatar,
          content: cleanText,
          timestamp: Date.now(),
          floor: post.comments.length + 1,
          isOpUpdate: true, // Marked as OP Update!
        };

        const updatedPost = {
          ...post,
          comments: [...post.comments, newComment]
        };

        setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));
        setSelectedPost(updatedPost);
        showToast("📢 楼主已发布后续更新！");
      }
    } catch (e) {
      console.error(e);
      alert("生成楼主更新失败，请重试");
    } finally {
      setIsGeneratingOpUpdate(false);
    }
  };

  // Manual OP Interact to reply to comments in character
  const handleOpInteract = async (post: ForumPost) => {
    if (isGeneratingOpInteract || post.authorId === 'user') return;
    
    // Check if there are any comments to reply to
    const commentsToReply = post.comments.filter(c => c.authorId !== post.authorId && !c.isRecalled);
    if (commentsToReply.length === 0) {
      alert("评论区还没有其他人的回复，请先让其他角色评论或自己发表回复！");
      return;
    }

    setIsGeneratingOpInteract(true);
    try {
      let opChar = characters.find(ch => ch.id === post.authorId);
      let opName = post.authorName;
      let opDesc = opChar ? opChar.description : "论坛NPC用户";

      const opReplyPrompt = `你现在是该论坛帖子的楼主。
楼主角色名字：${opName}
${opChar ? `楼主角色设定：${opDesc}` : ""}
原帖内容：“${post.content}”

以下是整个评论区里的评论列表：
${commentsToReply.map((c, idx) => `[评论编号 ${idx + 1}] floor: #${c.floor}, 作者: ${c.authorName}, 内容: "${c.content}"`).join('\n')}

请根据你的人设性格，选择性地决定回复其中某些评论。不需要每条都回复：
- 如果你是一个活泼、热情、话唠、爱社交的角色，你应该多回复几条评论（比如 2-3 条）。
- 如果你是一个高冷、冷漠、内敛、克制、安静的角色，你应该回复得极少或不回复（比如 0-1 条）。
- 其他性格则中等（1-2 条）。
请用你作为该角色的口吻和第一人称“我”写回复。

请严格返回以下格式 of JSON 数组（如果决定不回复任何评论，返回空数组 []）：
[
  {
    "commentIndex": 评论编号数字,
    "replyContent": "你的角色口吻回复内容"
  }
]`;

      const response = await apiChat({
        messages: [{ role: "user", content: opReplyPrompt }],
        character: opChar || { id: "npc", name: opName, description: opDesc } as any,
        settings,
        matchedLore: loreList,
        systemInstruction: "你是一个严格按照规则输出JSON数组的API。"
      });

      const responseText = (response.text || "").trim();
      let opParsed = [];
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        opParsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      } catch (e) {
        console.error("Failed to parse OP replies JSON", e);
      }

      if (Array.isArray(opParsed) && opParsed.length > 0) {
        const newComments: ForumComment[] = [];
        opParsed.forEach((rep: any) => {
          const idx = rep.commentIndex - 1;
          const replyContent = rep.replyContent;
          if (idx >= 0 && idx < commentsToReply.length && replyContent) {
            const targetComment = commentsToReply[idx];
            
            newComments.push({
              id: Date.now().toString() + "-op-reply-" + Math.random().toString(36).substr(2, 4),
              authorId: post.authorId,
              authorName: post.authorName,
              authorAvatar: post.authorAvatar,
              content: replyContent,
              timestamp: Date.now() + 50,
              floor: post.comments.length + newComments.length + 1,
              replyTo: {
                floor: targetComment.floor || 0,
                authorName: targetComment.authorName,
                content: targetComment.content.length > 30 ? targetComment.content.slice(0, 30) + "..." : targetComment.content
              }
            });
          }
        });

        if (newComments.length > 0) {
          const updatedPost = {
            ...post,
            comments: [...post.comments, ...newComments]
          };
          setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));
          setSelectedPost(updatedPost);
          showToast(`💬 楼主互动完毕，新增了 ${newComments.length} 条楼主回复！`);
        } else {
          showToast("楼主看了一眼评论区，高冷地选择了不予回复 🤫");
        }
      } else {
        showToast("楼主看了一眼评论区，感觉没什么好回复的 🤫");
      }
    } catch (e) {
      console.error(e);
      alert("楼主互动失败，请重试");
    } finally {
      setIsGeneratingOpInteract(false);
    }
  };

  // User Post Handler
  const handleCreateUserPost = () => {
    if (!userPostContent.trim()) {
      alert("请输入帖子内容！");
      return;
    }
    const targetBoardId = userPostBoardId || activeBoardId || boards[0]?.id || 'board-1';
    const newPost: ForumPost = {
      id: `user-post-${Date.now()}`,
      boardId: targetBoardId,
      authorId: 'user',
      authorName: userNickname,
      authorAvatar: userAvatar,
      title: "匿名帖子",
      content: userPostContent.trim(),
      tag: userPostTag || "日常",
      timestamp: Date.now(),
      likes: 0,
      comments: []
    };

    setPosts(prev => [newPost, ...prev]);
    setUserPostContent("");
    setIsUserPostModalOpen(false);
  };

  // Add User Comment
  const handleAddUserComment = () => {
    if (!selectedPost || !replyText.trim()) return;

    const newComment: ForumComment = {
      id: `user-comment-${Date.now()}`,
      authorId: 'user',
      authorName: userNickname,
      authorAvatar: userAvatar,
      content: replyText.trim(),
      timestamp: Date.now(),
      floor: selectedPost.comments.length + 1,
      isOpUpdate: (selectedPost.authorId === 'user' && isUserOpUpdate) ? true : undefined,
      replyTo: replyingToComment ? {
        floor: replyingToComment.floor,
        authorName: replyingToComment.authorName,
        content: replyingToComment.content.length > 30 ? replyingToComment.content.slice(0, 30) + "..." : replyingToComment.content
      } : undefined
    };

    const updatedPost = {
      ...selectedPost,
      comments: [...selectedPost.comments, newComment]
    };

    setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
    setSelectedPost(updatedPost);
    setReplyText("");
    setReplyingToComment(null);
    setIsUserOpUpdate(false);
  };

  const handleCommentTouchStart = (e: React.TouchEvent | React.MouseEvent, comment: ForumComment) => {
    if (comment.authorId !== 'user') return;
    
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    longPressTimeoutRef.current = setTimeout(() => {
      setActiveCommentMenu({ comment, x: clientX, y: clientY });
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleCommentTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleCommentContextMenu = (e: React.MouseEvent, comment: ForumComment) => {
    if (comment.authorId !== 'user') return;
    e.preventDefault();
    setActiveCommentMenu({ comment, x: e.clientX, y: e.clientY });
  };

  // Refresh Private Message Requests (AI Generate Contact DM)
  const handleRefreshPrivateMessages = async () => {
    if (isGeneratingPrivateRequest) return;
    setIsGeneratingPrivateRequest(true);

    try {
      const useNpc = characters.length === 0 || Math.random() < 0.4;
      let contactId = "";
      let contactName = "";
      let contactAvatar = "";
      let isNpc = false;
      let char: Character | undefined = undefined;

      if (!useNpc && characters.length > 0) {
        const randomChar = characters[Math.floor(Math.random() * characters.length)];
        char = randomChar;
        const profile = getOrInitCharForumProfile(randomChar);
        contactId = `private-char-${randomChar.id}-${Date.now()}`;
        contactName = profile.forumName;
        contactAvatar = profile.avatar;
      } else {
        const npc = FIXED_NPCS[Math.floor(Math.random() * FIXED_NPCS.length)];
        contactId = `private-npc-${npc.id}-${Date.now()}`;
        contactName = npc.name;
        contactAvatar = getLuntanAvatar(npc.name);
        isNpc = true;
      }

      const prompt = char
        ? `你是角色：${char.name}（在匿名论坛的昵称是：${contactName}）。
你在论坛遇到了网友（昵称：${userNickname}），你想向对方主动发一条私信搭讪或提出交流（比如看到对方的发言很有趣、或者有共同话题）。
请以你的口吻写一条搭讪私信（20-60字）。直接输出私信正文，不要包含Markdown包裹。`
        : `你是网络论坛网民“${contactName}”。
你想主动发一条论坛私信给网友“${userNickname}”（比如询问某个论坛热门话题、分享八卦、或者打招呼）。
请写一条有特色的开场白私信（20-60字）。直接输出私信正文，不要包含Markdown包裹。`;

      const response = await apiChat({
        messages: [{ role: "user", content: prompt }],
        character: char || { id: "npc", name: contactName, description: "论坛NPC" } as any,
        memories: char?.memories || [],
        matchedLore: loreList,
        settings
      });

      const initText = (response.text || "").trim() || "嗨，在论坛看到你的帖子，特地发私信打个招呼！";

      const newContact: PrivateContact = {
        id: contactId,
        name: contactName,
        avatar: contactAvatar,
        isNpc,
        character: char,
        subtitle: isNpc ? "论坛NPC" : `角色: ${char?.name}`,
        lastMsg: initText,
        lastTime: Date.now()
      };

      const initialMsg: PrivateMessage = {
        id: `msg-${Date.now()}`,
        sender: 'contact',
        text: initText,
        timestamp: Date.now()
      };

      const msgKey = `mobile_ai_forum_dm_msgs_${contactId}`;
      localStorage.setItem(msgKey, JSON.stringify([initialMsg]));

      setPrivateContacts(prev => [newContact, ...prev]);
    } catch (e) {
      console.error("Failed to generate private message request:", e);
      alert("刷新接收私信失败，请稍后重试。");
    } finally {
      setIsGeneratingPrivateRequest(false);
    }
  };

  // Open In-Forum Private Chat
  const openPrivateChat = (contact: PrivateContact) => {
    setActivePrivateContact(contact);
    const key = `mobile_ai_forum_dm_msgs_${contact.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setPrivateMessages(JSON.parse(stored));
      } catch (e) {
        setPrivateMessages([]);
      }
    } else {
      const initialMsg: PrivateMessage = {
        id: `init-${Date.now()}`,
        sender: 'contact',
        text: contact.lastMsg || (contact.isNpc 
          ? `嗨，我是${contact.name}，很高兴在论坛遇到你！`
          : `哈啰，我是在论坛里用的网名 ${contact.name}，很高兴认识你！`),
        timestamp: contact.lastTime || Date.now()
      };
      setPrivateMessages([initialMsg]);
      localStorage.setItem(key, JSON.stringify([initialMsg]));
    }
  };

  useEffect(() => {
    if (activePrivateContact) {
      privateChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [privateMessages, isContactTyping, activePrivateContact]);

  // Send User Private Message (only appends user message, does not trigger AI reply)
  const handleSendUserPrivateMessage = () => {
    if (!activePrivateContact || !privateInputText.trim() || isContactTyping) return;

    const userMsgText = privateInputText.trim();
    setPrivateInputText("");

    const userMsg: PrivateMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: Date.now()
    };

    const updatedMsgs = [...privateMessages, userMsg];
    setPrivateMessages(updatedMsgs);
    const key = `mobile_ai_forum_dm_msgs_${activePrivateContact.id}`;
    localStorage.setItem(key, JSON.stringify(updatedMsgs));

    // Update lastMsg in privateContacts list
    setPrivateContacts(prev => prev.map(c => c.id === activePrivateContact.id ? { ...c, lastMsg: userMsgText, lastTime: Date.now() } : c));
  };

  // Trigger AI Reply (reads context of the conversation and replies sequentially sentence by sentence)
  const handleTriggerAiReply = async () => {
    if (!activePrivateContact || isContactTyping) return;

    setIsContactTyping(true);
    const key = `mobile_ai_forum_dm_msgs_${activePrivateContact.id}`;

    try {
      // 1. Context extraction: read last 15 messages for rich context
      const recentMsgs = privateMessages.slice(-15);
      const historyContext = recentMsgs.length > 0
        ? `【当前私聊上下文历史记录（请务必连贯地接续该对话，保持话题一致，避免答非所问）：】\n${recentMsgs.map(m => `${m.sender === 'user' ? '用户' : activePrivateContact.name}: ${m.text}`).join("\n")}`
        : "【无此前对话历史，这是一个新对话，你可以先热情地打个招呼或发起一个话题】";

      let replyText = "";
      if (activePrivateContact.character) {
        const char = activePrivateContact.character;
        const prompt = `你正在与用户进行论坛私聊。
你的论坛网名是“${activePrivateContact.name}”，真实身份是：${char.name}（${char.description}）。

${historyContext}

请以符合你性格和论坛私聊的调性，回复该对话（回复内容应该是一句或几句自然连贯的话，30-100字，以描述或聊天为主）。请直接输出回复正文，不要包含Markdown语法或任何包裹字符。`;

        const response = await apiChat({
          messages: [{ role: "user", content: prompt }],
          character: char,
          memories: char.memories || [],
          matchedLore: loreList,
          settings
        });
        replyText = (response.text || "").trim();
      } else {
        const prompt = `你是网络论坛网民“${activePrivateContact.name}”。
你正在与一个论坛网友进行私聊。

${historyContext}

请以符合你网名特点的幽默、接地气的网友口吻，回复该对话（30-80字）。请直接输出回复正文，不要包含Markdown语法或任何包裹字符。`;

        const response = await apiChat({
          messages: [{ role: "user", content: prompt }],
          character: { id: "npc", name: activePrivateContact.name, description: "论坛NPC" } as any,
          settings
        });
        replyText = (response.text || "").trim();
      }

      if (replyText) {
        // 2. Sentences splitting: split the paragraph by punctuation (。, ！, ？, ., !, ?)
        const splitIntoSentences = (text: string): string[] => {
          if (!text) return [];
          const parts = text.split(/([。！？\n!?.])/);
          const result: string[] = [];
          let current = "";
          for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            if (!p) continue;
            if (/[。！？\n!?.]/.test(p)) {
              current += p;
              const trimmed = current.trim();
              if (trimmed) {
                result.push(trimmed);
              }
              current = "";
            } else {
              current += p;
            }
          }
          if (current.trim()) {
            result.push(current.trim());
          }
          return result.filter(s => s.trim().length > 0);
        };

        const sentences = splitIntoSentences(replyText);

        // 3. Sequential transmission with typing simulation
        for (let i = 0; i < sentences.length; i++) {
          const sentence = sentences[i];
          setIsContactTyping(true);

          // Simulation delay based on string length (80ms per char, min 800ms, max 2000ms)
          const typingTime = Math.max(800, Math.min(2000, sentence.length * 80));
          await new Promise(resolve => setTimeout(resolve, typingTime));

          const replyMsg: PrivateMessage = {
            id: `contact-${Date.now()}-${i}`,
            sender: 'contact',
            text: sentence,
            timestamp: Date.now()
          };

          setPrivateMessages(prev => {
            const finalMsgs = [...prev, replyMsg];
            localStorage.setItem(key, JSON.stringify(finalMsgs));
            return finalMsgs;
          });

          setPrivateContacts(prev => prev.map(c => c.id === activePrivateContact.id ? { ...c, lastMsg: sentence, lastTime: Date.now() } : c));
        }
      }
    } catch (e) {
      console.error("Private chat reply error:", e);
    } finally {
      setIsContactTyping(false);
    }
  };

  const handleDeleteContact = (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      title: "删除私信",
      message: "确定要删除这条私信记录吗？删除后不可恢复",
      onConfirm: () => {
        setPrivateContacts(prev => prev.filter(c => c.id !== contactId));
        localStorage.removeItem(`mobile_ai_forum_dm_msgs_${contactId}`);
        showToast("已删除私信记录");
        setTimeout(() => setConfirmDialog(null), 10);
      }
    });
  };

  const renderBoardIcon = (icon: Board['icon']) => {
    switch (icon) {
      case 'love': return <HeartIcon className="w-6 h-6 text-neutral-900" />;
      case 'skull': return <Skull className="w-6 h-6 text-neutral-900" />;
      case 'phone': return <Smartphone className="w-6 h-6 text-neutral-900" />;
      case 'plus': return <Plus className="w-6 h-6 text-neutral-900" />;
    }
  };

  // User comments list for "我的" -> "发表的评论"
  const userCommentsList = posts.flatMap(p => 
    p.comments.filter(c => c.authorId === 'user').map(c => ({ comment: c, post: p }))
  );

  return (
    <div className="flex-1 flex flex-col bg-neutral-50 text-neutral-900 select-none animate-slide-up h-full min-h-0 relative  overflow-hidden">
      
      {/* Detail View Overlay for Post */}
      {selectedPost && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col animate-slide-left">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white shrink-0">
            <button onClick={() => { setSelectedPost(null); setReplyingToComment(null); setReplyText(""); setShowOpOnly(false); setIsUserOpUpdate(false); }} className="p-1 -ml-1 text-neutral-500 hover:text-black">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-sm">帖子详情</span>
            <button 
              onClick={(e) => toggleBookmark(selectedPost.id, e)}
              className="p-1 text-neutral-500 hover:text-amber-500 transition-colors"
            >
              <Bookmark className={`w-5 h-5 ${userBookmarks.includes(selectedPost.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 space-y-4">
            {/* Post Main Card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 space-y-3 max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CharacterAvatar 
                    character={characters.find(ch => ch.id === selectedPost.authorId)} 
                    avatar={selectedPost.authorAvatar} 
                    name={selectedPost.authorName} 
                    size={40} 
                    className="rounded-full border border-neutral-200/50" 
                  />
                  <div>
                    <div className="text-sm font-bold text-neutral-900">{selectedPost.authorName}</div>
                    <div className="text-[10px] text-neutral-400">{formatTime(selectedPost.timestamp)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2.5 py-1 rounded-full font-medium">
                    {selectedPost.tag}
                  </span>
                </div>
              </div>
              {selectedPost.isFoundPhone && selectedPost.title && (
                <div className="font-bold text-base text-neutral-900 mb-2">{selectedPost.title}</div>
              )}
              {selectedPost.isFoundPhone && selectedPost.chatLogs && Array.isArray(selectedPost.chatLogs) ? (
                <div className="bg-neutral-100 rounded-xl h-[400px] overflow-y-auto p-4 space-y-3 relative shadow-inner border border-neutral-200">
                  <div className="text-[10px] text-neutral-400 text-center mb-4">聊天记录开始</div>
                  {selectedPost.chatLogs.map((log: any, idx: number) => (
                    <div key={idx} className={`flex flex-col max-w-[80%] ${log.isRight ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <div className="text-[10px] text-neutral-400 mb-1 flex items-center gap-1.5">
                        <span className="font-bold text-neutral-500">{log.sender}</span>
                        <span>{log.time}</span>
                      </div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed font-medium shadow-sm ${log.isRight ? 'bg-black text-white rounded-tr-xs' : 'bg-neutral-200 text-neutral-800 rounded-tl-xs'}`}>
                        {log.content}
                      </div>
                    </div>
                  ))}
                  <div className="text-[10px] text-neutral-400 text-center mt-4 pt-4">没有更多消息了</div>
                </div>
              ) : (
                <p className="text-[13px] text-neutral-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedPost.content}
                </p>
              )}

              {/* Post Interactive Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs text-neutral-500">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={(e) => handleLikePost(selectedPost.id, e)} 
                    className={`flex items-center gap-1 font-medium transition-colors ${selectedPost.isLiked ? 'text-neutral-900 font-bold' : 'hover:text-black'}`}
                    title={selectedPost.isLiked ? "取消点赞" : "点赞"}
                  >
                    <ThumbsUp className={`w-4 h-4 ${selectedPost.isLiked ? 'fill-neutral-900 text-neutral-900' : ''}`} />
                    <span>{selectedPost.likes || 0}</span>
                  </button>
                  <button 
                    onClick={(e) => handleDislikePost(selectedPost.id, e)} 
                    className="flex items-center gap-1 hover:text-black font-medium transition-colors"
                    title="点踩"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>{selectedPost.dislikes || 0}</span>
                  </button>
                  <button 
                    onClick={() => { setReplyingToComment(null); }} 
                    className="flex items-center gap-1 hover:text-black font-medium transition-colors"
                    title="回复帖子"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>回复</span>
                  </button>
                  <button 
                    onClick={() => setShareModalData({ type: 'post', itemContent: selectedPost.content, postId: selectedPost.id })} 
                    className="flex items-center gap-1 hover:text-black font-medium transition-colors"
                    title="分享给角色"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>分享</span>
                  </button>
                </div>

                <button 
                    onClick={(e) => handleDeletePost(selectedPost.id, e)} 
                    className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium transition-colors"
                    title="删除帖子"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除</span>
                  </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 px-1 pt-2 max-w-2xl mx-auto">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-neutral-900">全部回复 ({selectedPost.comments.filter(c => !c.isRecalled).length})</span>
                  <button
                    onClick={() => setShowOpOnly(prev => !prev)}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border transition-all ${
                      showOpOnly
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {showOpOnly ? "🟢 只看楼主" : "只看楼主"}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button 
                    onClick={() => handleGenerateComments(selectedPost)}
                    disabled={isGeneratingComments}
                    className="text-[11px] font-bold bg-neutral-900 hover:bg-black text-white px-2.5 py-1.5 rounded-full flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingComments ? 'animate-spin' : ''}`} />
                    {isGeneratingComments ? "生成中..." : "AI评论"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 pb-4 max-w-2xl mx-auto">
              {(() => {
                const map = new Map<number, any>();
                const topLevel: any[] = [];
                
                const sorted = [...selectedPost.comments].sort((a, b) => b.timestamp - a.timestamp);
                sorted.forEach(c => map.set(c.floor, { ...c, children: [], level: 0 }));
                
                sorted.forEach(c => {
                  const tc = map.get(c.floor)!;
                  if (c.replyTo && map.has(c.replyTo.floor)) {
                    const parent = map.get(c.replyTo.floor)!;
                    // Limit depth to 2 levels
                    tc.level = Math.min(parent.level + 1, 1);
                    parent.children.push(tc);
                  } else {
                    topLevel.push(tc);
                  }
                });
                
                const renderCommentNode = (c: any) => {
                  if (showOpOnly && c.authorId !== selectedPost.authorId && !c.isOpUpdate) {
                    return null;
                  }
                  
                  const isExpanded = expandedReplies[c.id];
                  
                  return (
                    <div key={c.id} className={`${c.level > 0 ? (c.level === 1 ? 'ml-6' : c.level === 2 ? 'ml-10' : 'ml-14') : ''}`}>
                      {(() => {
                        if (c.isRecalled) {
                          return (
                            <div className="bg-white rounded-xl p-3 shadow-xs border border-neutral-100 text-xs text-neutral-400 italic flex items-center justify-between mb-3">
                              <span>#{c.floor} [该评论已被作者撤回]</span>
                              <span className="text-[10px]">{formatTime(c.timestamp)}</span>
                            </div>
                          );
                        }
                        const isUserComment = c.authorId === 'user';
                        return (
                          <div 
                            onMouseDown={(e) => handleCommentTouchStart(e, c)}
                            onMouseUp={handleCommentTouchEnd}
                            onMouseLeave={handleCommentTouchEnd}
                            onTouchStart={(e) => handleCommentTouchStart(e, c)}
                            onTouchEnd={handleCommentTouchEnd}
                            onContextMenu={(e) => handleCommentContextMenu(e, c)}
                            className={`bg-white rounded-xl p-3 shadow-xs border flex gap-3 relative transition-all mb-3 ${
                              isUserComment 
                                ? 'border-neutral-200 hover:border-neutral-400 cursor-pointer hover:shadow-sm select-none' 
                                : 'border-neutral-100 hover:border-neutral-300'
                            }`}
                            title={isUserComment ? "长按或右键弹出编辑/复制/删除菜单" : undefined}
                          >
                            <CharacterAvatar 
                              character={characters.find(ch => ch.id === c.authorId)} 
                              avatar={c.authorAvatar} 
                              name={c.authorName} 
                              size={32} 
                              className="rounded-full shrink-0 border border-neutral-200/50" 
                            />
                            <div className="flex-1 space-y-2.5 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-neutral-900">{c.authorName}</span>
                                  {c.authorId === selectedPost.authorId && (
                                    <span className="text-[9px] bg-neutral-900 text-white px-1.5 py-0.5 rounded-sm font-bold shrink-0">
                                      楼主
                                    </span>
                                  )}
                                  {c.isOpUpdate && (
                                    <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5 shrink-0 animate-pulse">
                                      📢 楼主更新
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-neutral-400">#{c.floor}</span>
                              </div>
                              
                              {c.level > 0 && c.replyTo && (
                                <div className="text-[10px] text-neutral-400 mb-1">
                                  回复 @{c.replyTo.authorName}
                                </div>
                              )}
                              
                              {/* Remove old replyTo display to avoid duplication */}
                              {editingCommentId === c.id ? (
                                <div className="space-y-2">
                                  <textarea 
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    className="w-full bg-neutral-50 p-2 text-xs border border-neutral-300 rounded-lg outline-none resize-none"
                                    rows={2}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button 
                                      onClick={() => setEditingCommentId(null)}
                                      className="text-[11px] px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 rounded font-medium text-neutral-600"
                                    >
                                      取消
                                    </button>
                                    <button 
                                      onClick={() => handleSaveEditComment(c.id)}
                                      className="text-[11px] px-2.5 py-1 bg-black text-white rounded font-medium"
                                    >
                                      保存
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-neutral-800 font-medium break-all whitespace-pre-wrap leading-relaxed">
                                  {c.content}
                                </p>
                              )}
                              <div className="text-[11px] text-neutral-400 pt-1 flex items-center justify-between border-t border-neutral-50">
                                <span>{formatTime(c.timestamp)}</span>
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => handleLikeComment(c.id)}
                                    className={`flex items-center gap-1 font-medium transition-colors ${c.isLiked ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-black'}`}
                                    title={c.isLiked ? "取消点赞" : "点赞评论"}
                                  >
                                    <ThumbsUp className={`w-3.5 h-3.5 ${c.isLiked ? 'fill-neutral-900 text-neutral-900' : ''}`} />
                                    <span>{c.likes || 0}</span>
                                  </button>
                                  <button 
                                    onClick={() => handleDislikeComment(c.id)}
                                    className="flex items-center gap-1 text-neutral-400 hover:text-black font-medium transition-colors"
                                    title="点踩评论"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    <span>{c.dislikes || 0}</span>
                                  </button>
                                  <button 
                                    onClick={() => setReplyingToComment(c)}
                                    className="flex items-center gap-1 text-neutral-400 hover:text-black font-medium transition-colors"
                                    title="回复此评论"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>回复</span>
                                  </button>
                                  <button 
                                    onClick={() => setShareModalData({ type: 'comment', itemContent: c.content, postId: selectedPost.id, commentId: c.id })}
                                    className="flex items-center gap-1 text-neutral-400 hover:text-black font-medium transition-colors"
                                    title="分享给角色"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>分享</span>
                                  </button>
                                  {!isUserComment && (
                                    <button 
                                      onClick={() => handleCopyComment(c.content)}
                                      className="text-neutral-400 hover:text-black transition-colors"
                                      title="复制内容"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {c.children.length > 0 && (
                        <div className="mb-2 mt-[-4px]">
                          <button
                            onClick={() => setExpandedReplies(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                            className="text-[11px] font-bold text-neutral-500 hover:text-black transition-colors flex items-center gap-1 mb-2 bg-neutral-100/50 px-2 py-1 rounded-md"
                          >
                            <span className="w-4 h-0.5 bg-neutral-400 rounded inline-block" />
                            {isExpanded ? "收起回复" : `展开 ${c.children.length} 条回复`}
                          </button>
                          {isExpanded && (
                            <div className="space-y-1">
                              {c.children.map((child: any) => renderCommentNode(child))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                };

                return topLevel.reverse().map(renderCommentNode);
              })()}
              {selectedPost.comments.length === 0 && (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  暂无回复，在下方输入内容回复帖子或点击右上角 AI 生成
                </div>
              )}
            </div>
          </div>

          {/* Fixed Reply Input Box at Bottom */}
          <div className="shrink-0 bg-white border-t border-neutral-100 p-3 shadow-lg z-20">
            <div className="max-w-2xl mx-auto">
              {replyingToComment && (
                <div className="flex items-center justify-between text-xs bg-neutral-100 px-3 py-1.5 rounded-lg mb-2 text-neutral-600">
                  <span className="truncate">回复 #{replyingToComment.floor} @{replyingToComment.authorName}</span>
                  <button onClick={() => setReplyingToComment(null)} className="p-0.5 hover:text-black shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {selectedPost.authorId === 'user' && (
                <div className="flex items-center gap-1.5 mb-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-600 hover:text-black select-none">
                    <input
                      type="checkbox"
                      checked={isUserOpUpdate}
                      onChange={(e) => setIsUserOpUpdate(e.target.checked)}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-3.5 h-3.5 cursor-pointer accent-black"
                    />
                    <span className="font-medium text-[11px]">标记为「楼主更新」📢</span>
                  </label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddUserComment(); }}
                  placeholder={replyingToComment ? `回复 #${replyingToComment.floor} @${replyingToComment.authorName}...` : "说点什么吧..."}
                  className="flex-1 bg-neutral-100 rounded-full px-4 py-2.5 text-xs outline-none text-neutral-900 border border-neutral-200/60 focus:border-neutral-800"
                />
                <button 
                  onClick={handleAddUserComment}
                  disabled={!replyText.trim()}
                  className="bg-black text-white px-4 py-2.5 rounded-full text-xs font-bold disabled:opacity-40 active:scale-95 transition-all shrink-0 flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0 shadow-sm z-10 relative">
        <button
          onClick={onClose}
          className="p-1 -ml-1 text-neutral-500 hover:text-black rounded-lg active:scale-95 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className=" font-bold text-base tracking-wide text-neutral-950">
          {activeTab === 'public' ? '匿名论坛' : activeTab === 'private' ? '论坛私信' : '我的'}
        </span>
        <div className="w-8 flex items-center justify-end">
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-neutral-50 relative overflow-hidden">
        
        {/* PUBLIC SQUARE TAB */}
        {activeTab === 'public' && (
          <div className="flex-1 min-h-0 flex flex-row bg-neutral-50 relative overflow-hidden h-full">
            {/* Sidebar */}
            <div className="w-16 flex flex-col items-center py-4 bg-white border-r border-neutral-100 space-y-4 shrink-0 overflow-y-auto">
              {boards.map(board => (
                <button 
                  key={board.id} 
                  onClick={() => setActiveBoardId(board.id)}
                  className={`p-3 rounded-2xl transition-all ${activeBoardId === board.id ? 'bg-neutral-100 border border-neutral-300 shadow-xs' : 'hover:bg-neutral-50 opacity-70 hover:opacity-100'}`}
                  title={board.name}
                >
                  {renderBoardIcon(board.icon)}
                </button>
              ))}
              <button 
                onClick={() => openEditBoardModal(null)}
                className="p-3 rounded-2xl border-2 border-dashed border-neutral-200 hover:bg-neutral-50 transition-colors"
                title="新建板块"
              >
                {renderBoardIcon('plus')}
              </button>
            </div>

            {/* Main Board Post List */}
            <div className="flex-1 flex flex-col overflow-hidden relative h-full">
              {!activeBoardId && (
                <div className="flex-1 p-4 flex flex-col items-center justify-center text-neutral-400 text-sm gap-2">
                  <Compass className="w-8 h-8 text-neutral-300" />
                  <span>请在左侧选择一个板块开始交流</span>
                </div>
              )}

              {activeBoardId && (
                <div className="flex-1 flex flex-col overflow-hidden h-full">
                  <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-neutral-100 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900">{boards.find(b => b.id === activeBoardId)?.name}</span>
                      <button 
                        onClick={() => handleOpenGenModal(activeBoardId)}
                        disabled={isGeneratingPosts}
                        className="text-xs font-bold bg-neutral-900 hover:bg-black text-white px-2.5 py-1 rounded-full flex items-center gap-1 transition-all shadow-xs disabled:opacity-50"
                        title="AI 生成帖子"
                      >
                        <Sparkles className={`w-3 h-3 text-white ${isGeneratingPosts ? 'animate-spin' : ''}`} />
                        <span>{isGeneratingPosts ? "生成中..." : "AI 生成"}</span>
                      </button>
                    </div>
                    <button onClick={() => openEditBoardModal(boards.find(b => b.id === activeBoardId) || null)} className="text-xs font-bold text-neutral-500 hover:text-black">
                      编辑
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {posts.filter(p => p.boardId === activeBoardId).map(post => (
                      <div 
                        key={post.id} 
                        onClick={() => setSelectedPost(post)}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 cursor-pointer active:scale-[0.99] transition-transform relative hover:border-neutral-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                             <CharacterAvatar 
                               character={characters.find(ch => ch.id === post.authorId)} 
                               avatar={post.authorAvatar} 
                               name={post.authorName} 
                               size={28} 
                               className="rounded-full border border-neutral-200/50" 
                             />
                             <div className="text-xs font-bold text-neutral-900">{post.authorName}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-neutral-50 text-neutral-500 px-2 py-0.5 rounded border border-neutral-100">
                              {post.tag}
                            </span>
                            <button 
                              onClick={(e) => toggleBookmark(post.id, e)}
                              className="p-1 text-neutral-400 hover:text-amber-500 transition-colors"
                              title="收藏"
                            >
                              <Bookmark className={`w-4 h-4 ${userBookmarks.includes(post.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                            </button>
                            <button 
                              onClick={(e) => handleDeletePost(post.id, e)}
                              className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                              title="删除帖子"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {post.isFoundPhone && post.title && (
                          <div className="font-bold text-[13px] text-neutral-900 mb-2">{post.title}</div>
                        )}
                        <p className="text-[13px] text-neutral-800 leading-relaxed font-medium mb-3 line-clamp-3 whitespace-pre-wrap">
                          {post.isFoundPhone ? (post.chatLogs ? "[聊天记录] " + (post.chatLogs.length > 0 ? post.chatLogs[0].content : "") : post.content) : post.content}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-50">
                          <span>{formatTime(post.timestamp)}</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => handleLikePost(post.id, e)}
                              className={`flex items-center gap-1 font-medium transition-colors ${post.isLiked ? 'text-neutral-900 font-bold' : 'text-neutral-500 hover:text-black'}`}
                              title={post.isLiked ? "取消点赞" : "点赞"}
                            >
                              <ThumbsUp className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-neutral-900 text-neutral-900' : ''}`} />
                              <span>{post.likes || 0}</span>
                            </button>
                            <span className="flex items-center gap-1 text-neutral-500 font-medium">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {post.comments.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {posts.filter(p => p.boardId === activeBoardId).length === 0 && (
                      <div className="text-center py-16 text-neutral-400 text-xs flex flex-col items-center gap-2">
                        <span>此板块暂无帖子</span>
                        <div className="flex items-center gap-2 mt-2">
                          <button 
                            onClick={() => setIsUserPostModalOpen(true)}
                            className="text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-4 py-2 rounded-full transition-all"
                          >
                            手动发布帖子
                          </button>
                          <button 
                            onClick={() => handleOpenGenModal(activeBoardId)}
                            disabled={isGeneratingPosts}
                            className="text-xs font-bold bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-full flex items-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingPosts ? 'animate-spin' : ''}`} />
                            {isGeneratingPosts ? "生成中..." : "AI 生成帖子"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRIVATE MESSAGE TAB */}
        {activeTab === 'private' && (
          <div className="flex-1 min-h-0 flex flex-col bg-neutral-50 overflow-hidden relative h-full">
            {activePrivateContact ? (
              /* In-Forum Private Chat View (NO CHAT SETTINGS ICON IN TOP RIGHT) */
              <div className="flex-1 flex flex-col bg-neutral-50 h-full min-h-0 relative overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0 shadow-sm">
                  <button 
                    onClick={() => setActivePrivateContact(null)} 
                    className="p-1 -ml-1 text-neutral-600 hover:text-black flex items-center gap-1 text-xs font-bold"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>返回私信</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <CharacterAvatar 
                      character={activePrivateContact.character} 
                      avatar={activePrivateContact.avatar} 
                      name={activePrivateContact.name} 
                      size={28} 
                      className="rounded-full border border-neutral-200/50" 
                    />
                    <div className="text-center">
                      <div className="text-xs font-bold text-neutral-900">{activePrivateContact.name}</div>
                      {activePrivateContact.subtitle && (
                        <div className="text-[10px] text-neutral-400">{activePrivateContact.subtitle}</div>
                      )}
                    </div>
                  </div>
                  <div className="w-16" /> {/* Spacer without settings icon */}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-2xl w-full mx-auto">
                  {privateMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <img 
                        src={msg.sender === 'user' ? userAvatar : activePrivateContact.avatar} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-200/50 bg-neutral-100" 
                      />
                      <div className="space-y-1">
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed font-medium break-all whitespace-pre-wrap shadow-xs ${
                          msg.sender === 'user' 
                            ? 'bg-neutral-900 text-white rounded-tr-xs' 
                            : 'bg-white text-neutral-900 border border-neutral-100 rounded-tl-xs'
                        }`}>
                          {msg.text}
                        </div>
                        <div className={`text-[10px] text-neutral-400 px-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isContactTyping && (
                    <div className="flex gap-2.5 mr-auto max-w-[85%] items-center">
                      <CharacterAvatar 
                        character={activePrivateContact.character} 
                        avatar={activePrivateContact.avatar} 
                        name={activePrivateContact.name} 
                        size={32} 
                        className="shrink-0 border border-neutral-200/50" 
                      />
                      <div className="bg-white border border-neutral-100 px-3 py-2 rounded-2xl rounded-tl-xs text-xs text-neutral-400 flex items-center gap-1.5 shadow-xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                        <span>对方正在输入...</span>
                      </div>
                    </div>
                  )}
                  <div ref={privateChatEndRef} />
                </div>

                <div className="shrink-0 bg-white border-t border-neutral-100 p-3 shadow-lg z-20">
                  <div className="max-w-2xl mx-auto flex items-center gap-2">
                    <input 
                      type="text"
                      value={privateInputText}
                      onChange={(e) => setPrivateInputText(e.target.value)}
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter') {
                          handleSendUserPrivateMessage(); 
                        } 
                      }}
                      placeholder={`私信 ${activePrivateContact.name}...`}
                      className="flex-1 bg-neutral-100 rounded-full px-4 py-2.5 text-xs outline-none text-neutral-900 border border-neutral-200/60 focus:border-neutral-800"
                    />
                    <button 
                      onClick={handleSendUserPrivateMessage}
                      disabled={!privateInputText.trim() || isContactTyping}
                      className="bg-black text-white p-2.5 rounded-full text-xs font-bold disabled:opacity-40 active:scale-95 transition-all shrink-0 flex items-center justify-center w-9 h-9"
                      title="发送消息"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={handleTriggerAiReply}
                      disabled={isContactTyping}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-full text-xs font-bold disabled:opacity-75 disabled:cursor-not-allowed active:scale-95 transition-all shrink-0 flex items-center justify-center w-9 h-9 border border-rose-100"
                      title="触发 AI 回复"
                    >
                      {isContactTyping ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Private Messages Directory List */
              <div className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto flex flex-col">
                {privateContacts.length === 0 ? (
                  /* Empty state for private messages */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 my-auto">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-neutral-400 border border-neutral-200/80 shadow-sm">
                      <Mail className="w-7 h-7 stroke-[1.5]" />
                    </div>
                    <p className="text-base font-bold text-neutral-800">暂时没有人来私信你</p>
                    <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                      别担心，当你活跃在论坛中发表评论或动态时，会有志同道合的网友或角色主动找你聊天哒~
                    </p>
                  </div>
                ) : (
                  /* Private messages list */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1 pb-1">
                      <span className="text-xs font-bold text-neutral-500">私信对话 ({privateContacts.length})</span>
                    </div>

                    {privateContacts.map(contact => (
                      <div 
                        key={contact.id}
                        onClick={() => openPrivateChat(contact)}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all hover:border-neutral-300"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          <CharacterAvatar 
                            character={contact.character} 
                            avatar={contact.avatar} 
                            name={contact.name} 
                            size={44} 
                            className="border border-neutral-200/50 shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-neutral-900 truncate flex items-center gap-2">
                                <span className="truncate">{contact.name}</span>
                                <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-medium shrink-0">
                                  {contact.isNpc ? "NPC" : "角色"}
                                </span>
                              </div>
                              {contact.lastTime && (
                                <span className="text-[10px] text-neutral-400 shrink-0 ml-2">
                                  {formatTime(contact.lastTime)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5 truncate font-medium">
                              {contact.lastMsg || "点击进入私聊..."}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={(e) => handleDeleteContact(contact.id, e)}
                            className="p-2 text-neutral-300 hover:text-red-500 transition-colors"
                            title="删除私信"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <MessageCircle className="w-5 h-5 text-neutral-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl w-full mx-auto">
            {/* User Header Profile Card */}
            <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Uploadable User Avatar */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer shrink-0"
                  title="点击更换头像"
                >
                  <CharacterAvatar 
                    avatar={userAvatar} 
                    name="用户" 
                    size={64} 
                    className="border-2 border-neutral-200/70" 
                  />
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarUpload}
                    className="hidden" 
                  />
                </div>

                {/* Editable User Nickname */}
                <div className="space-y-1">
                  {isEditingNickname ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={tempNickname}
                        onChange={(e) => setTempNickname(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNickname(); }}
                        className="bg-neutral-100 rounded-lg px-2.5 py-1 text-sm font-bold text-neutral-900 border border-neutral-300 outline-none w-36"
                        autoFocus
                      />
                      <button 
                        onClick={handleSaveNickname}
                        className="p-1.5 bg-black text-white rounded-lg hover:bg-neutral-800 active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-neutral-900">{userNickname}</span>
                      <button 
                        onClick={() => { setTempNickname(userNickname); setIsEditingNickname(true); }}
                        className="p-1 text-neutral-400 hover:text-black transition-colors"
                        title="修改昵称"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-neutral-400">点击头像可自定义上传图片</div>
                </div>
              </div>
              
              <button 
                onClick={handleResetAndRegenerateForum}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors text-[11px] font-bold shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置论坛</span>
              </button>
            </div>

            {/* Profile Content Sub-tabs */}
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
              <div className="flex border-b border-neutral-100 bg-neutral-50/50">
                <button 
                  onClick={() => setProfileSection('posts')}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                    profileSection === 'posts' ? 'border-black text-black bg-white' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  发布的帖子 ({posts.filter(p => p.authorId === 'user').length})
                </button>
                <button 
                  onClick={() => setProfileSection('bookmarks')}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                    profileSection === 'bookmarks' ? 'border-black text-black bg-white' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  收藏的帖子 ({posts.filter(p => userBookmarks.includes(p.id)).length})
                </button>
                <button 
                  onClick={() => setProfileSection('comments')}
                  className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                    profileSection === 'comments' ? 'border-black text-black bg-white' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  发表的评论 ({userCommentsList.length})
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* 发布的帖子 */}
                {profileSection === 'posts' && (
                  <>
                    {posts.filter(p => p.authorId === 'user').length === 0 ? (
                      <div className="text-center py-12 text-neutral-400 text-xs flex flex-col items-center gap-2">
                        <span>还没有发布过帖子，去广场发一条吧~</span>
                        <button 
                          onClick={() => { setActiveTab('public'); setIsUserPostModalOpen(true); }}
                          className="mt-2 text-xs font-bold bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-full"
                        >
                          去发帖
                        </button>
                      </div>
                    ) : (
                      posts.filter(p => p.authorId === 'user').map(post => (
                        <div 
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200/60 cursor-pointer hover:border-neutral-400 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">
                              {post.tag}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-neutral-400">{formatTime(post.timestamp)}</span>
                              <button onClick={(e) => handleDeletePost(post.id, e)} className="text-neutral-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-neutral-800 font-medium line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>
                          <div className="text-[10px] text-neutral-400 pt-2 flex justify-between items-center">
                            <span>评论 ({post.comments.length})</span>
                            <span className="text-neutral-500 hover:text-black">查看详情 &gt;</span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* 收藏的帖子 */}
                {profileSection === 'bookmarks' && (
                  <>
                    {posts.filter(p => userBookmarks.includes(p.id)).length === 0 ? (
                      <div className="text-center py-12 text-neutral-400 text-xs">
                        还没有收藏过帖子
                      </div>
                    ) : (
                      posts.filter(p => userBookmarks.includes(p.id)).map(post => (
                        <div 
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200/60 cursor-pointer hover:border-neutral-400 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CharacterAvatar 
                                character={characters.find(ch => ch.id === post.authorId)} 
                                avatar={post.authorAvatar} 
                                name={post.authorName} 
                                size={20} 
                                className="rounded-full" 
                              />
                              <span className="text-xs font-bold text-neutral-800">{post.authorName}</span>
                            </div>
                            <button 
                              onClick={(e) => toggleBookmark(post.id, e)}
                              className="p-1 text-amber-500 hover:opacity-70"
                            >
                              <Bookmark className="w-4 h-4 fill-amber-500" />
                            </button>
                          </div>
                          <p className="text-xs text-neutral-800 font-medium line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>
                          <div className="text-[10px] text-neutral-400 pt-2 flex justify-between items-center">
                            <span>{formatTime(post.timestamp)}</span>
                            <span className="text-neutral-500 hover:text-black">查看详情 &gt;</span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* 发表的评论 */}
                {profileSection === 'comments' && (
                  <>
                    {userCommentsList.length === 0 ? (
                      <div className="text-center py-12 text-neutral-400 text-xs">
                        还没有发表过评论
                      </div>
                    ) : (
                      userCommentsList.map(({ comment, post }) => (
                        <div 
                          key={comment.id}
                          onClick={() => setSelectedPost(post)}
                          className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200/60 cursor-pointer hover:border-neutral-400 transition-colors space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px] text-neutral-400">
                            <span>我的评论</span>
                            <span>{formatTime(comment.timestamp)}</span>
                          </div>
                          <p className="text-xs text-neutral-900 font-bold leading-relaxed">
                            {comment.content}
                          </p>
                          <div className="text-[11px] text-neutral-500 bg-white p-2 rounded-lg border border-neutral-100 line-clamp-1">
                            原帖: {post.content}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Manual Post Modal */}
      {isUserPostModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="font-bold text-base text-neutral-900">发布新帖子</div>
              <button onClick={() => setIsUserPostModalOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase block">选择板块</label>
              <select 
                value={userPostBoardId || activeBoardId || boards[0]?.id}
                onChange={(e) => setUserPostBoardId(e.target.value)}
                className="w-full bg-neutral-100 p-3 rounded-xl text-xs font-medium outline-none border border-neutral-200/50"
              >
                {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {isHorrorBoard(boards.find(b => b.id === (userPostBoardId || activeBoardId || boards[0]?.id))) && (
              <div className="text-[11px] text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200/60 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <span>💀 深夜食堂（恐怖/灵异）板块规则：</span>
                </div>
                <p>1. 题材涵盖：亲身经历的灵异事件、听说的恐怖故事、察觉周围异常发帖求助、原创脑洞怪谈。</p>
                <p>2. 标签规则：真实经历/传闻标注“【真实】”，原创编造故事标注“【脑洞】”。</p>
                <p>3. 风格具极强代入感，可留下悬念或未完结，引发评论区猜测与推理。</p>
                <p className="font-bold text-red-800">4. 严禁恋爱/情感纠纷类内容！</p>
              </div>
            )}

            {isSeseBoard(boards.find(b => b.id === (userPostBoardId || activeBoardId || boards[0]?.id))) && (
              <div className="text-[11px] text-pink-700 bg-pink-50 p-2.5 rounded-xl border border-pink-200/60 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <span>💕 “不可以涩涩”板块指南：</span>
                </div>
                <p>1. 主题涵盖“戒涩挑战失败”搞笑记录、两性/亲密关系有趣冷知识、约会与暧昧期互动脑洞。</p>
                <p>2. 语言自然口语化，语气轻松自嘲、幽默解压。</p>
                <p className="font-bold text-pink-800">3. 严禁严肃说教、道德批判或沉重情感求助！</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase block">标签</label>
              <input 
                type="text" 
                value={userPostTag}
                onChange={(e) => setUserPostTag(e.target.value)}
                placeholder="标签 (如: 日常, 吐槽, 求解)"
                className="w-full bg-neutral-100 p-3 rounded-xl text-xs outline-none border border-neutral-200/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase block">帖子内容</label>
              <textarea 
                rows={4}
                value={userPostContent}
                onChange={(e) => setUserPostContent(e.target.value)}
                placeholder="分享你的想法..."
                className="w-full bg-neutral-100 p-3 rounded-xl text-xs outline-none border border-neutral-200/50 leading-relaxed resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setIsUserPostModalOpen(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-3 rounded-xl text-xs font-bold transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleCreateUserPost}
                disabled={!userPostContent.trim()}
                className="flex-1 bg-black text-white py-3 rounded-xl text-xs font-bold disabled:opacity-40 transition-all active:scale-95"
              >
                发布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Post Gen Modal */}
      {isGeneratingPostsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="font-bold text-base text-neutral-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-neutral-900" />
                <span>AI 批量生成帖子</span>
              </div>
              <button 
                onClick={() => {
                  setIsGeneratingPostsModalOpen(false);
                  if (isGeneratingPosts) {
                    showToast("⏳ AI 正在后台生成帖子，生成完毕后将自动提醒您~");
                  }
                }} 
                className="text-neutral-400 hover:text-black transition-colors"
                title="最小化到后台生成"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Loading Indicator inside Modal */}
            {isGeneratingPosts ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
                <div className="text-xs font-bold text-neutral-800 text-center px-4">
                  {postGenProgressText || "AI 正在思考并撰写帖子中..."}
                </div>
                <div className="text-[11px] text-neutral-400">请稍候，完成后将自动呈现</div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase block">选择目标板块</label>
                  <select 
                    value={genBoardId} 
                    onChange={(e) => setGenBoardId(e.target.value)}
                    className="w-full bg-neutral-100 p-3 rounded-xl text-xs font-medium outline-none border border-neutral-200/50"
                  >
                    {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {isHorrorBoard(boards.find(b => b.id === genBoardId)) && (
                  <div className="text-[11px] text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200/60 leading-relaxed">
                    💀 深夜食堂规则：生成内容包含亲身经历【真实】、所闻故事【脑洞】、诡异求助等，注重极其强烈的代入感与身临其境细节，可留下悬念，严禁情感纠纷。
                  </div>
                )}

                {isSeseBoard(boards.find(b => b.id === genBoardId)) && (
                  <div className="text-[11px] text-pink-700 bg-pink-50 p-2.5 rounded-xl border border-pink-200/60 leading-relaxed">
                    💕 “不可以涩涩”板块方向：生成内容将围绕“戒涩挑战失败”日常、亲密关系搞笑冷知识、约会/暧昧期脑洞套路，轻松搞笑解压，绝不涉及严肃说教或情感求助。
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase block">生成帖数量范围 (1-8 条)</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-neutral-100 rounded-xl border border-neutral-200/50 px-3 py-2.5">
                      <span className="text-xs text-neutral-400 mr-2 shrink-0 font-medium">最小值</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="8" 
                        value={genMinStr} 
                        onChange={(e) => setGenMinStr(e.target.value)} 
                        className="w-full bg-transparent text-xs font-bold text-neutral-900 outline-none" 
                        placeholder="1"
                      />
                    </div>
                    <span className="text-neutral-400 text-xs font-bold">-</span>
                    <div className="flex-1 flex items-center bg-neutral-100 rounded-xl border border-neutral-200/50 px-3 py-2.5">
                      <span className="text-xs text-neutral-400 mr-2 shrink-0 font-medium">最大值</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="8" 
                        value={genMaxStr} 
                        onChange={(e) => setGenMaxStr(e.target.value)} 
                        className="w-full bg-transparent text-xs font-bold text-neutral-900 outline-none" 
                        placeholder="3"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    将在 [{genMinStr || "1"} ~ {genMaxStr || "3"}] 条范围内随机生成（留空默认 1-3 条，上限 8 条）
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase">挂载世界书设定:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 border border-neutral-100 rounded-xl p-2.5 bg-neutral-50">
                    {loreList.map(l => (
                      <label key={l.id} className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={selectedLoreIds.includes(l.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedLoreIds([...selectedLoreIds, l.id]);
                            else setSelectedLoreIds(selectedLoreIds.filter(id => id !== l.id));
                          }}
                          className="rounded text-black focus:ring-black"
                        />
                        <span className="truncate">{l.title}</span>
                      </label>
                    ))}
                    {loreList.length === 0 && (
                      <span className="text-[11px] text-neutral-400">暂无可挂载的世界书</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => {
                      const resolved = resolvePostGenRange(genMinStr, genMaxStr);
                      saveConfig(resolved.minStr, resolved.maxStr, commentGenCount, genBoardId, selectedLoreIds);
                      showToast("设定已保存");
                      setTimeout(() => {
                        setIsGeneratingPostsModalOpen(false);
                      }, 1500);
                    }} 
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-3 rounded-xl text-xs font-bold transition-colors"
                  >
                    保存设定
                  </button>
                  <button 
                    onClick={() => {
                      const resolved = resolvePostGenRange(genMinStr, genMaxStr);
                      saveConfig(resolved.minStr, resolved.maxStr, commentGenCount, genBoardId, selectedLoreIds);
                      handleGeneratePosts(genBoardId, resolved.count, selectedLoreIds);
                    }} 
                    disabled={isGeneratingPosts}
                    className="flex-1 bg-black text-white py-3 rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingPosts ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingPosts ? "生成中..." : "开始生成"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Board Edit Modal */}
      {isEditingBoard && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="font-bold text-base text-neutral-900">
                {editingBoard ? "编辑板块" : "新建板块"}
              </div>
              <button onClick={() => setIsEditingBoard(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 板块名称 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase block">板块名称</label>
              <input 
                type="text" 
                placeholder="请输入板块名称" 
                value={boardEditName}
                onChange={(e) => setBoardEditName(e.target.value)}
                className="w-full bg-neutral-100 p-3 rounded-xl text-sm outline-none border border-neutral-200/50 focus:border-neutral-800"
              />
            </div>

            {/* 关键词 (可选) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase block">关键词 (可选)</label>
              <input 
                type="text" 
                placeholder="例如：吐槽、日常、恋爱、悬疑" 
                value={boardEditKeywords}
                onChange={(e) => setBoardEditKeywords(e.target.value)}
                className="w-full bg-neutral-100 p-3 rounded-xl text-sm outline-none border border-neutral-200/50 focus:border-neutral-800"
              />
            </div>

            {/* 内容设定 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-neutral-500 uppercase block">内容设定</label>
              </div>
              <textarea 
                placeholder="板块内容设定与讨论方向..." 
                value={boardEditDesc}
                onChange={(e) => setBoardEditDesc(e.target.value)}
                className="w-full bg-neutral-100 p-3 rounded-xl text-sm h-28 outline-none resize-none border border-neutral-200/50 focus:border-neutral-800 leading-relaxed"
              />
              <button 
                type="button"
                onClick={handleAiGenerateBoardDesc}
                disabled={isGeneratingBoardDesc}
                className="w-full bg-neutral-900 hover:bg-black text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isGeneratingBoardDesc ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI 生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>✨ AI 自动生成内容设定</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setIsEditingBoard(false)} 
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-3 rounded-xl text-xs font-bold transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  if (!boardEditName.trim()) {
                    alert("请填写板块名称");
                    return;
                  }
                  handleSaveBoard({
                    id: editingBoard?.id || '',
                    name: boardEditName.trim(),
                    keywords: boardEditKeywords.trim(),
                    description: boardEditDesc.trim(),
                    icon: editingBoard?.icon || 'phone',
                  });
                }} 
                className="flex-1 bg-black text-white py-3 rounded-xl text-xs font-bold active:scale-95 transition-all"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tabs */}
      <div className="shrink-0 bg-white border-t border-neutral-100 px-8 py-2 flex items-center justify-between shadow-sm pb-safe z-10 relative">
        <button
          onClick={() => { setActiveTab('public'); setActivePrivateContact(null); }}
          className={`flex flex-col items-center gap-1 py-1 transition-all ${activeTab === 'public' ? 'text-black scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
        >
          <Compass className={`w-5 h-5 ${activeTab === 'public' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className={`text-[10px] ${activeTab === 'public' ? 'font-bold' : 'font-medium'}`}>广场</span>
        </button>
        <button
          onClick={() => setActiveTab('private')}
          className={`flex flex-col items-center gap-1 py-1 transition-all ${activeTab === 'private' ? 'text-black scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
        >
          <Mail className={`w-5 h-5 ${activeTab === 'private' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className={`text-[10px] ${activeTab === 'private' ? 'font-bold' : 'font-medium'}`}>私信</span>
        </button>
        <button
          onClick={() => { setActiveTab('profile'); setActivePrivateContact(null); }}
          className={`flex flex-col items-center gap-1 py-1 transition-all ${activeTab === 'profile' ? 'text-black scale-105' : 'text-neutral-400 hover:text-neutral-600'}`}
        >
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className={`text-[10px] ${activeTab === 'profile' ? 'font-bold' : 'font-medium'}`}>我的</span>
        </button>
      </div>

      {/* Share Modal */}
      {shareModalData && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="font-bold text-base text-neutral-900">
                分享{shareModalData.type === 'post' ? '帖子' : '评论'}给角色
              </div>
              <button onClick={() => setShareModalData(null)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-500 line-clamp-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 italic">
              "{shareModalData.itemContent}"
            </p>

            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase">选择要分享的角色</div>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pt-1">
                {characters.map(char => (
                  <button 
                    key={char.id}
                    onClick={() => handleShareToCharacter(char)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-100 text-left transition-colors border border-neutral-100"
                  >
                    <img 
                      src={char.avatar || getLuntanAvatar(char.name)} 
                      alt="" 
                      className="w-9 h-9 rounded-full object-cover bg-neutral-100 border border-neutral-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-neutral-900 truncate">{char.name}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{char.description || "全能AI角色"}</div>
                    </div>
                    <Share2 className="w-4 h-4 text-neutral-400" />
                  </button>
                ))}
                {characters.length === 0 && (
                  <div className="text-center py-6 text-xs text-neutral-400">
                    暂无可用角色，请先创建角色
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setShareModalData(null)}
              className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2.5 rounded-xl text-xs font-bold transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Comment Action Menu Modal */}
      {activeCommentMenu && (
        <div 
          className="fixed inset-0 bg-black/40 z-[150] flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveCommentMenu(null)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-4 space-y-3 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center border-b border-neutral-100 pb-3">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">评论操作</div>
              <div className="text-xs text-neutral-500 mt-1 truncate px-4">“{activeCommentMenu.comment.content}”</div>
            </div>
            <div className="space-y-1">
              <button 
                onClick={() => {
                  setEditingCommentId(activeCommentMenu.comment.id);
                  setEditingCommentText(activeCommentMenu.comment.content);
                  setActiveCommentMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors"
              >
                <Edit3 className="w-4 h-4 text-blue-500" />
                <span>编辑评论</span>
              </button>
              
              <button 
                onClick={() => {
                  handleCopyComment(activeCommentMenu.comment.content);
                  setActiveCommentMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors"
              >
                <Copy className="w-4 h-4 text-neutral-500" />
                <span>复制内容</span>
              </button>

              <button 
                onClick={() => {
                  handleRecallComment(activeCommentMenu.comment.id);
                  setActiveCommentMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>撤回评论</span>
              </button>

              <button 
                onClick={() => {
                  handleDeleteComment(activeCommentMenu.comment.id);
                  setActiveCommentMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>删除评论</span>
              </button>
            </div>
            
            <button 
              onClick={() => setActiveCommentMenu(null)}
              className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl text-xs font-bold transition-colors"
            >
              取消
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

      {confirmDialog && (
        <ConfirmModal
          isOpen={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

    </div>
  );
}
