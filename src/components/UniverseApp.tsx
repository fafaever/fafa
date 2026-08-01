import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Film,
  Zap,
  Users,
  Clock,
  ArrowRight,
  Eye,
  Send,
  ChevronDown,
  ChevronUp,
  Share2,
  X,
  BookOpen,
  Check,
  Shield,
  User,
  HelpCircle,
  FolderArchive,
  RefreshCw,
  Heart,
  Trophy,
  Gift,
  Skull,
  MessageSquare,
  ShoppingBag,
  Award,
  Share2,
  Settings
} from "lucide-react";
import { Character, AppSettings } from "../types";
import { callLLM } from "../lib/api";
import { storeMemory } from "../lib/vectorMemory";
import { CharacterAvatar } from "./CharacterAvatar";

interface UniverseAppProps {
  characters: Character[];
  settings: AppSettings;
  onClose: () => void;
}

// ==================== TYPE DEFINITIONS ==================== //

// 1. Quick Transmigration (快穿)
export interface TransmigrationTask {
  id: number;
  description: string;
  completed: boolean;
}

export interface IdentityDetails {
  name: string;
  age: number;
  appearance: string;
  profession: string;
  relationship: string;
  personality: string;
  background: string;
  memories?: string[];
}

export interface CharacterTransmigrationState {
  characterId: string;
  roleTag: "攻略者" | "攻略对象";
  identity: IdentityDetails;
  favorability: number; // 0 - 100
  suspicion: number; // 0 - 100
  innerThought: string;
  flaws: string[]; // behavior flaws
}

export interface MemoryCard {
  title: string;
  content: string;
  status: "perfect" | "partial" | "failed";
  shared: boolean;
}

export interface CharacterCardData {
  characterName: string;
  action: string;
  dialogue: string;
}

export interface RandomEvent {
  id: string;
  description: string;
  options: { id: string; text: string }[];
}

export interface Faction {
  id: string;
  name: string;
  goal: string;
  memberIds: string[]; // "user" or characterId
}

export interface FactionChatMessage {
  id: string;
  senderId: string; // "user" or characterId
  senderName: string; // The identity name in this world
  content: string;
  timestamp: number;
}

export interface TransmigrationWorld {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "completed";
  characterIds: string[];
  background: string;
  tasks: TransmigrationTask[];
  activeEvent?: RandomEvent | null;
  messages: {
    id: string;
    role: "user" | "assistant" | "system";
    senderName?: string;
    content: string;
    timestamp: number;
    charCards?: CharacterCardData[];
  }[];
  currentTurnCount: number;
  createdAt: number;
  updatedAt: number;
  
  // Word limit settings
  minWord?: number;
  maxWord?: number;

  // Expanded roleplay gameplay fields
  userRoleTag?: "攻略者" | "攻略对象";
  userIdentity?: IdentityDetails;
  characterStates?: Record<string, CharacterTransmigrationState>;
  exposureLevel?: number; // 0 - 100
  flawsHistory?: { desc: string; suspicionAdded: number; timestamp: number }[];
  memoryCard?: MemoryCard | null;
  endingType?: "perfect" | "partial" | "failed" | null;

  // Faction & Group Chat
  factions?: Faction[];
  factionChats?: Record<string, FactionChatMessage[]>;
  actionOptions?: string[];
  factionProgress?: Record<string, number>;
  npcs?: { name: string; role?: string; description?: string }[];
}

// 2. Rules Horror (规则怪谈)
export interface RulesInstance {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "completed";
  characterIds: string[];
  background: string;
  rules: { id: number; text: string; status: "normal" | "violated" | "cleared" }[];
  endingProgress: string; // e.g. "探索中" | "安全逃出" | "永远困住" | "隐藏结局"
  possibleEndings: { type: string; title: string; condition: string }[];
  currentEnding?: string;
  messages: {
    id: string;
    role: "user" | "assistant" | "system";
    senderName?: string;
    content: string;
    timestamp: number;
  }[];
  createdAt: number;
  updatedAt: number;
}

// 3. Suspense Theater (悬疑剧场)
export type SuspenseGenre = "悬疑" | "犯罪" | "心理" | "都市";

export interface RoleAssignment {
  characterId: string;
  characterName: string;
  roleName: string;
  identity: string;
  secret: string;
  motive: string;
}

export interface SuspenseScript {
  id: string;
  name: string;
  genre: SuspenseGenre;
  status: "not_started" | "in_progress" | "completed";
  characterIds: string[];
  currentAct: number; // 1 to 5
  background: string;
  caseCore: string;
  keyClues: string[];
  roleAssignments: RoleAssignment[];
  endingBranches: { title: string; description: string }[];
  messages: {
    id: string;
    role: "user" | "assistant" | "system";
    senderName?: string;
    content: string;
    timestamp: number;
  }[];
  createdAt: number;
  updatedAt: number;
}

// Local Storage Keys
const STORAGE_KEY_TRANSMIGRATION = "mobile_ai_universe_transmigration_v1";
const STORAGE_KEY_RULES = "mobile_ai_universe_rules_v1";
const STORAGE_KEY_SUSPENSE = "mobile_ai_universe_suspense_v1";

