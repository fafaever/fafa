import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, MessageCircle, User, Sparkles, X, Compass, Mail, 
  MessageSquare, Plus, Skull, Smartphone, Heart as HeartIcon, 
  RefreshCw, Send, CornerDownRight, Loader2, Bookmark, Camera, Edit2, Check,
  ThumbsUp, ThumbsDown, Share2, Trash2, Edit3, Copy, RotateCcw
} from "lucide-react";
import { Character, AppSettings, LoreEntry } from "../types";
import { apiChat } from "../lib/api";
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

// Black and White Minimalist Line Art Avatar Generator
const getBlackWhiteLineAvatar = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 8;

  const svgs = [
    // 0: Cat
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="#ffffff" stroke="#e5e5e5" stroke-width="2"/><circle cx="50" cy="55" r="24" fill="none" stroke="#171717" stroke-width="2.5"/><path d="M30 38 L24 18 L42 32" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 38 L76 18 L58 32" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="42" cy="52" r="2" fill="#171717"/><circle cx="58" cy="52" r="2" fill="#171717"/><path d="M50 57 L48 60 H52 Z M50 60 V63 M46 64 Q50 67 54 64" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/><path d="M25 54 H35 M23 60 H35 M65 54 H75 M65 60 H75" stroke="#171717" stroke-width="2" stroke-linecap="round"/></svg>`,
    // 1: Dog
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="#ffffff" stroke="#e5e5e5" stroke-width="2"/><circle cx="50" cy="50" r="25" fill="none" stroke="#171717" stroke-width="2.5"/><path d="M26 38 C 12 40, 14 68, 28 58" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round"/><path d="M74 38 C 88 40, 86 68, 72 58" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round"/><circle cx="41" cy="46" r="2" fill="#171717"/><circle cx="59" cy="46" r="2" fill="#171717"/><ellipse cx="50" cy="56" rx="7" ry="5" fill="none" stroke="#171717" stroke-width="2"/><ellipse cx="50" cy="54" rx="3" ry="2" fill="#171717"/><path d="M50 56 V60 M46 60 Q50 63 54 60" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/></svg>`,
    // 2: Flower
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="#ffffff" stroke="#e5e5e5" stroke-width="2"/><circle cx="50" cy="45" r="10" fill="none" stroke="#171717" stroke-width="2.5"/><path d="M50 35 C 50 20, 38 20, 42 37" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/><path d="M50 35 C 50 20, 62 20, 58 37" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/><path d="M60 45 C 75 45, 75 33, 58 37" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/><path d="M60 45 C 75 45, 75 57, 58 53" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/><path d="M50 55 C 50 70, 38 70, 42 53" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/><path d="M50 55 C 50 70, 62 70, 58 53" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/><path d="M40 45 C 25 45, 25 33, 42 37" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/><path d="M40 45 C 25 45, 25 57, 42 53" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/><path d="M50 55 V82" stroke="#171717" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    // 3: Bear
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="#ffffff" stroke="#e5e5e5" stroke-width="2"/><circle cx="50" cy="52" r="26" fill="none" stroke="#171717" stroke-width="2.5"/><circle cx="30" cy="30" r="9" fill="none" stroke="#171717" stroke-width="2.5"/><circle cx="70" cy="30" r="9" fill="none" stroke="#171717" stroke-width="2.5"/><ellipse cx="40" cy="48" rx="5" ry="7" fill="none" stroke="#171717" stroke-width="2"/><ellipse cx="60" cy="48" rx="5" ry="7" fill="none" stroke="#171717" stroke-width="2"/><circle cx="40" cy="48" r="2" fill="#171717"/><circle cx="60" cy="48" r="2" fill="#171717"/><ellipse cx="50" cy="58" rx="4" ry="3" fill="#171717"/><path d="M45 64 Q50 68 55 64" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/></svg>`,
    // 4: Star/Moon
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="#ffffff" stroke="#e5e5e5" stroke-width="2"/><path d="M55 22 A28 28 0 1 0 78 68 A22 22 0 1 1 55 22 Z" fill="none" stroke="#171717" stroke-width="2.5" stroke-linejoin="round"/><path d="M30 35 L33 42 L40 43 L35 48 L36 55 L30 51 L24 55 L25 48 L20 43 L27 42 Z" fill="none" stroke="#171717" stroke-width="2" stroke-linejoin="round"/></svg>`,
    // 5: Coffee Cup
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="#ffffff" stroke="#e5e5e5" stroke-width="2"/><path d="M28 42 H72 L66 78 C66 82, 60 84, 50 84 C40 84, 34 82, 34 78 Z" fill="none" stroke="#171717" stroke-width="2.5" stroke-linejoin="round"/><path d="M72 48 C82 48, 82 68, 68 68" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round"/><path d="M40 28 Q44 20 40 14 M50 30 Q54 22 50 16 M60 28 Q64 20 60 14" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/></svg>`,
    // 6: Rabbit
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="#ffffff" stroke="#e5e5e5" stroke-width="2"/><path d="M36 45 C30 18, 44 18, 42 45" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round"/><path d="M64 45 C70 18, 56 18, 58 45" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round"/><circle cx="50" cy="60" r="22" fill="none" stroke="#171717" stroke-width="2.5"/><circle cx="42" cy="56" r="2" fill="#171717"/><circle cx="58" cy="56" r="2" fill="#171717"/><polygon points="50,62 47,65 53,65" fill="#171717"/><path d="M46 68 Q50 71 54 68" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round"/></svg>`,
    // 7: Ghost
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="50" fill="#ffffff" stroke="#e5e5e5" stroke-width="2"/><path d="M28 75 V45 C28 28, 72 28, 72 45 V75 L62 68 L50 75 L38 68 Z" fill="none" stroke="#171717" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="42" cy="46" r="3" fill="#171717"/><circle cx="58" cy="46" r="3" fill="#171717"/><ellipse cx="50" cy="56" rx="4" ry="6" fill="none" stroke="#171717" stroke-width="2"/></svg>`
  ];

  return `data:image/svg+xml;base64,${btoa(svgs[index])}`;
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
const INITIAL_DEMO_POSTS: ForumPost[] = [
  {
    id: 'demo-post-1',
    boardId: 'board-2',
    authorId: 'npc-4',
    authorName: '夜猫子阿怪',
    authorAvatar: getBlackWhiteLineAvatar('npc-bear-line'),
    title: '匿名帖子',
    tag: '灵异经历',
    timestamp: Date.now() - 3600000 * 24,
    likes: 18,
    dislikes: 0,
    content: '家人们，你们敢信？我至今想起三年前在大三暑假租老房子的那会，后背还是直冒凉气！那是2023年7月的某个暴雨夜，在老城区一栋七层没电梯的老楼顶层。那天凌晨两点多，我正戴着耳机在书桌前拼命赶论文呢，突然听到客厅卫生间传来一阵特别清晰又慢吞吞的“嗒、嗒、嗒”滴水声。我当时心里还嘀咕是不是水龙头没拧紧，就起身推开卫生间门。结果打开灯一看，地面干干爽爽的，水龙头一滴水都没掉！我当时真的懵了，以为是自己熬夜听错了，正准备转身回屋呢。结果你们猜最后怎么了？我顺眼扫了一下背后的镜子，当时整个人直接麻了——镜子里居然隐隐约约飘着个黑影，紧贴着我的后脖颈吹了一口刺骨的冷气！我脑子瞬间一片空白，连惨叫都卡在喉咙里了。第二天天一亮我就连夜收拾东西退租跑路，后来我才知道那老楼之前出过事……至今我一个人住都得开着灯！',
    comments: [
      {
        id: 'demo-comment-1',
        authorId: 'npc-2',
        authorName: '路过的社畜',
        authorAvatar: getBlackWhiteLineAvatar('npc-dog-line'),
        content: '看完脊背发凉！老楼顶层确实邪门，我当时看你写的也跟着心跳加速了。',
        timestamp: Date.now() - 3600000 * 20,
        floor: 1,
        likes: 5
      }
    ]
  },
  {
    id: 'demo-post-2',
    boardId: 'board-1',
    authorId: 'npc-1',
    authorName: '吃瓜第一线',
    authorAvatar: getBlackWhiteLineAvatar('npc-cat-line'),
    title: '匿名帖子',
    tag: '日常交流',
    timestamp: Date.now() - 3600000 * 12,
    likes: 12,
    dislikes: 0,
    content: '家人们，昨晚和刚认识不久的女友在海边散步聊天，真的被治愈到了！我们俩是上个月社团活动认识的，上周五晚上在海边吹晚风，不知不觉就聊到了深夜。我跟她坦白了我性格里特别缺乏安全感、有时候爱胡思乱想的小脾气，她也跟我倾诉了最近工作上的各种压力。你们敢信？我们居然坐在沙滩上足足聊了三个多小时！中间聊到一些敏感话题时，我当时心里其实挺紧张的，生怕气氛变尴尬，结果她特别温柔地回应了我。后来我才知道，原来她之前也一直在担心我不够信任她。这次聊完感觉我们俩彻底拉近了距离，直接打破了心防。虽然相处也有磨合，但这种真诚沟通的感觉真的太棒了，忍不住发个帖和大家分享一下！',
    comments: []
  }
];

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
    return {
      forumName: profiles[char.id].forumName,
      avatar: getBlackWhiteLineAvatar(profiles[char.id].avatarSeed)
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
    avatar: getBlackWhiteLineAvatar(newProfile.avatarSeed)
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
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  // User Profile State (Avatar, Nickname, Bookmarks)
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem("mobile_ai_forum_user_avatar") || getBlackWhiteLineAvatar("default-user-line");
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
  const [tempNickname, setTempNickname] = useState(userNickname);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // My Profile Section sub-tab
  const [profileSection, setProfileSection] = useState<'posts' | 'bookmarks' | 'comments'>('posts');

  // Board Edit State
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [boardEditName, setBoardEditName] = useState("");
  const [boardEditKeywords, setBoardEditKeywords] = useState("");
  const [boardEditDesc, setBoardEditDesc] = useState("");
  const [isGeneratingBoardDesc, setIsGeneratingBoardDesc] = useState(false);

  const [boards, setBoards] = useState<Board[]>([
    { id: 'board-1', name: '不可以涩涩', icon: 'love', description: '关于性爱、xp分享、亲密关系讨论的板块。', keywords: '情感, 亲密, 恋爱' },
    { id: 'board-2', name: '深夜食堂', icon: 'skull', description: '关于灵异事件、恐怖经历的分享板块。', keywords: '悬疑, 灵异, 故事' },
    { id: 'board-3', name: '捡手机文学', icon: 'phone', description: '太太们创作的捡手机文学板块。', keywords: '脑洞, 创作, 记录' },
  ]);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

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

  // Load posts and boards from localStorage
  useEffect(() => {
    const savedPosts = localStorage.getItem("mobile_ai_forum_posts");
    if (savedPosts) {
      try {
        const parsed = JSON.parse(savedPosts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosts(parsed);
        } else {
          setPosts(INITIAL_DEMO_POSTS);
        }
      } catch (e) {
        setPosts(INITIAL_DEMO_POSTS);
      }
    } else {
      setPosts(INITIAL_DEMO_POSTS);
    }
    const savedBoards = localStorage.getItem("mobile_ai_forum_boards");
    if (savedBoards) {
      try {
        setBoards(JSON.parse(savedBoards));
      } catch (e) {}
    }
  }, []);

  // Save posts, boards, and private contacts to localStorage
  useEffect(() => {
    localStorage.setItem("mobile_ai_forum_posts", JSON.stringify(posts));
    localStorage.setItem("mobile_ai_forum_boards", JSON.stringify(boards));
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

  // AI Generate Board Description handler
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

  const saveConfig = (p: number, c: number) => {
    setPostGenCount(p);
    setCommentGenCount(c);
    localStorage.setItem("mobile_ai_forum_p_count", p.toString());
    localStorage.setItem("mobile_ai_forum_c_count", c.toString());
  };

  // AI Post Gen Modal State
  const [selectedLoreIds, setSelectedLoreIds] = useState<string[]>([]);
  const [isGeneratingPostsModalOpen, setIsGeneratingPostsModalOpen] = useState(false);
  const [genBoardId, setGenBoardId] = useState<string>('');
  const [genCount, setGenCount] = useState<number>(3);

  const handleOpenGenModal = (bId?: string) => {
    const targetId = bId || activeBoardId || boards[0]?.id || '';
    setGenBoardId(targetId);
    setGenCount(postGenCount || 3);
    setPostGenProgressText("");
    setIsGeneratingPostsModalOpen(true);
  };

  const handleGeneratePosts = async (boardId: string, count: number, loreIds: string[]) => {
    if (characters.length === 0) {
      alert("请先创建至少一个角色，再进行 AI 生成帖子！");
      return;
    }
    if (isGeneratingPosts) return;
    setIsGeneratingPosts(true);
    setPostGenProgressText("AI 正在思考板块话题与灵感...");
    
    const board = boards.find(b => b.id === boardId) || boards[0];
    const selectedLores = loreList.filter(l => loreIds.includes(l.id));
    const loreContent = selectedLores.map(l => `【${l.title}】:\n${l.content}`).join("\n\n");
    const isHorror = isHorrorBoard(board);
    
    try {
      const generatedPosts: ForumPost[] = [];
      for (let i = 0; i < count; i++) {
        setPostGenProgressText(`AI 正在撰写第 ${i + 1} / ${count} 篇帖子...`);

        // 70% chance character, 30% chance NPC
        const useNpc = Math.random() < 0.3;
        let authorId = "";
        let authorName = "";
        let authorAvatar = "";
        let activeChar: Character | null = null;

        if (!useNpc) {
          activeChar = characters[Math.floor(Math.random() * characters.length)];
          authorId = activeChar.id;
          const profile = getOrInitCharForumProfile(activeChar);
          authorName = profile.forumName;
          authorAvatar = profile.avatar;
        } else {
          const npc = FIXED_NPCS[Math.floor(Math.random() * FIXED_NPCS.length)];
          authorId = npc.id;
          authorName = npc.name;
          authorAvatar = getBlackWhiteLineAvatar(npc.avatarSeed);
        }

        let validParsed: any = null;
        let attempts = 0;

        while (!validParsed && attempts < 3) {
          attempts++;

          let boardRequirementNotice = "";
          if (isHorror) {
            boardRequirementNotice = `
--- 【恐怖/灵异板块特别硬性规则（最高优先级）】 ---
1. 本板块必须是【真实恐怖或灵异相关题材】，包括但不限于：
   · 亲身经历的灵异事件
   · 都市传说改编
   · 恐怖故事创作
   · 诡异梦境记录
   · 民间恐怖传闻
2. 【绝对禁止】：严禁生成任何情感类、恋爱类、心理感伤类内容（例如“爱的人要离开我了”、“失恋悲伤”等绝不算恐怖，绝对禁止！）。
3. 必须包含具体的场景描写和细节（如时间、地点、阴暗环境、诡异声音、触觉与视觉细节），营造真实让人毛骨悚然但极具社交媒体分享感的恐怖氛围。
4. 请在生成前判断审查，确保内容 100% 属于恐怖/灵异主题，并在 JSON 中输出 "isHorrorTheme": true。
`;
          }

          const generalRequirementNotice = `
--- 【论坛帖子通用语气与生成规则（最高优先级）】 ---
1. 【统一第一人称视角】：所有帖子必须 100% 统一使用第一人称视角（“我”）进行叙述，严禁第三人称！
2. 【口语化与社交媒体讲述语气】：
   - 语气要像普通人在社交媒体（如贴吧、小红书、朋友圈）上分享经历一样自然、真实、接地气，【绝不能像在写小说或写文章】，避免过度修饰和刻意书面化的气氛描写。
   - 用词口语化，句子长短结合，就像在和朋友聊天或讲述一件事。
3. 【个人心理感受与当下反应】：
   - 必须加入个人心理感受、情绪变化和当下真实反应（如“我当时真的懵了”、“整个人都麻了”、“心跳差点漏了一拍”等）。
4. 【互动性语气词与社交表达】：
   - 必须自然融入面对面讲述或发帖时的互动语气词，例如：“你们猜最后怎么了？”、“我当时真的懵了”、“你们敢信？”、“后来我才知道…”、“家人们”、“直接把我给整不会了”等。
5. 【详细经过与字数要求】：必须详细描述事件完整经过，包含【时间、地点、事件起因、经过、细节和感受】，正文【字数绝对不少于 150 字】（推荐 180 ~ 380 字）。
`;

          const prompt = activeChar ? `你是角色：${activeChar.name}。简介：${activeChar.description}。
${loreContent ? `以下是本次生成挂载的世界观设定：\n${loreContent}\n` : ""}
论坛板块：${board?.name}。板块简介/方向：${board?.description}。

${generalRequirementNotice}
${boardRequirementNotice}

请以该角色的口吻，在匿名论坛的该板块下发布一篇详细的论坛帖子（必须使用第一人称“我”，口语化自然接地气，像在和朋友聊天讲述，自然加入“你们猜最后怎么了？”、“我当时真的懵了”、“你们敢信？”等互动语气，字数绝对不少于150字）。
同时，请为该角色生成一个不包含原名“${activeChar.name}”的论坛匿名网名（4-8字，如“深夜听风者”、“赛博咸鱼”）。

要求输出严格的 JSON 格式：
{
  ${isHorror ? `"isHorrorTheme": true,` : ""}
  "forumNickname": "论坛匿名网名",
  "tag": "${isHorror ? "灵异" : "日常"}",
  "content": "第一人称自然口语化叙述的详细帖子正文（不少于150字，像在和朋友聊天讲述，包含时间、地点、起因经过细节、当下情绪反应与自然互动语气词）"
}` : `你是一个网络论坛NPC成员“${authorName}”。
论坛板块：${board?.name}。板块方向：${board?.description}。

${generalRequirementNotice}
${boardRequirementNotice}

请在该板块发布一篇符合板块氛围的详细帖子（必须使用第一人称“我”，口语化自然接地气，像在和朋友聊天讲述，自然加入“你们猜最后怎么了？”、“我当时真的懵了”、“你们敢信？”等互动语气，字数绝对不少于150字）。

要求输出严格的 JSON 格式：
{
  ${isHorror ? `"isHorrorTheme": true,` : ""}
  "tag": "${isHorror ? "灵异" : "日常"}",
  "content": "第一人称自然口语化叙述的详细帖子正文（不少于150字，像在和朋友聊天讲述，包含时间、地点、起因经过细节、当下情绪反应与自然互动语气词）"
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

          if (parsed && parsed.content) {
            const text = parsed.content.trim();
            const hasFirstPerson = text.includes("我");
            const isHorrorValid = !isHorror || (parsed.isHorrorTheme !== false && isContentHorrorThemed(text));
            const isLengthOk = text.length >= 120;

            if ((hasFirstPerson && isHorrorValid && isLengthOk) || attempts >= 3) {
              validParsed = parsed;
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
          } else if (!activeChar) {
            authorName = makeUniqueNickname(authorName, usedNicknames);
            usedNicknames.add(authorName);
          }

          generatedPosts.push({
            id: Date.now().toString() + "-" + i,
            boardId: board.id,
            authorId: authorId,
            authorName: authorName,
            authorAvatar: authorAvatar,
            title: "匿名帖子",
            content: validParsed.content,
            tag: validParsed.tag || (isHorror ? "灵异" : "日常"),
            timestamp: Date.now(),
            likes: Math.floor(Math.random() * 20),
            dislikes: 0,
            comments: [] as ForumComment[]
          });
        }
      }
      
      if (generatedPosts.length > 0) {
        setPosts(prev => [...generatedPosts, ...prev]);
      }
      setIsGeneratingPostsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("AI 生成帖子出错，请稍后重试：" + (e as Error)?.message);
    } finally {
      setIsGeneratingPosts(false);
      setPostGenProgressText("");
      setSelectedLoreIds([]);
    }
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
      message: "确定要彻底删除该帖子吗？删除后不可恢复。",
      onConfirm: () => {
        setPosts(prev => prev.filter(p => p.id !== postId));
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(null);
        }
        showToast("帖子已成功删除");
        setConfirmDialog(null);
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
    let updatedComments: ForumComment[];
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
      const newContact: PrivateContact = {
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
    let existingMsgs: PrivateMessage[] = [];
    try {
      const stored = localStorage.getItem(msgKey);
      if (stored) existingMsgs = JSON.parse(stored);
    } catch (e) {}

    const shareMsg: PrivateMessage = {
      id: `msg-share-${Date.now()}`,
      sender: 'user',
      text: textToShare,
      timestamp: Date.now()
    };

    localStorage.setItem(msgKey, JSON.stringify([...existingMsgs, shareMsg]));
    showToast(`已成功分享给角色【${char.name}】`);
    setShareModalData(null);
  };

  const handleGenerateComments = async (post: ForumPost) => {
    if (isGeneratingComments || characters.length === 0) return;
    setIsGeneratingComments(true);
    
    try {
      const newComments: ForumComment[] = [];
      for (let i = 0; i < commentGenCount; i++) {
        const useNpc = Math.random() < 0.3;
        let authorId = "";
        let authorName = "";
        let authorAvatar = "";
        let activeChar: Character | null = null;

        if (!useNpc) {
          activeChar = characters[Math.floor(Math.random() * characters.length)];
          authorId = activeChar.id;
          const profile = getOrInitCharForumProfile(activeChar);
          authorName = profile.forumName;
          authorAvatar = profile.avatar;
        } else {
          const npc = FIXED_NPCS[Math.floor(Math.random() * FIXED_NPCS.length)];
          authorId = npc.id;
          authorName = npc.name;
          authorAvatar = getBlackWhiteLineAvatar(npc.avatarSeed);
        }

        const prompt = activeChar 
          ? `你是角色：${activeChar.name}（你在论坛的匿名网名是：${authorName}）。
现在你在一个论坛里看到了一篇帖子，内容是：“${post.content}”。
请以你的口吻写一条简短的回复（10-50字）。输出纯文本，不要包含任何格式。`
          : `你是论坛热心网民“${authorName}”。看到帖子：“${post.content}”。
请写一条接地气的评论（10-50字）。输出纯文本。`;

        const response = await apiChat({ 
          messages: [{ role: "user", content: prompt }], 
          character: activeChar || { id: "npc", name: authorName, description: "论坛NPC" } as any,
          memories: activeChar?.memories || [],
          matchedLore: loreList,
          settings 
        });
        const cleanText = (response.text || "").trim();
        
        if (cleanText) {
          newComments.push({
            id: Date.now().toString() + "-" + i,
            authorId: authorId,
            authorName: authorName,
            authorAvatar: authorAvatar,
            content: cleanText,
            timestamp: Date.now(),
            floor: post.comments.length + newComments.length + 1
          });
        }
      }

      if (newComments.length > 0) {
        const updatedPost = { ...post, comments: [...post.comments, ...newComments] };
        setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));
        if (selectedPost && selectedPost.id === post.id) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingComments(false);
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
        contactAvatar = getBlackWhiteLineAvatar(npc.avatarSeed);
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
    <div className="flex-1 flex flex-col bg-neutral-50 text-neutral-900 select-none animate-slide-up h-full min-h-0 relative font-sans overflow-hidden">
      
      {/* Detail View Overlay for Post */}
      {selectedPost && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col animate-slide-left">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white shrink-0">
            <button onClick={() => { setSelectedPost(null); setReplyingToComment(null); setReplyText(""); }} className="p-1 -ml-1 text-neutral-500 hover:text-black">
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
                  <img src={selectedPost.authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover bg-neutral-100 border border-neutral-200/50" />
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
              <p className="text-[13px] text-neutral-800 leading-relaxed font-medium whitespace-pre-wrap">
                {selectedPost.content}
              </p>

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

                {selectedPost.authorId === 'user' && (
                  <button 
                    onClick={(e) => handleDeletePost(selectedPost.id, e)} 
                    className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium transition-colors"
                    title="删除帖子"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-1 pt-2 max-w-2xl mx-auto">
              <span className="font-bold text-sm text-neutral-900">全部回复 ({selectedPost.comments.filter(c => !c.isRecalled).length})</span>
              <button 
                onClick={() => handleGenerateComments(selectedPost)}
                disabled={isGeneratingComments}
                className="text-[11px] font-bold bg-neutral-900 hover:bg-black text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingComments ? "生成中..." : "AI 生成评论"}
              </button>
            </div>

            <div className="space-y-3 pb-4 max-w-2xl mx-auto">
              {[...selectedPost.comments].reverse().map(c => {
                if (c.isRecalled) {
                  return (
                    <div key={c.id} className="bg-white rounded-xl p-3 shadow-xs border border-neutral-100 text-xs text-neutral-400 italic flex items-center justify-between">
                      <span>#{c.floor} [该评论已被作者撤回]</span>
                      <span className="text-[10px]">{formatTime(c.timestamp)}</span>
                    </div>
                  );
                }

                return (
                  <div 
                    key={c.id} 
                    className="bg-white rounded-xl p-3 shadow-xs border border-neutral-100 flex gap-3 relative hover:border-neutral-300 transition-colors"
                  >
                    <img src={c.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover bg-neutral-100 shrink-0 border border-neutral-200/50" />
                    <div className="flex-1 space-y-2.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">{c.authorName}</span>
                        <span className="text-[10px] text-neutral-400">#{c.floor}</span>
                      </div>

                      {c.replyTo && (
                        <div className="bg-neutral-50 border-l-2 border-neutral-300 px-2 py-1 rounded text-[11px] text-neutral-500 flex items-center gap-1 my-1">
                          <CornerDownRight className="w-3 h-3 text-neutral-400 shrink-0" />
                          <span>回复 #{c.replyTo.floor} @{c.replyTo.authorName}: {c.replyTo.content}</span>
                        </div>
                      )}

                      {/* Inline Comment Edit Mode */}
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

                      {/* Comment Toolbar */}
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

                          {/* User's own comment controls */}
                          {c.authorId === 'user' && (
                            <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                              <button 
                                onClick={() => handleRecallComment(c.id)}
                                className="text-amber-600 hover:text-amber-800 font-medium transition-colors"
                                title="撤回评论"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.content); }}
                                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                title="编辑评论"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-red-500 hover:text-red-700 font-medium transition-colors"
                                title="删除评论"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <button 
                            onClick={() => handleCopyComment(c.content)}
                            className="text-neutral-400 hover:text-black transition-colors"
                            title="复制内容"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
        <span className="font-sans font-bold text-base tracking-wide text-neutral-950">
          {activeTab === 'public' ? '匿名论坛' : activeTab === 'private' ? '论坛私信' : '我的'}
        </span>
        <div className="w-8" />
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
                        className="text-xs font-bold bg-neutral-900 hover:bg-black text-white px-2.5 py-1 rounded-full flex items-center gap-1 transition-all shadow-xs"
                        title="AI 生成帖子"
                      >
                        <Sparkles className="w-3 h-3 text-white" />
                        <span>AI 生成</span>
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
                             <img src={post.authorAvatar} alt="" className="w-7 h-7 rounded-full object-cover bg-neutral-100 border border-neutral-200/50" />
                             <div className="text-xs font-bold text-neutral-900">{post.authorName}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-neutral-50 text-neutral-500 px-2 py-0.5 rounded border border-neutral-100">
                              {post.tag}
                            </span>
                            <button 
                              onClick={(e) => toggleBookmark(post.id, e)}
                              className="p-1 text-neutral-400 hover:text-amber-500 transition-colors"
                            >
                              <Bookmark className={`w-4 h-4 ${userBookmarks.includes(post.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[13px] text-neutral-800 leading-relaxed font-medium mb-3 line-clamp-3 whitespace-pre-wrap">
                          {post.content}
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
                            className="text-xs font-bold bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-full flex items-center gap-1.5 transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI 生成帖子
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
                    <img src={activePrivateContact.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-neutral-200/50 bg-neutral-100" />
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
                      <img src={activePrivateContact.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-200/50 bg-neutral-100" />
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
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-full text-xs font-bold disabled:opacity-40 active:scale-95 transition-all shrink-0 flex items-center justify-center w-9 h-9 border border-rose-100"
                      title="触发 AI 回复"
                    >
                      <HeartIcon className="w-3.5 h-3.5 fill-rose-600" />
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
                    <p className="text-base font-bold text-neutral-800">暂无私信</p>
                    <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                      点击右上角的 🔄 刷新按钮，可接收来自论坛网友或角色的私信沟通~
                    </p>
                    <button 
                      onClick={handleRefreshPrivateMessages}
                      disabled={isGeneratingPrivateRequest}
                      className="mt-2 text-xs font-bold bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPrivateRequest ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingPrivateRequest ? "接收私信中..." : "接收新私信"}</span>
                    </button>
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
                          <img src={contact.avatar} alt="" className="w-11 h-11 rounded-full object-cover border border-neutral-200/50 bg-neutral-100 shrink-0" />
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
                        <MessageCircle className="w-5 h-5 text-neutral-300 shrink-0" />
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
                  <img src={userAvatar} className="w-16 h-16 rounded-full border-2 border-neutral-200/70 object-cover bg-neutral-100" />
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
                            <span className="text-[10px] text-neutral-400">{formatTime(post.timestamp)}</span>
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
                              <img src={post.authorAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
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
                  <span>💀 恐怖/灵异板块规则：</span>
                </div>
                <p>1. 必须是真实恐怖或灵异事件/都市传说/恐怖故事/诡异梦境/民间传闻。</p>
                <p>2. 统一使用第一人称（“我”）叙述，详细描述时间、地点、起因经过细节与感受，不少于150字。</p>
                <p className="font-bold text-red-800">3. 严禁情感/恋爱/伤感类内容！</p>
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
                disabled={isGeneratingPosts}
                onClick={() => setIsGeneratingPostsModalOpen(false)} 
                className="text-neutral-400 hover:text-black disabled:opacity-30"
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
                    💀 恐怖板块规则触发：生成内容将严格限定为真实恐怖/灵异题材（统一第一人称“我”，描述时间地点起因经过与场景细节，不少于150字），且严禁生成情感/恋爱/伤感类内容。
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase block">生成帖数量 (1-12)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="12" 
                    value={genCount} 
                    onChange={(e) => setGenCount(Math.min(12, Math.max(1, parseInt(e.target.value)||1)))} 
                    className="w-full bg-neutral-100 p-3 rounded-xl text-xs font-medium outline-none border border-neutral-200/50" 
                    placeholder="生成条数 (1-12)"
                  />
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
                      saveConfig(genCount, commentGenCount);
                      showToast("已保存");
                      setTimeout(() => {
                        setIsGeneratingPostsModalOpen(false);
                      }, 1500);
                    }} 
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-3 rounded-xl text-xs font-bold transition-colors"
                  >
                    保存设定
                  </button>
                  <button 
                    onClick={() => handleGeneratePosts(genBoardId, genCount, selectedLoreIds)} 
                    disabled={isGeneratingPosts}
                    className="flex-1 bg-black text-white py-3 rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>开始生成</span>
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
                      src={char.avatar || getBlackWhiteLineAvatar(char.id)} 
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
