import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Send,
  Sparkles,
  RotateCcw,
  BookOpen,
  MessageSquareQuote,
  Settings,
  Settings2,
  Check,
  X,
  Link2,
  Unlink,
  Wand2,
  Compass,
  Pencil,
  Copy,
  Trash2,
  RefreshCw,
  MoreHorizontal,
  Palette,
  Clock,
  Code,
  UserCheck,
  Feather,
  Play,
  Save,
  Plus,
  Menu,
} from "lucide-react";
import { Character, AppSettings, Message } from "../types";
import { apiChat } from "../lib/api";

export interface OfflineStoryMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export type MeetModeType = "shared" | "isolated"; // "shared" = 互通模式, "isolated" = 架空模式
export type VisualThemeType = "warm_grey" | "minimal_white" | "dark_night" | "retro_cream";
export type PerspectiveType = "third" | "first" | "second";
export type ToneType = "daily_plain" | "literary" | "cold_restrained" | "warm_soft";

export interface CustomCssPreset {
  id: string;
  name: string;
  css: string;
}

export interface OfflineHistoryRecord {
  id: string;
  timestamp: number;
  meetMode: MeetModeType;
  totalTurns: number;
  summary: string;
  messages: OfflineStoryMessage[];
}

export const THEME_STYLES: Record<VisualThemeType, {
  name: string;
  bg: string;
  text: string;
  cardBg: string;
  cardBorder: string;
  dialogueText: string;
  subText: string;
  headerBg: string;
}> = {
  warm_grey: {
    name: "暖灰纸",
    bg: "#F8F6F3",
    text: "#1A1A1A",
    cardBg: "#FFFFFF",
    cardBorder: "rgba(0,0,0,0.05)",
    dialogueText: "#4A4A4A",
    subText: "#99948E",
    headerBg: "#F8F6F3",
  },
  minimal_white: {
    name: "极简白",
    bg: "#FFFFFF",
    text: "#111111",
    cardBg: "#FAFAFA",
    cardBorder: "#E5E5E5",
    dialogueText: "#555555",
    subText: "#999999",
    headerBg: "#FFFFFF",
  },
  dark_night: {
    name: "深色夜",
    bg: "#18181A",
    text: "#ECECEC",
    cardBg: "#242427",
    cardBorder: "#333338",
    dialogueText: "#C2C2C5",
    subText: "#8E8E93",
    headerBg: "#18181A",
  },
  retro_cream: {
    name: "复古米黄",
    bg: "#FBF6E8",
    text: "#3D2E1E",
    cardBg: "#FFFDF5",
    cardBorder: "#E8DFCD",
    dialogueText: "#6B5644",
    subText: "#A39585",
    headerBg: "#FBF6E8",
  },
};

interface OfflineMeetViewProps {
  character: Character;
  settings: AppSettings;
  onlineMessages?: Message[];
  onSyncToOnlineChat?: (storySummary: string) => void;
  onClose: () => void;
}