export default function UniverseApp({ characters, settings, onClose }: UniverseAppProps) {
  const getCharacterById = (id: string) => characters.find(c => c.id === id);
  const formatDate = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };
  // Navigation View State
  const [activeTab, setActiveTab] = useState<
    | "main"
    | "transmigration_list"
    | "transmigration_play"
    | "rules_list"
    | "rules_play"
    | "suspense_list"
    | "suspense_play"
  >("main");

  // Data Collections
  const [worlds, setWorlds] = useState<TransmigrationWorld[]>([]);
  const [instances, setInstances] = useState<RulesInstance[]>([]);
  const [scripts, setScripts] = useState<SuspenseScript[]>([]);

  // Active Session States
  const [activeWorld, setActiveWorld] = useState<TransmigrationWorld | null>(null);
  const [activeInstance, setActiveInstance] = useState<RulesInstance | null>(null);
  const [activeScript, setActiveScript] = useState<SuspenseScript | null>(null);

  // Chat / Interactive States
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshingOptions, setIsRefreshingOptions] = useState(false);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  const [showBackgroundDrawer, setShowBackgroundDrawer] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState<RoleAssignment | null>(null);

  // Create Modals
  const [showCreateWorldModal, setShowCreateWorldModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<{ worldId: string; content: string } | null>(null);
  const [showCreateInstanceModal, setShowCreateInstanceModal] = useState(false);
  const [showCreateScriptModal, setShowCreateScriptModal] = useState(false);

  // Form States for Creation
  const [newWorldName, setNewWorldName] = useState("");
  const [newWorldKeywords, setNewWorldKeywords] = useState("");
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [selectedShareCharIds, setSelectedShareCharIds] = useState<string[]>([]);
  
  const [newInstanceName, setNewInstanceName] = useState("");

  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptGenre, setNewScriptGenre] = useState<SuspenseGenre>("悬疑");

  // Expanded Transmigration States
  const [newWorldPresetId, setNewWorldPresetId] = useState<string>("");
  const [newMinWord, setNewMinWord] = useState<number>(300);
  const [newMaxWord, setNewMaxWord] = useState<number>(1500);
  const [inspectingCharId, setInspectingCharId] = useState<string | null>(null);
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [accuseTargetId, setAccuseTargetId] = useState<string | null>(null);
  const [accuseText, setAccuseText] = useState("");
  const [activePlayTab, setActivePlayTab] = useState<"behavior" | "tasks" | "identities" | "history" | "chat" | "settings">("history");
  const [viewingFactionId, setViewingFactionId] = useState<string | null>(null);
  const [factionChatInput, setFactionChatInput] = useState("");
  const [editWorldBg, setEditWorldBg] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [editUserThought, setEditUserThought] = useState("");
  const [editMinWord, setEditMinWord] = useState<number>(300);
  const [editMaxWord, setEditMaxWord] = useState<number>(1500);
  const [editCharacterStates, setEditCharacterStates] = useState<Record<string, CharacterTransmigrationState>>({});
  const [editTasks, setEditTasks] = useState<TransmigrationTask[]>([]);
  const [editNpcs, setEditNpcs] = useState<{ name: string; role?: string; description?: string }[]>([]);
  const [selectedShareCharId, setSelectedShareCharId] = useState<string>("");
  const [showEndWorldConfirm, setShowEndWorldConfirm] = useState(false);
  const [worldListTab, setWorldListTab] = useState<"active" | "archived">("active");
  
  // Custom Confirmation States
  const [worldToDelete, setWorldToDelete] = useState<string | null>(null);
  const [showSaveExitConfirm, setShowSaveExitConfirm] = useState(false);

  // Catalog Filter & Unified Helpers
  const [catalogCategory, setCatalogCategory] = useState<"all" | "transmigration" | "rules" | "suspense">("all");
  const [showCreatePickerModal, setShowCreatePickerModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: "transmigration" | "rules" | "suspense";
    name: string;
  } | null>(null);

  interface UnifiedUniverseCard {
    id: string;
    name: string;
    category: "快穿" | "规则怪谈" | "悬疑剧场";
    typeKey: "transmigration" | "rules" | "suspense";
    status: "in_progress" | "completed" | "not_started";
    characterCount: number;
    progressText: string;
    updatedAt: number;
    background: string;
  }

  const getUnifiedUniverseItems = (): UnifiedUniverseCard[] => {
    const transmigrationItems: UnifiedUniverseCard[] = worlds.map((w) => ({
      id: w.id,
      name: w.name,
      category: "快穿",
      typeKey: "transmigration",
      status: w.status || "in_progress",
      characterCount: w.characterIds?.length || 0,
      progressText: `第 ${Math.min(5, Math.max(1, w.currentTurnCount || 1))} 场 / 共 5 场`,
      updatedAt: w.updatedAt || w.createdAt || Date.now(),
      background: w.background || "",
    }));

    const rulesItems: UnifiedUniverseCard[] = instances.map((inst) => {
      const turnEstimate = inst.messages && inst.messages.length > 1 
        ? Math.min(5, Math.max(1, Math.ceil(inst.messages.length / 2))) 
        : 1;
      return {
        id: inst.id,
        name: inst.name,
        category: "规则怪谈",
        typeKey: "rules",
        status: inst.status || "in_progress",
        characterCount: inst.characterIds?.length || 0,
        progressText: inst.endingProgress && inst.endingProgress !== "探索中"
          ? inst.endingProgress
          : `第 ${turnEstimate} 场 / 共 5 场`,
        updatedAt: inst.updatedAt || inst.createdAt || Date.now(),
        background: inst.background || "",
      };
    });

    const suspenseItems: UnifiedUniverseCard[] = scripts.map((sc) => ({
      id: sc.id,
      name: sc.name,
      category: "悬疑剧场",
      typeKey: "suspense",
      status: sc.status || "in_progress",
      characterCount: sc.characterIds?.length || 0,
      progressText: `第 ${sc.currentAct || 1} 场 / 共 5 场`,
      updatedAt: sc.updatedAt || sc.createdAt || Date.now(),
      background: sc.background || "",
    }));

    let all = [...transmigrationItems, ...rulesItems, ...suspenseItems];

    if (catalogCategory === "transmigration") {
      all = transmigrationItems;
    } else if (catalogCategory === "rules") {
      all = rulesItems;
    } else if (catalogCategory === "suspense") {
      all = suspenseItems;
    }

    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const handleOpenUniverseCard = (item: UnifiedUniverseCard) => {
    if (item.typeKey === "transmigration") {
      const target = worlds.find((w) => w.id === item.id);
      if (target) {
        setActiveWorld(target);
        setActiveTab("transmigration_play");
        setActivePlayTab("history");
      }
    } else if (item.typeKey === "rules") {
      const target = instances.find((inst) => inst.id === item.id);
      if (target) {
        setActiveInstance(target);
        setActiveTab("rules_play");
      }
    } else if (item.typeKey === "suspense") {
      const target = scripts.find((sc) => sc.id === item.id);
      if (target) {
        setActiveScript(target);
        setActiveTab("suspense_play");
      }
    }
  };

  const handleDeleteCardItem = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "transmigration") {
      persistWorlds(worlds.filter((w) => w.id !== itemToDelete.id));
    } else if (itemToDelete.type === "rules") {
      persistInstances(instances.filter((inst) => inst.id !== itemToDelete.id));
    } else if (itemToDelete.type === "suspense") {
      persistScripts(scripts.filter((sc) => sc.id !== itemToDelete.id));
    }
    setItemToDelete(null);
  };


  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const transmigrationHistoryScrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollTransmigrationToBottom = (smooth: boolean = true) => {
    const container = transmigrationHistoryScrollRef.current;
    if (container) {
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth"
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  useEffect(() => {
    if (activePlayTab === "history") {
      // Use setTimeout 0 to ensure DOM is fully rendered/updated first
      const timer = setTimeout(() => {
        scrollTransmigrationToBottom(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activePlayTab]);

  useEffect(() => {
    if (activePlayTab === "history" && activeWorld?.messages) {
      scrollTransmigrationToBottom(true);
    }
  }, [activeWorld?.messages, isGenerating]);

  useEffect(() => {
    scrollToBottom();
  }, [activeInstance?.messages, activeScript?.messages, isGenerating]);

  // Load from LocalStorage
  useEffect(() => {
    try {
      const savedWorlds = localStorage.getItem(STORAGE_KEY_TRANSMIGRATION);
      if (savedWorlds) setWorlds(JSON.parse(savedWorlds));

      const savedInstances = localStorage.getItem(STORAGE_KEY_RULES);
      if (savedInstances) setInstances(JSON.parse(savedInstances));

      const savedScripts = localStorage.getItem(STORAGE_KEY_SUSPENSE);
      if (savedScripts) setScripts(JSON.parse(savedScripts));
    } catch (e) {
      console.error("[Universe Storage Load Error]:", e);
    }
  }, []);

  // Save Helpers
  const persistWorlds = (data: TransmigrationWorld[]) => {
    setWorlds(data);
    localStorage.setItem(STORAGE_KEY_TRANSMIGRATION, JSON.stringify(data));
    if (activeWorld) {
      const found = data.find(w => w.id === activeWorld.id);
      if (found) {
        setActiveWorld(found);
      }
    }
  };

  const persistInstances = (data: RulesInstance[]) => {
    setInstances(data);
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(data));
  };

  const persistScripts = (data: SuspenseScript[]) => {
    setScripts(data);
    localStorage.setItem(STORAGE_KEY_SUSPENSE, JSON.stringify(data));
  };

  // Status helper text
  const getStatusLabel = (status: "not_started" | "in_progress" | "completed") => {
    switch (status) {
      case "in_progress":
        return { text: "进行中", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "completed":
        return { text: "已完结", color: "bg-neutral-800 text-neutral-400 border-neutral-700" };
      case "not_started":
      default:
        return { text: "未开始", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    }
  };

  // Preset Transmigration Worlds
  const PRESET_WORLDS = [
    {
      id: "immortal",
      name: "修仙破妄界",
      icon: "🌸",
      description: "仙魔两界暗流涌动，你与伙伴们坠入太古秘境，面临天道法则的审判。你需要破除万魔祭坛，找出潜伏的仙门叛徒。",
      tasks: ["破除太古万魔祭坛并加固封印", "揪出潜伏于正道仙门的魔修叛徒", "在天道大典上夺取世界源流之灵"]
    },
    {
      id: "wasteland",
      name: "废土避难所",
      icon: "🛡️",
      description: "核战之后的废土纪元，变异生物肆虐，各大地下避难所为争夺稀缺能源互相倾轧。你需要带领伙伴建立新秩序。",
      tasks: ["修复废土核心能源反应堆", "联合东部地下避难所抵抗机械军团", "探寻终极净水源头"]
    },
    {
      id: "cyber",
      name: "赛博霓虹城",
      icon: "🌆",
      description: "高科技与低生活交织的夜之城，巨型企业垄断一切。你和伙伴们作为地下黑客与雇佣兵，准备潜入中央核心网络。",
      tasks: ["入侵巨型企业A级数据库", "营救被囚禁的AI核心意识", "在霓虹区建立地下抵抗同盟"]
    }
  ];

  const generateLocalFallbackWorld = (worldName: string, selectedChars: Character[]) => {
    let bg = `这是一个名为《${worldName}》的快穿高维重构世界。天地灵气与赛博代码交织，隐藏着不可告人的远古秘密。`;
    let tasksList = [
      "探寻世界核心遗迹并唤醒古老石碑",
      "解决这个世界的源能危机并保护伙伴",
      "击败暗中操控命运维度的幕后反派"
    ];
    let userIdentity: IdentityDetails = {
      name: "攻略者",
      age: 23,
      appearance: "一袭素色衣袍，眼神坚定，带着一丝不属于这个世界的冷静与从容。",
      profession: "跨维度时空特工 / 攻略者",
      relationship: "对所有人来说都是身份神秘的异界来客",
      personality: "沉着冷静，智计百出，极具亲和力与观察力",
      background: "来自高维时空‘星穹管理局’，执行时空修复与羁绊拯救任务。"
    };

    let characterStates: Record<string, CharacterTransmigrationState> = {};
    selectedChars.forEach((char, idx) => {
      const isFirst = idx === 0;
      characterStates[char.id] = {
        characterId: char.id,
        roleTag: isFirst ? "攻略对象" : "攻略对象",
        identity: {
          name: char.name,
          age: 20 + idx,
          appearance: "容貌清秀，气质独特，身上仿佛萦绕着某种不寻常的气息。",
          profession: "世家传人 / 秘境寻宝者",
          relationship: isFirst ? "你的宿命羁绊对象" : "共同行动的同伴",
          personality: "表面高冷孤傲，实则内心善良且渴望被理解。",
          background: "在这个世界的世家大族中长大，背负着家族的秘密使命与宿命。"
        },
        favorability: 50,
        suspicion: 20,
        innerThought: "总觉得这个人有些古怪，但又有一种莫名的熟悉感...",
        flaws: ["容易口是心非", "对外界充满警惕"]
      };
    });

    const npcs = [
      { name: "老张头", role: "老管家/引路人", description: "在这个世界侍奉多年的老管家，对各方势力和地理环境极为了解，言行稳重。" },
      { name: "徐捕头", role: "地方治安官", description: "性格耿直且武艺不凡的捕头，对城中的风吹草动极其敏锐，是维护秩序的关键人物。" },
      { name: "阿月", role: "机灵的小贩/侍女", description: "手脚麻利且眼观六路耳听八方的年轻侍女，经常能带来一些不为人知的密谈和传言。" }
    ];

    return { bg, tasksList, userIdentity, characterStates, npcs };
  };

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) {
      alert("请输入新世界名称！");
      return;
    }
    if (selectedCharIds.length === 0) {
      alert("请至少选择一位角色！");
      return;
    }

    setIsGenerating(true);
    try {
      const worldName = newWorldName.trim();
    const selectedChars = selectedCharIds.map(id => getCharacterById(id)).filter(Boolean) as Character[];
    const charNames = selectedChars.map(c => c.name).join("、");

    let generatedBackground = "";
    let generatedInitialScene = "";
    let generatedTasks: string[] = [];
    let generatedUserIdentity: IdentityDetails | undefined;
    let generatedCharIdentities: Record<string, any> = {};
    let generatedNpcs: { name: string; role?: string; description?: string }[] = [];

    const presetObj = PRESET_WORLDS.find(p => p.id === newWorldPresetId);
    const customPromptPart = presetObj 
      ? `【世界基础背景】：${presetObj.description}\n【核心预设任务】：${presetObj.tasks.join("\n")}`
      : `【世界名】：${worldName}`;
    const keywordPart = newWorldKeywords.trim() ? `【设定关键词】：${newWorldKeywords.trim()}` : "";

    const prompt = "你是一个快穿世界剧情架构师。请为快穿世界《" + worldName + "》设计完整的背景、攻略者与攻略对象角色矩阵。\n" +
      customPromptPart + "\n" + keywordPart + "\n" +
      "【玩家角色设定】：玩家穿越后的身份是该世界原本的【恶毒女配/反派】。玩家知道原剧情设定，但真实性格与原角色不同，且玩家不知道自己穿越了，以为自己是这个世界的人，只需扮演好原角色，但因真实性格不同，行为会与原角色有反差。\n" +
      "参与穿越的位面攻略对象：" + charNames + "（身份全为【攻略对象】，原剧情中讨厌玩家角色，但会因玩家的行为反差而逐步疑惑、好奇、在意，最终被吸引）。\n\n" +
      "【核心文风与描写规范】：\n" +
      "1. 必须使用口语化、简洁直白的表达方式。不使用词藻堆砌、文艺化修饰或复杂句式。\n" +
      "2. 使用短句，一句话只说一件事。多用名词和动词，少用形容词。\n" +
      "3. 不渲染氛围，不铺垫情绪。直接说“是什么”，不说“像什么”。\n" +
      "4. 背景介绍通俗易懂，让用户一眼看懂当前世界发生了什么以及攻略目标。\n\n" +
      "请严格基于上述设定，生成JSON格式数据（不要包含markdown标记）：\n" +
      "{\n" +
      "  \"background\": \"世界宏观背景（150-200字）\",\n" +
      "  \"initial_scene\": \"初始场景描述（50-100字）\",\n" +
      "  \"tasks\": [\"任务目标1\", \"任务目标2\", \"任务目标3\"],\n" +
      "  \"user_identity\": {\n" +
      "    \"name\": \"玩家在本世界的扮演姓名（原著中的反派名）\",\n" +
      "    \"age\": 20,\n" +
      "    \"appearance\": \"外貌衣着\",\n" +
      "    \"profession\": \"职业\",\n" +
      "    \"relationship\": \"社会关系\",\n" +
      "    \"personality\": \"性格（玩家真实性格与原角色的反差）\",\n" +
      "    \"background\": \"背景故事与攻略使命（原著恶毒女配设定）\"" +
      "  },\n" +
      "  \"character_identities\": {}\n" +
      "}\n\n" +
      "其他多余文本不要输出，只输出合法JSON。";

    let generatedFactions: Faction[] = [];
    try {
      const resText = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      const cleanJson = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      generatedBackground = parsed.background;
      generatedInitialScene = parsed.initial_scene;
      generatedTasks = parsed.tasks;
      generatedUserIdentity = parsed.user_identity;
      generatedNpcs = parsed.npcs || [];
      
      selectedChars.forEach(char => {
        const idData = parsed.character_identities?.[char.id] || parsed.character_identities?.[char.name];
        if (idData) {
          generatedCharIdentities[char.id] = {
            characterId: char.id,
            roleTag: "攻略对象",
            identity: {
              name: idData.name || char.name,
              age: Number(idData.age) || 20,
              appearance: idData.appearance || "容貌端庄，着装得体",
              profession: idData.profession || "位面关键角色",
              relationship: idData.relationship || "攻略目标",
              personality: idData.personality || "心思沉稳",
              background: idData.background || "本地势力核心人物"
            },
            favorability: Math.floor(Math.random() * 11) - 20, // -20 to -10
            suspicion: 10,
            innerThought: idData.innerThought || "总觉得眼前这人眼神很特别...",
            flaws: idData.flaw ? [idData.flaw] : ["言语间有些戒备"],
          };
        }
      });
    } catch (e) {
      console.warn("AI World matrix generation failed, running local fallback engine:", e);
      const fb = generateLocalFallbackWorld(worldName, selectedChars);
      generatedBackground = fb.bg;
      generatedTasks = fb.tasksList;
      generatedUserIdentity = fb.userIdentity;
      generatedCharIdentities = fb.characterStates;
      generatedNpcs = fb.npcs;
    }

      // Default world chat faction container for group messaging
    generatedFactions = [
      {
        id: "world_chat",
        name: "位面交流群",
        goal: "与攻略对象开展言语攻防与羁绊交互",
        memberIds: ["user", ...selectedChars.map(c => c.id)]
      }
    ];

    // Double check character identities fully populated
    selectedChars.forEach(char => {
      if (!generatedCharIdentities[char.id]) {
        const fb = generateLocalFallbackWorld(worldName, selectedChars);
        generatedCharIdentities[char.id] = fb.characterStates[char.id] || {
          characterId: char.id,
          roleTag: "攻略对象",
          identity: {
            name: char.name,
            age: 20,
            appearance: "神色自若，衣衫楚楚",
            profession: "位面名流",
            relationship: "攻略目标",
            personality: "神秘内敛",
            background: "在这个快穿位面有着特殊身份。"
          },
          favorability: Math.floor(Math.random() * 11) - 20, // -20 to -10
          suspicion: 10,
          innerThought: "对眼前的陌生人保留戒心……",
          flaws: ["偶尔露出不适感"],
          skills: ["社交礼仪"],
          items: ["随身信物"]
        };
      }
    });

    const newWorld: TransmigrationWorld = {
      id: `world-${Date.now()}`,
      name: worldName.trim(),
      status: "in_progress",
      characterIds: selectedChars.map(c => c.id),
      background: generatedBackground,
      tasks: generatedTasks.map((desc, idx) => ({ id: idx + 1, description: desc, completed: false })),
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: "system",
          content: `🌌 【穿梭虚空 · 位面降临】
你已成功降落于快穿世界《${worldName}》！

📜 【世界背景】：${generatedBackground}
🎬 【初始场景】：${generatedInitialScene}

🎭 我的新身份：【${generatedUserIdentity?.name || "未知"}】 (年龄: ${generatedUserIdentity?.age || "未知"})
🏷️ 穿越标签：【攻略者】
💼 扮演职业：${generatedUserIdentity?.profession}
✨ 容貌外形：${generatedUserIdentity?.appearance}
📜 背景与使命：${generatedUserIdentity?.background}

👥 【参与攻略对象】：
${selectedChars.map(c => `- ${c.name} (${generatedCharIdentities[c.id]?.identity?.relationship})`).join("\n")}

🔮 攻略对象已隐秘就位。点击角色头像查看他们的【扮演身份】并洞察其真实的【内心心声】。
请努力提升各攻略对象的好感度并达成位面任务。`,
          timestamp: Date.now(),
        },
      ],
      currentTurnCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      // Word limit settings
      minWord: newMinWord || 300,
      maxWord: Math.min(15000, newMaxWord || 1500),

      // Extended fields
      userRoleTag: "攻略者",
      userIdentity: generatedUserIdentity,
      characterStates: generatedCharIdentities,
      exposureLevel: 5,
      flawsHistory: [],
      memoryCard: null,
      endingType: null,
      factions: generatedFactions,
      factionChats: (() => {
        const initialChats: Record<string, FactionChatMessage[]> = {};
        generatedFactions.forEach((f) => {
          const teammateIds = f.memberIds.filter((id) => id !== "user");
          const firstTeammate = teammateIds[0] ? getCharacterById(teammateIds[0]) : null;
          const charIdentity = firstTeammate ? generatedCharIdentities[firstTeammate.id] : null;
          const senderName = charIdentity?.identity?.name || firstTeammate?.name || "阵营情报员";

          initialChats[f.id] = [
            {
              id: `fchat-init-${Date.now()}-${f.id}`,
              senderId: firstTeammate ? firstTeammate.id : "system",
              senderName: senderName,
              content: `【${f.name}·阵营加密频道】成员已就位。我方核心使命为：《${f.goal}》。大家注意隐藏身份，互相打好配合！`,
              timestamp: Date.now(),
            },
          ];
        });
        return initialChats;
      })(),
      actionOptions: []
    };

    const updated = [newWorld, ...worlds];
    persistWorlds(updated);
    setActiveWorld(newWorld);
    setShowCreateWorldModal(false);
    setNewWorldName("");
    setNewWorldPresetId("");
    setSelectedCharIds([]);
    setIsGenerating(false);
    setActivePlayTab("history");
    setActiveTab("transmigration_play");
    } catch (err) {
      console.error("World creation failed:", err);
      alert("生成失败，请重试");
      setIsGenerating(false);
    }
  };

  // Helper to generate a random event
  const generateRandomEvent = (): RandomEvent => {
    const events: RandomEvent[] = [
      { id: "rain", description: "外面突然下起了大雨，你晾在阳台的衣服还没收...", options: [{ id: "1", text: "赶紧去收衣服" }, { id: "2", text: "不管它，继续当前的剧情" }] },
      { id: "knock", description: "有人敲门，打开门是一个神色慌张的陌生人，似乎找错人了...", options: [{ id: "1", text: "警惕地询问对方" }, { id: "2", text: "直接关门" }] },
      { id: "question", description: "同伴突然神色复杂地问你：'你觉得...人真的有前世今生吗？'", options: [{ id: "1", text: "严肃地回答不知道" }, { id: "2", text: "开玩笑地敷衍过去" }] },
      { id: "phone", description: "你发现同伴手机落在客厅，屏幕亮着，上面有一条未读的新消息...", options: [{ id: "1", text: "看一眼消息内容" }, { id: "2", text: "立刻拿起手机还给同伴" }] },
      { id: "argue", description: "楼下有人吵架，声音很大，好像内容跟你现在的身份有关...", options: [{ id: "1", text: "去楼下看看" }, { id: "2", text: "关上窗户，装作没听见" }] },
      { id: "power", description: "屋子里突然停电了，陷入了一片黑暗...", options: [{ id: "1", text: "寻找手电筒" }, { id: "2", text: "静观其变" }] },
    ];
    return events[Math.floor(Math.random() * events.length)];
  };

  const parseTextToCharCards = (
    content: string,
    characterIds: string[],
    getCharacterById: (id: string) => Character | undefined,
    characterStates?: Record<string, CharacterTransmigrationState>
  ): CharacterCardData[] => {
    const chars = characterIds.map(id => {
      const c = getCharacterById(id);
      const state = characterStates?.[id];
      return { name: c?.name || id, worldName: state?.identity?.name || c?.name || id };
    });

    // Split content by lines/paragraphs to maintain perfect narrative sequence
    const blocks = content.split('\n').map(b => b.trim()).filter(Boolean);
    const result: CharacterCardData[] = [];

    blocks.forEach(block => {
      // Find matching character
      const matchedChar = chars.find(c => block.includes(c.name) || block.includes(c.worldName));
      const charName = matchedChar ? matchedChar.name : "剧情描写";

      // Match dialogue inside quote marks
      const quoteMatch = block.match(/[“"']([^”"']+)?[”"']/);
      if (quoteMatch) {
        const dialogue = quoteMatch[1] || "";
        let action = block.replace(/[“"'][^”"']*[”"']/g, "").trim();
        if (matchedChar) {
          action = action.replace(new RegExp(matchedChar.name, "g"), "")
                         .replace(new RegExp(matchedChar.worldName, "g"), "")
                         .replace(/^[，。、,：:\s]+|[，。、,：:\s]+$/g, "")
                         .trim();
        }
        result.push({
          characterName: charName,
          action: action,
          dialogue: dialogue
        });
      } else {
        let action = block;
        if (matchedChar) {
          action = action.replace(new RegExp(matchedChar.name, "g"), "")
                         .replace(new RegExp(matchedChar.worldName, "g"), "")
                         .replace(/^[，。、,：:\s]+|[，。、,：:\s]+$/g, "")
                         .trim();
        }
        result.push({
          characterName: charName,
          action: action,
          dialogue: ""
        });
      }
    });

    if (result.length === 0 && content.trim()) {
      result.push({
        characterName: "剧情描写",
        action: content,
        dialogue: ""
      });
    }

    return result;
  };

function calculateSimilarity(str1: string, str2: string) {
  const getNgrams = (s: string, n: number) => {
    const ngrams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) ngrams.add(s.substring(i, i + n));
    return ngrams;
  };
  const set1 = getNgrams(str1, 5);
  const set2 = getNgrams(str2, 5);
  if (set1.size === 0 || set2.size === 0) return 0;
  let intersection = 0;
  for (const gram of set1) {
    if (set2.has(gram)) intersection++;
  }
  return intersection / (set1.size + set2.size - intersection);
}

  const handleTransmigrationUserSend = async (customAction?: string, forceItemOrSkill?: string) => {
    if (!activeWorld || isGenerating) return;
    const input = customAction || inputText.trim();
    if (!input && !customAction) return;

    // Check if we are resolving an active event
    let eventResolved = false;
    if (activeWorld.activeEvent) {
      eventResolved = true;
      // You could add logic here to incorporate the resolution into the user message
    }

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      senderName: activeWorld.userIdentity?.name || "我",
      content: forceItemOrSkill ? `【${forceItemOrSkill}】${input}` : input,
      timestamp: Date.now(),
    };

    const newTurnCount = activeWorld.currentTurnCount + 1;
    const updatedMessages = [...activeWorld.messages, userMsg];

    // Random Event trigger logic (30% chance after user action if no active event)
    let nextActiveEvent = null;
    if (!activeWorld.activeEvent && Math.random() < 0.3) {
      nextActiveEvent = generateRandomEvent();
    }

    let updatedWorld: TransmigrationWorld = {
      ...activeWorld,
      messages: updatedMessages,
      currentTurnCount: newTurnCount,
      activeEvent: eventResolved ? null : nextActiveEvent, // Update active event
      updatedAt: Date.now(),
    };

    setActiveWorld(updatedWorld);
    if (!customAction) setInputText("");
    setIsGenerating(true);

    const activeChars = activeWorld.characterIds
      .map((id) => getCharacterById(id))
      .filter(Boolean) as Character[];

    const minW = activeWorld.minWord || 300;
    const maxW = Math.min(15000, activeWorld.maxWord || 1500);
    const chatHistory = updatedMessages.slice(-8).map((m) => `${m.senderName || m.role}: ${m.content}`).join("\n");

    const prompt = `你现在是快穿游戏《${activeWorld.name}》的叙事主宰（Narrator）与角色扮演者。
这是一个双线系统的快穿设定，玩家和伙伴们都被投放入新身份，各自在当前世界扮演新角色。
世界背景：${activeWorld.background}
    ${activeWorld.activeEvent ? `
【当前突发事件】：${activeWorld.activeEvent.description}` : ""}
玩家的快穿扮演身份：
- 姓名：${activeWorld.userIdentity?.name} (年龄: ${activeWorld.userIdentity?.age})
- 职业与背景：${activeWorld.userIdentity?.profession}。${activeWorld.userIdentity?.background}
- 攻略标签：${activeWorld.userRoleTag}

各伙伴在本世界的扮演身份及属性：
${activeChars.map(c => {
  const state = activeWorld.characterStates?.[c.id];
  return `- 伙伴 [${c.name}] (本世界扮演姓名: ${state?.identity?.name}, 年龄: ${state?.identity?.age}):
    * 职业与背景: ${state?.identity?.profession}。${state?.identity?.background}
    * 真实属性: 核心性格保持原样，好感度 ${state?.favorability || 50}/100${(state?.favorability || 50) >= 100 ? " (🎉已攻略)" : ""}
    * 扮演状态: 知道自己在扮演该身份，但不知道玩家是攻略者！扮演认真度因人而异（可能偶有失误或露马脚）`;
}).join("\n")}

任务清单：
${activeWorld.tasks.map((t) => `${t.id}. [${t.completed ? "已完成" : "未完成"}] ${t.description}`).join("\n")}
")}

最新玩家发言/行动："${userMsg.content}"

对话历史记录：
${chatHistory}

请根据剧情走向，生成参与角色（${activeChars.map((c) => c.name).join("、")}）的场景描写与台词。

【快穿世界完整玩法规则与描写规范】：
1. 角色保留原有名字与核心性格特质，但在本世界获得新身份卡并进行扮演。角色知道自己在扮演该身份，但**绝对不知道**用户是攻略者！角色会沉浸式扮演当前身份，**绝对不会**主动怀疑用户或其他人“换人了”。
2. 多攻略对象与 NP 规则：
   - 本快穿世界允许多名攻略对象同时存在，最终结局认可多角关系（NP 路线）。
   - 角色之间可以因为用户关注吃醋、争抢或轻微不满，表现为语气变酸、短暂冷淡或轻微抱怨，**但绝不能**因此对用户产生任何形式的伤害行为（包括但不限于：言语攻击、肢体冲突、威胁、孤立用户）。
   - 吃醋必须增添剧情乐趣，绝不能阻碍互动与游戏推进，也不能因吃醋而拒绝互动、退出游戏或中断剧情进程。
3. 好感度结算：每个角色好感度 0-100。用户通过对话和行动提升/改变好感度。每轮剧情结束后输出 [FAVORABILITY: 角色真实名字, +数或-数] 标签结算好感度变化。
4. 字数控制要求：请务必将你的每一轮剧情描写与角色回应控制在 ${minW}~${maxW} 字范围内（单轮生成最高上限 15000 字）。
5. 剧情卡片展示规范：剧情生成必须以结构化的卡片形式展示，包含：
   - 【环境事件】：环境变化或事件推进描述。
   - 【角色反应】：参与角色的行为反应（动作/神态）。
   - 【对话内容】：角色的对话内容（单独成行）。
   - 【当前悬念】：当前剧情状态、悬念收尾或冲突点。
6. 文风要求：使用口语化、简洁直白的表达方式，短句为主，多用名词和动词。
7. **绝对禁止**代替玩家进行任何言行、表情或心理活动描写。所有玩家的行动必须由玩家自己决定。
8. 剧情描写与对话的隔离：请使用 [CHAR_CARD: ...] 格式输出，剧情描写独立成卡。

请在叙述文本的**最末尾**，严格以以下标签格式输出更新数据（每行一个标签，必须在中括号内，用于引擎状态同步）：
[TASK_COMPLETE: 任务ID] (如果某项任务在此轮得到了达成，输出如 [TASK_COMPLETE: 1])
[FAVORABILITY: 伙伴真实名字, +数或-数] (调整该伙伴的好感度，例如 [FAVORABILITY: ${activeChars[0]?.name || "角色"}, +10])
[INNER_THOUGHT: 伙伴真实名字, 心声文本] (提供该伙伴的最新隐秘心声。说明他对当前局势的猜测或对玩家的情感变化。字数40-80字)
[CHARACTER_FLAW_LEAKED: 伙伴真实名字, 破绽说明] (极低概率触发：若该伙伴在此轮对话里不慎露出了不属于本世界的习惯破绽，输出此标签，字数20-45字)
[GAME_ENDING: perfect 或 partial 或 failed] (如果满足结束条件：全部任务完成触发perfect；部分任务完成触发partial；全任务失败触发failed。没有触发结局千万别输出)
[ACTION_OPTION: 选项具体可执行内容] (请生成 4 到 6 个玩家下一步具体可执行的操作选项，例如“走过去和她说话”、“检查书桌抽屉”、“躲在门后观察”等，涵盖不同尝试方向。每行输出一个 [ACTION_OPTION: ...] 标签)
[CHAR_CARD: 角色名字 | 动作描述 | 对话内容] (为参与此轮对话的每个角色分别输出1条卡片标签。如 [CHAR_CARD: 剧情描写 | 窗外的冷雨敲打着玻璃，气氛瞬间凝固了。 | ]，或 [CHAR_CARD: 苏墨 | 缓缓放下茶盏，抬眼看着你 | 你真的以为能瞒过我吗])
${(activeWorld.factions || []).map(f => `[FACTION_CHAT: ${f.id}, 说话者名字, 消息内容] (为阵营【${f.name}】(使命:${f.goal})生成1条群聊消息：队友对当前局势的分析、建议或对敌方的猜想策略)`).join("\n")
})
`;

    try {
      let response = "";
      let isRepetitive = true;
      let retryCount = 0;
      
      while (isRepetitive && retryCount < 2) {
        const fullPrompt = prompt + (retryCount > 0 ? "【系统警告：请注意！你上一次生成的内容与历史重复度过高，请立即更换全新的剧情事件、对话走向或冲突点，切勿重复！】" : "");
        console.log("========== [Transmigration Generation Request] ==========");
        console.log("Full Prompt Length:", fullPrompt.length);
        console.log("Full Prompt:", fullPrompt);
        console.log("========================================================");
        
        response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: fullPrompt }], 0.8, settings.apiFormat);
        
        // Repetition check against last 2 assistant messages
        const cleanContent = response.replace(/\[[A-Z_]+:.*?\]/g, "").trim();
        const lastAssistantMsgs = updatedMessages.filter(m => m.role === "assistant").slice(-2);
        
        isRepetitive = false;
        for (const msg of lastAssistantMsgs) {
          const sim = calculateSimilarity(cleanContent, msg.content.replace(/\[[A-Z_]+:.*?\]/g, "").trim());
          if (sim > 0.15) { // If more than 15% 5-grams overlap, consider it repetitive
            isRepetitive = true;
            break;
          }
        }
        retryCount++;
      }

      
      // Parse tags from assistant response
      let cleanResponse = response.trim();
      let gameEnding: "perfect" | "partial" | "failed" | null = null;
      let userSuspicionDiff = 0;
      
      const taskCompletedIds: number[] = [];
      const favorChanges: Record<string, { diff: number, reason: string }> = {};
      const suspicionChanges: Record<string, number> = {};
      const innerThoughts: Record<string, string> = {};
      const leakedFlaws: Record<string, string> = {};
      const actionOptions: string[] = [];
      const charCards: CharacterCardData[] = [];
      const factionChatUpdates: Record<string, FactionChatMessage[]> = {
        ...(updatedWorld.factionChats || {})
      };
      const turnStartTimestamp = Date.now();

      // Match all [TAG: ...] formats
      const tagRegex = /\[([A-Z_]+):\s*([^\]]+)\]/g;
      let match;
      while ((match = tagRegex.exec(response)) !== null) {
        const tagType = match[1];
        const valStr = match[2].trim();

        if (tagType === "TASK_COMPLETE") {
          const tId = parseInt(valStr, 10);
          if (!isNaN(tId)) taskCompletedIds.push(tId);
        } else if (tagType === "FAVORABILITY") {
          const parts = valStr.split(",");
          if (parts.length >= 2) {
            const charName = parts[0].trim();
            const val = parseInt(parts[1].trim(), 10);
            const reason = parts.slice(2).join(",").trim() || "";
            if (!isNaN(val)) favorChanges[charName] = { diff: val, reason };
          }
        } else if (tagType === "CHARACTER_FLAW_LEAKED") {
          const firstComma = valStr.indexOf(",");
          if (firstComma !== -1) {
            const charName = valStr.slice(0, firstComma).trim();
            const flawDesc = valStr.slice(firstComma + 1).trim();
            leakedFlaws[charName] = flawDesc;
          }
        } else if (tagType === "GAME_ENDING") {
          if (valStr === "perfect" || valStr === "partial" || valStr === "failed") {
            gameEnding = valStr;
          }
        } else if (tagType === "ACTION_OPTION") {
          if (valStr) actionOptions.push(valStr);
        } else if (tagType === "CHAR_CARD") {
          const parts = valStr.split("|");
          if (parts.length >= 2) {
            charCards.push({
              characterName: parts[0].trim(),
              action: parts[1].trim(),
              dialogue: parts[2] ? parts[2].trim() : ""
            });
          }
        } else if (tagType === "FACTION_CHAT") {
          const firstComma = valStr.indexOf(",");
          const secondComma = valStr.indexOf(",", firstComma + 1);
          if (firstComma !== -1 && secondComma !== -1) {
            const fId = valStr.slice(0, firstComma).trim();
            const sender = valStr.slice(firstComma + 1, secondComma).trim();
            const chatContent = valStr.slice(secondComma + 1).trim();
            if (fId && sender && chatContent) {
              if (!factionChatUpdates[fId]) factionChatUpdates[fId] = [];
              factionChatUpdates[fId].push({
                id: `fchat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                senderId: sender,
                senderName: sender,
                content: chatContent,
                timestamp: Date.now()
              });
            }
          }
        }
      }

      // Ensure both factions receive synchronized chat messages this turn
      if (updatedWorld.factions && updatedWorld.factions.length > 0) {
        updatedWorld.factions.forEach((f) => {
          const newMsgsThisTurn = (factionChatUpdates[f.id] || []).filter(m => m.timestamp >= turnStartTimestamp);
          if (newMsgsThisTurn.length === 0) {
            const teammateIds = f.memberIds.filter(id => id !== "user");
            const randomCharId = teammateIds.length > 0 ? teammateIds[Math.floor(Math.random() * teammateIds.length)] : null;
            const char = randomCharId ? getCharacterById(randomCharId) : null;
            const charState = randomCharId ? updatedWorld.characterStates?.[randomCharId] : null;
            const senderName = charState?.identity?.name || char?.name || "阵营智囊";
            const isUserFaction = f.memberIds.includes("user");

            const autoContent = isUserFaction
              ? `刚才【${updatedWorld.userIdentity?.name || "玩家"}】推进了剧情，我们要紧跟步伐，围绕使命《${f.goal}》做好部署！`
              : `注意到对面的动向有了新进展。我们不能松懈，必须加快落实我方目标《${f.goal}》！`;

            if (!factionChatUpdates[f.id]) factionChatUpdates[f.id] = [];
            factionChatUpdates[f.id].push({
              id: `fchat-sync-${Date.now()}-${f.id}`,
              senderId: randomCharId || "system",
              senderName: senderName,
              content: autoContent,
              timestamp: Date.now()
            });
          }
        });
      }

      // Remove the tags from the visible response text
      cleanResponse = cleanResponse.replace(/\[[A-Z_]+:\s*[^\]]+\]/g, "").trim();

      // Formulate state updates
      let updatedCharStates = { ...(updatedWorld.characterStates || {}) };
      let updatedTasks = updatedWorld.tasks.map(t => {
        if (taskCompletedIds.includes(t.id)) {
          return { ...t, completed: true };
        }
        return t;
      });

      // Grant skill points if tasks completed
      
      // Update character individual states
      Object.keys(updatedCharStates).forEach(cId => {
        const state = updatedCharStates[cId];
        const char = getCharacterById(cId);
        if (char && state) {
          let fav = state.favorability;
          let susp = state.suspicion;
          let thought = state.innerThought;
          let flawsList = [...state.flaws];

          if (favorChanges[char.name] !== undefined) {
            fav = Math.max(-100, Math.min(100, fav + favorChanges[char.name].diff));
          }
          if (innerThoughts[char.name] !== undefined) {
            thought = innerThoughts[char.name];
          }
          if (leakedFlaws[char.name] !== undefined) {
            flawsList = [leakedFlaws[char.name], ...flawsList];
            const flawEntry = {
              desc: `发现【${state.identity.name}】露出破绽：${leakedFlaws[char.name]}`,
              suspicionAdded: 0,
              timestamp: Date.now()
            };
            updatedWorld.flawsHistory = [flawEntry, ...(updatedWorld.flawsHistory || [])];
          }

          updatedCharStates[cId] = {
            ...state,
            favorability: fav,
            suspicion: susp,
            innerThought: thought,
            flaws: flawsList
          };
        }
      });

      const nextExposure = 0;
      let systemStatusMsg = "";
      const favNames = Object.keys(favorChanges);
      if (favNames.length > 0) {
        systemStatusMsg += `💖 好感度变化：
${favNames.map(name => {
          const cObj = activeChars.find(c => c.name === name);
          const cId = cObj?.id;
          const currentFav = cId ? updatedCharStates[cId]?.favorability : 50;
          const { diff, reason } = favorChanges[name];
          const isCompleted = currentFav >= 100 ? " 🎉【攻略完成】" : "";
          const reasonStr = reason ? `（${reason}）` : "";
          return `  - ${name} 好感度 ${diff > 0 ? "+" : ""}${diff}${reasonStr} (当前好感度: ${currentFav}/100${isCompleted})`;
        }).join("\n")}
`;
      }
      let factionProgMap = "";
      if (Object.keys(factionChatUpdates).length > 0) {
        factionProgMap = `📡 阵营频段已更新（${Object.keys(factionChatUpdates).length}条新情报）`;
      }
      
      let finalSysStr = [systemStatusMsg, factionProgMap].filter(Boolean).join("\n");
      
      let nextActionOptions = actionOptions;
      if (gameEnding) {
         nextActionOptions = [];
         if (gameEnding === "perfect") finalSysStr += `\n\n✨ 【世界结局达成：Perfect Ending】✨\n所有任务均已完美完成。`;
         else if (gameEnding === "failed") finalSysStr += `\n\n☠️ 【世界结局：Failed】☠️\n任务失败或暴露度过高，世界线崩溃。`;
         else finalSysStr += `\n\n⚠️ 【世界结局：Partial】⚠️\n部分任务完成，世界线已强行收束。`;
      }

      if (finalSysStr.trim()) {
        updatedMessages.push({
          id: Date.now().toString() + "_sys",
          role: "system",
          content: finalSysStr.trim(),
          timestamp: Date.now(),
        });
      }

      updatedWorld = {
        ...activeWorld,
        messages: updatedMessages,
        characterStates: updatedCharStates,
        tasks: updatedTasks,
        actionOptions: nextActionOptions,
        status: gameEnding ? "completed" : "in_progress",
        exposureLevel: nextExposure,
        factionChats: factionChatUpdates,
        updatedAt: Date.now(),
      };

      setActiveWorld(updatedWorld);
      persistWorlds(worlds.map((w) => (w.id === updatedWorld.id ? updatedWorld : w)));

      setTimeout(() => {
        scrollTransmigrationToBottom(true);
      }, 100);
    } catch (e: any) {
      console.error("[Transmigration Error]", e);
      const errorMessage = e instanceof Error ? e.message : "未知错误";
      setActiveWorld({ 
        ...activeWorld, 
        messages: [...updatedMessages, { 
          id: Date.now().toString(), 
          role: "system", 
          content: `引擎响应异常: ${errorMessage}，请重试。`, 
          timestamp: Date.now() 
        }] 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteWorld = (worldId: string) => {
    persistWorlds(worlds.filter((w) => w.id !== worldId));
    if (activeWorld?.id === worldId) {
      setActiveWorld(null);
      setActiveTab("transmigration_list");
    }
  };

  const handleResumeWorld = (worldId: string) => {
    const world = worlds.find(w => w.id === worldId);
    if (world) {
      setActiveWorld(world);
      setActiveTab("transmigration_play");
    }
  };

  const handleAccuseCharacter = async (characterId: string | null, text: string) => {
    if (!activeWorld || !characterId) return;
    setIsGenerating(true);
    const newUserMessage = { id: Date.now().toString(), role: "user" as const, senderName: "玩家", content: text, timestamp: Date.now() };
    const updatedMessages = [...activeWorld.messages, newUserMessage];
    const updatedWorld = { ...activeWorld, messages: updatedMessages };
    setActiveWorld(updatedWorld);
    setIsGenerating(false);
  };

  const handleSaveWorldSettings = () => {};
  const handleGenerateMemoryCard = () => {};
  const handleSendMemoryCardToChar = () => {};
  const handleRefreshActionOptions = () => {};
  const handleSendFactionMessage = () => {};
  const handleAIGenerateFactionChat = () => {};
  const handleRulesUserSend = (text?: string) => {};
  const handleAdvanceAct = () => {};
  const handleSuspenseUserSend = () => {};
  const renderCharacterSelector = () => (
    <div>
      <label className="text-xs text-[#1A1A1A] block mb-2 font-medium">选择参与角色 (至少选择1位)</label>
      <div className="grid grid-cols-2 gap-2">
        {characters.map(char => (
          <button
            key={char.id}
            type="button"
            onClick={() => {
              setSelectedCharIds(prev => 
                prev.includes(char.id) 
                  ? prev.filter(id => id !== char.id) 
                  : [...prev, char.id]
              );
            }}
            className={`p-2 rounded-[8px] border text-xs flex items-center gap-2 transition cursor-pointer ${
              selectedCharIds.includes(char.id)
                ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
                : "bg-white border-[#EFECE8] text-[#1A1A1A] hover:border-[#1A1A1A]"
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              selectedCharIds.includes(char.id) ? "bg-white text-[#1A1A1A]" : "bg-[#F5F3F0]"
            }`}>
              {selectedCharIds.includes(char.id) ? <Check className="w-3 h-3" /> : <User className="w-3 h-3" />}
            </div>
            {char.name}
          </button>
        ))}
      </div>
    </div>
  );
  const handleCreateInstance = () => {};
  const handleCreateScript = () => {};
  const handleEndAndArchiveWorld = () => {};

  useEffect(() => {
    if (
      activeTab === "transmigration_play" &&
      activeWorld &&
      activeWorld.messages.length === 1 &&
      (!activeWorld.actionOptions || activeWorld.actionOptions.length === 0) &&
      !isGenerating
    ) {
      handleTransmigrationUserSend(
        "【系统指令】：世界初始化完成。请根据背景设定，立刻生成第一张剧情卡片，生动描写当前场景、宿主处境以及周围发生的事件。必须提供 4-6 个具体的行动选项供玩家选择开始冒险。"
      );
    }
  }, [activeTab, activeWorld?.id, activeWorld?.messages?.length, isGenerating]);

  return (
    <div className="flex flex-col h-full bg-[#FAFAF9] text-[#1A1A1A] relative ">
      
      {/* 1. MAIN UNIVERSE CATALOG LIST */}
      {activeTab === "main" && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#FAFAF9]">
          {/* Top Bar Header */}
          <div className="h-14 border-b border-[#EFECE8] px-4 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-md">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-[#1A1A1A] hover:bg-[#F5F3F0] rounded-full transition cursor-pointer flex items-center gap-1"
              title="返回首页"
            >
              <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
            </button>
            <h1 className=" font-semibold text-base text-[#1A1A1A] tracking-tight">
              宇宙目录
            </h1>
            <button
              onClick={() => setShowCreatePickerModal(true)}
              className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded-full text-xs  font-medium flex items-center gap-1 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>新建</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Universe Mode Cards Directory (Requirement 1) */}
            <div className="space-y-3">
              <h2 className="text-xs  font-semibold text-[#78716C] uppercase tracking-wider px-1">
                宇宙玩法模式
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Fast Pass / Transmigration Card */}
                <div
                  onClick={() => setActiveTab("transmigration_list")}
                  className="bg-white border border-[#EFECE8] rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#1A1A1A] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-full bg-[#F5F3F0] flex items-center justify-center text-lg group-hover:bg-[#1A1A1A] group-hover:text-white transition">
                        🌸
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F3F0] text-[#78716C] text-[10px]  font-medium border border-[#EFECE8]">
                        {worlds.length} 个世界
                      </span>
                    </div>
                    <h3 className=" font-semibold text-base text-[#1A1A1A]">快穿世界</h3>
                    <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed">
                      高维身份扮演、对立阵营攻略与多结局重构
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#EFECE8] flex items-center justify-between text-xs text-[#1A1A1A] font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>进入快穿列表</span>
                    <ChevronRight className="w-4 h-4 stroke-[1.5] text-[#A8A39A]" />
                  </div>
                </div>

                {/* Rules Horror Card */}
                <div
                  onClick={() => setActiveTab("rules_list")}
                  className="bg-white border border-[#EFECE8] rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#1A1A1A] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-full bg-[#F5F3F0] flex items-center justify-center text-lg group-hover:bg-[#1A1A1A] group-hover:text-white transition">
                        👁️
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F3F0] text-[#78716C] text-[10px]  font-medium border border-[#EFECE8]">
                        {instances.length} 个副本
                      </span>
                    </div>
                    <h3 className=" font-semibold text-base text-[#1A1A1A]">规则怪谈</h3>
                    <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed">
                      禁忌法则探索、心理压迫感与生还结局
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#EFECE8] flex items-center justify-between text-xs text-[#1A1A1A] font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>进入怪谈列表</span>
                    <ChevronRight className="w-4 h-4 stroke-[1.5] text-[#A8A39A]" />
                  </div>
                </div>

                {/* Suspense Theater Card */}
                <div
                  onClick={() => setActiveTab("suspense_list")}
                  className="bg-white border border-[#EFECE8] rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#1A1A1A] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all cursor-pointer flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-full bg-[#F5F3F0] flex items-center justify-center text-lg group-hover:bg-[#1A1A1A] group-hover:text-white transition">
                        🎭
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F3F0] text-[#78716C] text-[10px]  font-medium border border-[#EFECE8]">
                        {scripts.length} 个剧本
                      </span>
                    </div>
                    <h3 className=" font-semibold text-base text-[#1A1A1A]">悬疑剧场</h3>
                    <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed">
                      5幕大剧、角色专属彩蛋与推理演绎
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#EFECE8] flex items-center justify-between text-xs text-[#1A1A1A] font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>进入剧场列表</span>
                    <ChevronRight className="w-4 h-4 stroke-[1.5] text-[#A8A39A]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Unified Cards Section */}
            {(() => {
              const items = getUnifiedUniverseItems();
              if (items.length === 0) return null;
              return (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
                      宇宙记录
                    </h2>
                    <div className="flex items-center gap-1">
                      {[
                        { id: "all", label: "全部" },
                        { id: "transmigration", label: "快穿" },
                        { id: "rules", label: "怪谈" },
                        { id: "suspense", label: "剧场" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setCatalogCategory(cat.id as any)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer ${
                            catalogCategory === cat.id
                              ? "bg-[#1A1A1A] text-white"
                              : "bg-[#F5F3F0] text-[#78716C] hover:bg-[#EFECE8]"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={`${item.typeKey}-${item.id}`}
                        onClick={() => handleOpenUniverseCard(item)}
                        className="p-3.5 rounded-[14px] bg-white border border-[#EFECE8] hover:border-[#1A1A1A] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-full bg-[#F5F3F0] flex items-center justify-center text-sm shrink-0">
                            {item.typeKey === "transmigration" ? "🌸" : item.typeKey === "rules" ? "👁️" : "🎭"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[#1A1A1A] truncate">{item.name}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#F5F3F0] text-[#78716C] border border-[#EFECE8] shrink-0">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#78716C] truncate mt-0.5">{item.progressText}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#A8A39A] group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 2. TRANSMIGRATION LIST */}
      {activeTab === "transmigration_list" && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#F8F6F3] text-[#1A1A1A]">
          {/* Header Bar */}
          <div className="h-14 border-b border-[#EFECE8] px-4 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("main")}
              className="p-1.5 -ml-1 text-[#1A1A1A] hover:bg-[#F5F3F0] rounded-full transition cursor-pointer flex items-center gap-1"
              title="返回宇宙主页"
            >
              <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
            </button>
            <h1 className="font-serif font-bold text-base text-[#1A1A1A]">快穿 · 世界列表</h1>
            <button
              onClick={() => setShowCreateWorldModal(true)}
              className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded-full text-xs font-medium transition flex items-center gap-1 cursor-pointer shadow-2xs border border-[#1A1A1A]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>新建世界</span>
            </button>
          </div>

          {/* Tab Switcher: Active Worlds vs Historical Archives */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-[#EFECE8] shrink-0">
            <button
              onClick={() => setWorldListTab("active")}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium transition cursor-pointer text-center ${
                worldListTab === "active"
                  ? "bg-[#1A1A1A] text-white shadow-2xs"
                  : "bg-[#F5F3F0] text-[#78716C] hover:bg-[#EFECE8]"
              }`}
            >
              🚀 进行中世界 ({worlds.filter((w) => w.status !== "completed").length})
            </button>
            <button
              onClick={() => setWorldListTab("archived")}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium transition cursor-pointer text-center ${
                worldListTab === "archived"
                  ? "bg-[#1A1A1A] text-white shadow-2xs"
                  : "bg-[#F5F3F0] text-[#78716C] hover:bg-[#EFECE8]"
              }`}
            >
              📜 历史存档 ({worlds.filter((w) => w.status === "completed").length})
            </button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(() => {
              const displayWorlds =
                worldListTab === "active"
                  ? worlds.filter((w) => w.status !== "completed")
                  : worlds.filter((w) => w.status === "completed");

              if (displayWorlds.length === 0) {
                return (
                  <div className="py-16 text-center space-y-3 text-[#A8A39A]">
                    <Sparkles className="w-10 h-10 mx-auto opacity-30 text-[#1A1A1A]" />
                    <p className="text-xs text-[#78716C]">
                      {worldListTab === "active"
                        ? "暂无进行中的快穿世界，点击下方创建你的第一个新世界。"
                        : "暂无历史存档，在世界中点击“结束该世界”即可自动生成快穿存档卡片。"}
                    </p>
                  </div>
                );
              }

              return displayWorlds.map((world) => {
                const statusObj = getStatusLabel(world.status);
                const isArchived = world.status === "completed";

                return (
                  <div
                    key={world.id}
                    className="p-4 rounded-[16px] bg-white border border-[#EFECE8] hover:border-[#1A1A1A] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-sm text-[#1A1A1A] truncate">{world.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusObj.color}`}>
                            {isArchived ? "已完结 / 快穿存档" : statusObj.text}
                          </span>
                        </div>
                        <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed">
                          {world.background || "暂无背景描述"}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorld(world.id);
                        }}
                        className="p-1.5 text-[#A8A39A] hover:text-rose-600 rounded-full hover:bg-rose-50 transition cursor-pointer shrink-0"
                        title={isArchived ? "删除存档" : "删除世界"}
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </div>

                    {/* Archive Card Summary if completed */}
                    {isArchived && world.memoryCard && (
                      <div className="p-3 bg-[#F9F8F6] border border-[#EFECE8] rounded-[12px] text-xs text-[#78716C] whitespace-pre-wrap leading-relaxed font-mono">
                        <div className="font-bold text-[#1A1A1A] mb-1 flex items-center gap-1.5">
                          <span>🎴 快穿存档摘要</span>
                        </div>
                        {world.memoryCard.content}
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t border-[#EFECE8]">
                      <div className="flex items-center justify-between text-xs text-[#78716C]">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#A8A39A]" />
                          <span>参与角色: {world.characterIds?.length || 0} 位</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#A8A39A]">
                          <Clock className="w-3 h-3 text-[#A8A39A]" />
                          <span>{formatDate(world.updatedAt || world.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-1 gap-2">
                        {isArchived && (
                          <button
                            onClick={() => {
                              setShowShareModal({ worldId: world.id, content: world.memoryCard?.content || "" });
                              setSelectedShareCharIds(world.characterIds || []);
                            }}
                            className="px-3.5 py-1.5 text-[#78716C] hover:text-[#1A1A1A] hover:bg-[#EFECE8] text-xs font-medium rounded-full transition flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-[#EFECE8]"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>分享</span>
                          </button>
                        )}
                        {isArchived ? (
                          <button
                            onClick={() => handleResumeWorld(world.id)}
                            className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-medium rounded-full transition flex items-center gap-1.5 cursor-pointer shadow-2xs border border-[#1A1A1A]"
                          >
                            <Play className="w-3.5 h-3.5 stroke-[1.5]" />
                            <span>恢复存档 / 继续游戏</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveWorld(world);
                              setActiveTab("transmigration_play");
                              setActivePlayTab("history");
                            }}
                            className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-medium rounded-full transition flex items-center gap-1.5 cursor-pointer shadow-2xs border border-[#1A1A1A]"
                          >
                            <Play className="w-3.5 h-3.5 stroke-[1.5]" />
                            <span>进入世界</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Bottom Button */}
          <div className="p-3 bg-white border-t border-[#EFECE8] shrink-0">
            <button
              type="button"
              onClick={() => setShowCreateWorldModal(true)}
              className="w-full py-2.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded-full text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99] border border-[#1A1A1A]"
            >
              <Plus className="w-4 h-4 stroke-[1.5]" />
              <span>创建新世界</span>
            </button>
          </div>
        </div>
      )}

      {/* 2.5 TRANSMIGRATION PLAY */}
      {activeTab === "transmigration_play" && activeWorld && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#F8F6F3] text-[#1A1A1A]">
          {/* Top Header */}
          <div className="h-14 border-b border-[#EFECE8] px-4 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-md">
            <button
              onClick={() => {
                persistWorlds(worlds);
                setActiveTab("transmigration_list");
              }}
              className="p-1.5 -ml-1 text-[#1A1A1A] hover:bg-[#F5F3F0] rounded-full transition cursor-pointer flex items-center gap-1"
              title="返回快穿列表"
            >
              <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
            </button>
            <span className="font-serif font-bold text-base text-[#1A1A1A] truncate max-w-[180px]">
              {activeWorld.name}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEndWorldConfirm(true)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-full transition cursor-pointer border border-rose-200 shrink-0"
                title="结束该世界并生成快穿存档卡片"
              >
                🏁 结束该世界
              </button>
              <button
                onClick={() => {
                  if (activeWorld) {
                    setEditWorldBg(activeWorld.background || "");
                    setEditUserName(activeWorld.userIdentity?.name || "");
                    setEditUserThought((activeWorld.userIdentity as any)?.thought || "");
                    setEditMinWord(activeWorld.minWord || 300);
                    setEditMaxWord(activeWorld.maxWord || 1500);
                    setEditCharacterStates(activeWorld.characterStates || {});
                    setEditTasks(activeWorld.tasks || []);
                    if (activeWorld.characterIds?.[0]) {
                      setSelectedShareCharId(activeWorld.characterIds[0]);
                    }
                  }
                  setActivePlayTab("settings");
                }}
                className={`p-2 rounded-full transition cursor-pointer border ${
                  activePlayTab === "settings"
                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                    : "bg-white text-[#1A1A1A] border-[#EFECE8] hover:bg-[#F5F3F0]"
                }`}
                title="世界设置"
              >
                <Settings className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>
          </div>
          
          {/* Sub Navigation Tabs */}
          {activePlayTab !== "settings" && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-[#EFECE8] overflow-x-auto no-scrollbar shrink-0">

            </div>
          )}
          
          <div className="flex-1 overflow-hidden relative flex flex-col">

            {/* ==================== 0. SETTINGS & MEMORY CARD PAGE ==================== */}
            {activePlayTab === "settings" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#F9F8F6]">
                <div className="flex items-center justify-between border-b border-[#EFECE8] pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivePlayTab("history")}
                      className="p-1 text-[#1A1A1A] hover:bg-[#EFECE8] rounded-full transition cursor-pointer"
                      title="返回"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className=" font-bold text-sm text-[#1A1A1A]">快穿世界设置与记忆卡片</h2>
                  </div>
                  <button
                    onClick={handleSaveWorldSettings}
                    className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-medium rounded-full transition cursor-pointer shadow-xs"
                  >
                    保存设定
                  </button>
                </div>

                {/* Section 1: World Background & User Identity */}
                <div className="bg-white rounded-2xl p-4 border border-[#EFECE8] space-y-4 shadow-2xs">
                  <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">世界设定与玩家身份</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#78716C] mb-1">世界背景描述</label>
                      <textarea
                        value={editWorldBg}
                        onChange={(e) => setEditWorldBg(e.target.value)}
                        rows={3}
                        className="w-full p-2.5 text-xs rounded-xl bg-[#F5F3F0] border border-[#EFECE8] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#78716C] mb-1">玩家扮演身份名称</label>
                        <input
                          type="text"
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                          className="w-full p-2.5 text-xs rounded-xl bg-[#F5F3F0] border border-[#EFECE8] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#78716C] mb-1">身份背景 / 内心独白</label>
                        <input
                          type="text"
                          value={editUserThought}
                          onChange={(e) => setEditUserThought(e.target.value)}
                          className="w-full p-2.5 text-xs rounded-xl bg-[#F5F3F0] border border-[#EFECE8] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#78716C] mb-1">每轮生成的字数范围 (最小值 ~ 最大值，最高15000字)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={50}
                          max={15000}
                          value={editMinWord}
                          onChange={(e) => setEditMinWord(Math.max(50, parseInt(e.target.value) || 50))}
                          className="w-full p-2.5 text-xs rounded-xl bg-[#F5F3F0] border border-[#EFECE8] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition"
                          placeholder="最小字数 (默认300)"
                        />
                        <span className="text-xs text-[#78716C] font-semibold shrink-0">至</span>
                        <input
                          type="number"
                          min={100}
                          max={15000}
                          value={editMaxWord}
                          onChange={(e) => setEditMaxWord(Math.min(15000, parseInt(e.target.value) || 1500))}
                          className="w-full p-2.5 text-xs rounded-xl bg-[#F5F3F0] border border-[#EFECE8] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition"
                          placeholder="最大字数 (默认1500)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Character Identities */}
                <div className="bg-white rounded-2xl p-4 border border-[#EFECE8] space-y-4 shadow-2xs">
                  <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">参与角色扮演身份</h3>
                  <div className="space-y-3">
                    {activeWorld.characterIds?.map((cId) => {
                      const char = getCharacterById(cId);
                      const state = editCharacterStates[cId];
                      if (!char || !state) return null;
                      return (
                        <div key={cId} className="p-3 bg-[#F5F3F0] rounded-xl border border-[#EFECE8] space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#1A1A1A]">{char.name}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-white rounded-full text-[#78716C] border border-[#EFECE8]">原世界角色</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-[#78716C] mb-0.5">世界身份名称</label>
                              <input
                                type="text"
                                value={state.identity?.name || ""}
                                onChange={(e) => {
                                  const updated = {
                                    ...editCharacterStates,
                                    [cId]: {
                                      ...state,
                                      identity: { ...state.identity, name: e.target.value }
                                    }
                                  };
                                  setEditCharacterStates(updated);
                                }}
                                className="w-full p-2 text-xs rounded-lg bg-white border border-[#EFECE8] text-[#1A1A1A] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#78716C] mb-0.5">身份特征 / 职业</label>
                              <input
                                type="text"
                                value={state.identity?.profession || ""}
                                onChange={(e) => {
                                  const updated = {
                                    ...editCharacterStates,
                                    [cId]: {
                                      ...state,
                                      identity: { ...state.identity, profession: e.target.value }
                                    }
                                  };
                                  setEditCharacterStates(updated);
                                }}
                                className="w-full p-2 text-xs rounded-lg bg-white border border-[#EFECE8] text-[#1A1A1A] outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Generate Story Memory Card */}
                <div className="bg-white rounded-2xl p-4 border border-[#EFECE8] space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">剧情记忆卡片生成与分享</h3>
                    <button
                      onClick={handleGenerateMemoryCard}
                      className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-medium rounded-full transition cursor-pointer shadow-2xs"
                    >
                      ✨ 生成剧情卡片
                    </button>
                  </div>

                  {activeWorld.memoryCard ? (
                    <div className="p-4 bg-[#F9F8F6] rounded-xl border border-[#EFECE8] space-y-3">
                      <div className="flex items-center justify-between border-b border-[#EFECE8] pb-2">
                        <h4 className=" font-bold text-xs text-[#1A1A1A]">{activeWorld.memoryCard.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeWorld.memoryCard.shared ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {activeWorld.memoryCard.shared ? "已分享给角色" : "本地存档中"}
                        </span>
                      </div>
                      <p className="text-xs text-[#78716C] whitespace-pre-wrap leading-relaxed">{activeWorld.memoryCard.content}</p>

                      <div className="pt-2 border-t border-[#EFECE8] flex flex-col sm:flex-row items-center gap-2">
                        <select
                          value={selectedShareCharId}
                          onChange={(e) => setSelectedShareCharId(e.target.value)}
                          className="flex-1 p-2 text-xs bg-white border border-[#EFECE8] rounded-xl text-[#1A1A1A] outline-none"
                        >
                          {activeWorld.characterIds?.map(cId => {
                            const c = getCharacterById(cId);
                            return <option key={cId} value={cId}>{c?.name || cId}</option>;
                          })}
                        </select>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={handleSendMemoryCardToChar}
                            className="flex-1 sm:flex-none px-3 py-2 bg-[#1A1A1A] text-white text-xs font-medium rounded-xl hover:bg-neutral-800 transition cursor-pointer"
                          >
                            发送给角色并让其记住
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#A8A39A] italic">尚未生成记忆卡片，点击上方按钮开始生成。</p>
                  )}
                </div>
              </div>
            )}

            {/* ==================== 1. 剧情推进区 (STORY PROGRESSION AREA) ==================== */}
            {activePlayTab === "history" && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Faction Task Progress Bar */}
                {activeWorld.factions && activeWorld.factions.length >= 2 && (() => {
                  const myF = activeWorld.factions.find(f => f.memberIds.includes("user")) || activeWorld.factions[0];
                  const oppF = activeWorld.factions.find(f => !f.memberIds.includes("user")) || activeWorld.factions[1];
                  const myProg = activeWorld.factionProgress?.[myF.id] ?? Math.min(100, Math.max(0, 30 + (activeWorld.tasks.filter(t => t.completed).length / (activeWorld.tasks.length || 1)) * 50 + (activeWorld.currentTurnCount || 0) * 4));
                  const oppProg = activeWorld.factionProgress?.[oppF.id] ?? Math.min(100, Math.max(0, 35 + (activeWorld.currentTurnCount || 0) * 3));

                  return (
                    <div className="bg-white border-b border-[#EFECE8] px-4 py-2.5 shrink-0 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[#1A1A1A]">
                        <span className="text-[11px] text-[#78716C]">{myF.name}</span>
                        <span className="font-mono text-xs px-2 py-0.5 bg-[#F5F3F0] rounded text-[#1A1A1A] border border-[#EFECE8]">{myProg}%</span>
                      </div>

                      <div className="flex-1 mx-4 relative h-2.5 bg-[#E5E2DC] rounded-full overflow-hidden flex items-center shadow-inner">
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-[#1A1A1A] rounded-l-full transition-all duration-500" 
                          style={{ width: `${myProg}%` }}
                        />
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-white z-10 opacity-80" />
                      </div>

                      <div className="flex items-center gap-1.5 font-bold text-[#1A1A1A] justify-end">
                        <span className="font-mono text-xs px-2 py-0.5 bg-[#F5F3F0] rounded text-[#1A1A1A] border border-[#EFECE8]">{oppProg}%</span>
                        <span className="text-[11px] text-[#78716C]">{oppF.name}</span>
                      </div>
                    </div>
                  );
                })()}



                {/* 剧情消息历史滚动区 */}
                <div ref={transmigrationHistoryScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Story messages stream */}
                  <div className="space-y-3">
                    {activeWorld.messages && activeWorld.messages.length > 0 ? (
                      activeWorld.messages.map((msg, idx) => {
                        const isUser = msg.role === "user";
                        const isSystem = msg.role === "system";

                        if (isUser) {
                          return (
                            <div
                              key={msg.id || idx}
                              className="flex flex-col items-end mb-3"
                            >
                              <div className="flex items-center gap-1.5 mb-1 px-1 text-[12px] text-[#A8A39A]">
                                <span>{msg.senderName || "我"}</span>
                                <span className="text-[10px] opacity-70">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="max-w-[88%] sm:max-w-[80%] p-3.5 rounded-2xl text-[14px] leading-relaxed bg-[#1A1A1A] text-white rounded-tr-none shadow-xs">
                                {msg.content}
                              </div>
                            </div>
                          );
                        }

                        if (isSystem) {
                          return (
                            <div
                              key={msg.id || idx}
                              className="p-3.5 my-2 bg-[#F5F3F0] border border-[#EFECE8] rounded-2xl text-[14px] text-[#78716C] whitespace-pre-wrap leading-relaxed shadow-2xs"
                            >
                              {msg.content}
                            </div>
                          );
                        }

                        // Assistant role: Render character cards
                        const cards = msg.charCards && msg.charCards.length > 0
                          ? msg.charCards
                          : parseTextToCharCards(msg.content, activeWorld.characterIds, getCharacterById, activeWorld.characterStates);

                        const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                          <div key={msg.id || idx} className="space-y-3 mb-3">
                            {cards.map((card, cIdx) => {
                              const isNarrative = card.characterName === "剧情描写" || card.characterName === "旁白" || card.characterName === "环境描写" || card.characterName === "场景" || card.characterName === "系统叙事" || card.characterName === "AI主宰";
                              return (
                                <div
                                  key={cIdx}
                                  className="bg-white rounded-[12px] p-[12px_16px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-[#EFECE8] space-y-2 font-['Inter']"
                                >
                                  {/* Top-left: Character name (12px, bold, warm gray #A8A39A) + time (12px, regular, #BFBAB2) */}
                                  <div className="flex items-center gap-1.5 text-[12px] leading-none">
                                    <span className="font-bold text-[#A8A39A]">
                                      {isNarrative ? "📖 剧情推进" : card.characterName}
                                    </span>
                                    <span className="text-[#BFBAB2] font-normal">{timeStr}</span>
                                  </div>

                                  {/* Content area */}
                                  <div className="space-y-1.5 pt-0.5">
                                    {card.action && (
                                      <p className="text-[14px] text-[#333333] text-left leading-relaxed font-['Inter']">
                                        {card.action}
                                      </p>
                                    )}
                                    {card.dialogue && (
                                      <p className="text-[14px] text-[#1A1A1A] text-left leading-relaxed italic block mt-1.5 font-['Inter']">
                                        “{card.dialogue.replace(/^[“"']|[”"']$/g, "")}”
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-xs text-[#A8A39A]">
                        点击下方“AI推进”或选择行动选项开启故事...
                      </div>
                    )}
                  </div>

                  {/* Modern Warnings block */}
                  {(activeWorld as any).modernWarnings && (activeWorld as any).modernWarnings.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white border border-[#EFECE8] space-y-3 shadow-xs">
                      <h3 className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5 border-b border-[#EFECE8] pb-2">
                        <AlertTriangle className="w-4 h-4 text-[#78716C]" />
                        <span>现代言行穿帮警报</span>
                      </h3>
                      <div className="space-y-2">
                        {((activeWorld as any).modernWarnings as any[]).map((w, index) => (
                          <div key={index} className="p-3 bg-[#FAFAF9] border border-[#EFECE8] rounded-xl space-y-1.5 text-xs text-[#1A1A1A]">
                            <div className="flex items-center justify-between text-[10px] text-[#78716C] border-b border-[#EFECE8] pb-1">
                              <span className="font-medium">穿帮事件 #{index + 1}</span>
                              <span>罚分: +{w.penalty}% 暴露</span>
                            </div>
                            <p className="italic text-[11px]">&quot;{w.text}&quot;</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {w.keywords.map((kw, kwIdx) => (
                                <span key={kwIdx} className="bg-[#F5F3F0] border border-[#EFECE8] px-1.5 py-0.5 rounded text-[10px] font-mono text-[#78716C]">
                                  违禁词: {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 剧情推进区控制底部：Action Options & Custom Input */}
                {activeWorld.status !== "completed" && (
                  <div className="bg-white border-t border-[#EFECE8] flex flex-col shrink-0 shadow-lg">
                    {/* 分支选项 */}
                    {!isOptionsExpanded ? (
                      <div className="border-b border-[#EFECE8]">
                        <button
                          type="button"
                          onClick={() => setIsOptionsExpanded(true)}
                          className="w-full py-3 px-4 bg-[#FAFAF9] hover:bg-[#F5F3F0] flex items-center justify-between text-xs text-[#78716C] font-semibold transition cursor-pointer active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A] animate-pulse" />
                            <span>点击展开选项</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-stone-400 font-normal">
                            <span>展开下一步行动</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 sm:p-4 space-y-2.5 border-b border-[#EFECE8] bg-[#FAFAF9]/30">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A]" />
                            <span>剧情分支行动</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleRefreshActionOptions}
                              disabled={isGenerating || isRefreshingOptions}
                              className="text-xs  text-[#78716C] hover:text-[#1A1A1A] hover:bg-[#F5F3F0] flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5E2DC] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-95"
                              title="刷新行动选项"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRefreshingOptions ? "animate-spin text-[#1A1A1A]" : "text-[#78716C]"}`} />
                              <span>{isRefreshingOptions ? "刷新中..." : "刷新选项"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleTransmigrationUserSend("【AI推进】：请继续推进当前世界的剧情发展的关键节点！");
                                setIsOptionsExpanded(false);
                              }}
                              disabled={isGenerating || (activeWorld.status as string) === "completed"}
                              className="px-3 py-1 rounded-full bg-[#1A1A1A] hover:bg-neutral-800 disabled:bg-[#F5F3F0] disabled:text-[#A8A39A] text-white text-xs  font-medium transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 shadow-xs active:scale-95 border border-[#1A1A1A]"
                              title="AI自动推进剧情"
                            >
                              {isGenerating ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin stroke-[1.5]" />
                                  <span>推进中...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 stroke-[1.5]" />
                                  <span>AI推进剧情</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsOptionsExpanded(false)}
                              className="text-xs text-[#78716C] hover:text-[#1A1A1A] hover:bg-[#F5F3F0] p-1 rounded-full border border-transparent transition cursor-pointer"
                              title="收起选项"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(activeWorld.actionOptions && activeWorld.actionOptions.length > 0
                            ? activeWorld.actionOptions
                            : [
                                "走过去与对方说话",
                                "检查四周的环境与物品",
                                "思考当前原主宿留下的记忆",
                                "静观其变，等待对方开口"
                              ]
                          ).map((optText, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setInputText(optText);
                                setIsOptionsExpanded(false);
                              }}
                              disabled={isGenerating || isRefreshingOptions}
                              className="text-left px-3.5 py-2 bg-white border border-[#E5E2DC] hover:border-[#1A1A1A] hover:bg-[#F5F3F0] rounded-xl text-xs  text-[#1A1A1A] transition flex items-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-[0.99] group shadow-xs"
                            >
                              <span className="w-4 h-4 rounded-full bg-[#F5F3F0] group-hover:bg-[#1A1A1A] group-hover:text-white flex items-center justify-center text-[10px] font-mono text-[#78716C] shrink-0 transition font-medium border border-[#EFECE8]">
                                {idx + 1}
                              </span>
                              <span className="truncate flex-1">{optText}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 剧情推进自定义输入框 */}
                    <div className="p-3 bg-white flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={(activeWorld.status as string) !== "completed" ? "输入自定义行动、对话或回应..." : "世界已结束，无法继续操作"}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTransmigrationUserSend()}
                        disabled={isGenerating || (activeWorld.status as string) === "completed"}
                        className="flex-1 bg-white border border-[#E5E2DC] rounded-full px-4 py-2 text-[14px]  text-[#1A1A1A] outline-none focus:border-[#1A1A1A] placeholder-[#A8A39A] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleTransmigrationUserSend()}
                        disabled={isGenerating || !inputText.trim() || (activeWorld.status as string) === "completed"}
                        className="p-2.5 bg-[#1A1A1A] hover:bg-neutral-800 disabled:bg-[#F5F3F0] disabled:text-[#A8A39A] text-white rounded-full transition cursor-pointer flex items-center justify-center shrink-0 border border-[#1A1A1A]"
                        title="发送自定义行动"
                      >
                        {isGenerating ? <RefreshCw className="w-4 h-4 stroke-[1.5] animate-spin" /> : <Send className="w-4 h-4 stroke-[1.5]" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== 2. 位面交流群 (WORLD GROUP CHAT AREA) ==================== */}
            {activePlayTab === "chat" && (() => {
              const currentFactionId = activeWorld.factions?.[0]?.id || "world_chat";

              return (
                <div className="flex-1 flex flex-col h-full bg-[#F8F6F3] animate-fade-in overflow-hidden">
                  {/* 群聊区顶栏 */}
                  <div className="p-3 border-b border-[#EFECE8] bg-white sticky top-0 z-10 space-y-1 shrink-0 shadow-2xs flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#1A1A1A]" />
                      <span>位面交流群</span>
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                      🟢 活跃中
                    </span>
                  </div>

                  {/* 群聊消息展示区 (按时间倒序排列：最新消息在最上方) */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 ">
                    {(() => {
                      const rawMsgs = activeWorld.factionChats?.[currentFactionId] || activeWorld.factionChats?.["world_chat"] || [];
                      // 按时间倒序排列 (最新消息置顶)
                      const sortedMsgs = [...rawMsgs].sort((a, b) => b.timestamp - a.timestamp);

                      if (sortedMsgs.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-[#A8A39A] gap-2 py-16">
                            <MessageSquare className="w-8 h-8 opacity-40 stroke-[1.2]" />
                            <p className="text-xs font-medium">交流群暂无讨论消息</p>
                          </div>
                        );
                      }

                      return sortedMsgs.map((msg, idx) => {
                        const isMe = msg.senderId === "user" || msg.senderName === "玩家" || msg.senderName === "我";

                        let displayName = msg.senderName;
                        const char = characters.find(c => c.id === msg.senderId || c.name === msg.senderName);
                        const charState = activeWorld.characterStates?.[char?.id || ""] ||
                                          (activeWorld as any).charactersState?.find((cs: any) => cs.characterId === char?.id || cs.name === msg.senderName);

                        if (isMe) {
                          displayName = "玩家（你自己）";
                        } else {
                          const realName = char?.name || charState?.name || msg.senderName;
                          displayName = `${realName}（攻略对象）`;
                        }

                        const avatar = isMe
                          ? ((activeWorld.userIdentity as any)?.avatar || "👤")
                          : ((charState as any)?.avatar || char?.avatar || "👤");

                        const avatarEl = (
                          <CharacterAvatar character={char} avatar={avatar} name={isMe ? "我" : (char?.name || "角色")} mode="real" size={28} className="rounded-full shadow-2xs shrink-0" />
                        );

                        return (
                          <div
                            key={msg.id || idx}
                            className={`flex items-start gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            {!isMe && avatarEl}

                            <div className={`flex flex-col max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#78716C] ">
                                <span>{displayName}</span>
                                <span className="opacity-70 font-mono text-[9px]">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div
                                className={`p-3 rounded-2xl text-xs leading-relaxed  ${
                                  isMe
                                    ? "bg-[#1A1A1A] text-white rounded-tr-none shadow-xs"
                                    : "bg-white text-[#1A1A1A] border border-[#EFECE8] rounded-tl-none shadow-xs"
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            </div>

                            {isMe && avatarEl}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* 群聊区输入框 */}
                  <div className="p-3 border-t border-[#EFECE8] flex items-center gap-2 bg-white">
                    <input
                      type="text"
                      value={factionChatInput}
                      onChange={(e) => setFactionChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendFactionMessage()}
                      placeholder="在位面交流群发言，向攻略对象互动..."
                      className="flex-1 rounded-full px-4 py-2.5 text-xs bg-white border border-[#E5E2DC] text-[#1A1A1A] focus:border-[#1A1A1A] outline-none transition placeholder-[#A8A39A]"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSendFactionMessage}
                        disabled={!factionChatInput.trim()}
                        className={`px-3.5 py-2.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center justify-center border ${
                          factionChatInput.trim()
                            ? "bg-[#1A1A1A] hover:bg-neutral-800 text-white border-[#1A1A1A] shadow-xs"
                            : "bg-[#EFECE8] text-[#A8A39A] border-transparent cursor-not-allowed"
                        }`}
                        title="发送消息"
                      >
                        <Send className="w-3.5 h-3.5 stroke-[1.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={handleAIGenerateFactionChat}
                        disabled={isGenerating}
                        className="px-3 py-2.5 rounded-full text-xs font-medium bg-[#F5F3F0] hover:bg-[#EFECE8] text-[#1A1A1A] border border-[#EFECE8] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="AI生成讨论回复"
                      >
                        <Sparkles className="w-3.5 h-3.5 stroke-[1.5] text-amber-600" />
                        <span className="text-[11px]">AI讨论</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ==================== SUB-MODALS ==================== */}

          {/* Character Inspect Drawer Modal */}
          {inspectingCharId && (() => {
            const charState = ((activeWorld as any).charactersState || []).find((c: any) => c.characterId === inspectingCharId);
            if (!charState) return null;
            return (
              <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-[#EFECE8] rounded-3xl p-5 w-full max-w-sm space-y-4 animate-fade-in text-[#1A1A1A] shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#EFECE8] pb-3">
                    <h3 className="font-semibold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                      <User className="w-4 h-4 text-[#78716C]" />
                      <span>伙伴属性档案</span>
                    </h3>
                    <button onClick={() => setInspectingCharId(null)} className="text-[#A8A39A] hover:text-[#1A1A1A] cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 bg-[#F5F3F0] p-3 rounded-2xl border border-[#EFECE8]">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl border border-[#EFECE8]">
                      {charState.avatar || "👤"}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#1A1A1A] text-sm">{charState.name}</h4>
                      <p className="text-[10px] text-[#78716C] font-medium mt-0.5">
                        原世界真实身份: 【{charState.revealed ? (charState.thought?.includes("攻略者") ? "攻略者" : "攻略对象") : "未破译"}】
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed">
                    <div className="p-3 bg-[#FAFAF9] rounded-xl space-y-1 border border-[#EFECE8]">
                      <span className="text-[#78716C] font-medium block text-[10px] uppercase">当前原住民躯壳：</span>
                      <p className="font-semibold text-[#1A1A1A] text-[11px]">{charState.identity?.name || "???"} ({charState.identity?.age}岁)</p>
                      <p className="text-[#78716C] mt-1">职业: {charState.identity?.occupation}</p>
                      <p className="text-[#78716C] text-[11px] mt-1">性格: {charState.identity?.personality}</p>
                      <p className="text-[#78716C] text-[11px] leading-normal mt-1">背景故事: {charState.identity?.background}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#FAFAF9] p-2.5 rounded-xl border border-[#EFECE8]">
                        <span className="text-[#78716C] text-[10px] block">好感羁绊：</span>
                        <span className="text-[#1A1A1A] font-semibold font-mono text-base">{charState.favorability || 0}%</span>
                      </div>

                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#EFECE8] flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setInspectingCharId(null);
                        setAccuseTargetId(charState.characterId);
                        setAccuseText("");
                        setShowAccuseModal(true);
                      }}
                      className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-medium rounded-full hover:bg-neutral-800 transition cursor-pointer"
                    >
                      当面相认
                    </button>
                    <button
                      onClick={() => setInspectingCharId(null)}
                      className="px-4 py-2 bg-white border border-[#E5E2DC] text-[#78716C] hover:text-[#1A1A1A] text-xs rounded-full transition cursor-pointer"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Accuse Modal */}
          {showAccuseModal && accuseTargetId && (() => {
            const targetChar = ((activeWorld as any).charactersState || []).find((c: any) => c.characterId === accuseTargetId);
            if (!targetChar) return null;
            return (
              <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-[#EFECE8] rounded-3xl p-5 w-full max-w-sm space-y-4 animate-fade-in text-[#1A1A1A] shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#EFECE8] pb-3">
                    <h3 className="font-semibold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>情感试探 / 当面摊牌</span>
                    </h3>
                    <button onClick={() => setShowAccuseModal(false)} className="text-[#A8A39A] hover:text-[#1A1A1A] cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#78716C] leading-normal bg-[#FAFAF9] p-2.5 rounded-xl border border-[#EFECE8]">
                    向攻略对象 <span className="text-[#1A1A1A] font-semibold">{targetChar.name}</span> 发出试探或当面表达心意。若好感度足够，将打动对方心弦。
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-[#1A1A1A] block mb-1">说出您的试探或台词：</label>
                      <textarea
                        placeholder="例如：其实在这个世界，我一直注视着你的一切……"
                        rows={3}
                        value={accuseText}
                        onChange={(e) => setAccuseText(e.target.value)}
                        className="w-full bg-white border border-[#E5E2DC] rounded-xl px-3 py-2 text-xs text-[#1A1A1A] outline-none focus:border-[#1A1A1A] placeholder-[#A8A39A] resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#EFECE8] flex justify-end gap-2">
                    <button
                      onClick={() => setShowAccuseModal(false)}
                      className="px-4 py-2 bg-white border border-[#E5E2DC] text-[#78716C] hover:text-[#1A1A1A] text-xs rounded-full transition cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        if (!accuseText.trim()) {
                          alert("请输入试探或对白！");
                          return;
                        }
                        setShowAccuseModal(false);
                        await handleAccuseCharacter(accuseTargetId, accuseText);
                      }}
                      disabled={isGenerating || !accuseText.trim()}
                      className="px-4 py-2 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-medium rounded-full transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>确认发送</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. RULES HORROR LIST */}
      {activeTab === "rules_list" && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden">
          <div className="h-14 border-b border-neutral-900 px-4 flex items-center justify-between shrink-0 bg-neutral-950/80 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("main")}
              className="p-1.5 hover:bg-neutral-900 rounded-xl transition text-neutral-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-sm tracking-wide text-white">规则怪谈 · 副本列表</h1>
            <button
              onClick={() => setShowCreateInstanceModal(true)}
              className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>新建</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {instances.length === 0 ? (
              <div className="py-16 text-center space-y-3 text-neutral-500">
                <AlertTriangle className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
                <p className="text-xs">暂无怪谈副本，点击右上角“新建”踏入禁忌之域！</p>
              </div>
            ) : (
              instances.map((inst) => {
                const statusObj = getStatusLabel(inst.status);

                return (
                  <div
                    key={inst.id}
                    className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-white truncate">{inst.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusObj.color}`}>
                            {statusObj.text}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                          {inst.background}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (window.confirm("确定要删除该怪谈副本吗？")) {
                            persistInstances(instances.filter((item) => item.id !== inst.id));
                          }
                        }}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-neutral-800/60">
                      <div className="flex items-center justify-between text-[11px] text-amber-400">
                        <span>结局进度: {inst.endingProgress}</span>
                        <span className="font-mono text-[10px] text-neutral-500">{formatDate(inst.updatedAt)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center -space-x-1">
                          {inst.characterIds.map((cid) => {
                            const c = getCharacterById(cid);
                            return (
                              <div
                                key={cid}
                                className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs"
                              >
                                {c?.avatar || "👤"}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            setActiveInstance(inst);
                            setActiveTab("rules_play");
                          }}
                          className="px-3 py-1 bg-amber-950 border border-amber-500/40 hover:bg-amber-900 text-amber-300 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>进入副本</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* RULES HORROR PLAY SESSION */}
      {activeTab === "rules_play" && activeInstance && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden">
          <div className="h-14 border-b border-neutral-900 px-4 flex items-center justify-between shrink-0 bg-neutral-950/80 backdrop-blur-md">
            <button
              onClick={() => {
                persistInstances(instances);
                setActiveTab("main");
              }}
              className="p-1.5 hover:bg-neutral-900 rounded-xl transition text-neutral-400 hover:text-white cursor-pointer flex items-center gap-1"
              title="返回宇宙目录"
            >
              <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
            </button>
            <div className="text-center">
              <h1 className="font-bold text-sm text-white">{activeInstance.name}</h1>
              <p className="text-[10px] text-amber-400 font-mono">
                结局: {activeInstance.endingProgress}
              </p>
            </div>
            <button
              onClick={() => setShowBackgroundDrawer(!showBackgroundDrawer)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition cursor-pointer"
              title="查看规则清单"
            >
              <Shield className="w-5 h-5 text-amber-400" />
            </button>
          </div>

          {/* Rules Collapsible Drawer */}
          {showBackgroundDrawer && (
            <div className="bg-neutral-900 border-b border-neutral-800 p-4 space-y-3 animate-fade-in text-xs max-h-52 overflow-y-auto">
              <div className="flex items-center justify-between font-bold text-amber-400">
                <span>⚠️ 怪谈生存法则清单</span>
                <button onClick={() => setShowBackgroundDrawer(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                {activeInstance.rules.map((r) => (
                  <div key={r.id} className="p-2 bg-neutral-950 rounded-xl border border-neutral-800 text-neutral-300">
                    <p className="font-mono text-[11px] font-bold text-amber-300">【规则 {r.id}】</p>
                    <p className="mt-0.5">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeInstance.messages.map((m) => (
              <div key={m.id} className="space-y-1">
                {m.role === "system" ? (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-2xl text-xs text-amber-200 leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : m.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-amber-600 text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-neutral-900 border border-neutral-800 text-neutral-200 p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed whitespace-pre-wrap shadow-sm">
                      {m.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-amber-400 animate-pulse py-2">
                <Eye className="w-4 h-4 animate-spin" />
                <span>怪谈法则正在响应你的抉择...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-neutral-950 border-t border-neutral-900 flex items-center gap-2">
            <input
              type="text"
              placeholder="遵从或挑战规则..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRulesUserSend()}
              disabled={isGenerating}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 placeholder-neutral-600"
            />
            <button
              type="button"
              onClick={() => handleRulesUserSend()}
              disabled={isGenerating || !inputText.trim()}
              className="p-2 bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-800 text-white rounded-xl transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleRulesUserSend("【探索异象】：我们尝试探索周围的环境，探寻怪谈的源头！")}
              disabled={isGenerating}
              className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>探索</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. SUSPENSE THEATER LIST */}
      {activeTab === "suspense_list" && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden">
          <div className="h-14 border-b border-neutral-900 px-4 flex items-center justify-between shrink-0 bg-neutral-950/80 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("main")}
              className="p-1.5 hover:bg-neutral-900 rounded-xl transition text-neutral-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-sm tracking-wide text-white">悬疑剧场 · 剧本列表</h1>
            <button
              onClick={() => setShowCreateScriptModal(true)}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>新建</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {scripts.length === 0 ? (
              <div className="py-16 text-center space-y-3 text-neutral-500">
                <Film className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs">暂无悬疑剧本，点击右上角“新建”开启5幕大剧！</p>
              </div>
            ) : (
              scripts.map((sc) => {
                const statusObj = getStatusLabel(sc.status);

                return (
                  <div
                    key={sc.id}
                    className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-white truncate">{sc.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                            {sc.genre}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusObj.color}`}>
                            {statusObj.text}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                          {sc.background}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (window.confirm("确定要删除该悬疑剧本吗？")) {
                            persistScripts(scripts.filter((item) => item.id !== sc.id));
                          }
                        }}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-neutral-800/60">
                      <div className="flex items-center justify-between text-[11px] text-emerald-400">
                        <span>当前进度: 第 {sc.currentAct} 幕 / 共 5 幕</span>
                        <span className="font-mono text-[10px] text-neutral-500">{formatDate(sc.updatedAt)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center -space-x-1">
                          {sc.characterIds.map((cid) => {
                            const c = getCharacterById(cid);
                            return (
                              <div
                                key={cid}
                                className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs"
                              >
                                {c?.avatar || "👤"}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            setActiveScript(sc);
                            setActiveTab("suspense_play");
                          }}
                          className="px-3 py-1 bg-emerald-950 border border-emerald-500/40 hover:bg-emerald-900 text-emerald-300 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>进入剧场</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUSPENSE THEATER PLAY SESSION */}
      {activeTab === "suspense_play" && activeScript && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden">
          <div className="h-14 border-b border-neutral-900 px-4 flex items-center justify-between shrink-0 bg-neutral-950/80 backdrop-blur-md">
            <button
              onClick={() => {
                persistScripts(scripts);
                setActiveTab("main");
              }}
              className="p-1.5 hover:bg-neutral-900 rounded-xl transition text-neutral-400 hover:text-white cursor-pointer flex items-center gap-1"
              title="返回宇宙目录"
            >
              <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
            </button>
            <div className="text-center">
              <h1 className="font-bold text-sm text-white">{activeScript.name}</h1>
              <p className="text-[10px] text-emerald-400 font-mono">
                幕次: {activeScript.currentAct} / 5 幕
              </p>
            </div>
            <button
              onClick={() => setShowBackgroundDrawer(!showBackgroundDrawer)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition cursor-pointer"
              title="查看剧本秘闻"
            >
              <Users className="w-5 h-5 text-emerald-400" />
            </button>
          </div>

          {/* 5-Act Stepper Bar */}
          <div className="bg-neutral-900/90 border-b border-neutral-800 px-3 py-2 flex items-center justify-between text-[11px] overflow-x-auto">
            {["入场", "案件发生", "调查推进", "推理高潮", "结局揭晓"].map((actTitle, idx) => {
              const actNum = idx + 1;
              const isCurrent = activeScript.currentAct === actNum;
              const isPassed = activeScript.currentAct > actNum;

              return (
                <div key={actNum} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      isCurrent
                        ? "bg-emerald-500 text-neutral-950 ring-2 ring-emerald-400/30"
                        : isPassed
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : "bg-neutral-800 text-neutral-500"
                    }`}
                  >
                    {actNum}.{actTitle}
                  </div>
                  {actNum < 5 && <span className="text-neutral-700 text-[10px]">&gt;</span>}
                </div>
              );
            })}
          </div>

          {/* Role Assignments Collapsible Drawer */}
          {showBackgroundDrawer && (
            <div className="bg-neutral-900 border-b border-neutral-800 p-4 space-y-3 animate-fade-in text-xs max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between font-bold text-emerald-400">
                <span>🎭 角色彩蛋与秘密清单</span>
                <button onClick={() => setShowBackgroundDrawer(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {activeScript.roleAssignments.map((role) => (
                  <div key={role.characterId} className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{role.characterName} &rarr; 【{role.roleName}】</span>
                      <button
                        onClick={() => setShowSecretModal(role)}
                        className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                      >
                        查看秘密
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400">身份：{role.identity}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeScript.messages.map((m) => (
              <div key={m.id} className="space-y-1">
                {m.role === "system" ? (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl text-xs text-emerald-200 leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : m.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-emerald-600 text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-neutral-900 border border-neutral-800 text-neutral-200 p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed whitespace-pre-wrap shadow-sm">
                      {m.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 animate-pulse py-2">
                <Film className="w-4 h-4 animate-spin" />
                <span>DM 正在演播幕次剧情...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Action / Next Act Footer */}
          <div className="p-3 bg-neutral-950 border-t border-neutral-900 space-y-2">
            {activeScript.currentAct < 5 && (
              <button
                onClick={handleAdvanceAct}
                disabled={isGenerating}
                className="w-full py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>推进至下一幕 (第 {activeScript.currentAct + 1} 幕)</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="讨论案情或盘问角色..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSuspenseUserSend()}
                disabled={isGenerating}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 placeholder-neutral-600"
              />
              <button
                type="button"
                onClick={() => handleSuspenseUserSend()}
                disabled={isGenerating || !inputText.trim()}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-800 text-white rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE MODALS ==================== */}

      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFECE8] rounded-[16px] p-6 w-full max-w-lg space-y-5 animate-fade-in text-[#1A1A1A] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between border-b border-[#EFECE8] pb-3">
              <h3 className="text-lg text-[#1A1A1A] flex items-center gap-2">
                <Share2 className="w-4 h-4 stroke-[1.5] text-[#1A1A1A]" />
                分享存档到角色记忆
              </h3>
              <button onClick={() => setShowShareModal(null)} className="text-[#A8A39A] hover:text-[#1A1A1A] cursor-pointer p-1">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>
            
            <p className="text-sm text-[#78716C]">选择要分享该存档记忆的角色：</p>
            
            <div className="grid grid-cols-2 gap-2">
              {worlds.find(w => w.id === showShareModal.worldId)?.characterIds?.map(charId => {
                const char = characters.find(c => c.id === charId);
                const isSelected = selectedShareCharIds.includes(charId);
                return char ? (
                  <button
                    key={charId}
                    type="button"
                    onClick={() => {
                      setSelectedShareCharIds(prev => 
                        prev.includes(charId) 
                          ? prev.filter(id => id !== charId) 
                          : [...prev, charId]
                      );
                    }}
                    className={`p-2 rounded-[8px] border text-xs flex items-center gap-2 transition cursor-pointer ${
                      isSelected
                        ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
                        : "bg-white border-[#EFECE8] text-[#1A1A1A] hover:border-[#1A1A1A]"
                    }`}
                  >
                    <User className={`w-3 h-3 ${isSelected ? "text-white" : "text-[#A8A39A]"}`} />
                    {char.name}
                  </button>
                ) : null;
              })}
            </div>

            <div className="flex justify-end pt-4">
               <button
                 onClick={() => {
                    const world = worlds.find(w => w.id === showShareModal.worldId);
                    if (world) {
                      const updatedWorld = {
                        ...world,
                        memoryCard: { ...world.memoryCard!, shared: true },
                        characterStates: {
                          ...world.characterStates,
                        }
                      };
                      
                      selectedShareCharIds.forEach(id => {
                        if (updatedWorld.characterStates && updatedWorld.characterStates[id]) {
                          updatedWorld.characterStates[id] = {
                            ...updatedWorld.characterStates[id],
                            identity: {
                              ...updatedWorld.characterStates[id].identity,
                              memories: [...(updatedWorld.characterStates[id].identity.memories || []), showShareModal.content]
                            }
                          };
                        }
                      });
                      
                      persistWorlds(worlds.map(w => w.id === showShareModal.worldId ? updatedWorld : w));
                    }
                    setShowShareModal(null);
                    setSelectedShareCharIds([]);
                 }}
                 className="px-4 py-2 bg-[#1A1A1A] text-white text-xs rounded-full cursor-pointer"
               >
                 确认分享
               </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Create World Modal */}
      {showCreateWorldModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFECE8] rounded-[16px] p-6 w-full max-w-lg space-y-5 animate-fade-in text-[#1A1A1A] max-h-[90vh] overflow-y-auto shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between border-b border-[#EFECE8] pb-3">
              <h3 className=" text-lg text-[#1A1A1A] flex items-center gap-2">
                <Zap className="w-4 h-4 stroke-[1.5] text-[#1A1A1A]" />
                创建快穿新世界
              </h3>
              <button onClick={() => setShowCreateWorldModal(false)} className="text-[#A8A39A] hover:text-[#1A1A1A] cursor-pointer p-1">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <div className="space-y-4">
              {/* World Preset selection */}
              <div>
                <label className="text-xs  text-[#1A1A1A] block mb-2 font-medium">选择世界预设主题</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {PRESET_WORLDS.map((preset) => {
                    const isSelected = newWorldPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setNewWorldPresetId(preset.id);
                          setNewWorldName(preset.name);
                        }}
                        className={`p-3 rounded-[12px] border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
                            : "bg-white border-[#EFECE8] text-[#1A1A1A] hover:border-[#1A1A1A]"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs">{preset.icon}</span>
                          <span className="text-xs  truncate">{preset.name}</span>
                        </div>
                        <p className={`text-[10px]  line-clamp-1 leading-normal ${isSelected ? "text-neutral-300" : "text-[#A8A39A]"}`}>{preset.description}</p>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setNewWorldPresetId("");
                      setNewWorldName("");
                    }}
                    className={`p-3 rounded-[12px] border text-left transition-all cursor-pointer ${
                      newWorldPresetId === ""
                        ? "bg-[#1A1A1A] border-[#1A1A1A] text-white"
                        : "bg-white border-[#EFECE8] text-[#1A1A1A] hover:border-[#1A1A1A]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs">🎲</span>
                      <span className="text-xs  truncate">自定义世界</span>
                    </div>
                    <p className={`text-[10px]  line-clamp-1 leading-normal ${newWorldPresetId === "" ? "text-neutral-300" : "text-[#A8A39A]"}`}>自主拟定全新脑洞背景</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs  text-[#1A1A1A] block mb-1.5 font-medium">世界名称</label>
                <input
                  type="text"
                  placeholder="如：修仙破妄界 / 废土避难所"
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  className="w-full bg-white border border-[#EFECE8] rounded-[12px] px-4 py-2.5 text-[15px]  text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="text-xs  text-[#1A1A1A] block mb-1.5 font-medium">自定义设定关键词 (可选)</label>
                <input
                  type="text"
                  placeholder="如：赛博朋克、雨夜、宿命感"
                  value={newWorldKeywords}
                  onChange={(e) => setNewWorldKeywords(e.target.value)}
                  className="w-full bg-white border border-[#EFECE8] rounded-[12px] px-4 py-2.5 text-[15px]  text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                />
              </div>

              {/* Word Count Range Selection */}
              <div>
                <label className="text-xs text-[#1A1A1A] block mb-1.5 font-medium">每轮生成的字数范围 (最小值 ~ 最大值，最高15000字)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={50}
                    max={15000}
                    value={newMinWord}
                    onChange={(e) => setNewMinWord(Math.max(50, parseInt(e.target.value) || 50))}
                    className="w-full bg-white border border-[#EFECE8] rounded-[12px] px-3 py-2 text-xs text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                    placeholder="最小字数 (例如 300)"
                  />
                  <span className="text-xs text-[#78716C] font-semibold shrink-0">至</span>
                  <input
                    type="number"
                    min={100}
                    max={15000}
                    value={newMaxWord}
                    onChange={(e) => setNewMaxWord(Math.min(15000, parseInt(e.target.value) || 1500))}
                    className="w-full bg-white border border-[#EFECE8] rounded-[12px] px-3 py-2 text-xs text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                    placeholder="最大字数 (例如 1500，上限15000)"
                  />
                </div>
              </div>

              {renderCharacterSelector()}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFECE8]">
              <button
                onClick={() => setShowCreateWorldModal(false)}
                className="px-4 py-2 border border-[#E5E2DC] text-[#1A1A1A] text-[13px]  rounded-full hover:bg-[#F5F3F0] transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleCreateWorld}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px]  font-medium rounded-full transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin stroke-[1.5]" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" />
                    <span>AI 自动生成世界</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Create Instance Modal */}
      {showCreateInstanceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm space-y-4 animate-fade-in text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                创建规则怪谈副本
              </h3>
              <button onClick={() => setShowCreateInstanceModal(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">副本名称</label>
                <input
                  type="text"
                  placeholder="如：深夜404号巴士 / 午夜图书馆"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              {renderCharacterSelector()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setShowCreateInstanceModal(false)}
                className="px-4 py-2 bg-neutral-800 text-neutral-400 text-xs rounded-xl hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleCreateInstance}
                disabled={isGenerating || !newInstanceName.trim() || selectedCharIds.length === 0}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 生成怪谈规则</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Create Script Modal */}
      {showCreateScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm space-y-4 animate-fade-in text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Film className="w-4 h-4 text-emerald-400" />
                创建悬疑剧场剧本
              </h3>
              <button onClick={() => setShowCreateScriptModal(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">剧本名称</label>
                <input
                  type="text"
                  placeholder="如：钟楼谋杀案 / 山庄无人生还"
                  value={newScriptName}
                  onChange={(e) => setNewScriptName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">剧本类型</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["悬疑", "犯罪", "心理", "都市"] as SuspenseGenre[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNewScriptGenre(g)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        newScriptGenre === g
                          ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {renderCharacterSelector()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setShowCreateScriptModal(false)}
                className="px-4 py-2 bg-neutral-800 text-neutral-400 text-xs rounded-xl hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleCreateScript}
                disabled={isGenerating || !newScriptName.trim() || selectedCharIds.length < 2 || selectedCharIds.length > 5}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 生成完整剧本</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret Card Modal */}
      {showSecretModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-emerald-500/40 rounded-3xl p-5 w-full max-w-xs space-y-3 animate-fade-in text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                🔒 专属身份与秘密
              </h3>
              <button onClick={() => setShowSecretModal(null)} className="text-neutral-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><span className="font-bold text-neutral-400">角色：</span>{showSecretModal.characterName}</p>
              <p><span className="font-bold text-neutral-400">扮相身份：</span>{showSecretModal.roleName}</p>
              <p><span className="font-bold text-neutral-400">明面背景：</span>{showSecretModal.identity}</p>
              <div className="p-2.5 bg-neutral-950 rounded-xl border border-rose-500/30 text-rose-300">
                <p className="font-bold text-[11px] mb-0.5">私密秘密（不公开）：</p>
                <p>{showSecretModal.secret}</p>
              </div>
              <p><span className="font-bold text-neutral-400">核心动机：</span>{showSecretModal.motive}</p>
            </div>

            <button
              onClick={() => setShowSecretModal(null)}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl mt-2 cursor-pointer transition"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {worldToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-xs space-y-4 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="font-bold text-white">删除世界？</h3>
              <p className="text-xs text-neutral-400">确定要删除该快穿世界及所有记录吗？此操作无法撤销。</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setWorldToDelete(null)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  persistWorlds(worlds.filter((item) => item.id !== worldToDelete));
                  setWorldToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save & Exit Confirmation Modal */}
      {showSaveExitConfirm && activeWorld && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-purple-500/30 rounded-3xl p-6 w-full max-w-xs space-y-4 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-bold text-white">保存并退出？</h3>
              <p className="text-xs text-neutral-400">我们将为您保存当前的转生轮次与世界进度。</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveExitConfirm(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const updatedWorld = { ...activeWorld, status: "in_progress" as const, updatedAt: Date.now() };
                  const updatedWorlds = worlds.map(item => item.id === activeWorld.id ? updatedWorld : item);
                  persistWorlds(updatedWorlds);
                  setActiveWorld(null);
                  setActiveTab("main");
                  setShowSaveExitConfirm(false);
                }}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                确定保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creation Type Picker Modal */}
      {showCreatePickerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFECE8] rounded-[16px] p-6 w-full max-w-sm space-y-4 animate-fade-in text-[#1A1A1A] shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between border-b border-[#EFECE8] pb-3">
              <h3 className=" font-semibold text-base text-[#1A1A1A]">
                选择要创建的宇宙类型
              </h3>
              <button
                onClick={() => setShowCreatePickerModal(false)}
                className="text-[#A8A39A] hover:text-[#1A1A1A] p-1 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCreatePickerModal(false);
                  setShowCreateWorldModal(true);
                }}
                className="w-full p-3.5 rounded-[12px] border border-[#EFECE8] bg-white hover:border-[#1A1A1A] transition text-left flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-[#F5F3F0] flex items-center justify-center text-base group-hover:bg-[#1A1A1A] group-hover:text-white transition shrink-0">
                  🌸
                </div>
                <div>
                  <h4 className=" font-semibold text-sm text-[#1A1A1A]">快穿世界</h4>
                  <p className="text-[11px] text-[#78716C] mt-0.5">高维身份扮演、对立阵营攻略与多结局重构</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreatePickerModal(false);
                  setShowCreateInstanceModal(true);
                }}
                className="w-full p-3.5 rounded-[12px] border border-[#EFECE8] bg-white hover:border-[#1A1A1A] transition text-left flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-[#F5F3F0] flex items-center justify-center text-base group-hover:bg-[#1A1A1A] group-hover:text-white transition shrink-0">
                  👁️
                </div>
                <div>
                  <h4 className=" font-semibold text-sm text-[#1A1A1A]">规则怪谈</h4>
                  <p className="text-[11px] text-[#78716C] mt-0.5">禁忌法则探索、心理压迫感与生还结局</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreatePickerModal(false);
                  setShowCreateScriptModal(true);
                }}
                className="w-full p-3.5 rounded-[12px] border border-[#EFECE8] bg-white hover:border-[#1A1A1A] transition text-left flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-[#F5F3F0] flex items-center justify-center text-base group-hover:bg-[#1A1A1A] group-hover:text-white transition shrink-0">
                  🎭
                </div>
                <div>
                  <h4 className=" font-semibold text-sm text-[#1A1A1A]">悬疑剧场</h4>
                  <p className="text-[11px] text-[#78716C] mt-0.5">5幕大剧、角色专属彩蛋与推理真相</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFECE8] rounded-[16px] p-6 w-full max-w-xs space-y-4 animate-scale-in text-[#1A1A1A] shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-500">
                <Trash2 className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className=" font-semibold text-base text-[#1A1A1A]">删除宇宙？</h3>
              <p className="text-xs text-[#78716C]">
                确定要删除《{itemToDelete.name}》及其所有记录吗？此操作无法撤销。
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 border border-[#EFECE8] text-[#1A1A1A] text-xs  rounded-full hover:bg-[#F5F3F0] transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleDeleteCardItem}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs  font-medium rounded-full transition cursor-pointer"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End World Confirmation Modal */}
      {showEndWorldConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFECE8] rounded-[20px] p-6 w-full max-w-md space-y-4 animate-fade-in text-[#1A1A1A] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EFECE8] pb-3">
              <h3 className="font-bold text-base text-[#1A1A1A] flex items-center gap-2">
                <span>🏁 结束快穿世界与存档生成</span>
              </h3>
              <button onClick={() => setShowEndWorldConfirm(false)} className="text-[#A8A39A] hover:text-[#1A1A1A] cursor-pointer p-1">
                <X className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>

            <p className="text-xs text-[#78716C] leading-relaxed">
              您确定要手动结算并结束当前快穿世界《{activeWorld?.name}》吗？
              <br /><br />
              结束之后将：
              <br />• 自动统计任务达成数、角色最终好感度与暴露值
              <br />• 生成一张【快穿存档卡片】保存到历史存档列表中
              <br />• 您可以随时在历史存档中点击“恢复存档 / 继续游戏”重新进入世界
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFECE8]">
              <button
                onClick={() => setShowEndWorldConfirm(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-[#78716C] bg-[#F5F3F0] hover:bg-[#EFECE8] transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleEndAndArchiveWorld}
                className="px-4 py-2 rounded-full text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer shadow-xs"
              >
                确认结束并归档
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
