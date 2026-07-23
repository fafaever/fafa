import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
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
  Share2
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
    const [activePlayTab, setActivePlayTab] = useState<"behavior" | "tasks" | "identities" | "history" | "chat">("behavior");
  const [viewingFactionId, setViewingFactionId] = useState<string | null>(null);
  const [factionChatInput, setFactionChatInput] = useState("");
  
  // Custom Confirmation States
  const [worldToDelete, setWorldToDelete] = useState<string | null>(null);
  const [showSaveExitConfirm, setShowSaveExitConfirm] = useState(false);

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

  // Format date helper
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
    const worldName = newWorldPresetId 
      ? PRESET_WORLDS.find(p => p.id === newWorldPresetId)?.name || newWorldName 
      : newWorldName;

    if (!worldName.trim()) {
      alert("请输入或选择一个世界名称！");
      return;
    }
    if (selectedCharIds.length === 0) {
      alert("请至少选择一位参与角色！");
      return;
    }

    setIsGenerating(true);
    const selectedChars = selectedCharIds.map((id) => getCharacterById(id)).filter(Boolean) as Character[];
    const charNames = selectedChars.map((c) => c.name).join("、");

    const fAName = factionAName.trim() || "明光";
    const fBName = factionBName.trim() || "暗影";

    const factionAMembers = ["user", ...selectedChars.filter(c => (characterFactionMap[c.id] || 'faction_a') === 'faction_a').map(c => c.id)];
    const factionBMembers = selectedChars.filter(c => (characterFactionMap[c.id] || 'faction_a') === 'faction_b').map(c => c.id);

    if (factionAMembers.length === 0 || factionBMembers.length === 0) {
      alert("阵营A和阵营B均必须至少包含1名成员！");
      setIsGenerating(false);
      return;
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
      factionChats: Object.fromEntries(generatedFactions.map(f => [f.id, []]))
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
        }
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

      let finalMessages = [...updatedWorld.messages];
      
      // Push AI reply
      finalMessages.push({
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: cleanResponse,
        timestamp: Date.now()
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
        
        characterStates: updatedCharStates,
        exposureLevel: nextExposure,
        endingType: endingType,
        memoryCard: memoryCardObj,
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

      // Grant skill points on success
            if (accuseResult === "success") {
        newSkillPoints += 15;
        finalMsgs.push({
          id: `msg-accuse-bonus-${Date.now() + 2}`,
          role: "system",
          content: `🎁 获得相认特权奖赏：15 技能点！`,
          timestamp: Date.now()
        });
      }

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

  const handleSendFactionMessage = () => {
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
      factionChats: updatedChats
    };

    setActiveWorld(updatedWorld);
    persistWorlds(worlds.map(w => w.id === updatedWorld.id ? updatedWorld : w));
    setFactionChatInput("");

    // Simulate teammates reply
    setTimeout(() => {
        const factionMembers = myFaction.memberIds.filter(id => id !== "user");
        if (factionMembers.length > 0) {
            const randomMemberId = factionMembers[Math.floor(Math.random() * factionMembers.length)];
            const memberState = activeWorld.characterStates?.[randomMemberId];
            if (memberState) {
                const autoReply: FactionChatMessage = {
                    id: `fchat-reply-${Date.now()}`,
                    senderId: randomMemberId,
                    senderName: memberState.identity.name,
                    content: "收到，我会配合你的行动。我们要小心，不要让敌方察觉。",
                    timestamp: Date.now()
                };
                
                const finalWorlds = worlds.map(w => {
                    if (w.id === activeWorld.id) {
                        const finalChats = {
                            ...(w.factionChats || {}),
                            [viewingFactionId]: [...(w.factionChats?.[viewingFactionId] || []), autoReply]
                        };
                        return { ...w, factionChats: finalChats };
                    }
                    return w;
                });
                
                const currentWorld = finalWorlds.find(w => w.id === activeWorld.id);
                if (currentWorld) {
                    setActiveWorld(currentWorld);
                    persistWorlds(finalWorlds);
                }
            }
        }
    }, 1500);
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
              <button
                key={char.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedCharIds(selectedCharIds.filter((id) => id !== char.id));
                  } else {
                    setSelectedCharIds([...selectedCharIds, char.id]);
                  }
                }}
                className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-purple-950/40 border-purple-500/50 text-white"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-sm shrink-0">
                  {char.avatar || "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{char.name}</p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-[#F5F3F0] text-[#1A1A1A] font-sans h-full relative overflow-hidden">
      {/* 1. UNIVERSE MAIN SCREEN */}
      {activeTab === "main" && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden">
          {/* Top Bar */}
          <div className="h-14 border-b border-[#EFECE8] px-6 flex items-center justify-between shrink-0 bg-white">
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5F3F0] rounded-full transition text-[#1A1A1A] cursor-pointer"
              title="返回首页"
            >
              <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 stroke-[1.5] text-[#1A1A1A]" />
              <h1 className="font-serif text-base tracking-wider text-[#1A1A1A]">多重宇宙</h1>
            </div>
            <div className="w-8" />
          </div>

          {/* Banner & Intro */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
            <div className="bg-white border border-[#EFECE8] rounded-[16px] p-6 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                <span className="text-[11px] font-sans tracking-widest text-[#A8A39A] uppercase">
                  MULTIVERSE MATRIX
                </span>
              </div>
              <h2 className="font-serif text-xl font-normal text-[#1A1A1A]">平行宇宙与叙事空间</h2>
              <p className="text-xs text-[#A8A39A] font-sans leading-relaxed">
                穿越快穿大千世界、规则怪谈禁忌副本与悬疑剧场。与通讯录伙伴建立跨维度羁绊。
              </p>
            </div>

            {/* 3 Entry Mode Cards */}
            <div className="space-y-4 pt-2">
              {/* Card 1: 快穿 */}
              <div
                onClick={() => setActiveTab("transmigration_list")}
                className="group bg-white border border-[#EFECE8] hover:border-[#1A1A1A] rounded-[16px] p-6 transition-all duration-300 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-[#EFECE8] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white transition-all">
                      <Zap className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-normal text-[#1A1A1A] flex items-center gap-2">
                        快穿模式
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#EFECE8] text-[#A8A39A] font-sans font-normal">
                          世界任务
                        </span>
                      </h3>
                      <p className="text-xs text-[#A8A39A] font-sans mt-1">
                        跨越不同异世界，与角色协同完成判定任务
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 stroke-[1.5] text-[#A8A39A] group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#EFECE8] text-xs text-[#A8A39A] font-sans">
                  <span>
                    进度: {worlds.filter((w) => w.status === "in_progress").length} 进行中 / {worlds.filter((w) => w.status === "completed").length} 已完结
                  </span>
                  <span className="text-[#1A1A1A] font-medium group-hover:underline">进入世界列表 &rarr;</span>
                </div>
              </div>

              {/* Card 2: 规则怪谈 */}
              <div
                onClick={() => setActiveTab("rules_list")}
                className="group bg-white border border-[#EFECE8] hover:border-[#1A1A1A] rounded-[16px] p-6 transition-all duration-300 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-[#EFECE8] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white transition-all">
                      <AlertTriangle className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-normal text-[#1A1A1A] flex items-center gap-2">
                        规则怪谈模式
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#EFECE8] text-[#A8A39A] font-sans font-normal">
                          多重结局
                        </span>
                      </h3>
                      <p className="text-xs text-[#A8A39A] font-sans mt-1">
                        遵守或打破诡异规则，探寻怪谈副本真相
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 stroke-[1.5] text-[#A8A39A] group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#EFECE8] text-xs text-[#A8A39A] font-sans">
                  <span>
                    副本: {instances.filter((i) => i.status === "in_progress").length} 探索中 / {instances.filter((i) => i.status === "completed").length} 已通关
                  </span>
                  <span className="text-[#1A1A1A] font-medium group-hover:underline">进入副本列表 &rarr;</span>
                </div>
              </div>

              {/* Card 3: 悬疑剧场 */}
              <div
                onClick={() => setActiveTab("suspense_list")}
                className="group bg-white border border-[#EFECE8] hover:border-[#1A1A1A] rounded-[16px] p-6 transition-all duration-300 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-[#EFECE8] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white transition-all">
                      <Film className="w-4 h-4 stroke-[1.5]" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-normal text-[#1A1A1A] flex items-center gap-2">
                        悬疑剧场模式
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#EFECE8] text-[#A8A39A] font-sans font-normal">
                          5幕推理
                        </span>
                      </h3>
                      <p className="text-xs text-[#A8A39A] font-sans mt-1">
                        沉浸式悬疑案件，每个角色都有不为人知的秘密
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 stroke-[1.5] text-[#A8A39A] group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#EFECE8] text-xs text-[#A8A39A] font-sans">
                  <span>
                    剧本: {scripts.filter((s) => s.status === "in_progress").length} 进行中 / {scripts.filter((s) => s.status === "completed").length} 已结案
                  </span>
                  <span className="text-[#1A1A1A] font-medium group-hover:underline">进入剧本列表 &rarr;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TRANSMIGRATION WORLD LIST */}
      {activeTab === "transmigration_list" && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#F5F3F0]">
          <div className="h-14 border-b border-[#EFECE8] px-6 flex items-center justify-between shrink-0 bg-white">
            <button
              onClick={() => setActiveTab("main")}
              className="p-2 hover:bg-[#F5F3F0] rounded-full transition text-[#1A1A1A] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
            </button>
            <h1 className="font-serif text-base text-[#1A1A1A]">快穿模式 · 世界列表</h1>
            <button
              onClick={() => setShowCreateWorldModal(true)}
              className="border border-[#E5E2DC] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] rounded-full px-4 py-1.5 text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>新建世界</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-2xl mx-auto w-full">
            {worlds.length === 0 ? (
              <div className="py-20 text-center space-y-3 text-[#A8A39A]">
                <Zap className="w-8 h-8 mx-auto stroke-[1.5] opacity-50" />
                <p className="text-xs font-sans">暂无快穿世界，点击右上角“新建世界”开始穿越。</p>
              </div>
            ) : (
              worlds.map((w) => {
                const statusObj = {
                    not_started: { text: "○ 未开始" },
                    in_progress: { text: "○— 穿越中" },
                    completed: { text: "□ 已完结" }
                }[w.status];

                return (
                  <div
                    key={w.id}
                    className="p-6 rounded-[16px] bg-white border border-[#EFECE8] hover:border-[#1A1A1A] transition-all space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-serif text-base font-normal text-[#1A1A1A] truncate">{w.name}</h3>
                          <span className="text-[11px] text-[#A8A39A] font-sans font-normal">
                            {statusObj.text}
                          </span>
                        </div>
                        <p className="text-xs text-[#A8A39A] font-sans line-clamp-2 leading-relaxed">
                          {w.background}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorldToDelete(w.id);
                        }}
                        className="p-2 text-[#A8A39A] hover:text-[#1A1A1A] rounded-full hover:bg-[#F5F3F0] transition cursor-pointer shrink-0"
                        title="删除世界"
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#EFECE8]">
                      <div className="flex -space-x-2">
                        {w.characterIds.slice(0, 3).map((id) => {
                          const char = characters.find(c => c.id === id);
                          return (
                            <div key={id} className="w-7 h-7 rounded-full border border-white bg-[#F5F3F0] flex items-center justify-center text-xs" title={char?.name}>
                              {char?.avatar || "👤"}
                            </div>
                          );
                        })}
                        {w.characterIds.length > 3 && (
                          <div className="w-7 h-7 rounded-full border border-white bg-[#F5F3F0] flex items-center justify-center text-[10px] text-[#A8A39A]">
                            +{w.characterIds.length - 3}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          const playingWorld = { ...w, status: w.status === "not_started" ? "in_progress" as const : w.status };
                          setActiveWorld(playingWorld);
                          setActiveTab("transmigration_play");
                          const updated = worlds.map(item => item.id === w.id ? playingWorld : item);
                          setWorlds(updated);
                          persistWorlds(updated);
                        }}
                        className="border border-[#E5E2DC] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] px-4 py-1.5 rounded-full text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>{w.status === "completed" ? "重温回顾" : (w.status === "in_progress" ? "继续穿越" : "开启世界")}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. RULES INSTANCE LIST */}
      {activeTab === "rules_list" && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#F5F3F0]">
          <div className="h-14 border-b border-[#EFECE8] px-6 flex items-center justify-between shrink-0 bg-white">
            <button
              onClick={() => setActiveTab("main")}
              className="p-2 hover:bg-[#F5F3F0] rounded-full transition text-[#1A1A1A] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
            </button>
            <h1 className="font-serif text-base text-[#1A1A1A]">规则怪谈 · 副本列表</h1>
            <button
              onClick={() => setShowCreateInstanceModal(true)}
              className="border border-[#E5E2DC] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] rounded-full px-4 py-1.5 text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>新建副本</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-2xl mx-auto w-full">
            {instances.length === 0 ? (
              <div className="py-20 text-center space-y-3 text-[#A8A39A]">
                <AlertTriangle className="w-8 h-8 mx-auto stroke-[1.5] opacity-50" />
                <p className="text-xs font-sans">暂无怪谈副本，点击右上角“新建副本”开启禁忌之旅。</p>
              </div>
            ) : (
              instances.map((i) => {
                const statusObj = {
                    not_started: { text: "○ 未开启" },
                    in_progress: { text: "○— 探索中" },
                    completed: { text: "□ 已通关" }
                }[i.status];

                return (
                  <div
                    key={i.id}
                    className="p-6 rounded-[16px] bg-white border border-[#EFECE8] hover:border-[#1A1A1A] transition-all space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-serif text-base font-normal text-[#1A1A1A] truncate">{i.name}</h3>
                          <span className="text-[11px] text-[#A8A39A] font-sans font-normal">
                            {statusObj.text}
                          </span>
                        </div>
                        <p className="text-xs text-[#A8A39A] font-sans line-clamp-2 leading-relaxed">
                          {i.background}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = instances.filter(item => item.id !== i.id);
                          setInstances(updated);
                          persistInstances(updated);
                        }}
                        className="p-2 text-[#A8A39A] hover:text-[#1A1A1A] rounded-full hover:bg-[#F5F3F0] transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#EFECE8] text-xs text-[#A8A39A] font-sans">
                      <span>规则: {i.rules.length} 条 • 结局: {i.currentEnding || "探索中"}</span>

                      <button
                        onClick={() => {
                          setActiveInstance(i);
                          setActiveTab("rules_play");
                        }}
                        className="border border-[#E5E2DC] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] px-4 py-1.5 rounded-full text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>{i.status === "completed" ? "回顾通关" : "继续探索"}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. SUSPENSE SCRIPT LIST */}
      {activeTab === "suspense_list" && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#F5F3F0]">
          <div className="h-14 border-b border-[#EFECE8] px-6 flex items-center justify-between shrink-0 bg-white">
            <button
              onClick={() => setActiveTab("main")}
              className="p-2 hover:bg-[#F5F3F0] rounded-full transition text-[#1A1A1A] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
            </button>
            <h1 className="font-serif text-base text-[#1A1A1A]">悬疑剧场 · 剧本列表</h1>
            <button
              onClick={() => setShowCreateScriptModal(true)}
              className="border border-[#E5E2DC] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] rounded-full px-4 py-1.5 text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>新建剧本</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-2xl mx-auto w-full">
            {scripts.length === 0 ? (
              <div className="py-20 text-center space-y-3 text-[#A8A39A]">
                <Film className="w-8 h-8 mx-auto stroke-[1.5] opacity-50" />
                <p className="text-xs font-sans">暂无悬疑剧本，点击右上角“新建剧本”开启推理之门。</p>
              </div>
            ) : (
              scripts.map((s) => {
                const statusObj = {
                    not_started: { text: "○ 未开始" },
                    in_progress: { text: "○— 排演中" },
                    completed: { text: "□ 已完结" }
                }[s.status];

                return (
                  <div
                    key={s.id}
                    className="p-6 rounded-[16px] bg-white border border-[#EFECE8] hover:border-[#1A1A1A] transition-all space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-serif text-base font-normal text-[#1A1A1A] truncate">{s.name}</h3>
                          <span className="text-[11px] text-[#A8A39A] font-sans font-normal">
                            {statusObj.text}
                          </span>
                        </div>
                        <p className="text-xs text-[#A8A39A] font-sans line-clamp-2 leading-relaxed">
                          {s.background}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = scripts.filter(item => item.id !== s.id);
                          setScripts(updated);
                          persistScripts(updated);
                        }}
                        className="p-2 text-[#A8A39A] hover:text-[#1A1A1A] rounded-full hover:bg-[#F5F3F0] transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#EFECE8] text-xs text-[#A8A39A] font-sans">
                      <span>{s.genre} • 幕次: 第 {s.currentAct} 幕 / 5</span>

                      <button
                        onClick={() => {
                          setActiveScript(s);
                          setActiveTab("suspense_play");
                        }}
                        className="border border-[#E5E2DC] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] px-4 py-1.5 rounded-full text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 stroke-[1.5]" />
                        <span>{s.status === "completed" ? "回顾剧本" : "继续排演"}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === "transmigration_play" && activeWorld && (
        <div className="flex-1 flex flex-col z-10 overflow-hidden bg-[#F5F3F0]">
          {/* Header */}
          <div className="h-14 border-b border-[#EFECE8] px-6 flex items-center justify-between shrink-0 bg-white">
            <button
              onClick={() => setActiveTab("transmigration_list")}
              className="p-2 hover:bg-[#F5F3F0] rounded-full transition text-[#1A1A1A] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
            </button>
            <div className="text-left flex-1 mx-4 min-w-0">
              <h1 className="font-serif text-base text-[#1A1A1A] truncate flex items-center gap-2">
                <span>{activeWorld.name}</span>
              </h1>
              <p className="font-serif text-[11px] text-[#A8A39A] flex items-center gap-2">
                <span>轮次: {activeWorld.currentTurnCount} / 20</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 relative z-30">
              <button
                onClick={() => {
                  if (activeWorld.status === "completed") {
                    setActiveWorld(null);
                    setActiveTab("transmigration_list");
                    return;
                  }
                  setShowSaveExitConfirm(true);
                }}
                className="border border-[#E5E2DC] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] rounded-full px-3.5 py-1 text-[13px] font-sans transition cursor-pointer relative z-50"
              >
                保存退出
              </button>
              
              <button
                onClick={() => setShowBackgroundDrawer(!showBackgroundDrawer)}
                className="p-2 text-[#A8A39A] hover:text-[#1A1A1A] rounded-full hover:bg-[#F5F3F0] transition cursor-pointer"
                title="世界信息"
              >
                <BookOpen className="w-4 h-4 stroke-[1.5]" />
              </button>
            </div>
          </div>

          {/* Quick Stats & Exposure Meter */}
          <div className="bg-white border-b border-[#EFECE8] px-6 py-3 flex flex-col gap-2">
            {/* Identity Info line */}
            <div className="flex items-center justify-between text-[11px] font-serif text-[#A8A39A]">
              <span>
                穿越身份: <span className="text-[#1A1A1A] font-sans">【{activeWorld.userTag}】{activeWorld.userIdentity?.name || "未知宿主"}</span>
              </span>
              <span>
                {activeWorld.userIdentity?.age}岁 | {activeWorld.userIdentity?.occupation}
              </span>
            </div>

            {/* Exposure progress bar */}
            <div className="flex items-center justify-between text-[11px] font-serif text-[#A8A39A] gap-3">
              <div className="flex items-center gap-1.5">
                <Skull className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>灵魂排异(暴露度):</span>
                <span className="font-sans text-[#1A1A1A]">{activeWorld.exposure || 0}%</span>
              </div>
              <div className="flex-1 h-1.5 bg-[#F5F3F0] rounded-full overflow-hidden max-w-xs">
                <div
                  className={`h-full transition-all duration-500 ${
                    (activeWorld.exposure || 0) > 70
                      ? "bg-[#1A1A1A]"
                      : "bg-[#A8A39A]"
                  }`}
                  style={{ width: `${Math.min(100, activeWorld.exposure || 0)}%` }}
                />
              </div>
              {activeWorld.exposure >= 100 && (
                <span className="text-[11px] font-serif text-[#1A1A1A] shrink-0">
                  ⚠️ 灵魂碎灭！
                </span>
              )}
            </div>
          </div>

          {/* Collapsible Background Drawer */}
          {showBackgroundDrawer && (
            <div className="p-6 bg-white border-b border-[#EFECE8] animate-slide-down overflow-y-auto max-h-[40vh] space-y-4">
              <div>
                <h4 className="font-serif text-xs text-[#1A1A1A] tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 stroke-[1.5]" />
                  当前世界大背景
                </h4>
                <p className="text-[15px] font-serif text-[#1A1A1A] leading-[1.7] bg-[#F5F3F0] p-4 rounded-[12px] border border-[#EFECE8]">
                  {activeWorld.background}
                </p>
              </div>
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#F5F3F0]">
            {activePlayTab === "behavior" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
                  {activeWorld.messages.map((msg, index) => (
                    <div key={msg.id || index} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-fade-in`}>
                      {msg.role !== "user" && (
                        <span className="font-serif text-[11px] text-[#A8A39A] mb-1.5 px-1">{msg.senderName || "天道系统"}</span>
                      )}
                      <div className={`max-w-[85%] p-5 rounded-[16px] ${
                        msg.role === "user" 
                        ? "bg-[#1A1A1A] text-white rounded-tr-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-sans text-base" 
                        : "bg-white text-[#1A1A1A] border border-[#EFECE8] rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[15px] font-serif leading-[1.7]"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-[#A8A39A] animate-pulse text-[11px] font-serif p-3 bg-white rounded-[12px] border border-[#EFECE8] w-fit shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                      <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>天道主宰正在推演大千世界剧情中...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {activePlayTab === "tasks" && (
              <div className="p-6 space-y-6 max-w-3xl mx-auto w-full">
                {/* 1. Core Tasks list */}
                <div className="p-5 rounded-[16px] bg-white border border-[#EFECE8] space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  <h3 className="font-serif text-sm text-[#1A1A1A] flex items-center gap-1.5 border-b border-[#EFECE8] pb-2">
                    <Trophy className="w-4 h-4 text-[#1A1A1A] stroke-[1.5]" />
                    <span>核心任务指标</span>
                  </h3>
                  <div className="space-y-3">
                    {activeWorld.tasks.map((t) => (
                      <div key={t.id} className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskCompletion(t.id)}
                          className="cursor-pointer mt-1"
                          title="手动触发判定"
                        >
                          {t.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[1.5]" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#A8A39A] shrink-0 stroke-[1.5]" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className={`text-[15px] font-serif leading-[1.7] ${t.completed ? "line-through text-[#A8A39A]" : "text-[#1A1A1A]"}`}>
                            {t.description}
                          </p>
                          <span className={`text-[11px] font-serif px-2 py-0.5 rounded mt-1.5 inline-block ${t.completed ? "bg-emerald-50 text-emerald-700" : "bg-[#F5F3F0] text-[#A8A39A]"}`}>
                            {t.completed ? "已完成" : "进行中 • 判定由行动推动或在此手动判定"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. User Props Deck */}
                <div className="p-5 rounded-[16px] bg-white border border-[#EFECE8] space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between border-b border-[#EFECE8] pb-2">
                    <h3 className="font-serif text-sm text-[#1A1A1A] flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-[#1A1A1A] stroke-[1.5]" />
                      <span>我的行囊法宝 ({activeWorld.props?.filter(p => p.count > 0).length || 0})</span>
                    </h3>
                    
                  </div>
                  <div className="space-y-3">
                    {activeWorld.props?.map((p) => {
                      if (p.count === 0) return null;
                      return (
                        <div key={p.id} className="p-4 rounded-[12px] bg-[#F5F3F0] border border-[#EFECE8] flex items-center justify-between gap-3 transition-all hover:border-[#1A1A1A]">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[14px] font-serif text-[#1A1A1A]">{p.name}</span>
                              <span className="text-[11px] font-serif px-2 py-0.5 rounded bg-white text-[#1A1A1A] border border-[#EFECE8]">
                                存量: {p.count}
                              </span>
                            </div>
                            <p className="text-[15px] font-serif text-[#1A1A1A] leading-[1.7]">{p.description}</p>
                          </div>
                          <button
                            onClick={() => useTransmigrationPropOrSkill("item", p.id)}
                            disabled={isGenerating || p.count <= 0}
                            className="px-4 py-2 bg-[#1A1A1A] hover:bg-neutral-800 disabled:opacity-40 text-white text-[13px] font-sans rounded-full cursor-pointer shrink-0 transition"
                          >
                            使用
                          </button>
                        </div>
                      );
                    })}
                    {(!activeWorld.props || activeWorld.props.filter(p => p.count > 0).length === 0) && (
                      <p className="text-[11px] font-serif text-[#A8A39A] text-center py-3">
                        背囊空空如也，可在商店购买灵丹妙药...
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. User Skills Deck */}
                <div className="p-5 rounded-[16px] bg-white border border-[#EFECE8] space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  <h3 className="font-serif text-sm text-[#1A1A1A] flex items-center gap-1.5 border-b border-[#EFECE8] pb-2">
                    <Zap className="w-4 h-4 text-[#1A1A1A] stroke-[1.5]" />
                    <span>天道神技</span>
                  </h3>
                  <div className="space-y-3">
                    {activeWorld.skills?.map((s) => (
                      <div key={s.id} className="p-4 rounded-[12px] bg-[#F5F3F0] border border-[#EFECE8] flex items-center justify-between gap-3 transition-all hover:border-[#1A1A1A]">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[14px] font-serif text-[#1A1A1A]">{s.name}</span>
                            <span className="text-[11px] font-serif px-2 py-0.5 rounded bg-white text-[#1A1A1A] border border-[#EFECE8]">
                              LV.{s.level}
                            </span>
                          </div>
                          <p className="text-[15px] font-serif text-[#1A1A1A] leading-[1.7]">{s.description}</p>
                        </div>
                        <button
                          onClick={() => useTransmigrationPropOrSkill("skill", s.id)}
                          disabled={isGenerating || s.level <= 0}
                          className="px-4 py-2 bg-[#1A1A1A] hover:bg-neutral-800 disabled:opacity-40 text-white text-[13px] font-sans rounded-full cursor-pointer shrink-0 transition"
                        >
                          发动
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Memory Card Achievements */}
                {activeWorld.memoryCard && (
                  <div className="p-4 rounded-2xl bg-neutral-900 border border-purple-500/30 bg-gradient-to-br from-neutral-900 to-purple-950/20 space-y-3 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1 bg-purple-600 text-[9px] text-white font-bold rounded-bl-xl shadow-md uppercase tracking-wider font-mono">
                      【终焉刻印】
                    </div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-neutral-800 pb-2">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span>解封记忆碎片卡 (Memory Card)</span>
                    </h3>
                    <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-300">{activeWorld.memoryCard.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          activeWorld.memoryCard.status === "perfect"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : activeWorld.memoryCard.status === "partial"
                            ? "bg-amber-950 text-amber-400 border border-amber-500/30"
                            : "bg-rose-950 text-rose-400 border border-rose-500/30"
                        }`}>
                          {activeWorld.memoryCard.status === "perfect" ? "★ 完美谢幕" : activeWorld.memoryCard.status === "partial" ? "☆ 破碎结局" : "☠ 灵魂湮灭"}
                        </span>
                      </div>
                      <p className="text-neutral-300 leading-relaxed text-[11px] italic bg-neutral-900 p-2 rounded border border-neutral-800">
                        &quot;{activeWorld.memoryCard.content}&quot;
                      </p>
                      
                    </div>
                    <button
                      onClick={() => handleShareMemoryCard(activeWorld.id)}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>分享终焉记忆卡片</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activePlayTab === "identities" && (
              <div className="p-4 space-y-3">
                {activeWorld.characterIds.map((charId) => {
                  const charState = activeWorld.characterStates?.[charId];
                  if (!charState) return null;
                  
                  const myFaction = activeWorld.factions?.find(f => f.memberIds.includes("user"));
                  const isSameFaction = myFaction?.memberIds.includes(charId);
                  const isUnlocked = !!charState.revealed || isSameFaction;
                  
                  return (
                    <div
                      key={charId}
                      className={`p-3 bg-neutral-900 border rounded-2xl flex flex-col gap-3 transition-all hover:border-neutral-700 ${
                        isSameFaction ? "border-emerald-500/20" : "border-neutral-800"
                      }`}
                    >
                      {/* Character identity row */}
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-lg shadow-md border border-neutral-700 shrink-0 cursor-pointer hover:scale-105 transition"
                          onClick={() => setInspectingCharId(charId)}
                        >
                          {charState.identity?.appearance?.includes("袍") ? "🧙" : "👤"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">
                              {isUnlocked ? charState.identity?.name : "【未知原住民】"}
                            </span>
                            {isSameFaction && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase tracking-wider">
                                盟友
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                            扮演身份: {charState.identity?.name || "???"} ({charState.identity?.age}岁)
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setAccuseTargetId(charId);
                            setAccuseText("");
                            setShowAccuseModal(true);
                          }}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg transition shrink-0 cursor-pointer"
                        >
                          {isSameFaction ? "秘密传讯" : "试探身份"}
                        </button>
                      </div>

                      {/* Faction & Status */}
                      <div className="flex items-center justify-between bg-neutral-950 p-2.5 rounded-xl border border-neutral-850 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500">阵营归属:</span>
                          <span className={isSameFaction ? "text-emerald-400 font-bold" : "text-neutral-600 italic"}>
                            {isSameFaction ? myFaction?.name : "尚未识别"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500">真实身份:</span>
                          <span className={isUnlocked ? "text-purple-400 font-bold" : "text-neutral-600 italic"}>
                            {isUnlocked ? "攻略者" : "待查证"}
                          </span>
                        </div>
                      </div>

                      {/* Gauges of interaction */}
                      <div className="grid grid-cols-2 gap-3 bg-neutral-950/50 p-2 rounded-xl border border-neutral-900">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-neutral-400 flex items-center gap-1">
                              <Heart className="w-3 h-3 text-rose-400" />
                              <span>好感度:</span>
                            </span>
                            <span className="text-rose-400 font-mono font-bold">{charState.favorability || 0}%</span>
                          </div>
                          <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500" style={{ width: `${charState.favorability || 0}%` }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-neutral-400 flex items-center gap-1">
                              <Eye className="w-3 h-3 text-amber-400" />
                              <span>怀疑度:</span>
                            </span>
                            <span className="text-amber-400 font-mono font-bold">{charState.suspicion || 0}%</span>
                          </div>
                          <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${charState.suspicion || 0}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Mind reading */}
                      <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 text-[11px] leading-relaxed relative">
                        <div className="flex items-center justify-between text-[10px] text-purple-400 mb-1 border-b border-neutral-900 pb-1">
                          <span className="flex items-center gap-1 font-bold">
                            <Shield className="w-3.5 h-3.5" />
                            <span>【真实心声】</span>
                          </span>
                        </div>
                        {isUnlocked ? (
                          <p className="text-purple-200 italic font-medium">
                            &quot;{charState.innerThought}&quot;
                          </p>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-2 text-neutral-500 gap-1.5">
                            <p className="text-[10px] italic">心声处于迷雾封锁中...</p>
                            <button
                              onClick={() => useTransmigrationPropOrSkill("item", "read_mind_pill")}
                              className="px-2 py-0.5 bg-purple-950/60 border border-purple-500/30 text-purple-400 hover:text-white rounded text-[9px] font-bold cursor-pointer transition"
                            >
                              消耗【读心灵丹】窥探内心
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activePlayTab === "history" && (
              <div className="p-4 space-y-4">
                {/* Modern Warnings block */}
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-neutral-800 pb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>现代言行穿帮警报</span>
                  </h3>
                  <div className="space-y-2">
                    {activeWorld.modernWarnings && activeWorld.modernWarnings.length > 0 ? (
                      activeWorld.modernWarnings.map((w, index) => (
                        <div key={index} className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl space-y-1.5 text-xs text-rose-200">
                          <div className="flex items-center justify-between text-[10px] text-rose-400 border-b border-rose-950 pb-1">
                            <span className="font-bold">穿帮事件 #{index + 1}</span>
                            <span>罚分: +{w.penalty}% 暴露</span>
                          </div>
                          <p className="italic text-[11px]">&quot;{w.text}&quot;</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {w.keywords.map((kw, kwIdx) => (
                              <span key={kwIdx} className="bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.2 rounded text-[9px] font-bold text-rose-400 font-mono">
                                现代违禁词: {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center space-y-2 text-neutral-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-40 animate-bounce" />
                        <p className="text-[11px]">言行举止毫无现代破绽！天衣无缝！</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Role play tips */}
                <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs text-neutral-300">
                  <h4 className="font-bold text-white flex items-center gap-1">
                    <span>💡</span>
                    <span>快穿世界扮演守则</span>
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-neutral-400 text-[11px]">
                    <li>请沉浸式扮演您在当前世界的原宿主身份，符合时代背景。</li>
                    <li>严禁使用现代词汇（如：&quot;手机&quot;、&quot;微信&quot;、&quot;AI&quot;、&quot;网络&quot;、&quot;穿越&quot;）。</li>
                    <li>系统将采用高敏检测，一旦发言触发违禁，将直接惩罚暴涨暴露指数。</li>
                    <li>当好感羁绊到100%且任务达成时，AI天道将为您刻印完美谢幕记忆碎片卡！</li>
                  </ul>
                </div>
              </div>
            )}
            
            {activePlayTab === "chat" && viewingFactionId && (
              <div className="flex flex-col h-full bg-neutral-950 animate-fade-in">
                {/* Chat Header */}
                <div className="p-3 border-b border-neutral-900 flex items-center justify-between bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1">
                      {activeWorld.factions?.find(f => f.id === viewingFactionId)?.memberIds.includes("user") 
                       ? <>🛡️ 我的阵营群聊 <span className="bg-emerald-500/10 text-emerald-400 px-1 rounded">己方</span></> 
                       : <>👁️ 敌方阵营频道 <span className="bg-rose-500/10 text-rose-400 px-1 rounded">偷看中</span></>}
                    </span>
                    <h4 className="text-sm font-bold text-white truncate">
                      {activeWorld.factions?.find(f => f.id === viewingFactionId)?.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      const otherFaction = activeWorld.factions?.find(f => f.id !== viewingFactionId);
                      if (otherFaction) setViewingFactionId(otherFaction.id);
                    }}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-neutral-700 shadow-lg active:scale-95 shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    切换频道
                  </button>
                </div>

                {/* Faction Goal Banner */}
                <div className="px-4 py-3 bg-neutral-900/20 border-b border-neutral-900/40">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 bg-purple-500/10 border border-purple-500/20 rounded flex items-center justify-center shrink-0 mt-0.5">
                      <Trophy className="w-3 h-3 text-purple-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-neutral-300 font-bold">阵营共鸣目标</p>
                      <p className="text-[10px] text-neutral-500 leading-relaxed italic">
                        {activeWorld.factions?.find(f => f.id === viewingFactionId)?.goal}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {activeWorld.factionChats?.[viewingFactionId]?.map((msg, idx) => {
                    const isMe = msg.senderId === "user";
                    return (
                      <div key={msg.id || idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-scale-in`}>
                        <div className="flex items-center gap-2 mb-1.5 px-1.5">
                          {!isMe && (
                            <span className="text-[10px] text-neutral-400 font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                              {msg.senderName}
                            </span>
                          )}
                          <span className="text-[8px] text-neutral-600 font-mono tracking-tighter">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-[11px] leading-relaxed shadow-xl border ${
                          isMe 
                          ? "bg-neutral-100 text-black border-white rounded-tr-none" 
                          : "bg-neutral-900 border-neutral-800 text-neutral-100 rounded-tl-none"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  {(!activeWorld.factionChats?.[viewingFactionId] || activeWorld.factionChats[viewingFactionId].length === 0) && (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-3 py-20">
                      <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800">
                        <MessageSquare className="w-8 h-8 text-neutral-500" />
                      </div>
                      <p className="text-xs font-bold tracking-widest uppercase">频道内尚无神识交流</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-neutral-900/30 border-t border-neutral-900/60 backdrop-blur-sm">
                  {activeWorld.factions?.find(f => f.id === viewingFactionId)?.memberIds.includes("user") ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={factionChatInput}
                          onChange={(e) => setFactionChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendFactionMessage()}
                          placeholder="与阵营伙伴密谋策略..."
                          className="w-full bg-neutral-950 border border-neutral-850 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all shadow-inner"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                           <span className="text-[9px] text-neutral-700 font-mono hidden sm:block">ENTER 发送</span>
                        </div>
                      </div>
                      <button
                        onClick={handleSendFactionMessage}
                        disabled={!factionChatInput.trim()}
                        className="w-11 h-11 bg-white hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-700 text-black rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-3 px-4 bg-neutral-950 border border-neutral-900 rounded-2xl text-center shadow-inner">
                      <span className="text-[10px] text-neutral-500 font-bold flex items-center justify-center gap-2">
                        <Shield className="w-3.5 h-3.5 opacity-50" />
                        🔒 偷看模式下无法直接干预敌方通讯
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input Footer */}
          {activeWorld.activeEvent && (
            <div className="bg-purple-900/20 border-t border-purple-500/30 p-4 space-y-3">
              <p className="text-xs text-purple-200">{activeWorld.activeEvent.description}</p>
              <div className="flex gap-2">
                {activeWorld.activeEvent.options.map(opt => (
                  <button key={opt.id} onClick={() => handleTransmigrationUserSend(opt.text)} className="text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-3 py-2 cursor-pointer transition">
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="p-4 bg-white border-t border-[#EFECE8] flex items-center gap-3">
            <input
              type="text"
              placeholder={activeWorld.status !== "completed" ? "输入在这个世界的互动扮演、叙述或者对白..." : "世界已结束，无法继续操作"}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTransmigrationUserSend()}
              disabled={isGenerating || activeWorld.status === "completed"}
              className="flex-1 bg-white border border-[#EFECE8] rounded-full px-5 py-3 text-[15px] font-sans text-[#1A1A1A] outline-none focus:border-[#1A1A1A] placeholder-[#A8A39A] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => handleTransmigrationUserSend()}
              disabled={isGenerating || !inputText.trim() || activeWorld.status === "completed"}
              className="p-3 bg-[#1A1A1A] hover:bg-neutral-800 disabled:bg-[#F5F3F0] disabled:text-[#A8A39A] text-white rounded-full transition cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4 h-4 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => handleTransmigrationUserSend("【AI推进】：请继续推进当前世界的剧情发展的关键节点！")}
              disabled={isGenerating || activeWorld.status === "completed"}
              className="px-4 py-3 border border-[#E5E2DC] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] rounded-full text-[13px] font-sans transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
              title="AI自动推进剧情"
            >
              <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>推进</span>
            </button>
          </div>

          {/* ==================== SUB-MODALS ==================== */}

          {/* 1. Skill/Props Shop Modal */}
          {/* 2. Character Inspect Drawer Modal */}
          {inspectingCharId && (() => {
            const charState = activeWorld.charactersState.find(c => c.characterId === inspectingCharId);
            if (!charState) return null;
            return (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm space-y-4 animate-fade-in text-neutral-100">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>👤</span>
                      <span>伙伴属性档案</span>
                    </h3>
                    <button onClick={() => setInspectingCharId(null)} className="text-neutral-500 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 bg-neutral-950 p-3 rounded-2xl border border-neutral-850">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-2xl border border-neutral-750">
                      {charState.avatar || "👤"}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{charState.name}</h4>
                      <p className="text-[10px] text-purple-400 font-bold mt-0.5">
                        原世界真实身份: 【{charState.revealed ? charState.thought?.includes("攻略者") ? "攻略者" : "攻略对象" : "封锁未破译"}】
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed">
                    <div className="p-3 bg-neutral-950 rounded-xl space-y-1 border border-neutral-850">
                      <span className="text-neutral-400 font-bold block text-[10px] uppercase">当前世界原住民躯壳：</span>
                      <p className="font-bold text-white text-[11px]">{charState.identity?.name || "???"} ({charState.identity?.age}岁)</p>
                      <p className="text-neutral-300 mt-1">职业: {charState.identity?.occupation}</p>
                      <p className="text-neutral-400 text-[11px] mt-1">性格: {charState.identity?.personality}</p>
                      <p className="text-neutral-400 text-[11px] leading-normal mt-1">背景故事: {charState.identity?.background}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-850">
                        <span className="text-neutral-400 text-[10px] block">好好感羁绊：</span>
                        <span className="text-rose-400 font-bold font-mono text-base">{charState.favorability || 0}%</span>
                      </div>
                      <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-850">
                        <span className="text-neutral-400 text-[10px] block">对你怀疑度：</span>
                        <span className="text-amber-400 font-bold font-mono text-base">{charState.suspicion || 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setInspectingCharId(null);
                        setAccuseTargetId(charState.characterId);
                        setAccuseText("");
                        setShowAccuseModal(true);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      当面相认
                    </button>
                    <button
                      onClick={() => setInspectingCharId(null)}
                      className="px-4 py-2 bg-neutral-800 text-neutral-400 text-xs rounded-xl hover:text-white"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. Accuse Modal */}
          {showAccuseModal && accuseTargetId && (() => {
            const targetChar = activeWorld.charactersState.find(c => c.characterId === accuseTargetId);
            if (!targetChar) return null;
            return (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm space-y-4 animate-fade-in text-neutral-100">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>灵魂当面相认指控</span>
                    </h3>
                    <button onClick={() => setShowAccuseModal(false)} className="text-neutral-500 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-400 leading-normal bg-neutral-950 p-2.5 rounded-xl border border-neutral-850">
                    您怀疑伙伴 <span className="text-white font-bold">{targetChar.name}</span> 的躯壳下隐藏着另一个穿越者灵魂。在这里发出您的试探与当面质控，如果猜错会大幅暴涨其怀疑度！
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1.5">您猜想它的秘密身份标签是：</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAccuseGuessTag("攻略者")}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            accuseGuessTag === "攻略者"
                              ? "bg-purple-950/40 border-purple-500/80 text-white font-bold"
                              : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                          }`}
                        >
                          🎯 攻略者
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccuseGuessTag("攻略对象")}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            accuseGuessTag === "攻略对象"
                              ? "bg-purple-950/40 border-purple-500/80 text-white font-bold"
                              : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                          }`}
                        >
                          💖 攻略对象
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-neutral-300 block mb-1">说出您的摊牌、试探或戳穿神台词：</label>
                      <textarea
                        placeholder="例如：别装了，那天你下意识地拍了下身上的灰尘，那是你上辈子的习惯动作，其实，你也是个攻略者对吧？"
                        rows={3}
                        value={accuseText}
                        onChange={(e) => setAccuseText(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex justify-end gap-2">
                    <button
                      onClick={() => setShowAccuseModal(false)}
                      className="px-4 py-2 bg-neutral-800 text-neutral-400 text-xs rounded-xl hover:text-white"
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
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>摊牌指控</span>
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
              onClick={() => setActiveTab("rules_list")}
              className="p-1.5 hover:bg-neutral-900 rounded-xl transition text-neutral-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
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
              onClick={() => setActiveTab("suspense_list")}
              className="p-1.5 hover:bg-neutral-900 rounded-xl transition text-neutral-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
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
                disabled={isGenerating || !newWorldName.trim() || selectedCharIds.length === 0}
                className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-neutral-800 disabled:opacity-50 text-white text-[13px] font-sans font-medium rounded-full transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin stroke-[1.5]" /> : <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" />}
                <span>AI 自动生成世界</span>
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
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>AI 生成怪谈规则</span>
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
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>AI 生成完整剧本</span>
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
                  setActiveTab("transmigration_list");
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
    </div>
  );
}