export const OfflineMeetView: React.FC<OfflineMeetViewProps> = ({
  character,
  settings,
  onlineMessages = [],
  onSyncToOnlineChat,
  onClose,
}) => {
  const [messages, setMessages] = useState<OfflineStoryMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // View Mode: 'chat' | 'visual_settings' | 'mode_settings' | 'history_replay'
  const [viewMode, setViewMode] = useState<"chat" | "visual_settings" | "mode_settings" | "history_replay">("chat");

  // Context menu & action states
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState<OfflineStoryMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const [copyToast, setCopyToast] = useState<boolean>(false);

  // Core settings states
  const [wordLimit, setWordLimit] = useState<number>(600);
  const [meetMode, setMeetMode] = useState<MeetModeType>("shared");
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

  // Customization & Style states
  const [activeTheme, setActiveTheme] = useState<VisualThemeType>("warm_grey");
  const [perspective, setPerspective] = useState<PerspectiveType>("third");
  const [writingTone, setWritingTone] = useState<ToneType>("daily_plain");
  const [customToneKeywords, setCustomToneKeywords] = useState<string>("");
  const [customCss, setCustomCss] = useState<string>("");
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [savedCssPresets, setSavedCssPresets] = useState<CustomCssPreset[]>([]);

  // History states
  const [historyRecords, setHistoryRecords] = useState<OfflineHistoryRecord[]>([]);
  const [replayingRecord, setReplayingRecord] = useState<OfflineHistoryRecord | null>(null);

  // Shared mode opening fields
  const [timeSetting, setTimeSetting] = useState("");
  const [locationSetting, setLocationSetting] = useState("");
  const [reasonSetting, setReasonSetting] = useState("");
  const [atmosphereSetting, setAtmosphereSetting] = useState("");

  // Isolated mode opening field
  const [isolatedBackground, setIsolatedBackground] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `offline_story_${character.id}`;
  const configKey = `offline_config_${character.id}`;
  const historyKey = `offline_history_${character.id}`;

  // Load configuration & story history
  useEffect(() => {
    let hasLoadedStory = false;

    // Load config
    try {
      const savedConfig = localStorage.getItem(configKey);
      if (savedConfig) {
        const parsedCfg = JSON.parse(savedConfig);
        if (parsedCfg.wordLimit) setWordLimit(parsedCfg.wordLimit);
        if (parsedCfg.meetMode) setMeetMode(parsedCfg.meetMode);
        if (parsedCfg.timeSetting) setTimeSetting(parsedCfg.timeSetting);
        if (parsedCfg.locationSetting) setLocationSetting(parsedCfg.locationSetting);
        if (parsedCfg.reasonSetting) setReasonSetting(parsedCfg.reasonSetting);
        if (parsedCfg.atmosphereSetting) setAtmosphereSetting(parsedCfg.atmosphereSetting);
        if (parsedCfg.isolatedBackground) setIsolatedBackground(parsedCfg.isolatedBackground);
        if (parsedCfg.theme) setActiveTheme(parsedCfg.theme);
        if (parsedCfg.perspective) setPerspective(parsedCfg.perspective);
        if (parsedCfg.writingTone) setWritingTone(parsedCfg.writingTone);
        if (parsedCfg.customToneKeywords !== undefined) setCustomToneKeywords(parsedCfg.customToneKeywords);
        if (parsedCfg.customCss !== undefined) setCustomCss(parsedCfg.customCss);
        if (Array.isArray(parsedCfg.savedCssPresets)) setSavedCssPresets(parsedCfg.savedCssPresets);
      }
    } catch (e) {
      console.error("Failed to load offline config:", e);
    }

    // Load history records
    try {
      const savedHist = localStorage.getItem(historyKey);
      if (savedHist) {
        const parsedHist = JSON.parse(savedHist);
        if (Array.isArray(parsedHist)) setHistoryRecords(parsedHist);
      }
    } catch (e) {
      console.error("Failed to load offline history:", e);
    }

    // Load story messages
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          hasLoadedStory = true;
        }
      }
    } catch (e) {
      console.error("Failed to load offline story:", e);
    }

    // If no story history exists, open setup modal automatically
    if (!hasLoadedStory) {
      setShowSetupModal(true);
    }
  }, [character.id]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current && viewMode === "chat") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating, viewMode]);

  // Save messages to local storage
  const saveStory = (newMsgs: OfflineStoryMessage[]) => {
    setMessages(newMsgs);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newMsgs));
    } catch (e) {
      console.error("Failed to save offline story:", e);
    }
  };

  // Helper to save current settings object
  const saveAllConfig = (updated: Partial<{
    wordLimit: number;
    meetMode: MeetModeType;
    timeSetting: string;
    locationSetting: string;
    reasonSetting: string;
    atmosphereSetting: string;
    isolatedBackground: string;
    theme: VisualThemeType;
    perspective: PerspectiveType;
    writingTone: ToneType;
    customToneKeywords: string;
    customCss: string;
    savedCssPresets: CustomCssPreset[];
  }>) => {
    const nextLimit = updated.wordLimit !== undefined ? updated.wordLimit : wordLimit;
    const nextMode = updated.meetMode !== undefined ? updated.meetMode : meetMode;
    const nextTheme = updated.theme !== undefined ? updated.theme : activeTheme;
    const nextPerspective = updated.perspective !== undefined ? updated.perspective : perspective;
    const nextTone = updated.writingTone !== undefined ? updated.writingTone : writingTone;
    const nextKeywords = updated.customToneKeywords !== undefined ? updated.customToneKeywords : customToneKeywords;
    const nextCss = updated.customCss !== undefined ? updated.customCss : customCss;
    const nextPresets = updated.savedCssPresets !== undefined ? updated.savedCssPresets : savedCssPresets;

    try {
      localStorage.setItem(
        configKey,
        JSON.stringify({
          wordLimit: nextLimit,
          meetMode: nextMode,
          timeSetting,
          locationSetting,
          reasonSetting,
          atmosphereSetting,
          isolatedBackground,
          theme: nextTheme,
          perspective: nextPerspective,
          writingTone: nextTone,
          customToneKeywords: nextKeywords,
          customCss: nextCss,
          savedCssPresets: nextPresets,
        })
      );
    } catch (e) {
      console.error("Failed to save offline config:", e);
    }
  };

  // Save config state (mode & limit)
  const saveConfigState = (mode: MeetModeType, limit: number) => {
    setMeetMode(mode);
    setWordLimit(limit);
    saveAllConfig({ meetMode: mode, wordLimit: limit });
  };

  // Archive current active session to history list
  const archiveCurrentSession = (msgsToArchive = messages, modeToArchive = meetMode) => {
    if (!msgsToArchive || msgsToArchive.length === 0) return;

    const firstMsg = msgsToArchive[0];
    const rawContent = firstMsg?.content || "";
    const summaryStr = rawContent.slice(0, 70) + (rawContent.length > 70 ? "..." : "");

    const newRecord: OfflineHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: Date.now(),
      meetMode: modeToArchive,
      totalTurns: msgsToArchive.length,
      summary: summaryStr,
      messages: msgsToArchive,
    };

    const updatedList = [newRecord, ...historyRecords];
    setHistoryRecords(updatedList);
    try {
      localStorage.setItem(historyKey, JSON.stringify(updatedList));
    } catch (e) {
      console.error("Failed to archive session:", e);
    }
  };

  // Helper to generate dynamic style prompt instructions based on perspective & tone & custom keywords
  const getPromptStyleInstructions = () => {
    let perspectiveInstruction = "";
    if (perspective === "first") {
      perspectiveInstruction = "【叙述视角要求】：从角色自身视角出发，使用第一人称（“我”）来进行心理活动与动作描写。";
    } else if (perspective === "second") {
      perspectiveInstruction = "【叙述视角要求】：在描写与叙述中直接称呼用户为“你”，拉近距离与陪伴感。";
    } else {
      perspectiveInstruction = "【叙述视角要求】：使用上帝视角/第三人称（“他/她”）来客观叙述角色的姿态、动作与心理。";
    }

    let toneInstruction = "";
    if (writingTone === "literary") {
      toneInstruction = "【文风基调 - 文艺细腻】：句子稍长，极其注重氛围感与感官描写（光线、温度、雨声、微风），文笔优雅有呼吸感。";
    } else if (writingTone === "cold_restrained") {
      toneInstruction = "【文风基调 - 冷淡克制】：用词极少，语气收敛克制，不滥用修辞，依靠极少的眼神微动作与微小停顿传递情感。";
    } else if (writingTone === "warm_soft") {
      toneInstruction = "【文风基调 - 温暖柔和】：语气非常软，细节温馨细腻，充满关怀与陪伴感，让人感觉被包容。";
    } else {
      toneInstruction = "【文风基调 - 日常白描】：句子短，动作具体，干净自然，像讲身边发生的事，呈现生活原本的节奏（日本电影台词本风格）。";
    }

    const customKwStr = customToneKeywords.trim()
      ? `\n【用户自定义文风要求】：${customToneKeywords.trim()}`
      : "";

    return `
${perspectiveInstruction}
${toneInstruction}${customKwStr}

【核心撰写规范】：
1. 坚决杜绝油腻、霸总、超雄、极端情绪或夸张华丽词藻的堆砌。
2. 句式多用具体的名词与动词。形容词极其克制，多来自光线、声音、温度、空气、距离等真实感官。
3. 情绪不依赖浮夸形容词，而是通过细腻动作、眼神停顿、肢体微调与环境变化克制地传递。
4. 让节奏慢下来，对话平实自然，与环境细节穿插交织。
`;
  };

  // Long press timer touch/mouse handlers
  const handleTouchStart = (msg: OfflineStoryMessage) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setSelectedMsgForMenu(msg);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Generate the AI's first opening scene (开场描写 - 不包含任何对话)
  const generateOpeningScene = async (
    currentMode: MeetModeType,
    currentLimit: number,
    timeStr: string,
    locStr: string,
    reasonStr: string,
    atmoStr: string,
    isoBg: string
  ) => {
    setIsGenerating(true);
    setApiError(null);

    try {
      let contextPrompt = "";

      if (currentMode === "shared") {
        let recentOnlineStr = "";
        if (onlineMessages && onlineMessages.length > 0) {
          recentOnlineStr = onlineMessages
            .slice(-15)
            .map((m) => `${m.role === "user" ? "用户" : character.name}: ${m.content}`)
            .join("\n");
        }

        const hasUserSetup = timeStr.trim() || locStr.trim() || reasonStr.trim() || atmoStr.trim();

        if (hasUserSetup) {
          contextPrompt = `【开场设定依据（用户自定义）】：
- 时间：${timeStr.trim() || "（AI根据线上聊天推断合适时间）"}
- 地点：${locStr.trim() || "（AI根据线上聊天推断合适地点）"}
- 见面原因：${reasonStr.trim() || "（AI根据线上聊天推断合适原因）"}
- 氛围关键词：${atmoStr.trim() || "（自然流畅）"}

请结合以上设定，以及你与用户过去的线上聊天历史与角色人设，撰写见面第一段开场描写。
【过去的线上聊天历史背景】：
${recentOnlineStr || "（此前在线上已有熟悉互动与交谈）"}`;
        } else {
          contextPrompt = `【开场设定依据（系统自动推断）】：
用户未填写特定设定。请你根据你与用户此前在线上的聊天历史，以及你的角色人设，自动推断并呈现一个非常自然、呼应线上聊天的见面场景（例如线上聊过的咖啡馆、旧书店、公园、大雨后的街道或双方约好的地点与时间）。
【过去的线上聊天历史背景】：
${recentOnlineStr || "（此前在线上已有熟悉互动与交谈）"}`;
        }
      } else {
        // Isolated mode (架空模式)
        if (isoBg.trim()) {
          contextPrompt = `【架空模式开场背景（用户自定义）】：
背景与场景描述：${isoBg.trim()}

请以此架空背景为起点，保持你的角色性格特征，展开第一段开场描写。忽略所有线上聊天记录。`;
        } else {
          contextPrompt = `【架空模式开场背景（AI自由随机创作）】：
用户未指定架空背景。请依据你的角色性格（${character.description || ""}）与世界观，完全自由地随机构思一个极具新意、悬念与吸引力的平行时空/独立剧本开场描写。忽略所有线上聊天记录。`;
        }
      }

      const minWords = Math.max(150, Math.floor(currentLimit * 0.75));
      const maxWords = Math.min(2500, Math.floor(currentLimit * 1.25));

      const styleRules = getPromptStyleInstructions();

      const openingInstruction = `【线下见面 - 第一段开场描写特别指令】：
你正在为“线下见面”互动生成【第一段开场描写】。

【最高优先级规则】：
1. 【绝对严禁包含任何话语或对话内容】：第一段开场描写必须完全是环境渲染、动作细节、氛围布置、心理与眼神等叙述性画面文字。严禁出现角色说话、对话框、 quotes “...” 或任何言语台词！用户的第一次对话或行动将在开场之后由用户主动输入。
2. 【字数控制】：字数必须在 ${currentLimit} 字左右（要求 ${minWords}~${maxWords} 字）。
3. 【角色人设】：贴合 ${character.name} 的性格风格（${character.description || ""}）。
${styleRules}

${contextPrompt}`;

      const apiMessages = [
        {
          id: `sys-open-${Date.now()}`,
          role: "user" as const,
          content: openingInstruction,
          timestamp: Date.now(),
        },
      ];

      const cleanCharacter = {
        name: character.name,
        description: character.description,
        systemInstruction: character.systemInstruction + "\n" + openingInstruction,
      };

      const requestParams = {
        messages: apiMessages,
        character: cleanCharacter,
        settings: settings,
        chatMode: "offline" as const,
        replyLength: "long",
        replyCount: 1,
      };

      const response = await apiChat(requestParams);
      const aiText = response.text || "（环境静谧，阳光斜斜照在地面上。你与对方在约定地点相遇，静静地凝视着彼此...）";

      const aiOpeningMsg: OfflineStoryMessage = {
        id: `ai-open-${Date.now()}`,
        role: "assistant",
        content: aiText,
        timestamp: Date.now(),
      };

      saveStory([aiOpeningMsg]);

      if (currentMode === "shared" && onSyncToOnlineChat) {
        onSyncToOnlineChat(aiText);
      }
    } catch (err: any) {
      console.error("Failed to generate opening scene:", err);
      setApiError(err.message || "生成开场失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // Mode switch handler with confirmation prompt
  const handleSwitchModeWithConfirm = (targetMode: MeetModeType) => {
    if (targetMode === meetMode) return;

    const confirmed = window.confirm("切换模式将结束当前见面并创建新见面，确定继续吗？");
    if (!confirmed) return;

    if (messages.length > 0) {
      archiveCurrentSession(messages, meetMode);
    }

    setMeetMode(targetMode);
    saveConfigState(targetMode, wordLimit);
    setMessages([]);
    setViewMode("chat");

    generateOpeningScene(
      targetMode,
      wordLimit,
      timeSetting,
      locationSetting,
      reasonSetting,
      atmosphereSetting,
      isolatedBackground
    );
  };

  // Opening setup apply handler with confirmation prompt
  const handleApplySetupWithConfirm = () => {
    const confirmed = window.confirm("切换模式将结束当前见面并创建新见面，确定继续吗？");
    if (!confirmed) return;

    if (messages.length > 0) {
      archiveCurrentSession(messages, meetMode);
    }

    saveConfigState(meetMode, wordLimit);
    setMessages([]);
    setViewMode("chat");

    generateOpeningScene(
      meetMode,
      wordLimit,
      timeSetting,
      locationSetting,
      reasonSetting,
      atmosphereSetting,
      isolatedBackground
    );
  };

  // Start / Confirm Setup
  const handleStartMeeting = () => {
    if (messages.length > 0) {
      archiveCurrentSession(messages, meetMode);
    }
    saveConfigState(meetMode, wordLimit);
    setShowSetupModal(false);
    generateOpeningScene(
      meetMode,
      wordLimit,
      timeSetting,
      locationSetting,
      reasonSetting,
      atmosphereSetting,
      isolatedBackground
    );
  };

  // Reset scene
  const handleResetScene = () => {
    if (window.confirm("确定要重新配置并重置线下见面剧情吗？当前对话将自动存入历史记录。")) {
      if (messages.length > 0) {
        archiveCurrentSession(messages, meetMode);
      }
      setMessages([]);
      setShowSetupModal(true);
    }
  };

  // Re-roll a character AI message (重新生成该条描写内容，替换原内容)
  const handleRerollMessage = async (targetMsgId: string) => {
    if (isGenerating) return;

    const targetIdx = messages.findIndex((m) => m.id === targetMsgId);
    if (targetIdx === -1) return;

    setIsGenerating(true);
    setApiError(null);

    try {
      const priorMsgs = messages.slice(0, targetIdx);

      if (priorMsgs.length === 0) {
        // If re-rolling the opening scene
        await generateOpeningScene(
          meetMode,
          wordLimit,
          timeSetting,
          locationSetting,
          reasonSetting,
          atmosphereSetting,
          isolatedBackground
        );
        return;
      }

      let onlineContextStr = "";
      if (meetMode === "shared" && onlineMessages && onlineMessages.length > 0) {
        const recentOnline = onlineMessages
          .slice(-15)
          .map((m) => `${m.role === "user" ? "用户" : character.name}: ${m.content}`)
          .join("\n");
        onlineContextStr = `\n【互通模式 - 线上聊天记忆与背景（必须连贯）】：\n以下是你与用户此前在线上聊天的最近记录，请保持记忆连贯：\n${recentOnline}\n`;
      } else {
        onlineContextStr = `\n【架空模式 - 完全独立平行时空】：\n忽略所有线上聊天历史，这是一个独立的平行时空剧本。`;
      }

      const minWords = Math.max(150, Math.floor(wordLimit * 0.75));
      const maxWords = Math.min(2500, Math.floor(wordLimit * 1.25));

      const systemInstruction = `【线下见面剧情模式特别指令】：
你正在与用户进行“线下见面”互动。这是一个纯剧情小说/剧本模式，以环境白描、肢体动作、感官细节与微小停顿为主，对话为辅。
${onlineContextStr}

【字数控制要求】：
请务必将你的每一轮描写控制在约 ${wordLimit} 字左右（范围：${minWords}~${maxWords} 字）。

【文风与写作风格要求（日本电影台词本风格）】：
1. 干净白描，略带文艺感，字里行间有呼吸感与阅读质感。坚决杜绝油腻、霸总、超雄、极端情绪或华丽修辞的堆砌。
2. 句式短，多用具体的名词与动词。形容词极其克制，多来自光线、雨声、温度、空气、距离等真实感官。
3. 不喊叫，不摔东西，不砸墙。情绪不靠形容词，靠动作细节、眼神停顿与微小的心理波澜传递。
4. 让画面静下来，让节奏慢下来。不热闹，不煽情，不装深沉。
5. 对话自然平实，与环境细节及停顿穿插交织，呈现出真实时间流逝的质感。

规则：
1. 严禁单纯输出网聊短句，不要使用任何聊天气泡视角。
2. 动作与心理描写可以用 *...* 或 （...） 包裹，说话内容放在 quotes “...” 中。
3. 表现出 ${character.name} 的独特性格细节（${character.description || ""}）。`;

      const apiMessages = [
        {
          id: "sys-instruct",
          role: "user" as const,
          content: systemInstruction,
          timestamp: Date.now() - 10000,
        },
        ...priorMsgs
          .filter((m) => m.role !== "system")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.role === "user" ? `[用户行动/表达]: ${m.content}` : m.content,
            timestamp: m.timestamp,
          })),
      ];

      const cleanCharacter = {
        name: character.name,
        description: character.description,
        systemInstruction: character.systemInstruction + "\n" + systemInstruction,
      };

      const requestParams = {
        messages: apiMessages,
        character: cleanCharacter,
        settings: settings,
        chatMode: "offline" as const,
        replyLength: "long",
        replyCount: 1,
      };

      const response = await apiChat(requestParams);
      const aiText = response.text || "（对方没有说话，抬眼看了你一下，微微笑了笑。）";

      const updatedMsgs = messages.map((m, idx) =>
        idx === targetIdx ? { ...m, content: aiText, timestamp: Date.now() } : m
      );

      saveStory(updatedMsgs);

      if (meetMode === "shared" && onSyncToOnlineChat) {
        onSyncToOnlineChat(aiText);
      }
    } catch (err: any) {
      console.error("Failed to reroll message:", err);
      setApiError(err.message || "重roll 失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // Continue story / AI Advance
  const handleContinueStory = async () => {
    if (isGenerating || messages.length === 0) return;

    setIsGenerating(true);
    setApiError(null);

    try {
      let onlineContextStr = "";
      if (meetMode === "shared" && onlineMessages && onlineMessages.length > 0) {
        const recentOnline = onlineMessages
          .slice(-15)
          .map((m) => `${m.role === "user" ? "用户" : character.name}: ${m.content}`)
          .join("\n");
        onlineContextStr = `\n【互通模式 - 线上聊天记忆与背景（必须连贯）】：\n以下是你与用户此前在线上聊天的最近记录，请保持记忆连贯：\n${recentOnline}\n`;
      } else {
        onlineContextStr = `\n【架空模式 - 完全独立平行时空】：\n忽略所有线上聊天历史，这是一个独立的平行时空剧本。`;
      }

      const minWords = Math.max(150, Math.floor(wordLimit * 0.75));
      const maxWords = Math.min(2500, Math.floor(wordLimit * 1.25));

      const systemInstruction = `【线下见面剧情模式特别指令】：
你正在与用户进行“线下见面”互动。这是一个纯剧情小说/剧本模式，以环境白描、肢体动作、感官细节与微小停顿为主，对话为辅。
${onlineContextStr}

【字数控制要求】：
请务必将你的每一轮描写控制在约 ${wordLimit} 字左右（范围：${minWords}~${maxWords} 字）。

【文风与写作风格要求（日本电影台词本风格）】：
1. 干净白描，略带文艺感，字里行间有呼吸感与阅读质感。坚决杜绝油腻、霸总、超雄、极端情绪或华丽修辞的堆砌。
2. 句式短，多用具体的名词与动词。形容词极其克制，多来自光线、雨声、温度、空气、距离等真实感官。
3. 不喊叫，不摔东西，不砸墙。情绪不靠形容词，靠动作细节、眼神停顿与微小的心理波澜传递。
4. 让画面静下来，让节奏慢下来。不热闹，不煽情，不装深沉。
5. 对话自然平实，与环境细节及停顿穿插交织，呈现出真实时间流逝的质感。

规则：
1. 严禁单纯输出网聊短句，不要使用任何聊天气泡视角。
2. 动作与心理描写可以用 *...* 或 （...） 包裹，说话内容放在 quotes “...” 中。
3. 表现出 ${character.name} 的独特性格细节（${character.description || ""}）。`;

      const apiMessages = [
        {
          id: "sys-instruct",
          role: "user" as const,
          content: systemInstruction,
          timestamp: Date.now() - 10000,
        },
        ...messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.role === "user" ? `[用户行动/表达]: ${m.content}` : m.content,
            timestamp: m.timestamp,
          })),
      ];

      const cleanCharacter = {
        name: character.name,
        description: character.description,
        systemInstruction: character.systemInstruction + "\n" + systemInstruction,
      };

      const requestParams = {
        messages: apiMessages,
        character: cleanCharacter,
        settings: settings,
        chatMode: "offline" as const,
        replyLength: "long",
        replyCount: 1,
      };

      const response = await apiChat(requestParams);
      const aiText = response.text || "（对方微笑着看着你，没有说话。）";

      const aiMsg: OfflineStoryMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: aiText,
        timestamp: Date.now(),
      };

      const finalStoryList = [...messages, aiMsg];
      saveStory(finalStoryList);

      if (meetMode === "shared" && onSyncToOnlineChat) {
        onSyncToOnlineChat(aiText);
      }
    } catch (err: any) {
      console.error("Offline meet AI continue error:", err);
      setApiError(err.message || "推进失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // Send User Action / Dialogue (Appends message directly without auto-generating AI reply)
  const handleUserSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating || messages.length === 0 || !inputText.trim()) return;

    const userText = inputText.trim();
    setInputText("");
    setApiError(null);

    const userMsg: OfflineStoryMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };

    const updatedMsgs = [...messages, userMsg];
    saveStory(updatedMsgs);
  };

  // Save edited user message
  const handleSaveEdit = () => {
    if (!editingMsg) return;
    const updated = messages.map((m) =>
      m.id === editingMsg.id ? { ...m, content: editingMsg.content } : m
    );
    saveStory(updated);
    setEditingMsg(null);
  };

  // Copy message text
  const handleCopyMsg = (content: string) => {
    try {
      navigator.clipboard.writeText(content);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
    setSelectedMsgForMenu(null);
  };

  // Delete message
  const handleDeleteMsg = (msgId: string) => {
    const updated = messages.filter((m) => m.id !== msgId);
    saveStory(updated);
    setSelectedMsgForMenu(null);
  };

  // Helper to render narrative paragraphs and dialogue in unified card blocks
  const renderStoryContent = (msg: OfflineStoryMessage) => {
    const { id, content, role, timestamp } = msg;

    if (role === "system") {
      return (
        <div key={id} className="text-center py-2 px-4 my-2 text-[#99948E] text-[11px] font-bold">
          {content}
        </div>
      );
    }

    const nameLabel = role === "user" ? "你" : character.name;
    const rawParagraphs = content.split("\n").filter((p) => p.trim());
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div
        key={id}
        className="w-full bg-white rounded-[12px] px-[16px] py-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-stone-100/60 mb-[10px] group relative text-left select-text"
        onTouchStart={() => handleTouchStart(msg)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onMouseDown={() => handleTouchStart(msg)}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setSelectedMsgForMenu(msg);
        }}
      >
        {/* Card Header: Name tag top-left in 11px, bold, #99948E */}
        <div className="flex items-center justify-between w-full mb-[8px]">
          <span className="text-[11px] font-bold text-[#99948E]">
            {nameLabel}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMsgForMenu(msg);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-[#99948E] hover:text-[#1A1A1A] rounded cursor-pointer"
            title={role === "user" ? "操作菜单" : "重roll"}
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>

        {/* Card Body: Narrative (#1A1A1A) vs Dialogue (#4A4A4A), left-aligned */}
        <div className="w-full space-y-[6px]">
          {rawParagraphs.map((para, pIdx) => {
            const parts = para.split(/([“"][^”"]+[”"])/g);

            return (
              <div key={pIdx} className="space-y-[4px] w-full text-left">
                {parts.map((part, partIdx) => {
                  if (!part) return null;
                  let trimmed = part.trim();
                  if (!trimmed) return null;

                  const isDialogue =
                    (trimmed.startsWith("“") && trimmed.endsWith("”")) ||
                    (trimmed.startsWith('"') && trimmed.endsWith('"'));

                  if (isDialogue) {
                    let cleanDialogue = trimmed;
                    if (cleanDialogue.startsWith('"') && cleanDialogue.endsWith('"')) {
                      cleanDialogue = `“${cleanDialogue.slice(1, -1)}”`;
                    }
                    if (!cleanDialogue.startsWith("“")) {
                      cleanDialogue = `“${cleanDialogue}`;
                    }
                    if (!cleanDialogue.endsWith("”")) {
                      cleanDialogue = `${cleanDialogue}”`;
                    }

                    // 对话内容：稍微浅灰色 #4A4A4A，左对齐，15px，行高 1.8
                    return (
                      <div
                        key={partIdx}
                        className="w-full text-left text-[15px] text-[#4A4A4A] leading-[1.8] font-normal my-1 select-text whitespace-pre-wrap"
                      >
                        {cleanDialogue}
                      </div>
                    );
                  }

                  // 动作/旁白描写：深灰色 #1A1A1A，左对齐，15px，行高 1.8
                  const cleanAction = trimmed
                    .replace(/^[*（(【]/, "")
                    .replace(/[*）)】]$/, "")
                    .trim();

                  if (!cleanAction) return null;

                  return (
                    <div
                      key={partIdx}
                      className="w-full text-left text-[15px] text-[#1A1A1A] leading-[1.8] font-normal my-1 select-text whitespace-pre-wrap"
                    >
                      {cleanAction}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Card Footer: Word count & Timestamp (10px, #BFBAB2, right-aligned) */}
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-[#BFBAB2] mt-[8px]">
          <span>{content.length} 字</span>
          <span>·</span>
          <span>{timeFormatted}</span>
        </div>
      </div>
    );
  };

  const KAITI_FONT = '"STKaiti", "KaiTi", "楷体", "STKaiti SC", "DFKai-SB", serif';
  const currentTheme = THEME_STYLES[activeTheme] || THEME_STYLES.warm_grey;

  // Preset CSS snippets for quick selection in Block 3
  const CSS_PRESETS = [
    {
      name: "暖黄复古风",
      code: `.offline-meet-container {\n  background-color: #fbf6e8 !important;\n  color: #3d2e1e !important;\n}\n.offline-story-card {\n  background-color: #fffdf5 !important;\n  border-color: #e8dfcd !important;\n  color: #3d2e1e !important;\n}`,
    },
    {
      name: "深色夜间模式",
      code: `.offline-meet-container {\n  background-color: #121212 !important;\n  color: #e0e0e0 !important;\n}\n.offline-story-card {\n  background-color: #1e1e1e !important;\n  border-color: #2c2c2c !important;\n  color: #e0e0e0 !important;\n}`,
    },
    {
      name: "极简白",
      code: `.offline-meet-container {\n  background-color: #ffffff !important;\n  color: #111111 !important;\n}\n.offline-story-card {\n  background-color: #fafafa !important;\n  border-color: #e5e5e5 !important;\n}`,
    },
  ];

  return (
    <div
      style={{
        fontFamily: KAITI_FONT,
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
      className="offline-meet-container fixed inset-0 z-50 flex flex-col max-w-md mx-auto sm:max-w-md sm:rounded-[32px] overflow-hidden border-none shadow-2xl animate-fade-in transition-colors duration-200"
    >
      {/* Dynamic Custom CSS Injection */}
      {customCss && (
        <style dangerouslySetInnerHTML={{ __html: customCss }} />
      )}

      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-70 bg-[#1A1A1A] text-white text-xs px-4 py-2 rounded-full shadow-lg animate-fade-in flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>已复制到剪贴板</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{ backgroundColor: currentTheme.headerBg }}
        className="h-12 px-4 flex items-center justify-between shrink-0 z-10 border-b border-black/5"
      >
        <button
          type="button"
          onClick={() => {
            if (viewMode === "history_replay") {
              setViewMode("mode_settings");
              setReplayingRecord(null);
            } else if (viewMode === "visual_settings" || viewMode === "mode_settings") {
              setViewMode("chat");
            } else {
              onClose();
            }
          }}
          className="p-1.5 -ml-1 rounded-full hover:bg-black/5 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          title="返回"
          style={{ color: currentTheme.text }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span
          className="font-bold text-[15px] tracking-wide"
          style={{ color: currentTheme.text }}
        >
          {viewMode === "visual_settings"
            ? "视觉设置"
            : viewMode === "mode_settings"
            ? "模式设置"
            : viewMode === "history_replay"
            ? "历史见面回放"
            : "线下见面"}
        </span>

        <div className="flex items-center gap-1">
          {viewMode === "chat" && (
            <>
              {/* 齿轮图标：视觉设置 */}
              <button
                type="button"
                onClick={() => setViewMode("visual_settings")}
                className="p-1.5 rounded-full hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
                title="视觉设置"
                style={{ color: currentTheme.subText }}
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* 三条线图标：模式设置 */}
              <button
                type="button"
                onClick={() => setViewMode("mode_settings")}
                className="p-1.5 -mr-1 rounded-full hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
                title="模式设置"
                style={{ color: currentTheme.subText }}
              >
                <Menu className="w-5 h-5" />
              </button>
            </>
          )}

          {viewMode !== "chat" && (
            <button
              type="button"
              onClick={() => {
                setViewMode("chat");
                setReplayingRecord(null);
              }}
              className="p-1.5 -mr-1 rounded-full hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
              title="完成并返回"
              style={{ color: currentTheme.subText }}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area depending on ViewMode */}
      {viewMode === "visual_settings" ? (
        /* 视觉设置页面 (齿轮图标) */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 font-sans">
          {/* 板块一：视觉主题切换 */}
          <div className="bg-white/80 rounded-2xl p-4 shadow-xs border border-black/5 space-y-3">
            <div className="flex items-center gap-2 border-b border-black/5 pb-2">
              <Palette className="w-4 h-4 text-purple-700" />
              <h3 className="font-bold text-xs text-stone-800">板块一：视觉主题切换</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(THEME_STYLES) as VisualThemeType[]).map((tKey) => {
                const tObj = THEME_STYLES[tKey];
                const isActive = activeTheme === tKey;

                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => {
                      setActiveTheme(tKey);
                      saveAllConfig({ theme: tKey });
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer relative ${
                      isActive
                        ? "border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/30"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">{tObj.name}</span>
                      {isActive && <Check className="w-4 h-4 text-purple-700 shrink-0" />}
                    </div>

                    {/* Color Preview Pills */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-black/10"
                        style={{ backgroundColor: tObj.bg }}
                        title="背景色"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/10"
                        style={{ backgroundColor: tObj.cardBg }}
                        title="卡片色"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/10"
                        style={{ backgroundColor: tObj.text }}
                        title="文字色"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 板块二：界面美化自定义（CSS代码） */}
          <div className="bg-white/80 rounded-2xl p-4 shadow-xs border border-black/5 space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-xs text-stone-800">板块二：界面美化自定义（CSS）</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomCss("");
                  saveAllConfig({ customCss: "" });
                }}
                className="text-[11px] text-stone-500 hover:text-stone-800 font-medium cursor-pointer"
              >
                重置为默认
              </button>
            </div>

            {/* Presets buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-600 block">选择示例 CSS：</label>
              <div className="flex flex-wrap gap-1.5">
                {CSS_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setCustomCss(p.code)}
                    className="text-[10px] bg-stone-100 hover:bg-purple-50 hover:text-purple-700 text-stone-700 px-2.5 py-1 rounded-lg border border-stone-200 transition-all cursor-pointer font-medium"
                  >
                    +{p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* CSS Textarea */}
            <textarea
              rows={5}
              placeholder="/* 在此处输入自定义 CSS 代码，只作用于线下见面界面 */"
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              className="w-full text-[11px] font-mono border border-stone-200 rounded-xl p-3 bg-stone-900 text-emerald-400 outline-none focus:border-purple-600 resize-none"
            />

            {/* Apply & Save Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  saveAllConfig({ customCss });
                  alert("自定义 CSS 样式已应用生效！");
                }}
                className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>应用样式</span>
              </button>
            </div>

            {/* Save CSS Preset with name */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="方案名称（如：暗黑朋克）"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 text-xs border border-stone-200 rounded-xl px-3 py-1.5 bg-white outline-none focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPresetName.trim() || !customCss.trim()) {
                      alert("请输入方案名称并填写 CSS 内容");
                      return;
                    }
                    const newPreset: CustomCssPreset = {
                      id: `preset-${Date.now()}`,
                      name: newPresetName.trim(),
                      css: customCss,
                    };
                    const updatedPresets = [...savedCssPresets, newPreset];
                    setSavedCssPresets(updatedPresets);
                    saveAllConfig({ savedCssPresets: updatedPresets });
                    setNewPresetName("");
                    alert(`样式方案 “${newPreset.name}” 已保存！`);
                  }}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer shrink-0"
                >
                  保存方案
                </button>
              </div>

              {savedCssPresets.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-stone-600 block">已保存方案：</span>
                  <div className="flex flex-wrap gap-1.5">
                    {savedCssPresets.map((sp) => (
                      <div
                        key={sp.id}
                        className="flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-lg text-[10px] text-stone-700 border border-stone-200"
                      >
                        <button
                          type="button"
                          onClick={() => setCustomCss(sp.css)}
                          className="hover:text-purple-700 font-bold cursor-pointer"
                        >
                          {sp.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = savedCssPresets.filter((p) => p.id !== sp.id);
                            setSavedCssPresets(updated);
                            saveAllConfig({ savedCssPresets: updated });
                          }}
                          className="text-stone-400 hover:text-rose-600 ml-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 板块三：叙述视角选择 */}
          <div className="bg-white/80 rounded-2xl p-4 shadow-xs border border-black/5 space-y-3">
            <div className="flex items-center gap-2 border-b border-black/5 pb-2">
              <UserCheck className="w-4 h-4 text-purple-700" />
              <h3 className="font-bold text-xs text-stone-800">板块三：叙述视角选择</h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "first", title: "第一人称", desc: "从角色视角用“我”叙述" },
                { id: "second", title: "第二人称", desc: "直接称呼用户为“你”" },
                { id: "third", title: "第三人称", desc: "上帝视角用“他/她”（默认）" },
              ].map((pOpt) => {
                const isActive = perspective === pOpt.id;

                return (
                  <button
                    key={pOpt.id}
                    type="button"
                    onClick={() => {
                      setPerspective(pOpt.id as PerspectiveType);
                      saveAllConfig({ perspective: pOpt.id as PerspectiveType });
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                      isActive
                        ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">{pOpt.title}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-purple-700 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-stone-500 leading-tight">{pOpt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 板块四：文风选择 */}
          <div className="bg-white/80 rounded-2xl p-4 shadow-xs border border-black/5 space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <div className="flex items-center gap-2">
                <Feather className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-xs text-stone-800">板块四：文风偏好选择</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPerspective("third");
                  setWritingTone("daily_plain");
                  setCustomToneKeywords("");
                  saveAllConfig({
                    perspective: "third",
                    writingTone: "daily_plain",
                    customToneKeywords: "",
                  });
                  alert("已恢复默认视角与文风（第三人称 + 日常白描）");
                }}
                className="text-[11px] text-stone-500 hover:text-purple-700 font-medium cursor-pointer"
              >
                恢复默认
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "daily_plain", name: "日常白描", desc: "句子短，动作具体，干净流畅（默认）" },
                { id: "literary", name: "文艺细腻", desc: "句子稍长，注重氛围与光影细节" },
                { id: "cold_restrained", name: "冷淡克制", desc: "用词少，情绪收着，隐晦真实" },
                { id: "warm_soft", name: "温暖柔和", desc: "语气软，细节暖，温柔包容" },
              ].map((tOpt) => {
                const isActive = writingTone === tOpt.id;

                return (
                  <button
                    key={tOpt.id}
                    type="button"
                    onClick={() => {
                      setWritingTone(tOpt.id as ToneType);
                      saveAllConfig({ writingTone: tOpt.id as ToneType });
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isActive
                        ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">{tOpt.name}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-purple-700 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-stone-500 leading-tight">{tOpt.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Custom Tone Keywords */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-stone-700 block">
                自定义文风关键词 <span className="text-[10px] font-normal text-stone-400">（可选）</span>
              </label>
              <input
                type="text"
                placeholder="如：像日本电影一样安静、带一点幽默感、阴雨天感的沉静..."
                value={customToneKeywords}
                onChange={(e) => setCustomToneKeywords(e.target.value)}
                className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-purple-600"
              />
              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-wrap gap-1">
                  {["像日本电影一样安静", "带一点幽默感", "阴雨天般的沉静"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCustomToneKeywords(tag)}
                      className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-0.5 rounded cursor-pointer"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveAllConfig({ customToneKeywords });
                    alert("文风关键词设置已保存！");
                  }}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                >
                  保存文风
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === "mode_settings" ? (
        /* 模式设置页面 (三条线图标) */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 font-sans">
          {/* 板块一：模式选择 */}
          <div className="bg-white/80 rounded-2xl p-4 shadow-xs border border-black/5 space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-xs text-stone-800">板块一：模式选择</h3>
              </div>
              <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                当前: {meetMode === "shared" ? "互通模式" : "架空模式"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* 互通模式卡片 */}
              <button
                type="button"
                onClick={() => handleSwitchModeWithConfirm("shared")}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  meetMode === "shared"
                    ? "bg-purple-50/90 border-purple-500 ring-2 ring-purple-600/20 shadow-xs"
                    : "bg-white border-stone-200 hover:border-purple-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-purple-700" />
                    🔗 互通模式
                  </span>
                  {meetMode === "shared" && <Check className="w-3.5 h-3.5 text-purple-700" />}
                </div>
                <p className="text-[10.5px] text-stone-500 leading-tight">
                  读取线上聊天历史作为记忆，线下剧情将同步至线上聊天。
                </p>
              </button>

              {/* 架空模式卡片 */}
              <button
                type="button"
                onClick={() => handleSwitchModeWithConfirm("isolated")}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                  meetMode === "isolated"
                    ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-600/20 shadow-xs"
                    : "bg-white border-stone-200 hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1">
                    <Unlink className="w-3.5 h-3.5 text-amber-700" />
                    🌌 架空模式
                  </span>
                  {meetMode === "isolated" && <Check className="w-3.5 h-3.5 text-amber-700" />}
                </div>
                <p className="text-[10.5px] text-stone-500 leading-tight">
                  平行时空小剧场。不读取也不同步线上历史，完全独立。
                </p>
              </button>
            </div>
          </div>

          {/* 板块二：开场设定 */}
          <div className="bg-white/80 rounded-2xl p-4 shadow-xs border border-black/5 space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-xs text-stone-800">板块二：开场设定</h3>
              </div>
              <span className="text-purple-700 font-mono font-bold text-xs">{wordLimit} 字/轮</span>
            </div>

            {/* 字数限制 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-700 block">生成字数上限：</label>
              <input
                type="range"
                min={200}
                max={2000}
                step={50}
                value={wordLimit}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setWordLimit(val);
                  saveAllConfig({ wordLimit: val });
                }}
                className="w-full accent-purple-700 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                {[300, 600, 1000, 1500].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setWordLimit(w);
                      saveAllConfig({ wordLimit: w });
                    }}
                    className={`flex-1 py-1 text-[10px] rounded-lg font-medium border transition-all cursor-pointer ${
                      wordLimit === w
                        ? "bg-purple-700 text-white border-purple-700 font-bold"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {w}字
                  </button>
                ))}
              </div>
            </div>

            {/* 开场细化表单 */}
            <div className="pt-2 border-t border-stone-100 space-y-3">
              {meetMode === "shared" ? (
                /* 互通模式开场设定 */
                <div className="space-y-2.5">
                  <div className="bg-purple-50/70 border border-purple-100 p-2.5 rounded-xl text-[11px] text-purple-900 leading-relaxed">
                    💡 <span className="font-bold">互通模式开场：</span>留空将由 AI 结合线上聊天自动推断。
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block">时间（可选）：</label>
                    <input
                      type="text"
                      placeholder="例：某个周末的下午 / 大雨刚停的傍晚"
                      value={timeSetting}
                      onChange={(e) => {
                        setTimeSetting(e.target.value);
                        saveAllConfig({ timeSetting: e.target.value });
                      }}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block">地点（可选）：</label>
                    <input
                      type="text"
                      placeholder="例：街角旧书店 / 公园湖边长椅"
                      value={locationSetting}
                      onChange={(e) => {
                        setLocationSetting(e.target.value);
                        saveAllConfig({ locationSetting: e.target.value });
                      }}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block">见面原因（可选）：</label>
                    <input
                      type="text"
                      placeholder="例：约好了散步 / 很久没见聊聊"
                      value={reasonSetting}
                      onChange={(e) => {
                        setReasonSetting(e.target.value);
                        saveAllConfig({ reasonSetting: e.target.value });
                      }}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block">氛围关键词（可选）：</label>
                    <input
                      type="text"
                      placeholder="例：安静温情 / 略带尴尬"
                      value={atmosphereSetting}
                      onChange={(e) => {
                        setAtmosphereSetting(e.target.value);
                        saveAllConfig({ atmosphereSetting: e.target.value });
                      }}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-purple-600"
                    />
                  </div>
                </div>
              ) : (
                /* 架空模式开场设定 */
                <div className="space-y-2">
                  <div className="bg-amber-50/70 border border-amber-100 p-2.5 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                    🌌 <span className="font-bold">架空模式背景：</span>自定义剧本或留空由 AI 随机构思。
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700 block">架空背景描述：</label>
                    <textarea
                      rows={3}
                      placeholder="例如：穿越到古代，在医馆遇上神秘剑客；或雨夜太空港酒吧..."
                      value={isolatedBackground}
                      onChange={(e) => {
                        setIsolatedBackground(e.target.value);
                        saveAllConfig({ isolatedBackground: e.target.value });
                      }}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-amber-600 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* 应用开场设定并创建新见面按钮 */}
              <button
                type="button"
                onClick={handleApplySetupWithConfirm}
                className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>应用新设定并创建新见面</span>
              </button>
            </div>
          </div>

          {/* 板块三：历史见面记录 */}
          <div className="bg-white/80 rounded-2xl p-4 shadow-xs border border-black/5 space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-700" />
                <h3 className="font-bold text-xs text-stone-800">板块三：历史见面记录</h3>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    archiveCurrentSession(messages, meetMode);
                    alert("当前见面会话已存档入历史记录！");
                  }}
                  className="text-[11px] text-purple-700 hover:text-purple-900 font-medium cursor-pointer"
                >
                  + 存档当前会话
                </button>
              )}
            </div>

            {historyRecords.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 space-y-1">
                <Clock className="w-8 h-8 text-stone-300 mx-auto opacity-50" />
                <p>暂无历史见面记录</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {historyRecords.map((rec) => {
                  const dateStr = new Date(rec.timestamp).toLocaleString([], {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={rec.id}
                      className="p-3 bg-white rounded-xl border border-stone-200 hover:border-purple-300 transition-all flex items-start justify-between gap-2 text-left"
                    >
                      <div
                        onClick={() => {
                          setReplayingRecord(rec);
                          setViewMode("history_replay");
                        }}
                        className="flex-1 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center gap-2 text-[11px] font-bold text-stone-800">
                          <span>{dateStr}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              rec.meetMode === "shared"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {rec.meetMode === "shared" ? "互通模式" : "架空模式"}
                          </span>
                          <span className="text-stone-400 font-normal">
                            {rec.totalTurns} 轮
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                          {rec.summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setReplayingRecord(rec);
                            setViewMode("history_replay");
                          }}
                          className="p-1 text-purple-700 hover:bg-purple-50 rounded cursor-pointer"
                          title="查看回放"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("确定删除该条历史记录吗？")) {
                              const updated = historyRecords.filter((h) => h.id !== rec.id);
                              setHistoryRecords(updated);
                              localStorage.setItem(historyKey, JSON.stringify(updated));
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="删除记录"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : viewMode === "history_replay" && replayingRecord ? (
        /* History Replay Mode View */
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 font-sans">
          <div className="p-3 bg-stone-100 border border-stone-200 rounded-2xl text-xs space-y-1 text-stone-700">
            <div className="flex items-center justify-between font-bold">
              <span>见面时间：{new Date(replayingRecord.timestamp).toLocaleString()}</span>
              <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded text-[10px]">
                {replayingRecord.meetMode === "shared" ? "互通模式" : "架空模式"}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              只读回放模式 · 共 {replayingRecord.totalTurns} 轮描写
            </p>
          </div>

          <div className="space-y-[12px]">
            {replayingRecord.messages.map((msg) => (
              <React.Fragment key={msg.id}>{renderStoryContent(msg)}</React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        /* Main Offline Meet Story View */
        <>
          {/* Sub Header / Status Bar */}
          <div
            style={{ color: currentTheme.subText }}
            className="px-4 py-1 flex items-center justify-between text-[11px] border-none"
          >
            <div className="flex items-center gap-1.5">
              <span>{meetMode === "shared" ? "🔗 互通模式" : "🌌 架空模式"}</span>
              <span>· 字数约 {wordLimit} 字</span>
              <span>
                · {perspective === "first" ? "第一人称" : perspective === "second" ? "第二人称" : "第三人称"}
              </span>
            </div>
            <button
              onClick={() => setShowSetupModal(true)}
              className="hover:underline font-bold text-[11px] cursor-pointer"
              style={{ color: currentTheme.subText }}
            >
              重置设定
            </button>
          </div>

          {/* Story Content Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-3 space-y-[12px] transition-colors duration-200"
            style={{ backgroundColor: currentTheme.bg }}
          >
            {messages.map((msg) => (
              <React.Fragment key={msg.id}>{renderStoryContent(msg)}</React.Fragment>
            ))}

            {isGenerating && (
              <div
                className="py-2 flex items-center gap-2 text-[13px] animate-pulse"
                style={{ color: currentTheme.subText }}
              >
                <Sparkles className="w-4 h-4 animate-spin" style={{ color: currentTheme.text }} />
                <span>
                  {messages.length === 0
                    ? `${character.name} 正在撰写开场场景...`
                    : `${character.name} 正在撰写中...`}
                </span>
              </div>
            )}

            {apiError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center">
                {apiError}
              </div>
            )}
          </div>

          {/* Bottom Input Box Area */}
          <div className="p-3 border-none shadow-none shrink-0" style={{ backgroundColor: currentTheme.bg }}>
            <form onSubmit={handleUserSend} className="flex items-center gap-2">
              <input
                type="text"
                style={{ fontFamily: KAITI_FONT, color: currentTheme.text, backgroundColor: currentTheme.cardBg }}
                placeholder={
                  messages.length === 0
                    ? "开场生成后即可输入..."
                    : "输入你的行动或表达..."
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isGenerating || messages.length === 0}
                className="flex-1 h-[44px] border border-black/10 rounded-[12px] px-[14px] py-[10px] text-[14px] placeholder-[#99948E] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />

              <div className="flex items-center gap-[6px] shrink-0">
                {/* 发送按钮 (纸飞机图标) */}
                <button
                  type="submit"
                  disabled={isGenerating || messages.length === 0 || !inputText.trim()}
                  className="w-[36px] h-[36px] rounded-full bg-[#1A1A1A] hover:bg-black text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:bg-[#E5E2DC] disabled:text-[#99948E] disabled:cursor-not-allowed disabled:transform-none"
                  title="发送消息"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>

                {/* AI推进按钮 (✨图标) */}
                <button
                  type="button"
                  onClick={handleContinueStory}
                  disabled={isGenerating || messages.length === 0}
                  className="w-[36px] h-[36px] rounded-full bg-[#1A1A1A] hover:bg-black text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:bg-[#E5E2DC] disabled:text-[#99948E] disabled:cursor-not-allowed disabled:transform-none"
                  title={isGenerating ? "AI 正在生成中..." : "AI 推进剧情"}
                >
                  {isGenerating ? (
                    <Sparkles className="w-4 h-4 text-[#99948E] animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Long Press Context Menu Modal */}
      {selectedMsgForMenu && (
        <div
          className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-fade-in"
          onClick={() => setSelectedMsgForMenu(null)}
        >
          <div
            className="bg-white border border-stone-200 rounded-3xl p-4 w-full max-w-xs shadow-2xl space-y-2 font-sans text-stone-800 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="text-xs font-bold text-stone-500">
                {selectedMsgForMenu.role === "user" ? "用户描写菜单" : "角色描写菜单"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMsgForMenu(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedMsgForMenu.role === "user" ? (
              <div className="space-y-1">
                {/* 1. 编辑 */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingMsg({
                      id: selectedMsgForMenu.id,
                      content: selectedMsgForMenu.content,
                    });
                    setSelectedMsgForMenu(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-xs font-bold text-stone-700 hover:bg-stone-50 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-purple-600" />
                  <span>编辑本条描写</span>
                </button>

                {/* 2. 复制 */}
                <button
                  type="button"
                  onClick={() => handleCopyMsg(selectedMsgForMenu.content)}
                  className="w-full flex items-center gap-3 p-3 text-xs font-bold text-stone-700 hover:bg-stone-50 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-blue-600" />
                  <span>复制内容</span>
                </button>

                {/* 3. 删除 */}
                <button
                  type="button"
                  onClick={() => handleDeleteMsg(selectedMsgForMenu.id)}
                  className="w-full flex items-center gap-3 p-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>删除本条描写</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* 角色描写菜单选项: 仅保留 重roll */}
                <button
                  type="button"
                  onClick={() => {
                    const msgId = selectedMsgForMenu.id;
                    setSelectedMsgForMenu(null);
                    handleRerollMessage(msgId);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-xs font-bold text-purple-800 hover:bg-purple-50 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                  <div>
                    <div>重roll（重新生成本段描写）</div>
                    <div className="text-[10px] font-normal text-stone-400">
                      替换当前这一段描述，重新构思AI反应
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Message Modal */}
      {editingMsg && (
        <div className="fixed inset-0 z-70 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3 font-sans text-stone-800">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="font-bold text-sm text-stone-800 flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-purple-600" />
                编辑你的描写与表达
              </span>
              <button
                type="button"
                onClick={() => setEditingMsg(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={4}
              value={editingMsg.content}
              onChange={(e) => setEditingMsg({ ...editingMsg, content: e.target.value })}
              className="w-full text-xs border border-stone-200 rounded-2xl p-3 bg-stone-50 outline-none focus:border-purple-600 resize-none font-sans"
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingMsg(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-60 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-[#FAF8F5] border border-[#E8E2D7] rounded-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 font-sans text-[#2B2723]">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#EFECE5]">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-base">线下见面 · 开场设定</h3>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="p-1 text-stone-400 hover:text-stone-800 rounded-full hover:bg-stone-200/50 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* 1. 模式选择 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800 block">
                1. 模式选择
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* 互通模式 */}
                <div
                  onClick={() => setMeetMode("shared")}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                    meetMode === "shared"
                      ? "bg-purple-50/90 border-purple-500 ring-2 ring-purple-600/20"
                      : "bg-white border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5 text-purple-700" />
                      🔗 互通模式
                    </span>
                    {meetMode === "shared" && <Check className="w-3.5 h-3.5 text-purple-700" />}
                  </div>
                  <p className="text-[10.5px] text-stone-500 leading-tight">
                    读取线上聊天历史作为记忆，线下剧情将同步至线上聊天。
                  </p>
                </div>

                {/* 架空模式 */}
                <div
                  onClick={() => setMeetMode("isolated")}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                    meetMode === "isolated"
                      ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-600/20"
                      : "bg-white border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1">
                      <Unlink className="w-3.5 h-3.5 text-amber-700" />
                      🌌 架空模式
                    </span>
                    {meetMode === "isolated" && <Check className="w-3.5 h-3.5 text-amber-700" />}
                  </div>
                  <p className="text-[10.5px] text-stone-500 leading-tight">
                    平行时空小剧场。不读取也不同步线上历史，完全独立。
                  </p>
                </div>
              </div>
            </div>

            {/* 2. 字数限制 */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span>2. 生成字数限制</span>
                <span className="text-purple-700 font-mono font-bold">{wordLimit} 字/轮</span>
              </div>
              <input
                type="range"
                min={200}
                max={2000}
                step={50}
                value={wordLimit}
                onChange={(e) => setWordLimit(Number(e.target.value))}
                className="w-full accent-purple-700 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                {[300, 600, 1000, 1500].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWordLimit(w)}
                    className={`flex-1 py-1 text-[11px] rounded-lg font-medium border transition-all cursor-pointer ${
                      wordLimit === w
                        ? "bg-purple-700 text-white border-purple-700 font-bold"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {w}字 {w === 600 ? "(默认)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 模式对应的开场设定表单 */}
            <div className="space-y-3 pt-2 border-t border-[#EFECE5]">
              {meetMode === "shared" ? (
                /* 互通模式开场设定 */
                <div className="space-y-3">
                  <div className="bg-purple-50/70 border border-purple-100 p-2.5 rounded-2xl text-[11px] text-purple-900 leading-relaxed">
                    💡 <span className="font-bold">开场设定为可选（非必填）。</span>若留空直接点击“开始见面”，系统将自动结合线上聊天记录和角色人设，推断出最自然的见面场景。
                  </div>

                  {/* 时间 */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                      <span>时间</span>
                      <span className="text-[10px] font-normal text-stone-400">（可选）</span>
                    </label>
                    <input
                      type="text"
                      placeholder="例：某个周末的下午 / 大雨刚停的傍晚"
                      value={timeSetting}
                      onChange={(e) => setTimeSetting(e.target.value)}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-purple-600"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {["某个周末下午", "周五下班后", "大雨刚停的傍晚"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setTimeSetting(tag)}
                          className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-0.5 rounded-md cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 地点 */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                      <span>地点</span>
                      <span className="text-[10px] font-normal text-stone-400">（可选）</span>
                    </label>
                    <input
                      type="text"
                      placeholder="例：街角那家旧书店 / 公园湖边的长椅"
                      value={locationSetting}
                      onChange={(e) => setLocationSetting(e.target.value)}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-purple-600"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {["街角旧书店", "公园湖边长椅", "便利店门口"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setLocationSetting(tag)}
                          className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-0.5 rounded-md cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 见面原因 */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                      <span>见面原因</span>
                      <span className="text-[10px] font-normal text-stone-400">（可选）</span>
                    </label>
                    <input
                      type="text"
                      placeholder="例：约好了散步 / 很久没见约着聊聊"
                      value={reasonSetting}
                      onChange={(e) => setReasonSetting(e.target.value)}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-purple-600"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {["约好了散步", "很久没见聊聊", "有东西要给我"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setReasonSetting(tag)}
                          className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-0.5 rounded-md cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 氛围关键词 */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                      <span>氛围关键词</span>
                      <span className="text-[10px] font-normal text-stone-400">（可选）</span>
                    </label>
                    <input
                      type="text"
                      placeholder="例：安静的 / 有点尴尬的 / 久别重逢的"
                      value={atmosphereSetting}
                      onChange={(e) => setAtmosphereSetting(e.target.value)}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-purple-600"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {["安静温情", "略带尴尬", "久别重逢"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setAtmosphereSetting(tag)}
                          className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-0.5 rounded-md cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* 架空模式开场设定 */
                <div className="space-y-2">
                  <div className="bg-amber-50/70 border border-amber-100 p-2.5 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
                    🌌 <span className="font-bold">架空模式两种玩法：</span><br />
                    1. 填写下方背景，AI 将按照你的剧本展开。<br />
                    2. 留空直接开始，AI 将依据角色人设自主随机生成剧情走向。
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">
                      架空背景与场景描述 <span className="text-[10px] font-normal text-stone-400">（可选）</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="例如：穿越到古代，在医馆里遇到一个神秘剑客；或者在未来太空港雨夜酒馆..."
                      value={isolatedBackground}
                      onChange={(e) => setIsolatedBackground(e.target.value)}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-amber-600 resize-none"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {[
                        "穿越古代在医馆相遇",
                        "未来太空港雨夜酒馆",
                        "魔法学院旧图书禁书区",
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setIsolatedBackground(tag)}
                          className="text-[10px] bg-amber-100/60 hover:bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartMeeting}
                className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                <span>开始见面（生成开场描写）</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
