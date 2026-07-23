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
  const [showBackgroundDrawer, setShowBackgroundDrawer] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState<RoleAssignment | null>(null);

  // Create Modals
  const [showCreateWorldModal, setShowCreateWorldModal] = useState(false);
  const [showCreateInstanceModal, setShowCreateInstanceModal] = useState(false);
  const [showCreateScriptModal, setShowCreateScriptModal] = useState(false);

  // Form States for Creation
  const [newWorldName, setNewWorldName] = useState("");
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  
  const [newInstanceName, setNewInstanceName] = useState("");

  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptGenre, setNewScriptGenre] = useState<SuspenseGenre>("悬疑");

  // Expanded Transmigration States
  const [newWorldPresetId, setNewWorldPresetId] = useState<string>("");
  const [newWorldUserTag, setNewWorldUserTag] = useState<"攻略者" | "攻略对象">("攻略者");
  const [factionAName, setFactionAName] = useState("明光");
  const [factionBName, setFactionBName] = useState("暗影");
  const [characterFactionMap, setCharacterFactionMap] = useState<Record<string, 'faction_a' | 'faction_b'>>({});
  const [inspectingCharId, setInspectingCharId] = useState<string | null>(null);
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [accuseTargetId, setAccuseTargetId] = useState<string | null>(null);
  const [accuseGuessTag, setAccuseGuessTag] = useState<"攻略者" | "攻略对象">("攻略者");
  const [accuseText, setAccuseText] = useState("");
  const [activePlayTab, setActivePlayTab] = useState<"behavior" | "tasks" | "identities" | "history" | "chat" | "settings">("history");
  const [viewingFactionId, setViewingFactionId] = useState<string | null>(null);
  const [factionChatInput, setFactionChatInput] = useState("");
  const [editWorldBg, setEditWorldBg] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [editUserThought, setEditUserThought] = useState("");
  const [editCharacterStates, setEditCharacterStates] = useState<Record<string, CharacterTransmigrationState>>({});
  const [editTasks, setEditTasks] = useState<TransmigrationTask[]>([]);
  const [selectedShareCharId, setSelectedShareCharId] = useState<string>("");
  
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

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeWorld?.messages, activeInstance?.messages, activeScript?.messages, isGenerating]);

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

  const generateLocalFallbackWorld = (worldName: string, selectedChars: Character[], userTag: string) => {
    let bg = `这是一个名为《${worldName}》的跨次元高维重构世界。天地灵气与赛博代码交织，各方势力盘根错节，隐藏着不可告人的远古秘密。`;
    let tasksList = ["探寻世界核心遗迹并破解封印", "联合关键阵营NPC获取信任", "在时空崩塌前寻回原世界归途"];

    const userIdentity: IdentityDetails = {
      name: userTag === "攻略者" ? "秦羽" : "叶悠然",
      age: 21,
      appearance: "眼眸深邃，气质沉稳，身穿一袭符合当下身份的得体服饰，但举手投足间隐隐透露着一股游离于这个世界之外的超脱感。",
      profession: userTag === "攻略者" ? "特级时空管理局监察官" : "流落此界的高维觉醒者",
      relationship: "与众角色在当前世界中拥有千丝万缕的因果牵绊，彼此命运交织。",
      personality: "冷静克制，言辞谨慎，对周围一切都保持着极强的观察力。",
      background: "苏醒在此刻宿主的躯壳中。表面是个老实巴交的研究助手，实际上隐藏着极其强烈的穿越秘密，必须在不暴露的情况下推进世界重构。"
    };

    const characterStates: Record<string, CharacterTransmigrationState> = {};
    selectedChars.forEach((c, idx) => {
      characterStates[c.id] = {
        characterId: c.id,
        roleTag: idx % 2 === 0 ? "攻略对象" : "攻略者",
        identity: {
          name: c.name + " (异界宿体)",
          age: 22,
          appearance: "容貌清丽，神情中带着一丝疏离。",
          profession: "核心观察员",
          relationship: "与你有深厚的羁绊，但似乎各自心怀秘密。",
          personality: "多疑且敏感，伴随警惕心。",
          background: "在此界有着特殊身份背景。"
        },
        favorability: 50,
        suspicion: 20,
        innerThought: "总觉得这个人身上有一种熟悉又陌生的气息……",
        flaws: ["偶尔走神", "过度戒备"],
      };
    });

    return { bg, tasksList, userIdentity, characterStates };
  };

  const handleCreateWorld = async () => {
    try {
      const worldName = newWorldPresetId 
        ? PRESET_WORLDS.find(p => p.id === newWorldPresetId)?.name || newWorldName 
        : newWorldName;

      if (!worldName.trim()) {
        alert("请输入或选择一个世界名称！");
        return;
      }

      let currentSelectedCharIds = [...selectedCharIds];
      if (currentSelectedCharIds.length === 0) {
        if (characters.length > 0) {
          currentSelectedCharIds = characters.slice(0, 2).map((c) => c.id);
          setSelectedCharIds(currentSelectedCharIds);
        } else {
          alert("请至少选择一位参与角色！");
          return;
        }
      }

      setIsGenerating(true);
      const selectedChars = currentSelectedCharIds.map((id) => getCharacterById(id)).filter(Boolean) as Character[];
      const charNames = selectedChars.map((c) => c.name).join("、");

      const fAName = factionAName.trim() || "明光";
      const fBName = factionBName.trim() || "暗影";

      let factionAMembers: string[] = [];
      let factionBMembers: string[] = [];

      // User's faction
      if (characterFactionMap["user"] === "faction_b") {
        factionBMembers.push("user");
      } else {
        factionAMembers.push("user");
      }

      // Characters' factions
      selectedChars.forEach(c => {
        if (characterFactionMap[c.id] === "faction_b") {
          factionBMembers.push(c.id);
        } else {
          factionAMembers.push(c.id);
        }
      });

      if (factionBMembers.length === 0 && selectedChars.length > 0) {
        const lastChar = selectedChars[selectedChars.length - 1];
        factionBMembers.push(lastChar.id);
        factionAMembers = factionAMembers.filter(id => id !== lastChar.id);
      } else if (factionAMembers.length === 0 && selectedChars.length > 0) {
        const lastChar = selectedChars[selectedChars.length - 1];
        factionAMembers.push(lastChar.id);
        factionBMembers = factionBMembers.filter(id => id !== lastChar.id);
      }

    let generatedBackground = "";
    let generatedTasks: string[] = [];
    let generatedUserIdentity: IdentityDetails | undefined;
    let generatedCharIdentities: Record<string, any> = {};

    const presetObj = PRESET_WORLDS.find(p => p.id === newWorldPresetId);
    const customPromptPart = presetObj 
      ? `【世界基础背景】：${presetObj.description}
【核心预设任务】：${presetObj.tasks.join("、")}`
      : `【世界名】：${worldName}`;

    const prompt = "你是一个跨次元快穿世界剧情架构师。请为快穿世界《" + worldName + "》设计完整的背景、双线身份扮演矩阵以及【对立阵营攻略系统】。\n" +
      customPromptPart + "\n" +
      "玩家穿越后的攻略标签为：【" + newWorldUserTag + "】。\n" +
      "参与穿越的通讯录现实伙伴：" + charNames + "。\n\n" +
      "【用户指定的阵营架构与成员分配】：\n" +
      "- 阵营A：名称《" + fAName + "》，包含成员ID：" + JSON.stringify(factionAMembers) + "\n" +
      "- 阵营B：名称《" + fBName + "》，包含成员ID：" + JSON.stringify(factionBMembers) + "\n" +
      "请为这两个阵营分别设定对立的任务目标。\n\n" +
      "【核心文风与描写规范】：\n" +
      "1. 必须使用口语化、简洁直白的表达方式。不使用词藻堆砌、文艺化修饰或复杂句式。\n" +
      "2. 使用短句，一句话只说一件事。多用名词和动词，少用形容词。\n" +
      "3. 不渲染氛围，不铺垫情绪。直接说“是什么”，不说“像什么”。\n" +
      "4. 背景介绍通俗易懂，让用户一眼看懂当前世界发生了什么。\n\n" +
      "请严格基于上述设定，生成JSON格式数据（不要包含markdown标记）：\n" +
      "{\n" +
      "  \"background\": \"世界宏观背景（150-200字）\",\n" +
      "  \"tasks\": [\"任务目标1\", \"任务目标2\", \"任务目标3\"],\n" +
      "  \"factions\": [\n" +
      "    {\"id\": \"faction_a\", \"name\": \"" + fAName + "\", \"goal\": \"阵营A目标\", \"memberIds\": " + JSON.stringify(factionAMembers) + "},\n" +
      "    {\"id\": \"faction_b\", \"name\": \"" + fBName + "\", \"goal\": \"阵营B目标\", \"memberIds\": " + JSON.stringify(factionBMembers) + "}\n" +
      "  ],\n" +
      "  \"user_identity\": {\n" +
      "    \"name\": \"玩家在本世界的扮演姓名\",\n" +
      "    \"age\": 20,\n" +
      "    \"appearance\": \"外貌衣着\",\n" +
      "    \"profession\": \"职业\",\n" +
      "    \"relationship\": \"社会关系\",\n" +
      "    \"personality\": \"性格\",\n" +
      "    \"background\": \"背景故事与秘密目标\"\n" +
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
      generatedTasks = parsed.tasks;
      generatedUserIdentity = parsed.user_identity;
      generatedFactions = parsed.factions || [];
      
      selectedChars.forEach(char => {
        const idData = parsed.character_identities?.[char.id] || parsed.character_identities?.[char.name];
        if (idData) {
          generatedCharIdentities[char.id] = {
            characterId: char.id,
            roleTag: "攻略者",
            identity: {
              name: idData.name || char.name,
              age: Number(idData.age) || 20,
              appearance: idData.appearance || "衣着华贵",
              profession: idData.profession || "本地修士",
              relationship: idData.relationship || "对手",
              personality: idData.personality || "谨慎多疑",
              background: idData.background || "本地世家继承人"
            },
            favorability: 50,
            suspicion: 10,
            innerThought: idData.innerThought || "隐藏好自己的穿越秘密...",
            flaws: idData.flaw ? [idData.flaw] : ["有些不符常理的动作"],
          };
        }
      });
    } catch (e) {
      console.warn("AI World matrix generation failed, running premium local fallback engine:", e);
      const fb = generateLocalFallbackWorld(worldName, selectedChars, newWorldUserTag);
      generatedBackground = fb.bg;
      generatedTasks = fb.tasksList;
      generatedUserIdentity = fb.userIdentity;
      generatedCharIdentities = fb.characterStates;
      
      // Default fallback factions
      const half = Math.ceil(selectedChars.length / 2);
      generatedFactions = [
        {
          id: "faction_a",
          name: "逆天阵营",
          goal: "颠覆当前世界的既定命运线",
          memberIds: ["user", ...selectedChars.slice(0, half).map(c => c.id)]
        },
        {
          id: "faction_b",
          name: "顺天阵营",
          goal: "维护当前世界的既定命运线",
          memberIds: selectedChars.slice(half).map(c => c.id)
        }
      ];
    }

    // Ensure factions exist if AI didn't provide enough
    if (generatedFactions.length < 2) {
        const userFaction = generatedFactions.find(f => f.memberIds.includes("user")) || { id: "f1", name: "阵营1", goal: "主线目标", memberIds: ["user"] };
        const otherChars = selectedChars.filter(c => !userFaction.memberIds.includes(c.id));
        generatedFactions = [
            userFaction,
            { id: "f2", name: "敌对阵营", goal: "对立目标", memberIds: otherChars.map(c => c.id) }
        ];
    }

    // Double check character identities fully populated
    selectedChars.forEach(char => {
      if (!generatedCharIdentities[char.id]) {
        const fb = generateLocalFallbackWorld(worldName, selectedChars, newWorldUserTag);
        generatedCharIdentities[char.id] = fb.characterStates[char.id] || {
          characterId: char.id,
          roleTag: "攻略者",
          identity: {
            name: char.name,
            age: 20,
            appearance: "神色自若，衣衫楚楚",
            profession: "林府门客",
            relationship: "盟友",
            personality: "神秘内敛",
            background: "突兀降临在这个世界的穿越同类。"
          },
          favorability: 50,
          suspicion: 10,
          innerThought: "绝不能暴露出我是个穿越者……",
          flaws: ["偶尔下意识寻找现代设备"],
          skills: ["基础吐纳"],
          items: ["一阶符箓"]
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

🎭 我的新身份：【${generatedUserIdentity?.name || "未知"}】 (年龄: ${generatedUserIdentity?.age || "未知"})
🏷️ 攻略阵营：【${newWorldUserTag}】
💼 扮演职业：${generatedUserIdentity?.profession}
✨ 容貌外形：${generatedUserIdentity?.appearance}
📜 背景与秘密：${generatedUserIdentity?.background}

🔮 参与穿梭的伙伴已隐秘就位。由于时空排斥，他们的言行偶尔会露出前世习惯的【细节破绽】。点击伙伴头像可以查看他们的【扮演身份】并洞察其真实的【内心世界】（心声线）。
请努力维护你的原住民人设。如果触发敏感词、动作崩塌或乱用技能，将会提升你的【身份暴露值】！`,
          timestamp: Date.now(),
        },
      ],
      currentTurnCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      // Extended fields
      userRoleTag: newWorldUserTag,
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
      actionOptions: [
        "走过去与对方说话",
        "检查四周的环境与线索",
        "思考当前原主宿留下的记忆",
        "静观其变，等待对方开口"
      ]
    };

    const updated = [newWorld, ...worlds];
    persistWorlds(updated);
    setActiveWorld(newWorld);
    setShowCreateWorldModal(false);
    setNewWorldName("");
    setNewWorldPresetId("");
    setSelectedCharIds([]);
    setIsGenerating(false);
    setActivePlayTab("behavior");
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

    const sentences = content.split(/[\n。！？；]/).map(s => s.trim()).filter(Boolean);
    const cardsMap: Record<string, { action: string[]; dialogue: string[] }> = {};

    sentences.forEach(sent => {
      let matchedChar = chars.find(c => sent.includes(c.name) || sent.includes(c.worldName));
      if (!matchedChar && chars.length > 0) {
        matchedChar = chars[0];
      }
      if (!matchedChar) return;

      const charKey = matchedChar.name;
      if (!cardsMap[charKey]) cardsMap[charKey] = { action: [], dialogue: [] };

      const quoteMatch = sent.match(/[“""]([^”""]+)[”""]/);
      if (quoteMatch) {
        const diag = quoteMatch[1];
        cardsMap[charKey].dialogue.push(diag);
        const act = sent.replace(/[“""][^”""]+[”""]/g, "").replace(matchedChar.name, "").trim();
        if (act) cardsMap[charKey].action.push(act);
      } else {
        const act = sent.replace(matchedChar.name, "").trim();
        if (act) cardsMap[charKey].action.push(act);
      }
    });

    const result: CharacterCardData[] = [];
    Object.keys(cardsMap).forEach(k => {
      const data = cardsMap[k];
      if (data.action.length > 0 || data.dialogue.length > 0) {
        result.push({
          characterName: k,
          action: data.action.join("，"),
          dialogue: data.dialogue.join(" ")
        });
      }
    });

    if (result.length === 0 && content.trim()) {
      result.push({
        characterName: chars[0]?.name || "AI主宰",
        action: content,
        dialogue: ""
      });
    }

    return result;
  };

  const handleTransmigrationUserSend = async (customAction?: string, forceItemOrSkill?: string) => {
    if (!activeWorld || isGenerating) return;
    const input = customAction || inputText.trim();
    if (!input && !customAction) return;

    // Keyword detection for Exposure Level mechanism - only for character roleplay, not meta-talk
    const SENSITIVE_KEYWORDS = [
      "手机", "电脑", "互联网", "穿越者", "微信", "现代", "高科技", "服务器", "视频", 
      "攻略者", "攻略对象", "百度", "搜一下", "抖音", "B站", "微博", "外卖", "快递",
      "淘宝", "支付宝", "扫码", "现代人", "原世界", "现代社会"
    ];
    const META_IGNORE_TERMS = ["AI", "模型", "回复", "聊天", "发送", "输入", "提交", "按钮", "界面", "设置", "系统"];
    
    let exposureAdded = 0;
    let exposureReason = "";
    
    // Only check for flaws if not meta-dialogue
    const isMetaInteraction = META_IGNORE_TERMS.some(term => input.toUpperCase().includes(term.toUpperCase()));
    
    if (!isMetaInteraction) {
      SENSITIVE_KEYWORDS.forEach(kw => {
        if (input.includes(kw)) {
          exposureAdded = 10;
          exposureReason = `言行中提及了暴露穿越者身份的敏感词汇「${kw}」`;
        }
      });
    }

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

    let currentExposure = (activeWorld.exposureLevel || 0) + exposureAdded;
    if (currentExposure > 100) currentExposure = 100;

    let updatedWorld: TransmigrationWorld = {
      ...activeWorld,
      messages: updatedMessages,
      currentTurnCount: newTurnCount,
      exposureLevel: currentExposure,
      activeEvent: eventResolved ? null : nextActiveEvent, // Update active event
      updatedAt: Date.now(),
    };

    if (exposureAdded > 0) {
      const logEntry = { desc: exposureReason, suspicionAdded: exposureAdded, timestamp: Date.now() };
      updatedWorld.flawsHistory = [logEntry, ...(updatedWorld.flawsHistory || [])];
      updatedWorld.messages.push({
        id: `msg-exposure-${Date.now()}`,
        role: "system",
        content: `⚠️ 【破绽警告】你在行动中不慎露出了破绽：${exposureReason}！你的身份暴露值提升了 ${exposureAdded}% （当前暴露值：${currentExposure}%）。`,
        timestamp: Date.now()
      });
    }

    setActiveWorld(updatedWorld);
    if (!customAction) setInputText("");
    setIsGenerating(true);

    const activeChars = activeWorld.characterIds
      .map((id) => getCharacterById(id))
      .filter(Boolean) as Character[];

    const chatHistory = updatedMessages.slice(-8).map((m) => `${m.senderName || m.role}: ${m.content}`).join("\n");

    const prompt = `你现在是快穿游戏《${activeWorld.name}》的叙事主宰（Narrator）与角色扮演者。
这是一个双线系统的快穿设定，玩家和伙伴们都被投放入新身份，并各自拥有秘密攻略标签。
世界背景：${activeWorld.background}
    ${activeWorld.activeEvent ? `\n【当前突发事件】：${activeWorld.activeEvent.description}` : ""}

玩家的快穿扮演身份：
- 姓名：${activeWorld.userIdentity?.name} (年龄: ${activeWorld.userIdentity?.age})
- 职业与背景：${activeWorld.userIdentity?.profession}。${activeWorld.userIdentity?.background}
- 攻略标签：${activeWorld.userRoleTag}

各伙伴在本世界的扮演身份及属性：
${activeChars.map(c => {
  const state = activeWorld.characterStates?.[c.id];
  return `- 伙伴 [${c.name}] (扮演姓名: ${state?.identity?.name}, 年龄: ${state?.identity?.age}):
    * 职业与背景: ${state?.identity?.profession}。${state?.identity?.background}
    * 攻略标签: 你作为主宰知道他们的角色标签 is [${state?.roleTag}]
    * 好感度: ${state?.favorability}/100, 怀疑度: ${state?.suspicion}/100
    * 他们的原世界细节破绽: ${state?.flaws?.[0] || "容易在听到原世界歌谣时失神"}`;
}).join("\n")}

任务清单：
${activeWorld.tasks.map((t) => `${t.id}. [${t.completed ? "已完成" : "未完成"}] ${t.description}`).join("\n")}

最新玩家发言/行动（可能使用了特殊道具/技能）：
"${userMsg.content}"

对话历史记录：
${chatHistory}

请以极度简洁、口语化、直白的语言描写场景进展以及参与角色（${activeChars.map((c) => c.name).join("、")}）的表情台词。

【核心文风与描写规范（极其重要）】：
1. 必须使用口语化、简洁直白的表达方式。绝对不使用词藻堆砌、文艺化修饰或复杂句式。
2. 使用短句，一句话只说一件事。多用名词和动词，少用形容词。
3. 不渲染氛围，不铺垫情绪，不加文学修饰。直接说“是什么”，不说“像什么”。
4. 让用户一眼看懂当前发生了什么，绝对不制造信息过载。例如：不写“暮色低垂，公馆的轮廓在灰蓝的天际线里显得沉重而沉默”，应写“天快黑了。公馆很安静”。

【重要扮演规则】：
1. 角色必须扮演本世界的人设，绝不能主动承认自己是穿越者。
2. 角色在言行中，会隐秘地露出设定的“细节破绽”（例如：提及现代科技、流行文化、特定地名等专属信息。请注意：不检测“AI、系统、模型、回复、界面、按钮”等元对话词汇为破绽），给玩家提供怀疑线索。
3. 玩家如果使用了技能或道具，请在场景中展现奇幻或剧情效果。
4. **绝对禁止**代替玩家进行任何行动、言语、表情、情绪、动机或心理活动描写。你只能描写环境、其他角色的言行，以及对玩家已做出的客观行动的反应。
5. 禁止描写“你心想...”、“你正要...”、“你脸上闪过...”等任何涉及玩家主观层面的内容。所有玩家的行动必须由玩家自己决定。

请在叙述文本的**最末尾**，严格以以下标签格式输出更新数据（每行一个标签，必须在中括号内，用于引擎状态同步。这些标签不会被显示给用户，不要输出多余格式）：
[TASK_COMPLETE: 任务ID] (如果某项任务在此轮得到了达成，输出如 [TASK_COMPLETE: 1])
[FAVORABILITY: 伙伴真实名字, +数或-数] (调整该伙伴的好感度，例如 [FAVORABILITY: ${activeChars[0]?.name || "角色"}, +10])
[SUSPICION: 伙伴真实名字, +数或-数] (调整该伙伴对玩家是否为穿越者的怀疑度，每次建议 5 到 15 点)
[USER_SUSPICION: +数或-数] (调整玩家当前的暴露度（当前为 ${currentExposure}%）。仅当玩家在角色扮演中提及现代专属信息如科技产品、流行文化、原世界地名时增加。请务必忽略用户提及的“AI、模型、系统、界面操作”等元对话内容。)
[INNER_THOUGHT: 伙伴真实名字, 心声文本] (提供该伙伴的最新隐秘心声。说明他对当前局势的猜测、对玩家的怀疑、或对暴露自身破绽的遮掩。字数40-80字)
[CHARACTER_FLAW_LEAKED: 伙伴真实名字, 破绽说明] (若该伙伴在此轮对话里露出了习惯破绽，输出此标签，字数20-45字)
[GAME_ENDING: perfect 或 partial 或 failed] (如果满足结束条件：全部任务完成且暴露度低于70%触发perfect；部分任务完成或暴露度高于70%触发partial；暴露度满100%或全任务失败触发failed。没有触发结局千万别输出)
[ACTION_OPTION: 选项具体可执行内容] (请生成 4 到 6 个玩家下一步具体可执行的操作选项，例如“走过去和她说话”、“检查书桌抽屉”、“躲在门后观察”等，涵盖不同尝试方向。每行输出一个 [ACTION_OPTION: ...] 标签)
[CHAR_CARD: 角色名字 | 动作描述 | 对话内容] (为参与此轮对话的每个角色分别输出1条卡片标签。如 [CHAR_CARD: 苏墨 | 缓缓放下茶盏，抬眼看着你 | 你真的以为能瞒过我吗])
${(activeWorld.factions || []).map(f => `[FACTION_CHAT: ${f.id}, 说话者名字, 消息内容] (为阵营【${f.name}】(使命:${f.goal})生成1条群聊消息：队友对当前局势的分析、建议或对敌方的猜想策略)`).join("\n")}
`;

    try {
      const response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      
      // Parse tags from assistant response
      let cleanResponse = response.trim();
      let gameEnding: "perfect" | "partial" | "failed" | null = null;
      let userSuspicionDiff = 0;
      
      const taskCompletedIds: number[] = [];
      const favorChanges: Record<string, number> = {};
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
          if (parts.length === 2) {
            const charName = parts[0].trim();
            const val = parseInt(parts[1].trim(), 10);
            if (!isNaN(val)) favorChanges[charName] = val;
          }
        } else if (tagType === "SUSPICION") {
          const parts = valStr.split(",");
          if (parts.length === 2) {
            const charName = parts[0].trim();
            const val = parseInt(parts[1].trim(), 10);
            if (!isNaN(val)) suspicionChanges[charName] = val;
          }
        } else if (tagType === "USER_SUSPICION") {
          const val = parseInt(valStr.replace("+", ""), 10);
          if (!isNaN(val)) userSuspicionDiff += val;
        } else if (tagType === "INNER_THOUGHT") {
          const firstComma = valStr.indexOf(",");
          if (firstComma !== -1) {
            const charName = valStr.slice(0, firstComma).trim();
            const thought = valStr.slice(firstComma + 1).trim();
            innerThoughts[charName] = thought;
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
            fav = Math.max(0, Math.min(100, fav + favorChanges[char.name]));
          }
          if (suspicionChanges[char.name] !== undefined) {
            susp = Math.max(0, Math.min(100, susp + suspicionChanges[char.name]));
          }
          if (innerThoughts[char.name] !== undefined) {
            thought = innerThoughts[char.name];
          }
          if (leakedFlaws[char.name] !== undefined) {
            flawsList = [leakedFlaws[char.name], ...flawsList];
            // Log in global flaws history list
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

      let nextExposure = Math.max(0, Math.min(100, (updatedWorld.exposureLevel || 0) + userSuspicionDiff));
      if (nextExposure >= 100) {
        gameEnding = "failed";
      }

      // If all tasks done manually or automatically, check for perfect/partial ending
      const allDone = updatedTasks.every(t => t.completed);
      if (allDone && !gameEnding) {
        gameEnding = nextExposure < 50 ? "perfect" : "partial";
      }

      let systemStatusMsg = "";
      if (taskCompletedIds.length > 0) {
        systemStatusMsg += `🎯 任务达成！你完成了任务目标：${taskCompletedIds.map(id => `目标 ${id}`).join("、")}\n`;
      }
      
      const favNames = Object.keys(favorChanges);
      if (favNames.length > 0) {
        systemStatusMsg += `💖 好感变化：${favNames.map(name => `${name} ${favorChanges[name] > 0 ? "+" : ""}${favorChanges[name]}`).join(", ")}\n`;
      }

      const suspNames = Object.keys(suspicionChanges);
      if (suspNames.length > 0) {
        systemStatusMsg += `🔍 嫌疑变化：${suspNames.map(name => `${name} ${suspicionChanges[name] > 0 ? "+" : ""}${suspicionChanges[name]}`).join(", ")}\n`;
      }

      let factionProgMap = { ...(updatedWorld.factionProgress || {}) };
      const myF = updatedWorld.factions?.find(f => f.memberIds.includes("user")) || updatedWorld.factions?.[0];
      const oppF = updatedWorld.factions?.find(f => !f.memberIds.includes("user")) || updatedWorld.factions?.[1];

      if (myF && oppF) {
        const completedCount = updatedTasks.filter(t => t.completed).length;
        const totalTasks = updatedTasks.length || 1;
        const baseMy = Math.min(100, Math.max(0, Math.round(30 + (completedCount / totalTasks) * 50 + newTurnCount * 4)));
        const baseOpp = Math.min(100, Math.max(0, Math.round(35 + newTurnCount * 3 - (nextExposure / 10))));
        factionProgMap[myF.id] = baseMy;
        factionProgMap[oppF.id] = baseOpp;
      }

      let finalMessages = [...updatedWorld.messages];
      
      // Push AI reply
      finalMessages.push({
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: cleanResponse,
        timestamp: Date.now(),
        charCards: charCards.length > 0 ? charCards : undefined
      });

      if (systemStatusMsg) {
        finalMessages.push({
          id: `msg-system-status-${Date.now() + 2}`,
          role: "system",
          content: `📊 【位面法则判定】\n${systemStatusMsg.trim()}`,
          timestamp: Date.now()
        });
      }

      // Check ending trigger
      let finalStatus = updatedWorld.status;
      let endingType = updatedWorld.endingType;
      let memoryCardObj = updatedWorld.memoryCard;

      if (gameEnding) {
        finalStatus = "completed";
        endingType = gameEnding;

        const endingTitle = gameEnding === "perfect" 
          ? `完美契合 · 飞升回归` 
          : gameEnding === "partial" 
          ? `部分重构 · 记忆遗失` 
          : `位面崩塌 · 身份崩解`;

        const endingDesc = gameEnding === "perfect"
          ? `你与伙伴成功在暴露度极低的情况下完成了《${updatedWorld.name}》的所有因果律任务。两人的灵魂完美契合神识，在一片绚丽的极光中冲上云霄，返回主神殿。你不仅保留了完整记忆，还收获了与同伴在异世共生死的绝对默契。`
          : gameEnding === "partial"
          ? `虽然完成了世界线的大部分指标，但你的真实身份遭到高度怀疑。在位面重组的拉扯过程中，时空法则剥夺了你们的部分神识。虽然返回了现实，但伙伴眼中闪烁着迷茫，需要依靠记忆卡片去慢慢唤醒……`
          : `由于你在《${updatedWorld.name}》中做出了严重违背本土原住民人设的举动，或者身陷绝境导致身份暴露值达到100%，被这个世界的法则判定为“天外异端”。天地雷劫轰然落下，位面崩塌，你与伙伴被弹出此界，任务宣告失败。`;

        memoryCardObj = {
          title: `《${updatedWorld.name}》羁绊回忆录`,
          content: `在穿越至《${updatedWorld.name}》的因果线中，你扮演了【${updatedWorld.userIdentity?.name}】。伙伴们化身为异世原住民同你相守。在第 ${newTurnCount} 轮决胜对决里，你们见证了命运的纠葛，达成了「${endingTitle}」结局。`,
          status: gameEnding,
          shared: false
        };

        finalMessages.push({
          id: `msg-ending-${Date.now() + 3}`,
          role: "system",
          content: `🏆 【世界线判定完结】
【最终结局】：${endingTitle}

📖 结局详情：
${endingDesc}

🎁 恭喜！此世界探索已结束，系统已为你生成了独一无二的【时光羁绊记忆卡片】，你可以在“任务与卡包”中选择将其分享给角色！`,
          timestamp: Date.now()
        });
      }

      const finalWorld: TransmigrationWorld = {
        ...updatedWorld,
        status: finalStatus,
        messages: finalMessages,
        tasks: updatedTasks,
        factionChats: factionChatUpdates,
        
        characterStates: updatedCharStates,
        exposureLevel: nextExposure,
        endingType: endingType,
        memoryCard: memoryCardObj,
        actionOptions: actionOptions.length > 0 ? actionOptions : updatedWorld.actionOptions,
        factionProgress: factionProgMap,
        updatedAt: Date.now()
      };

      setActiveWorld(finalWorld);
      const newWorlds = worlds.map((w) => (w.id === finalWorld.id ? finalWorld : w));
      persistWorlds(newWorlds);
    } catch (e: any) {
      alert("AI 推进剧情失败: " + (e.message || "请检查网络"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefreshActionOptions = async () => {
    if (!activeWorld || isGenerating || isRefreshingOptions) return;
    setIsRefreshingOptions(true);
    try {
      const activeChars = activeWorld.characterIds
        .map((id) => getCharacterById(id))
        .filter(Boolean) as Character[];

      const chatHistory = activeWorld.messages.slice(-6).map((m) => `${m.senderName || m.role}: ${m.content}`).join("\n");

      const prompt = `你现在是快穿游戏《${activeWorld.name}》的叙事主宰。
世界背景：${activeWorld.background}
玩家身份：${activeWorld.userIdentity?.name || "玩家"} (${activeWorld.userIdentity?.profession || "未知"})
参与角色：${activeChars.map(c => c.name).join("、")}

最新剧情历史：
${chatHistory}

请为玩家重新生成 4 到 6 个具体可执行的下一步行动选项（例如：“走过去和她说话”、“检查书桌抽屉”、“躲在门后观察”、“向同伴打听情报”等），涵盖不同动作与尝试策略。

请严格按以下标签格式输出 4-6 行，不要输出其他文字或说明：
[ACTION_OPTION: 选项1内容]
[ACTION_OPTION: 选项2内容]
[ACTION_OPTION: 选项3内容]
[ACTION_OPTION: 选项4内容]
[ACTION_OPTION: 选项5内容]
`;

      const response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      
      const newOptions: string[] = [];
      const tagRegex = /\[ACTION_OPTION:\s*([^\]]+)\]/g;
      let match;
      while ((match = tagRegex.exec(response)) !== null) {
        if (match[1].trim()) {
          newOptions.push(match[1].trim());
        }
      }

      // Fallback line parsing
      if (newOptions.length === 0) {
        const lines = response.split("\n")
          .map(l => l.replace(/^[\d\.\-\*•\s\[\]ACTION_OPTION:]+/g, "").trim())
          .filter(Boolean);
        if (lines.length > 0) {
          newOptions.push(...lines.slice(0, 6));
        }
      }

      if (newOptions.length > 0) {
        const updatedWorld: TransmigrationWorld = {
          ...activeWorld,
          actionOptions: newOptions,
          updatedAt: Date.now()
        };
        setActiveWorld(updatedWorld);
        const newWorlds = worlds.map(w => w.id === updatedWorld.id ? updatedWorld : w);
        persistWorlds(newWorlds);
      }
    } catch (e: any) {
      console.error("Refresh options failed:", e);
      alert("刷新选项失败: " + (e.message || "请检查网络"));
    } finally {
      setIsRefreshingOptions(false);
    }
  };

  const handleAccuseCharacter = async (targetId: string, guessedTag: "攻略者" | "攻略对象", text: string) => {
    if (!activeWorld || isGenerating) return;
    const charState = activeWorld.characterStates?.[targetId];
    const character = getCharacterById(targetId);
    if (!charState || !character) return;

    if (!text.trim()) {
      alert("请输入你的戳穿说辞！");
      return;
    }

    setIsGenerating(true);
    setShowAccuseModal(false);
    setInspectingCharId(null);

    const userMsg = {
      id: `msg-accuse-${Date.now()}`,
      role: "user" as const,
      senderName: activeWorld.userIdentity?.name || "我",
      content: `【指控相认】我当面指控【${charState.identity.name}】的真实身份，我猜测你的穿越秘密标签是：【${guessedTag}】！\n对白：“${text}”`,
      timestamp: Date.now(),
    };

    let updatedWorld = {
      ...activeWorld,
      messages: [...activeWorld.messages, userMsg],
      updatedAt: Date.now()
    };
    setActiveWorld(updatedWorld);
    setAccuseText("");

    const isCorrect = charState.roleTag === guessedTag;
    const prompt = `你现在是快穿游戏《${activeWorld.name}》的叙事主宰。
玩家选择当场对伙伴【${character.name}】（本世界扮演身份：${charState.identity.name}，扮演职业：${charState.identity.profession}）发动“身份对质戳穿”！
玩家猜测该伙伴的真实穿越标签是：【${guessedTag}】（他的真正属性是：【${charState.roleTag}】）。
猜测是否正确：【${isCorrect ? "正确" : "错误"}】
玩家与该伙伴的当前好感度是：${charState.favorability}/100，怀疑度是：${charState.suspicion}/100。
玩家当前的言辞：
"${text}"

请根据上述条件判定这次“当场相认戳穿”的成败。
1. 判定标准：通常，必须【猜测正确】且【好感度 >= 60】才判定为【成功相认】。如果猜测错误或好感过低，则是【失败对质】。
2. 成功对质：对方会极度动容，卸下伪装与你紧紧相拥或默契相认，决定全力支持你，好感度暴涨、怀疑度暴跌。
3. 失败对质：对方会矢口否认，并认为你精神错乱或在胡言乱语，对你高度戒备甚至疏远你，好感度降低、怀疑度暴涨。

请以极其精彩、戏剧化、扣人心弦的快穿小说男女主角对质相认场景，写出这精彩的一幕微表情和对白！
【描写限制】：
1. **绝对禁止**代替玩家进行任何心理活动、动机、表情或行动描写。
2. 你只能描写伙伴【${character.name}】的反应、言行以及周围的环境变化。
3. 禁止描写“你感到...”、“你深吸一口气...”等任何涉及玩家主观层面的内容。

请在文本的最末尾，输出以下状态更新标签（每行一个，必须在中括号内，用于引擎同步）：
[ACCUSE_RESULT: ${isCorrect && charState.favorability >= 60 ? "success" : "failed"}]
[FAVORABILITY_CHANGE: ${isCorrect && charState.favorability >= 60 ? "+30" : "-20"}]
[SUSPICION_CHANGE: ${isCorrect && charState.favorability >= 60 ? "-40" : "+35"}]
[EXPOSURE_CHANGE: ${isCorrect && charState.favorability >= 60 ? "-15" : "+20"}]
[ACCUSE_INNER_THOUGHT: ${isCorrect ? "原来我们真的是同类……在这孤独的千百世界里，我终于找到你了。" : "太可怕了，他是在试探我吗？他到底是谁？我绝对不能向他妥协。"}]
`;

    try {
      const response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      
      let cleanResponse = response.trim();
      let accuseResult: "success" | "failed" = "failed";
      let favDiff = -20;
      let suspDiff = 35;
      let expDiff = 20;
      let innerT = "";

      // Parse tags
      const tagRegex = /\[([A-Z_]+):\s*([^\]]+)\]/g;
      let match;
      while ((match = tagRegex.exec(response)) !== null) {
        const type = match[1];
        const val = match[2].trim();

        if (type === "ACCUSE_RESULT") {
          accuseResult = val === "success" ? "success" : "failed";
        } else if (type === "FAVORABILITY_CHANGE") {
          favDiff = parseInt(val, 10) || -20;
        } else if (type === "SUSPICION_CHANGE") {
          suspDiff = parseInt(val, 10) || 35;
        } else if (type === "EXPOSURE_CHANGE") {
          expDiff = parseInt(val, 10) || 20;
        } else if (type === "ACCUSE_INNER_THOUGHT") {
          innerT = val;
        }
      }

      cleanResponse = cleanResponse.replace(/\[[A-Z_]+:\s*[^\]]+\]/g, "").trim();

      // Implement states updates
      const updatedStates = { ...(updatedWorld.characterStates || {}) };
      const cState = updatedStates[targetId];
      if (cState) {
        const updatedFav = Math.max(0, Math.min(100, cState.favorability + favDiff));
        const updatedSusp = Math.max(0, Math.min(100, cState.suspicion + suspDiff));
        
        updatedStates[targetId] = {
          ...cState,
          favorability: updatedFav,
          suspicion: updatedSusp,
          innerThought: innerT || cState.innerThought
        };
      }

      const nextExposure = Math.max(0, Math.min(100, (updatedWorld.exposureLevel || 0) + expDiff));
      let currentStatus = updatedWorld.status;
      let endingType = updatedWorld.endingType;
      let memoryCardObj = updatedWorld.memoryCard;

      let finalMsgs = [...updatedWorld.messages];
      finalMsgs.push({
        id: `msg-accuse-reply-${Date.now()}`,
        role: "assistant",
        content: cleanResponse,
        timestamp: Date.now()
      });

      // System result box
      finalMsgs.push({
        id: `msg-accuse-sys-${Date.now() + 1}`,
        role: "system",
        content: accuseResult === "success" 
          ? `🎉 【指控相认大成功！】\n你与伙伴【${charState.identity.name}】成功揭开了穿越者的面纱，灵魂频率达到绝对共鸣！好感度增加 30，怀疑度降低 40！`
          : `❌ 【指控失败 / 遭遇掩饰】\n伙伴【${charState.identity.name}】对你露出了看疯子一样的神色，并将防备提到了最高！好感度降低 20，怀疑度暴涨 35！你的暴露度上升了 20% （当前：${nextExposure}%）`,
        timestamp: Date.now()
      });


      // If exposure is max, trigger ending
      if (nextExposure >= 100) {
        currentStatus = "completed";
        endingType = "failed";
        memoryCardObj = {
          title: `《${updatedWorld.name}》· 身份瓦解`,
          content: `你强行在《${updatedWorld.name}》指证伙伴失败并暴露出滔天违和，惨遭世界意志无情抹杀。`,
          status: "failed",
          shared: false
        };

        finalMsgs.push({
          id: `msg-accuse-ending-${Date.now() + 3}`,
          role: "system",
          content: `🏆 【世界因果线彻底崩溃】\n由于你的暴露值达到100%，你在大庭广众之下指证时空法则。天道神罚落下，身份彻底瓦解，本世界任务宣告失败！`,
          timestamp: Date.now()
        });
      }

      const finalWorld: TransmigrationWorld = {
        ...updatedWorld,
        status: currentStatus,
        endingType: endingType,
        memoryCard: memoryCardObj,
        characterStates: updatedStates,
        exposureLevel: nextExposure,
        
        messages: finalMsgs,
        updatedAt: Date.now()
      };

      setActiveWorld(finalWorld);
      persistWorlds(worlds.map(w => w.id === finalWorld.id ? finalWorld : w));
    } catch (e: any) {
      alert("对质指控判定失败: " + (e.message || "请检查网络"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareMemoryCard = (worldId: string) => {
    const world = worlds.find(w => w.id === worldId);
    if (!world || !world.memoryCard) return;

    // Set memory shared to true
    const updatedMemory = { ...world.memoryCard, shared: true };
    const updatedWorld = { ...world, memoryCard: updatedMemory };
    
    // Reward: increase base favorability of characters or log a heartwarming message
    const characterNames = world.characterIds.map(id => getCharacterById(id)?.name).filter(Boolean).join("、");
    alert(`💌 已将《${world.name}》的羁绊记忆卡片分享给角色【${characterNames}】！他们接收了这份宿世记忆，跨次元好感与现实羁绊得到了深深固化！`);

    // Persist
    const newWorlds = worlds.map(w => w.id === worldId ? updatedWorld : w);
    persistWorlds(newWorlds);
    if (activeWorld?.id === worldId) {
      setActiveWorld(updatedWorld);
    }
  };

  const handleSaveWorldSettings = () => {
    if (!activeWorld) return;
    const updatedWorld: TransmigrationWorld = {
      ...activeWorld,
      background: editWorldBg,
      userIdentity: {
        ...(activeWorld.userIdentity || { name: "我", avatar: "👤", thought: "", role: "攻略者" }),
        name: editUserName,
        thought: editUserThought,
      },
      characterStates: editCharacterStates,
      tasks: editTasks,
      updatedAt: Date.now()
    };
    const newWorlds = worlds.map(w => w.id === updatedWorld.id ? updatedWorld : w);
    persistWorlds(newWorlds);
    alert("✨ 快穿世界设定已成功更新！");
    setActivePlayTab("history");
  };

  const handleGenerateMemoryCard = () => {
    if (!activeWorld) return;
    const participantNames = activeWorld.characterIds.map(id => getCharacterById(id)?.name || id).join("、");
    const cardObj = {
      title: `《${activeWorld.name}》剧情记忆卡片`,
      content: `世界名称：${activeWorld.name}\n参与角色：${participantNames}\n背景摘要：${activeWorld.background?.substring(0, 120) || "无"}...\n关键事件数：${activeWorld.messages?.length || 0}条\n生成时间：${new Date().toLocaleString()}`,
      status: activeWorld.status,
      shared: false
    };
    const updatedWorld = { ...activeWorld, memoryCard: cardObj, updatedAt: Date.now() };
    const newWorlds = worlds.map(w => w.id === updatedWorld.id ? updatedWorld : w);
    persistWorlds(newWorlds);
    alert("🎁 剧情记忆卡片已成功生成！");
  };

  const handleSendMemoryCardToChar = () => {
    if (!activeWorld || !activeWorld.memoryCard) {
      alert("请先生成记忆卡片！");
      return;
    }
    const char = getCharacterById(selectedShareCharId);
    const charName = char?.name || "角色";
    const updatedCard = { ...activeWorld.memoryCard, shared: true };
    const updatedWorld = { ...activeWorld, memoryCard: updatedCard, updatedAt: Date.now() };
    const newWorlds = worlds.map(w => w.id === updatedWorld.id ? updatedWorld : w);
    persistWorlds(newWorlds);
    alert(`💌 已将《${activeWorld.name}》的记忆卡片发送给【${charName}】！对方已接收并记住了这段宿世记忆。`);
  };

  const handleSendFactionMessage = async () => {
    if (!activeWorld || !factionChatInput.trim() || !viewingFactionId) return;
    
    // User can only send to their own faction
    const myFaction = activeWorld.factions?.find(f => f.memberIds.includes("user"));
    if (viewingFactionId !== myFaction?.id) {
        alert("偷看模式下无法发送消息！");
        return;
    }

    const newMessage: FactionChatMessage = {
      id: `fchat-${Date.now()}`,
      senderId: "user",
      senderName: activeWorld.userIdentity?.name || "玩家",
      content: factionChatInput.trim(),
      timestamp: Date.now()
    };

    const updatedChats = {
      ...(activeWorld.factionChats || {}),
      [viewingFactionId]: [...(activeWorld.factionChats?.[viewingFactionId] || []), newMessage]
    };

    const updatedWorld: TransmigrationWorld = {
      ...activeWorld,
      factionChats: updatedChats,
      updatedAt: Date.now()
    };

    setActiveWorld(updatedWorld);
    persistWorlds(worlds.map(w => w.id === updatedWorld.id ? updatedWorld : w));
    const sentText = factionChatInput.trim();
    setFactionChatInput("");

    // Trigger AI teammate response based on user message
    try {
      const factionMembers = myFaction.memberIds.filter(id => id !== "user");
      if (factionMembers.length > 0) {
        const membersInfo = factionMembers.map(id => {
          const char = getCharacterById(id);
          const state = activeWorld.characterStates?.[id];
          return `- 角色ID: ${id}, 真实姓名: ${char?.name || id}, 世界扮演身份: ${state?.identity?.name || char?.name || "未知"}`;
        }).join("\n");

        const prompt = `你现在是快穿游戏《${activeWorld.name}》的群聊主宰。
世界背景：${activeWorld.background}
我方阵营：【${myFaction.name}】（目标：${myFaction.goal}）
阵营成员：
${membersInfo}

玩家刚刚在群里发言说：“${sentText}”

请根据玩家的发言，让阵营中的 1 到 2 位队友针对该发言给出即时回应、战术分析或配合建议。
请严格按以下格式输出每条消息，不要输出其他文字：
[FACTION_MSG: 角色ID | 角色名称 | 消息内容]
`;

        const res = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
        const newReplies: FactionChatMessage[] = [];
        const regex = /\[FACTION_MSG:\s*([^\|]+)\|\s*([^\|]+)\|\s*([^\]]+)\]/g;
        let match;
        let timeOffset = 100;
        while ((match = regex.exec(res)) !== null) {
          const sId = match[1].trim();
          const sName = match[2].trim();
          const content = match[3].trim();
          if (content) {
            newReplies.push({
              id: `fchat-reply-${Date.now() + timeOffset++}`,
              senderId: sId,
              senderName: sName,
              content: content,
              timestamp: Date.now() + timeOffset
            });
          }
        }

        if (newReplies.length === 0 && factionMembers.length > 0) {
          const randomMemberId = factionMembers[0];
          const memberState = activeWorld.characterStates?.[randomMemberId];
          newReplies.push({
            id: `fchat-reply-${Date.now()}`,
            senderId: randomMemberId,
            senderName: memberState?.identity?.name || "队友",
            content: "收到你的消息，我们会严格按此计划暗中配合，随时保持联络。",
            timestamp: Date.now()
          });
        }

        const latestWorld = worlds.find(w => w.id === activeWorld.id) || updatedWorld;
        const finalChats = {
          ...(latestWorld.factionChats || {}),
          [viewingFactionId]: [...(latestWorld.factionChats?.[viewingFactionId] || []), ...newReplies]
        };
        const finalWorld: TransmigrationWorld = {
          ...latestWorld,
          factionChats: finalChats,
          updatedAt: Date.now()
        };
        setActiveWorld(finalWorld);
        persistWorlds(worlds.map(w => w.id === finalWorld.id ? finalWorld : w));
      }
    } catch (e) {
      console.error("AI teammate reply failed:", e);
    }
  };

  const handleAIGenerateFactionChat = async () => {
    if (!activeWorld || isGenerating || !viewingFactionId) return;
    const myFaction = activeWorld.factions?.find(f => f.memberIds.includes("user"));
    if (viewingFactionId !== myFaction?.id) {
      alert("偷看模式下无法主动生成讨论！");
      return;
    }

    setIsGenerating(true);
    try {
      const chatHistory = (activeWorld.messages || []).slice(-4).map(m => `${m.senderName || m.role}: ${m.content}`).join("\n");
      const memberIds = myFaction.memberIds.filter(id => id !== "user");
      const membersInfo = memberIds.map(id => {
        const char = getCharacterById(id);
        const state = activeWorld.characterStates?.[id];
        return `- 角色ID: ${id}, 真实姓名: ${char?.name || id}, 世界扮演身份: ${state?.identity?.name || char?.name || "未知"}`;
      }).join("\n");

      const prompt = `你现在是快穿游戏《${activeWorld.name}》的群聊主宰。
世界背景：${activeWorld.background}
我方阵营：【${myFaction.name}】（目标：${myFaction.goal}）
阵营成员：
${membersInfo}

最新剧情进展：
${chatHistory}

请根据当前剧情，让阵营中的 2 到 3 位成员在群里展开一轮讨论。讨论内容包括对当前剧情的分析、给玩家（主角）的战术建议、或对接下来的行动规划。
请严格按以下格式输出每条消息，不要输出其他文字：
[FACTION_MSG: 角色ID | 角色名称 | 消息内容]
`;

      const res = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      const newMsgs: FactionChatMessage[] = [];
      const regex = /\[FACTION_MSG:\s*([^\|]+)\|\s*([^\|]+)\|\s*([^\]]+)\]/g;
      let match;
      let timeOffset = 100;
      while ((match = regex.exec(res)) !== null) {
        const sId = match[1].trim();
        const sName = match[2].trim();
        const content = match[3].trim();
        if (content) {
          newMsgs.push({
            id: `fchat-gen-${Date.now() + timeOffset++}`,
            senderId: sId,
            senderName: sName,
            content: content,
            timestamp: Date.now() + timeOffset
          });
        }
      }

      if (newMsgs.length === 0 && memberIds.length > 0) {
        const rId = memberIds[0];
        const char = getCharacterById(rId);
        const state = activeWorld.characterStates?.[rId];
        newMsgs.push({
          id: `fchat-gen-${Date.now()}`,
          senderId: rId,
          senderName: state?.identity?.name || char?.name || "队友",
          content: "根据目前形势，我们需要步步为营，随时保持暗中联动。",
          timestamp: Date.now()
        });
      }

      const updatedChats = {
        ...(activeWorld.factionChats || {}),
        [viewingFactionId]: [...(activeWorld.factionChats?.[viewingFactionId] || []), ...newMsgs]
      };

      const updatedWorld: TransmigrationWorld = {
        ...activeWorld,
        factionChats: updatedChats,
        updatedAt: Date.now()
      };

      setActiveWorld(updatedWorld);
      persistWorlds(worlds.map(w => w.id === updatedWorld.id ? updatedWorld : w));
    } catch (e: any) {
      alert("AI 生成讨论失败: " + (e.message || "请检查网络"));
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTaskCompletion = (taskId: number) => {
    if (!activeWorld) return;
    const task = activeWorld.tasks.find(t => t.id === taskId);
    const wasCompleted = !!task?.completed;

    const updatedTasks = activeWorld.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const allCompleted = updatedTasks.every((t) => t.completed);
    
    // Skill point bonus on completing tasks manually
    let skillDiff = 0;
    if (!wasCompleted) {
      skillDiff = 5;
    }

    const updatedWorld: TransmigrationWorld = {
      ...activeWorld,
      tasks: updatedTasks,
      
      status: allCompleted ? "completed" : activeWorld.status,
      updatedAt: Date.now(),
    };

    if (skillDiff > 0) {
      updatedWorld.messages.push({
        id: `msg-task-manual-${Date.now()}`,
        role: "system",
        content: `🎯 【任务判定】您手动完成了任务 ${taskId}：[${task?.description}]，获得 5 技能点奖励！`,
        timestamp: Date.now()
      });
    }

    setActiveWorld(updatedWorld);
    persistWorlds(worlds.map((w) => (w.id === updatedWorld.id ? updatedWorld : w)));
  };

  // ==================== 2. RULES HORROR LOGIC ==================== //

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      alert("请输入副本名称！");
      return;
    }
    if (selectedCharIds.length === 0) {
      alert("请至少选择一位参与角色！");
      return;
    }

    setIsGenerating(true);
    const selectedChars = selectedCharIds.map((id) => getCharacterById(id)).filter(Boolean) as Character[];
    const charNames = selectedChars.map((c) => c.name).join("、");

    const prompt = `你是一个专业的规则怪谈（Creepypasta Rules Horror）设计大师。
请为怪谈副本【${newInstanceName}】设计背景、规则与多重结局。
参与角色的姓名：${charNames}。

请生成：
1. 怪谈世界背景（100-200字）：诡异、悬疑、压迫感。
2. 5-7条怪谈规则（如：“规则1：如果在走廊听到猫叫声，请立刻闭上眼睛倒数三秒”）。
3. 3个不同结局的触发条件描述（如：“安全逃出”、“永远困住”、“隐藏结局：成为规则管理者”）。

请严格按以下 JSON 格式返回，不要包含 markdown 代码块：
{
  "background": "背景描述...",
  "rules": ["规则1...", "规则2...", "规则3...", "规则4...", "规则5..."],
  "endings": [
    {"type": "escape", "title": "安全逃出", "condition": "遵守全部生存法则并找到隐藏出口"},
    {"type": "trapped", "title": "永远困住", "condition": "触发3条以上红线或直接违反核心规则"},
    {"type": "hidden", "title": "隐藏结局：融为一体", "condition": "发现规则背后的造物者并达成契约"}
  ]
}`;

    let genBackground = "";
    let genRules: string[] = [];
    let genEndings: { type: string; title: string; condition: string }[] = [];

    try {
      const resText = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      const cleanJson = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      genBackground = parsed.background || `【${newInstanceName}】被一片不可名状的迷雾包裹，这里的世界遵循着极其诡异的生存准则。`;
      genRules = Array.isArray(parsed.rules) ? parsed.rules : [
        "规则一：不要相信任何在午夜12点主动向你借伞的人。",
        "规则二：如果发现房间角落的影子在独立移动，请立刻拍三下手。",
        "规则三：同行伙伴（" + charNames + "）如果突然叫你的全名，请忽略并继续向前走。",
        "规则四：看到红色的告示牌时，请逆时针绕行三圈。",
        "规则五：当所有灯光熄灭，请待在原处不要发出任何声音。"
      ];
      genEndings = Array.isArray(parsed.endings) ? parsed.endings : [
        { type: "escape", title: "安全逃出", condition: "遵守全部生存法则" },
        { type: "trapped", title: "永远困住", condition: "触发核心死亡规则" },
        { type: "hidden", title: "隐藏结局：真相揭晓", condition: "破解怪谈起源" }
      ];
    } catch (e) {
      console.warn("AI Generation fallback for rules horror:", e);
      genBackground = `【${newInstanceName}】是一个被异常规则笼罩的禁忌之地。你与${charNames}误入其中，周围看似正常的环境下暗藏杀机，唯有严守纸条上的规矩才能活下去。`;
      genRules = [
        "规则一：绝不要回应没有源头的敲门声。",
        "规则二：若同伴的手温突然低于冰点，请立刻给对方递上一杯热饮。",
        "规则三：午夜过后，走廊尽头的镜子里不会反射你的倒影。",
        "规则四：永远保持规则清单不离开视线。"
      ];
      genEndings = [
        { type: "escape", title: "安全逃出", condition: "破解异常现象并安全离场" },
        { type: "trapped", title: "永远困住", condition: "违背两条以上核心禁忌" }
      ];
    }

    const newInstance: RulesInstance = {
      id: `instance-${Date.now()}`,
      name: newInstanceName.trim(),
      status: "in_progress",
      characterIds: [...selectedCharIds],
      background: genBackground,
      rules: genRules.map((r, idx) => ({ id: idx + 1, text: r, status: "normal" })),
      endingProgress: "探索中",
      possibleEndings: genEndings,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: "system",
          content: `👁️ 【进入怪谈副本】《${newInstanceName}》\n\n📜 副本背景：\n${genBackground}\n\n⚠️ 【注意！你拾到了一张染血的规则纸条】：\n${genRules.map((r) => `- ${r}`).join("\n")}\n\n生存还是陷落？请谨慎做出每一个决定！`,
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newInstance, ...instances];
    setInstances(updated);
    persistInstances(updated);
    setActiveInstance(newInstance);
    setShowCreateInstanceModal(false);
    setNewInstanceName("");
    setSelectedCharIds([]);
    setIsGenerating(false);
    setActiveTab("rules_play");
  };

  const handleRulesUserSend = async (customAction?: string) => {
    if (!activeInstance || isGenerating) return;
    const input = customAction || inputText.trim();
    if (!input && !customAction) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      senderName: "我",
      content: input,
      timestamp: Date.now(),
    };

    const updatedMessages = [...activeInstance.messages, userMsg];
    let updatedInstance: RulesInstance = {
      ...activeInstance,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    setActiveInstance(updatedInstance);
    if (!customAction) setInputText("");
    setIsGenerating(true);

    const activeChars = activeInstance.characterIds
      .map((id) => characters.find(c => c.id === id))
      .filter(Boolean) as Character[];

    const prompt = `你现在是规则怪谈副本《${activeInstance.name}》的怪谈主宰（Creepypasta DM）。
副本背景：${activeInstance.background}
规则清单：
${activeInstance.rules.map((r) => `${r.id}. ${r.text}`).join("\n")}

同行角色：${activeChars.map((c) => c.name).join("、")}

最新玩家决定/行动：
"${input}"

请判断玩家的决定是否遵守或触犯了规则，并以充满心理恐惧与压迫感的方式描写场景变化和角色的反应。
如果玩家的行为触发了某个结局（如安全逃出或被困），请在文末加入标签 [ENDING: 结局名称]。`;

    try {
      const response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      
      let endingDetected = "";
      let cleanResponse = response.trim();
      const endMatch = cleanResponse.match(/\[ENDING:\s*([^\]]+)\]/);
      if (endMatch) {
        endingDetected = endMatch[1].trim();
        cleanResponse = cleanResponse.replace(/\[ENDING:\s*([^\]]+)\]/, "").trim();
      }

      const aiMsg = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant" as const,
        content: cleanResponse,
        timestamp: Date.now(),
      };

      const finalInstance: RulesInstance = {
        ...updatedInstance,
        messages: [...updatedInstance.messages, aiMsg],
        endingProgress: endingDetected ? endingDetected : updatedInstance.endingProgress,
        status: endingDetected ? "completed" : updatedInstance.status,
        currentEnding: endingDetected ? endingDetected : updatedInstance.currentEnding,
        updatedAt: Date.now(),
      };

      setActiveInstance(finalInstance);
      const updatedInstances = instances.map((i) => (i.id === finalInstance.id ? finalInstance : i));
      setInstances(updatedInstances);
      persistInstances(updatedInstances);
    } catch (e: any) {
      alert("AI 生成失败: " + (e.message || "请检查网络"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateScript = async () => {
    if (!newScriptName.trim()) {
      alert("请输入剧本名称！");
      return;
    }
    if (selectedCharIds.length < 2 || selectedCharIds.length > 5) {
      alert("悬疑剧场模式请选择 2 至 5 位参与角色！");
      return;
    }

    setIsGenerating(true);
    const selectedChars = selectedCharIds.map((id) => characters.find(c => c.id === id)).filter(Boolean) as Character[];

    const prompt = `你是一个顶级悬疑剧本杀（Murder Mystery Script）编剧。
请为【${newScriptGenre}】类型的剧本《${newScriptName}》分配角色、案件核心、关键线索与5幕大纲。
参与角色列表：${selectedChars.map((c) => `${c.name} (${c.description || "普通"})`).join("、")}。

要求：
1. 剧本背景（150-250字）。
2. 案件核心（例如：“古堡主人在密室中离奇失踪，现场留下一封无字血书”）。
3. 3条关键线索。
4. 为每一个参与角色分配专属角色名称、明面身份、私密秘密（不公开）以及行动动机。
5. 2个不同分支结局。

请严格按以下 JSON 格式返回，不要包含 markdown 代码块：
{
  "background": "剧本背景...",
  "caseCore": "案件核心...",
  "keyClues": ["线索1", "线索2", "线索3"],
  "roleAssignments": [
    {
      "characterId": "${selectedChars[0]?.id}",
      "characterName": "${selectedChars[0]?.name}",
      "roleName": "角色剧本身份名",
      "identity": "明面身份",
      "secret": "隐藏在内心的不可告人秘密",
      "motive": "行动动机"
    }
  ],
  "endingBranches": [
    {"title": "真凶伏法", "description": "成功锁定并揭露真相"},
    {"title": "凶手逃逸", "description": "推理陷入误区，真凶逍遥法外"}
  ]
}`;

    try {
      const response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      const cleanJson = response.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      const newScript: SuspenseScript = {
        id: `script-${Date.now()}`,
        name: newScriptName.trim(),
        genre: newScriptGenre,
        status: "in_progress",
        characterIds: [...selectedCharIds],
        currentAct: 1,
        background: parsed.background,
        caseCore: parsed.caseCore,
        keyClues: parsed.keyClues,
        roleAssignments: parsed.roleAssignments,
        endingBranches: parsed.endingBranches,
        messages: [
          {
            id: `msg-${Date.now()}`,
            role: "system",
            content: `🎭 【剧本杀开启】《${newScriptName}》\n\n📖 剧本背景：\n${parsed.background}\n\n🕵️ 案件核心：\n${parsed.caseCore}\n\n当前处于：第一幕 · 入场`,
            timestamp: Date.now(),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updated = [newScript, ...scripts];
      setScripts(updated);
      persistScripts(updated);
      setActiveScript(newScript);
      setShowCreateScriptModal(false);
      setNewScriptName("");
      setSelectedCharIds([]);
      setIsGenerating(false);
      setActiveTab("suspense_play");
    } catch (e: any) {
      alert("AI 生成失败: " + (e.message || "请检查网络"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuspenseUserSend = async (customAction?: string) => {
    if (!activeScript || isGenerating) return;
    const input = customAction || inputText.trim();
    if (!input && !customAction) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      senderName: "我",
      content: input,
      timestamp: Date.now(),
    };

    const updatedMessages = [...activeScript.messages, userMsg];
    let updatedScript: SuspenseScript = {
      ...activeScript,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    setActiveScript(updatedScript);
    if (!customAction) setInputText("");
    setIsGenerating(true);

    const actNames = ["入场", "案件发生", "调查推进", "推理高潮", "结局揭晓"];
    const prompt = `你现在是悬疑剧本杀《${activeScript.name}》中所有角色的联合演播者。
当前剧本处于：【第 ${activeScript.currentAct} 幕：${actNames[activeScript.currentAct - 1]}】

角色身份与秘密（请让每个角色按自身动机行动并隐藏秘密）：
${activeScript.roleAssignments.map((r) => `- ${r.characterName} (扮 ${r.roleName}): 秘密=${r.secret}, 动机=${r.motive}`).join("\n")}

最新玩家互动：
"${input}"

请扮演这些角色与玩家进行生动的多角色互质与讨论，维护剧本氛围与各自的角色私密动机！字数150-300字。`;

    try {
      const response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      const aiMsg = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant" as const,
        content: response.trim(),
        timestamp: Date.now(),
      };

      const finalScript = {
        ...updatedScript,
        messages: [...updatedScript.messages, aiMsg],
        updatedAt: Date.now(),
      };

      setActiveScript(finalScript);
      const updatedScripts = scripts.map((s) => (s.id === finalScript.id ? finalScript : s));
      setScripts(updatedScripts);
      persistScripts(updatedScripts);
    } catch (e: any) {
      alert("AI 生成失败: " + (e.message || "请检查网络"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdvanceAct = async () => {
    if (!activeScript || isGenerating || activeScript.currentAct >= 5) return;
    const nextAct = activeScript.currentAct + 1;
    const actNames = ["入场", "案件发生", "调查推进", "推理高潮", "结局揭晓"];
    
    setIsGenerating(true);
    const systemMsg = {
      id: `msg-${Date.now()}`,
      role: "system" as const,
      content: `🎭 【剧本推进】剧本进入：【第 ${nextAct} 幕：${actNames[nextAct - 1]}】。请各位角色根据当前进展发表新看法或抛出新线索！`,
      timestamp: Date.now(),
    };

    const updatedScript: SuspenseScript = {
      ...activeScript,
      currentAct: nextAct,
      messages: [...activeScript.messages, systemMsg],
      updatedAt: Date.now(),
    };

    setActiveScript(updatedScript);

    const prompt = `你现在是悬疑剧本杀《${activeScript.name}》的DM。
当前剧本刚刚推进到了：【第 ${nextAct} 幕：${actNames[nextAct - 1]}】。
剧本案件核心：${activeScript.caseCore}
关键线索：${activeScript.keyClues.join("、")}

请以演播者身份描述当前幕次的场景氛围变化、各角色的新反应或突发事件。字数120-220字。`;

    try {
      const response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt }], 0.8, settings.apiFormat);
      const aiMsg = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant" as const,
        content: response.trim(),
        timestamp: Date.now(),
      };

      const finalScript = {
        ...updatedScript,
        messages: [...updatedScript.messages, aiMsg],
        status: nextAct === 5 ? ("completed" as const) : updatedScript.status,
        updatedAt: Date.now(),
      };

      setActiveScript(finalScript);
      const updatedScripts = scripts.map((s) => (s.id === finalScript.id ? finalScript : s));
      setScripts(updatedScripts);
      persistScripts(updatedScripts);
    } catch (e: any) {
      alert("推进幕次失败: " + (e.message || "请检查网络"));
    } finally {
      setIsGenerating(false);
    }
  };

  const renderCharacterSelector = () => (
    <div className="space-y-2">
      <label className="text-xs font-bold text-neutral-300 block">
        选择参与角色 <span className="text-neutral-500 font-normal">（可多选）</span>
      </label>
      {characters.length === 0 ? (
        <p className="text-xs text-neutral-500 italic">暂无角色，请先在通讯录中创建角色。</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
          {characters.map((char) => {
            const isSelected = selectedCharIds.includes(char.id);
            return (
              <div
                key={char.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedCharIds(selectedCharIds.filter(id => id !== char.id));
                  } else {
                    setSelectedCharIds([...selectedCharIds, char.id]);
                  }
                }}
                className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition border ${isSelected ? "border-amber-500 bg-amber-500/10" : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"}`}
              >
                {char.avatar.startsWith('data:') || char.avatar.startsWith('http') ? (
                  <img src={char.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 flex items-center justify-center text-[10px] bg-neutral-800 rounded-full">{char.avatar}</span>
                )}
                <span className="text-[11px] font-bold text-white flex-1 truncate">{char.name}</span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#FAFAF9] text-[#1A1A1A] relative font-sans">
      
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
            <h1 className="font-serif font-semibold text-base text-[#1A1A1A] tracking-tight">
              宇宙目录
            </h1>
            <button
              onClick={() => setShowCreatePickerModal(true)}
              className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded-full text-xs font-sans font-medium flex items-center gap-1 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>新建</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Universe Mode Cards Directory (Requirement 1) */}
            <div className="space-y-3">
              <h2 className="text-xs font-sans font-semibold text-[#78716C] uppercase tracking-wider px-1">
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
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F3F0] text-[#78716C] text-[10px] font-sans font-medium border border-[#EFECE8]">
                        {worlds.length} 个世界
                      </span>
                    </div>
                    <h3 className="font-serif font-semibold text-base text-[#1A1A1A]">快穿世界</h3>
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
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F3F0] text-[#78716C] text-[10px] font-sans font-medium border border-[#EFECE8]">
                        {instances.length} 个副本
                      </span>
                    </div>
                    <h3 className="font-serif font-semibold text-base text-[#1A1A1A]">规则怪谈</h3>
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
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F3F0] text-[#78716C] text-[10px] font-sans font-medium border border-[#EFECE8]">
                        {scripts.length} 个剧本
                      </span>
                    </div>
                    <h3 className="font-serif font-semibold text-base text-[#1A1A1A]">悬疑剧场</h3>
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
          </div>
        </div>
      )}

      {/* 2. TRANSMIGRATION LIST */}
      {activeTab === "transmigration_list" && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#F9F8F6] text-[#1A1A1A]">
          {/* Header Bar */}
          <div className="h-14 border-b border-[#EFECE8] px-4 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("main")}
              className="p-1.5 -ml-1 text-[#1A1A1A] hover:bg-[#F5F3F0] rounded-full transition cursor-pointer flex items-center gap-1"
              title="返回宇宙主页"
            >
              <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
            </button>
            <h1 className="font-serif font-semibold text-base text-[#1A1A1A]">快穿 · 世界列表</h1>
            <button
              onClick={() => setShowCreateWorldModal(true)}
              className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded-full text-xs font-sans font-medium transition flex items-center gap-1 cursor-pointer shadow-2xs border border-[#1A1A1A]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>新建世界</span>
            </button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {worlds.length === 0 ? (
              <div className="py-16 text-center space-y-3 text-[#A8A39A]">
                <Sparkles className="w-10 h-10 mx-auto opacity-30 text-[#1A1A1A]" />
                <p className="text-xs text-[#78716C]">暂无世界，点击下方创建你的第一个快穿世界。</p>
              </div>
            ) : (
              worlds.map((world) => {
                const statusObj = getStatusLabel(world.status);

                return (
                  <div
                    key={world.id}
                    className="p-4 rounded-[16px] bg-white border border-[#EFECE8] hover:border-[#1A1A1A] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-semibold text-sm text-[#1A1A1A] truncate">{world.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-sans ${statusObj.color}`}>
                            {statusObj.text}
                          </span>
                        </div>
                        <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed font-sans">
                          {world.background || "暂无背景描述"}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`确定要删除快穿世界《${world.name}》吗？删除后不可恢复。`)) {
                            persistWorlds(worlds.filter((item) => item.id !== world.id));
                          }
                        }}
                        className="p-1.5 text-[#A8A39A] hover:text-rose-600 rounded-full hover:bg-rose-50 transition cursor-pointer shrink-0"
                        title="删除世界"
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#EFECE8]">
                      <div className="flex items-center justify-between text-xs font-sans text-[#78716C]">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#A8A39A]" />
                          <span>参与角色: {world.characterIds?.length || 0} 位</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#A8A39A]">
                          <Clock className="w-3 h-3 text-[#A8A39A]" />
                          <span>{formatDate(world.updatedAt || world.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => {
                            setActiveWorld(world);
                            setActiveTab("transmigration_play");
                            setActivePlayTab("history");
                          }}
                          className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-sans font-medium rounded-full transition flex items-center gap-1.5 cursor-pointer shadow-2xs border border-[#1A1A1A]"
                        >
                          <Play className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>进入世界</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Button */}
          <div className="p-3 bg-white border-t border-[#EFECE8] shrink-0">
            <button
              type="button"
              onClick={() => setShowCreateWorldModal(true)}
              className="w-full py-2.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white rounded-full text-xs font-sans font-medium transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99] border border-[#1A1A1A]"
            >
              <Plus className="w-4 h-4 stroke-[1.5]" />
              <span>创建新世界</span>
            </button>
          </div>
        </div>
      )}

      {/* 2.5 TRANSMIGRATION PLAY */}
      {activeTab === "transmigration_play" && activeWorld && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#F5F3F0] text-[#1A1A1A]">
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
            <span className="font-serif font-semibold text-base text-[#1A1A1A] truncate max-w-[180px]">
              {activeWorld.name}
            </span>
            <button
              onClick={() => {
                if (activeWorld) {
                  setEditWorldBg(activeWorld.background || "");
                  setEditUserName(activeWorld.userIdentity?.name || "");
                  setEditUserThought(activeWorld.userIdentity?.thought || "");
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
          
          {/* Sub Navigation Tabs */}
          {activePlayTab !== "settings" && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-[#EFECE8] overflow-x-auto no-scrollbar shrink-0">
               <button
                 onClick={() => setActivePlayTab("history")}
                 className={`text-xs font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1.5 ${
                   activePlayTab === "history"
                     ? "bg-[#1A1A1A] text-white border border-[#1A1A1A] shadow-xs"
                     : "bg-[#F5F3F0] text-[#78716C] border border-[#EFECE8] hover:text-[#1A1A1A]"
                 }`}
               >
                 <span>📖 剧情推进区</span>
               </button>
               <button
                 onClick={() => {
                   const userFaction = activeWorld.factions?.find(f => f.memberIds.includes("user")) || activeWorld.factions?.[0];
                   if (userFaction && !viewingFactionId) setViewingFactionId(userFaction.id);
                   setActivePlayTab("chat");
                 }}
                 className={`text-xs font-medium whitespace-nowrap px-4 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1.5 ${
                   activePlayTab === "chat"
                     ? "bg-[#1A1A1A] text-white border border-[#1A1A1A] shadow-xs"
                     : "bg-[#F5F3F0] text-[#78716C] border border-[#EFECE8] hover:text-[#1A1A1A]"
                 }`}
               >
                 <span>💬 阵营群聊区</span>
               </button>
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
                    <h2 className="font-serif font-bold text-sm text-[#1A1A1A]">快穿世界设置与记忆卡片</h2>
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
                        <h4 className="font-serif font-bold text-xs text-[#1A1A1A]">{activeWorld.memoryCard.title}</h4>
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-[#A8A39A]">
                                <span>{msg.senderName || "我"}</span>
                                <span className="text-[10px] opacity-70">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="max-w-[88%] sm:max-w-[80%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed bg-[#1A1A1A] text-white rounded-tr-none shadow-xs">
                                {msg.content}
                              </div>
                            </div>
                          );
                        }

                        if (isSystem) {
                          return (
                            <div
                              key={msg.id || idx}
                              className="p-3.5 my-2 bg-[#F5F3F0] border border-[#EFECE8] rounded-2xl text-xs text-[#78716C] whitespace-pre-wrap leading-relaxed shadow-2xs"
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
                            {cards.map((card, cIdx) => (
                              <div
                                key={cIdx}
                                className="bg-white rounded-[12px] p-[12px_16px] shadow-2xs border border-[#EFECE8] space-y-1.5"
                              >
                                {/* Top-left: Character name (10px, warm gray #A8A39A, bold) + time (9px, #BFBAB2, regular) on the same line */}
                                <div className="flex items-center gap-1.5 text-[10px] leading-none">
                                  <span className="font-bold text-[#A8A39A]">{card.characterName}</span>
                                  <span className="text-[#BFBAB2] font-normal">{timeStr}</span>
                                </div>

                                {/* Content area */}
                                <div className="space-y-1 pt-0.5">
                                  {card.action && (
                                    <p className="text-[15px] text-[#1A1A1A] font-sans text-left leading-relaxed">
                                      {card.action}
                                    </p>
                                  )}
                                  {card.dialogue && (
                                    <p className="text-[15px] text-[#1A1A1A] font-sans text-left leading-relaxed">
                                      {card.dialogue.replace(/^[“""]|[”""]$/g, "")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-xs text-[#A8A39A]">
                        点击下方“AI推进”或选择行动选项开启故事...
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Modern Warnings block */}
                  {activeWorld.modernWarnings && activeWorld.modernWarnings.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white border border-[#EFECE8] space-y-3 shadow-xs">
                      <h3 className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5 border-b border-[#EFECE8] pb-2">
                        <AlertTriangle className="w-4 h-4 text-[#78716C]" />
                        <span>现代言行穿帮警报</span>
                      </h3>
                      <div className="space-y-2">
                        {activeWorld.modernWarnings.map((w, index) => (
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

                  {/* Role play tips */}
                  <div className="p-4 rounded-2xl bg-white border border-[#EFECE8] space-y-2 text-xs text-[#1A1A1A] shadow-xs">
                    <h4 className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#78716C]" />
                      <span>快穿世界扮演守则</span>
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-[#78716C] text-[11px] leading-relaxed">
                      <li>请沉浸式扮演您在当前世界的原宿主身份，符合时代背景。</li>
                      <li>严禁使用现代词汇（如：“手机”、“微信”、“AI”、“网络”、“穿越”）。</li>
                      <li>系统采用高敏检测，一旦发言触发违禁将提示暴露度惩罚。</li>
                      <li>当好感羁绊提升且任务达成时，将生成完美谢幕记忆碎片。</li>
                    </ul>
                  </div>
                </div>

                {/* 剧情推进区控制底部：Action Options & Custom Input */}
                {activeWorld.status !== "completed" && (
                  <div className="bg-white border-t border-[#EFECE8] flex flex-col shrink-0 shadow-lg">
                    {/* 分支选项 */}
                    <div className="p-3 sm:p-4 space-y-2.5 border-b border-[#EFECE8]">
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
                            className="text-xs font-sans text-[#78716C] hover:text-[#1A1A1A] hover:bg-[#F5F3F0] flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5E2DC] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-95"
                            title="刷新行动选项"
                          >
                            <RefreshCw className={`w-3 h-3 ${isRefreshingOptions ? "animate-spin text-[#1A1A1A]" : "text-[#78716C]"}`} />
                            <span>{isRefreshingOptions ? "刷新中..." : "刷新选项"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTransmigrationUserSend("【AI推进】：请继续推进当前世界的剧情发展的关键节点！")}
                            disabled={isGenerating || activeWorld.status === "completed"}
                            className="px-3 py-1 rounded-full bg-[#1A1A1A] hover:bg-neutral-800 disabled:bg-[#F5F3F0] disabled:text-[#A8A39A] text-white text-xs font-sans font-medium transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 shadow-xs active:scale-95 border border-[#1A1A1A]"
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
                            onClick={() => handleTransmigrationUserSend(optText)}
                            disabled={isGenerating || isRefreshingOptions}
                            className="text-left px-3.5 py-2 bg-white border border-[#E5E2DC] hover:border-[#1A1A1A] hover:bg-[#F5F3F0] rounded-xl text-xs font-sans text-[#1A1A1A] transition flex items-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-[0.99] group shadow-xs"
                          >
                            <span className="w-4 h-4 rounded-full bg-[#F5F3F0] group-hover:bg-[#1A1A1A] group-hover:text-white flex items-center justify-center text-[10px] font-mono text-[#78716C] shrink-0 transition font-medium border border-[#EFECE8]">
                              {idx + 1}
                            </span>
                            <span className="truncate flex-1">{optText}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 剧情推进自定义输入框 */}
                    <div className="p-3 bg-white flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={activeWorld.status !== "completed" ? "输入自定义行动、对话或回应..." : "世界已结束，无法继续操作"}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTransmigrationUserSend()}
                        disabled={isGenerating || activeWorld.status === "completed"}
                        className="flex-1 bg-white border border-[#E5E2DC] rounded-full px-4 py-2 text-xs sm:text-sm font-sans text-[#1A1A1A] outline-none focus:border-[#1A1A1A] placeholder-[#A8A39A] disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleTransmigrationUserSend()}
                        disabled={isGenerating || !inputText.trim() || activeWorld.status === "completed"}
                        className="p-2.5 bg-[#1A1A1A] hover:bg-neutral-800 disabled:bg-[#F5F3F0] disabled:text-[#A8A39A] text-white rounded-full transition cursor-pointer flex items-center justify-center shrink-0 border border-[#1A1A1A]"
                        title="发送自定义行动"
                      >
                        <Send className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================== 2. 阵营群聊区 (FACTION GROUP CHAT AREA) ==================== */}
            {activePlayTab === "chat" && (() => {
              const myFaction = activeWorld.factions?.find(f => f.memberIds.includes("user")) || activeWorld.factions?.[0];
              const opponentFaction = activeWorld.factions?.find(f => !f.memberIds.includes("user")) || activeWorld.factions?.[1];
              
              const currentFactionId = viewingFactionId && activeWorld.factions?.some(f => f.id === viewingFactionId)
                ? viewingFactionId
                : (myFaction?.id || "");

              const isMyFactionViewing = Boolean(myFaction && currentFactionId === myFaction.id);

              return (
                <div className="flex-1 flex flex-col h-full bg-[#F5F3F0] animate-fade-in overflow-hidden">
                  {/* 群聊区顶栏：阵营切换标签 (我方阵营 vs 对方阵营) */}
                  <div className="p-3 border-b border-[#EFECE8] bg-white sticky top-0 z-10 space-y-2 shrink-0 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[#1A1A1A]" />
                        <span>双阵营加密群聊矩阵</span>
                      </span>
                      <span className={`text-[10px] font-sans px-2.5 py-0.5 rounded-full border ${
                        isMyFactionViewing 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {isMyFactionViewing ? "🟢 我方可发言" : "👁️ 对方只能偷看"}
                      </span>
                    </div>

                    {/* 切换标签按钮组 */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* 我方阵营 Tab */}
                      {myFaction && (
                        <button
                          type="button"
                          onClick={() => setViewingFactionId(myFaction.id)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                            currentFactionId === myFaction.id
                              ? "bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-xs"
                              : "bg-[#F9F8F6] border-[#EFECE8] text-[#1A1A1A] hover:border-[#1A1A1A]"
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-bold truncate">我方阵营 · {myFaction.name}</span>
                            </div>
                            <p className={`text-[10px] truncate ${currentFactionId === myFaction.id ? "text-neutral-300" : "text-[#78716C]"}`}>
                              {myFaction.goal}
                            </p>
                          </div>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                            currentFactionId === myFaction.id ? "bg-white/20 text-white" : "bg-[#EFECE8] text-[#78716C]"
                          }`}>
                            {(activeWorld.factionChats?.[myFaction.id] || []).length}条
                          </span>
                        </button>
                      )}

                      {/* 对方阵营 Tab */}
                      {opponentFaction && (
                        <button
                          type="button"
                          onClick={() => setViewingFactionId(opponentFaction.id)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                            currentFactionId === opponentFaction.id
                              ? "bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-xs"
                              : "bg-[#F9F8F6] border-[#EFECE8] text-[#1A1A1A] hover:border-[#1A1A1A]"
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-bold truncate">对方阵营 · {opponentFaction.name}</span>
                            </div>
                            <p className={`text-[10px] truncate ${currentFactionId === opponentFaction.id ? "text-neutral-300" : "text-[#78716C]"}`}>
                              {opponentFaction.goal}
                            </p>
                          </div>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                            currentFactionId === opponentFaction.id ? "bg-white/20 text-white" : "bg-[#EFECE8] text-[#78716C]"
                          }`}>
                            {(activeWorld.factionChats?.[opponentFaction.id] || []).length}条
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 群聊消息展示区 (按时间倒序排列：最新消息在最上方) */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
                    {(() => {
                      const rawMsgs = activeWorld.factionChats?.[currentFactionId] || [];
                      // 按时间倒序排列 (最新消息置顶)
                      const sortedMsgs = [...rawMsgs].sort((a, b) => b.timestamp - a.timestamp);

                      if (sortedMsgs.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-[#A8A39A] gap-2 py-16">
                            <MessageSquare className="w-8 h-8 opacity-40 stroke-[1.2]" />
                            <p className="text-xs font-medium">该阵营频道内暂无加密沟通</p>
                          </div>
                        );
                      }

                      return sortedMsgs.map((msg, idx) => {
                        const isMe = msg.senderId === "user" || msg.senderName === "玩家" || msg.senderName === "我";

                        // Format sender identity name:
                        // 我方阵营消息显示角色真实身份（攻略者身份），对方阵营消息显示角色的伪装身份
                        let displayName = msg.senderName;
                        const char = characters.find(c => c.id === msg.senderId || c.name === msg.senderName);
                        const charState = activeWorld.characterStates?.[char?.id || ""] ||
                                          activeWorld.charactersState?.find(cs => cs.characterId === char?.id || cs.name === msg.senderName);

                        if (isMe) {
                          displayName = isMyFactionViewing ? "玩家（你自己）" : (activeWorld.userIdentity?.name || "未知异世者");
                        } else if (isMyFactionViewing) {
                          // 我方阵营：显示角色真实身份（攻略者身份）
                          const realName = char?.name || charState?.name || msg.senderName;
                          displayName = `${realName}（攻略者）`;
                        } else {
                          // 对方阵营：显示角色的伪装身份（原宿主/位面身份）
                          const disguiseName = charState?.identity?.name || msg.senderName || char?.name || "敌方角力者";
                          displayName = `${disguiseName}（伪装身份）`;
                        }

                        const avatar = isMe
                          ? (activeWorld.userIdentity?.avatar || "👤")
                          : (charState?.avatar || char?.avatar || "👤");

                        const avatarEl = (
                          avatar.startsWith('data:') || avatar.startsWith('http') ? (
                            <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 shadow-2xs" />
                          ) : (
                            <span className="w-7 h-7 flex items-center justify-center text-xs bg-[#F5F3F0] rounded-full shrink-0 border border-[#EFECE8] shadow-2xs">
                              {avatar}
                            </span>
                          )
                        );

                        return (
                          <div
                            key={msg.id || idx}
                            className={`flex items-start gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            {!isMe && avatarEl}

                            <div className={`flex flex-col max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#78716C] font-sans">
                                <span>{displayName}</span>
                                <span className="opacity-70 font-mono text-[9px]">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div
                                className={`p-3 rounded-2xl text-xs leading-relaxed font-sans ${
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

                  {/* 群聊区输入框 (我方可发言，对方只能查看) */}
                  <div className={`p-3 border-t border-[#EFECE8] flex items-center gap-2 transition ${
                    isMyFactionViewing ? "bg-white" : "bg-[#F5F3F0]"
                  }`}>
                    {isMyFactionViewing ? (
                      <>
                        <input
                          type="text"
                          value={factionChatInput}
                          onChange={(e) => setFactionChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendFactionMessage()}
                          placeholder={`在【${myFaction?.name || "我方"}】群聊发言，向队友打话/分配任务...`}
                          className="flex-1 rounded-full px-4 py-2.5 text-xs font-sans bg-white border border-[#E5E2DC] text-[#1A1A1A] focus:border-[#1A1A1A] outline-none transition placeholder-[#A8A39A]"
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
                      </>
                    ) : (
                      <div className="w-full py-2.5 text-center text-xs text-[#78716C] bg-[#EFECE8]/60 rounded-full font-sans border border-[#EFECE8]">
                        🔒 只能查看，无法发送
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ==================== SUB-MODALS ==================== */}

          {/* Character Inspect Drawer Modal */}
          {inspectingCharId && (() => {
            const charState = activeWorld.charactersState.find(c => c.characterId === inspectingCharId);
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
                      <div className="bg-[#FAFAF9] p-2.5 rounded-xl border border-[#EFECE8]">
                        <span className="text-[#78716C] text-[10px] block">怀疑度：</span>
                        <span className="text-[#1A1A1A] font-semibold font-mono text-base">{charState.suspicion || 0}%</span>
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
            const targetChar = activeWorld.charactersState.find(c => c.characterId === accuseTargetId);
            if (!targetChar) return null;
            return (
              <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-[#EFECE8] rounded-3xl p-5 w-full max-w-sm space-y-4 animate-fade-in text-[#1A1A1A] shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#EFECE8] pb-3">
                    <h3 className="font-semibold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-[#78716C]" />
                      <span>相认指控</span>
                    </h3>
                    <button onClick={() => setShowAccuseModal(false)} className="text-[#A8A39A] hover:text-[#1A1A1A] cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#78716C] leading-normal bg-[#FAFAF9] p-2.5 rounded-xl border border-[#EFECE8]">
                    您怀疑伙伴 <span className="text-[#1A1A1A] font-semibold">{targetChar.name}</span> 躯壳下隐藏着另一个灵魂。发出的试探如果猜错会提升其怀疑度。
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-[#1A1A1A] block mb-1.5">您猜想它的秘密身份是：</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAccuseGuessTag("攻略者")}
                          className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs ${
                            accuseGuessTag === "攻略者"
                              ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                              : "bg-white border-[#E5E2DC] text-[#78716C] hover:border-[#1A1A1A]"
                          }`}
                        >
                          攻略者
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccuseGuessTag("攻略对象")}
                          className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs ${
                            accuseGuessTag === "攻略对象"
                              ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                              : "bg-white border-[#E5E2DC] text-[#78716C] hover:border-[#1A1A1A]"
                          }`}
                        >
                          攻略对象
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[#1A1A1A] block mb-1">说出您的试探或台词：</label>
                      <textarea
                        placeholder="例如：那天你下意识动作，其实你也是个攻略者对吧？"
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
                          alert("请输入揭穿相认的行动对白！");
                          return;
                        }
                        setShowAccuseModal(false);
                        await handleAccuseCharacter(accuseTargetId, accuseGuessTag, accuseText);
                      }}
                      disabled={isGenerating || !accuseText.trim()}
                      className="px-4 py-2 bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-medium rounded-full transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>确认指控</span>
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

      {/* 1. Create World Modal */}
      {showCreateWorldModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFECE8] rounded-[16px] p-6 w-full max-w-lg space-y-5 animate-fade-in text-[#1A1A1A] max-h-[90vh] overflow-y-auto shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between border-b border-[#EFECE8] pb-3">
              <h3 className="font-serif text-lg text-[#1A1A1A] flex items-center gap-2">
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
                <label className="text-xs font-sans text-[#1A1A1A] block mb-2 font-medium">选择世界预设主题</label>
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
                          <span className="text-xs font-serif truncate">{preset.name}</span>
                        </div>
                        <p className={`text-[10px] font-sans line-clamp-1 leading-normal ${isSelected ? "text-neutral-300" : "text-[#A8A39A]"}`}>{preset.description}</p>
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
                      <span className="text-xs font-serif truncate">自定义世界</span>
                    </div>
                    <p className={`text-[10px] font-sans line-clamp-1 leading-normal ${newWorldPresetId === "" ? "text-neutral-300" : "text-[#A8A39A]"}`}>自主拟定全新脑洞背景</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-sans text-[#1A1A1A] block mb-1.5 font-medium">世界名称</label>
                <input
                  type="text"
                  placeholder="如：修仙破妄界 / 废土避难所"
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  className="w-full bg-white border border-[#EFECE8] rounded-[12px] px-4 py-2.5 text-[15px] font-sans text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                />
              </div>

              {/* User Identity Role preference selection */}
              <div>
                <label className="text-xs font-sans text-[#1A1A1A] block mb-2 font-medium">您的穿越身份标签</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewWorldUserTag("攻略者")}
                    className={`p-3 rounded-[12px] border transition-all text-center cursor-pointer ${
                      newWorldUserTag === "攻略者"
                        ? "bg-[#1A1A1A] border-[#1A1A1A] text-white font-medium"
                        : "bg-white border-[#EFECE8] text-[#1A1A1A] hover:border-[#1A1A1A]"
                    }`}
                  >
                    <div className="text-xs font-serif">🎯 攻略者</div>
                    <div className={`text-[10px] font-sans mt-0.5 ${newWorldUserTag === "攻略者" ? "text-neutral-300" : "text-[#A8A39A]"}`}>主动出击 推进宿命关系</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewWorldUserTag("攻略对象")}
                    className={`p-3 rounded-[12px] border transition-all text-center cursor-pointer ${
                      newWorldUserTag === "攻略对象"
                        ? "bg-[#1A1A1A] border-[#1A1A1A] text-white font-medium"
                        : "bg-white border-[#EFECE8] text-[#1A1A1A] hover:border-[#1A1A1A]"
                    }`}
                  >
                    <div className="text-xs font-serif">💖 攻略对象</div>
                    <div className={`text-[10px] font-sans mt-0.5 ${newWorldUserTag === "攻略对象" ? "text-neutral-300" : "text-[#A8A39A]"}`}>被攻略方 试探言语温度</div>
                  </button>
                </div>
              </div>

              {renderCharacterSelector()}

              {/* Faction Assignment Section (Requirement 1) */}
              <div className="space-y-3 pt-3 border-t border-[#EFECE8]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-sans text-[#1A1A1A] font-medium flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#1A1A1A]" />
                    <span>阵营分配与名称自定义</span>
                  </label>
                  <span className="text-[10px] text-[#78716C]">划分阵营并自动生成对立目标</span>
                </div>

                {/* Custom Faction Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-sans text-[#78716C] block mb-1">阵营 A 自定义名称</label>
                    <input
                      type="text"
                      placeholder="如：明光 / 正道"
                      value={factionAName}
                      onChange={(e) => setFactionAName(e.target.value)}
                      className="w-full bg-white border border-[#EFECE8] rounded-[10px] px-3 py-1.5 text-xs text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-sans text-[#78716C] block mb-1">阵营 B 自定义名称</label>
                    <input
                      type="text"
                      placeholder="如：暗影 / 魔道"
                      value={factionBName}
                      onChange={(e) => setFactionBName(e.target.value)}
                      className="w-full bg-white border border-[#EFECE8] rounded-[10px] px-3 py-1.5 text-xs text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                    />
                  </div>
                </div>

                {/* Member Faction Allocation */}
                <div className="space-y-2">
                  <label className="text-[11px] font-sans text-[#78716C] block font-medium">成员阵营划归</label>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {/* 1. User (Self) */}
                    <div className="flex items-center justify-between p-2 rounded-[12px] bg-[#F9F8F6] border border-[#EFECE8]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-bold">
                          我
                        </div>
                        <span className="text-xs font-medium text-[#1A1A1A]">玩家（你自己）</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[#EFECE8]">
                        <button
                          type="button"
                          onClick={() => setCharacterFactionMap(prev => ({ ...prev, user: 'faction_a' }))}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
                            (characterFactionMap['user'] || 'faction_a') === 'faction_a'
                              ? "bg-[#1A1A1A] text-white shadow-xs"
                              : "text-[#78716C] hover:text-[#1A1A1A]"
                          }`}
                        >
                          {factionAName.trim() || "明光"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCharacterFactionMap(prev => ({ ...prev, user: 'faction_b' }))}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
                            characterFactionMap['user'] === 'faction_b'
                              ? "bg-[#1A1A1A] text-white shadow-xs"
                              : "text-[#78716C] hover:text-[#1A1A1A]"
                          }`}
                        >
                          {factionBName.trim() || "暗影"}
                        </button>
                      </div>
                    </div>

                    {/* 2. Selected Characters */}
                    {selectedCharIds.length === 0 ? (
                      <p className="text-[11px] text-[#A8A39A] italic px-1">请先在上方选择参与调遣的角色</p>
                    ) : (
                      selectedCharIds.map((cId) => {
                        const char = getCharacterById(cId);
                        if (!char) return null;
                        const currentFaction = characterFactionMap[cId] || 'faction_a';
                        return (
                          <div key={cId} className="flex items-center justify-between p-2 rounded-[12px] bg-white border border-[#EFECE8]">
                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                              {char.avatar.startsWith('data:') || char.avatar.startsWith('http') ? (
                                <img src={char.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                              ) : (
                                <span className="w-5 h-5 flex items-center justify-center text-[10px] bg-[#F5F3F0] rounded-full shrink-0">
                                  {char.avatar}
                                </span>
                              )}
                              <span className="text-xs font-medium text-[#1A1A1A] truncate">{char.name}</span>
                            </div>

                            <div className="flex items-center gap-1 bg-[#F9F8F6] p-1 rounded-full border border-[#EFECE8] shrink-0">
                              <button
                                type="button"
                                onClick={() => setCharacterFactionMap(prev => ({ ...prev, [cId]: 'faction_a' }))}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
                                  currentFaction === 'faction_a'
                                    ? "bg-[#1A1A1A] text-white shadow-xs"
                                    : "text-[#78716C] hover:text-[#1A1A1A]"
                                }`}
                              >
                                {factionAName.trim() || "明光"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCharacterFactionMap(prev => ({ ...prev, [cId]: 'faction_b' }))}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition cursor-pointer ${
                                  currentFaction === 'faction_b'
                                    ? "bg-[#1A1A1A] text-white shadow-xs"
                                    : "text-[#78716C] hover:text-[#1A1A1A]"
                                }`}
                              >
                                {factionBName.trim() || "暗影"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFECE8]">
              <button
                onClick={() => setShowCreateWorldModal(false)}
                className="px-4 py-2 border border-[#E5E2DC] text-[#1A1A1A] text-[13px] font-sans rounded-full hover:bg-[#F5F3F0] transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleCreateWorld}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-sans font-medium rounded-full transition flex items-center gap-1.5 cursor-pointer shadow-sm"
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
              <h3 className="font-serif font-semibold text-base text-[#1A1A1A]">
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
                  <h4 className="font-serif font-semibold text-sm text-[#1A1A1A]">快穿世界</h4>
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
                  <h4 className="font-serif font-semibold text-sm text-[#1A1A1A]">规则怪谈</h4>
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
                  <h4 className="font-serif font-semibold text-sm text-[#1A1A1A]">悬疑剧场</h4>
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
              <h3 className="font-serif font-semibold text-base text-[#1A1A1A]">删除宇宙？</h3>
              <p className="text-xs text-[#78716C]">
                确定要删除《{itemToDelete.name}》及其所有记录吗？此操作无法撤销。
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 border border-[#EFECE8] text-[#1A1A1A] text-xs font-sans rounded-full hover:bg-[#F5F3F0] transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleDeleteCardItem}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-sans font-medium rounded-full transition cursor-pointer"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
