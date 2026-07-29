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
  User,
  Users,
  Heart,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Character, AppSettings, Message } from "../types";
import { apiChat } from "../lib/api";
import { storeMemory } from "../lib/vectorMemory";
import { getPrioritizedMemories } from "../lib/memoryPriority";

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

export interface OfflineMeetCardInfo {
  time: string;
  location: string;
  memoryId: string;
}

interface OfflineMeetViewProps {
  character: Character;
  allCharacters?: Character[];
  settings: AppSettings;
  onlineMessages?: Message[];
  loreList?: any[];
  onSyncToOnlineChat?: (storySummary: string, cardInfo?: OfflineMeetCardInfo) => void;
  onClose: () => void;
  forcedMode?: "shared" | "isolated";
}

// Helper to parse narrative paragraphs vs dialogue lines cleanly
function parseStoryParagraphs(content: string): { text: string; isDialogue: boolean }[] {
  if (!content) return [];

  const rawBlocks = content.split(/\n\s*\n/);
  const result: { text: string; isDialogue: boolean }[] = [];

  rawBlocks.forEach((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    let currentNarrativeBuffer: string[] = [];

    lines.forEach((line) => {
      const isDialogue = (line.includes("“") && line.includes("”")) || 
                         (line.includes('"') && line.includes('"')) || 
                         (line.includes("*“") && line.includes("”*"));

      if (isDialogue) {
        if (currentNarrativeBuffer.length > 0) {
          result.push({
            text: currentNarrativeBuffer.join(""),
            isDialogue: false,
          });
          currentNarrativeBuffer = [];
        }
        result.push({
          text: line,
          isDialogue: true,
        });
      } else {
        currentNarrativeBuffer.push(line);
      }
    });

    if (currentNarrativeBuffer.length > 0) {
      result.push({
        text: currentNarrativeBuffer.join(""),
        isDialogue: false,
      });
      currentNarrativeBuffer = [];
    }
  });

  return result;
}

export interface InteractiveKeyPoint {
  conflictType: string;
  description: string;
  options: string[];
}

export function parseInteractiveKeyPoint(rawText: string): {
  cleanStoryText: string;
  keyPoint: null;
} {
  if (!rawText) return { cleanStoryText: "", keyPoint: null };

  let cleanStoryText = rawText;
  const blockHeaderRegex = /【(?:互动)?(?:关键点|抉择焦点|焦点|分支选项|选项)】/i;
  const blockIndex = cleanStoryText.search(blockHeaderRegex);

  if (blockIndex !== -1) {
    cleanStoryText = cleanStoryText.substring(0, blockIndex).trim();
  }

  return {
    cleanStoryText: cleanStoryText || rawText,
    keyPoint: null,
  };
}

export const OfflineMeetView: React.FC<OfflineMeetViewProps> = ({
  character,
  allCharacters = [],
  settings,
  onlineMessages = [],
  loreList = [],
  onSyncToOnlineChat,
  onClose,
  forcedMode,
}) => {
  const [messages, setMessages] = useState<OfflineStoryMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isInputZoomed, setIsInputZoomed] = useState<boolean>(false);
  const [isOptionsExpanded, setIsOptionsExpanded] = useState<boolean>(false);

  // View Mode: 'chat' | 'settings_view' | 'history_replay'
  const [viewMode, setViewMode] = useState<"chat" | "settings_view" | "history_replay">("chat");

  // Context menu & action states
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState<OfflineStoryMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const [copyToast, setCopyToast] = useState<boolean>(false);

  // Core settings states
  const [wordLimit, setWordLimit] = useState<number>(600);
  const [meetMode, setMeetMode] = useState<MeetModeType>(forcedMode || "shared");
  const [showSetupModal, setShowSetupModal] = useState<boolean>(true);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasSavedSetup, setHasSavedSetup] = useState<boolean>(false);

  // Plot Mode state ("single" | "multi") and selected multi character IDs
  const [plotMode, setPlotMode] = useState<"single" | "multi">("single");
  const [selectedMultiCharIds, setSelectedMultiCharIds] = useState<string[]>([]);

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

  // Helper to filter characters associated with the active character
  const getAssociatedCharacters = (): Character[] => {
    if (!allCharacters || allCharacters.length === 0) return [];
    return allCharacters.filter((c) => {
      if (c.id === character.id) return false;
      const isAssoc1 = character.associatedCharacterIds?.includes(c.id);
      const isAssoc2 = c.associatedCharacterIds?.includes(character.id);
      const hasRel1 = !!character.associatedRelations?.[c.id];
      const hasRel2 = !!c.associatedRelations?.[character.id];
      const isSub = c.parentCharacterId === character.id || character.parentCharacterId === c.id;
      return isAssoc1 || isAssoc2 || hasRel1 || hasRel2 || isSub;
    });
  };

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
        if (parsedCfg.plotMode) setPlotMode(parsedCfg.plotMode);
        if (Array.isArray(parsedCfg.selectedMultiCharIds)) setSelectedMultiCharIds(parsedCfg.selectedMultiCharIds);
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
      setHasSavedSetup(false);
    } else {
      setShowSetupModal(false);
      setHasSavedSetup(true);
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
    plotMode: "single" | "multi";
    selectedMultiCharIds: string[];
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
    const nextPlot = updated.plotMode !== undefined ? updated.plotMode : plotMode;
    const nextMultiChars = updated.selectedMultiCharIds !== undefined ? updated.selectedMultiCharIds : selectedMultiCharIds;
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
          plotMode: nextPlot,
          selectedMultiCharIds: nextMultiChars,
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
    try {
      localStorage.setItem(historyKey, JSON.stringify(updatedList));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };

  // Helper to validate and retrieve all mandatory data sources and settings
  const validateAndGetMandatoryDataSources = (currentMsgs: OfflineStoryMessage[]) => {
    // 1. 角色人设（性格、说话风格、背景）
    const charName = character?.name || "";
    const charPersonaParts = [
      character?.description ? `【概要/背景】: ${character.description}` : "",
      character?.personality ? `【性格特征】: ${character.personality}` : "",
      character?.background ? `【生平背景】: ${character.background}` : "",
      character?.systemInstruction ? `【人设/系统指令】: ${character.systemInstruction}` : "",
      character?.persona ? `【详细人设】: ${character.persona}` : "",
    ].filter((p) => p && typeof p === "string" && p.trim().length > 0);

    let multiPersonaStr = "";
    if (plotMode === "multi") {
      const assocList = getAssociatedCharacters();
      const selectedMultiChars = assocList.filter((c) => selectedMultiCharIds.includes(c.id));
      if (selectedMultiChars.length > 0) {
        multiPersonaStr = selectedMultiChars.map((sc) => {
          const parts = [
            sc.description ? `概要: ${sc.description}` : "",
            sc.personality ? `性格: ${sc.personality}` : "",
            sc.background ? `背景: ${sc.background}` : "",
          ].filter(Boolean).join("；");
          return `· 配角 [${sc.name}]: ${parts || "已出场配合互动"}`;
        }).join("\n");
      }
    }

    const charPersonaText = charPersonaParts.join("\n") + (multiPersonaStr ? `\n\n【出场配角人设】:\n${multiPersonaStr}` : "");
    const isCharValid = Boolean(charName.trim() && charPersonaParts.length > 0);

    // 2. 用户绑定的用户设定（用户人设）
    let userPersonaName = settings?.userPersonaName || "";
    let userPersonaDesc = settings?.userPersonaDescription || "";

    if (character?.userPersonaId) {
      try {
        const stored = localStorage.getItem("mobile_ai_user_personas");
        if (stored) {
          const personas = JSON.parse(stored);
          const bound = personas.find((p: any) => p.id === character.userPersonaId);
          if (bound) {
            userPersonaName = bound.name || userPersonaName;
            userPersonaDesc = bound.description || userPersonaDesc;
          }
        }
      } catch (e) {}
    }

    if (!userPersonaName || !userPersonaDesc) {
      try {
        const activePersonaStr = localStorage.getItem("mobile_ai_active_user_persona");
        if (activePersonaStr) {
          const activePersona = JSON.parse(activePersonaStr);
          if (activePersona) {
            userPersonaName = userPersonaName || activePersona.name;
            userPersonaDesc = userPersonaDesc || activePersona.description;
          }
        }
      } catch (e) {}
    }

    if (!userPersonaName && !userPersonaDesc) {
      userPersonaName = "用户";
      userPersonaDesc = "在现实中与角色相遇并交互的对话主角。";
    }

    const isUserValid = Boolean(userPersonaName.trim() && userPersonaDesc.trim());

    // 3. 剧场世界设定（用户自定义的世界背景 / 世界书）
    let worldBookText = "";
    try {
      let rawLores: any[] = (loreList && loreList.length > 0) ? loreList : (character?.lores || []);
      if (!rawLores || rawLores.length === 0) {
        const storedLoreStr = localStorage.getItem("mobile_ai_lore");
        if (storedLoreStr) {
          rawLores = JSON.parse(storedLoreStr);
        }
      }

      if (rawLores && Array.isArray(rawLores) && rawLores.length > 0) {
        const activeLores = rawLores.filter((l: any) => {
          if (l.enabled === false) return false;
          if (l.characterIds && Array.isArray(l.characterIds) && l.characterIds.length > 0) {
            if (!l.characterIds.includes(character.id)) return false;
          }
          return true;
        });

        if (activeLores.length > 0) {
          worldBookText = activeLores
            .map((l: any) => `- 【${l.title || "设定条目"}】: ${l.content || ""}`)
            .join("\n");
        }
      }
    } catch (e) {}

    if (!worldBookText) {
      if (meetMode === "isolated" && isolatedBackground.trim()) {
        worldBookText = `- 【架空剧场世界背景】: ${isolatedBackground.trim()}`;
      } else if (timeSetting.trim() || locationSetting.trim() || reasonSetting.trim() || atmosphereSetting.trim()) {
        worldBookText = `- 【共享剧场世界情境】: 时间「${timeSetting || "未设定"}」，地点「${locationSetting || "未设定"}」，缘由「${reasonSetting || "未设定"}」，氛围「${atmosphereSetting || "未设定"}」`;
      } else {
        worldBookText = "（剧场世界设定：暂未挂载特殊的专属世界观设定条目）";
      }
    }
    const isWorldBookValid = Boolean(worldBookText.trim());

    // 4. 字数范围（用户设定的最小值和最大值）
    const minWords = Math.max(150, Math.floor((wordLimit || 600) * 0.75));
    const maxWords = Math.min(2500, Math.floor((wordLimit || 600) * 1.25));
    const isWordCountValid = Boolean(wordLimit && wordLimit > 0 && minWords > 0 && maxWords >= minWords);

    // 5. 叙述视角（第一人称/第二人称/第三人称）
    const isPerspectiveValid = Boolean(perspective && ["first", "second", "third"].includes(perspective));

    // 6. 文风偏好（日常白描/文艺细腻/冷淡克制/温暖柔和）
    const isToneValid = Boolean(writingTone && ["daily_plain", "literary", "cold_restrained", "warm_soft"].includes(writingTone));

    // 7. 记忆库（剧情记忆 + 核心记忆 - 严格遵循核心记忆优先级规则）
    let memoryText = "";
    let isMemoryValid = false;
    try {
      const prioResult = getPrioritizedMemories(character.id);
      memoryText = prioResult.formattedPromptText;
      isMemoryValid = Boolean(memoryText && memoryText.trim().length > 0);
    } catch (e) {
      memoryText = "（角色记忆库：读取异常）";
      isMemoryValid = true;
    }

    // 8. 当前上下文（最近 5 轮对话）
    let contextText = "";
    if (currentMsgs && currentMsgs.length > 0) {
      const recent = currentMsgs.slice(-10); // 10 messages = 5 rounds
      contextText = recent
        .map((m) => `${m.role === "user" ? userPersonaName : (m.role === "assistant" ? charName : "旁白")}: ${m.content}`)
        .join("\n");
    } else if (onlineMessages && onlineMessages.length > 0) {
      const recent = onlineMessages.slice(-10);
      contextText = recent
        .map((m) => `${m.role === "user" ? userPersonaName : charName}: ${m.content}`)
        .join("\n");
    } else {
      contextText = "（线下见面：第一段初始场景沟通）";
    }
    const isContextValid = Boolean(contextText.trim());

    const isValid =
      isCharValid &&
      isUserValid &&
      isWorldBookValid &&
      isWordCountValid &&
      isPerspectiveValid &&
      isToneValid &&
      isMemoryValid &&
      isContextValid;

    return {
      isValid,
      charName,
      charPersonaText,
      userPersonaName,
      userPersonaDesc,
      worldBookText,
      minWords,
      maxWords,
      wordLimit,
      perspective,
      writingTone,
      memoryText,
      contextText,
    };
  };

  // Helper to generate dynamic style prompt instructions based on user settings
  const getPromptStyleInstructions = (currentMsgs: OfflineStoryMessage[] = messages) => {
    const ds = validateAndGetMandatoryDataSources(currentMsgs);
    const currentUserName = ds.userPersonaName;
    const assocList = getAssociatedCharacters();
    const selectedMultiChars = plotMode === "multi" ? assocList.filter((c) => selectedMultiCharIds.includes(c.id)) : [];

    const persLabel =
      perspective === "first"
        ? "第一人称（“我”）"
        : perspective === "second"
        ? "第二人称（“你”）"
        : "第三人称（“他/她”及角色姓名）";

    let toneLabel = "";
    if (writingTone === "literary") {
      toneLabel = "文艺细腻";
    } else if (writingTone === "cold_restrained") {
      toneLabel = "冷淡克制";
    } else if (writingTone === "warm_soft") {
      toneLabel = "温暖柔和";
    } else {
      toneLabel = "日常白描";
    }

    const mandatoryDataSourcesBlock = `
【线下见面 8 大强制读取数据源（剧情生成绝对依凭）】：
1. 剧场世界设定（用户自定义的世界背景/世界书）：
${ds.worldBookText}

2. 字数范围（用户设定的最小值和最大值）：
   - 目标字数: 约 ${ds.wordLimit} 字（严格限制范围: ${ds.minWords} ~ ${ds.maxWords} 字）

3. 叙述视角（第一人称/第二人称/第三人称）：
   - 设定视角: ${persLabel}

4. 文风偏好（日常白描/文艺细腻/冷淡克制/温暖柔和）：
   - 设定文风: ${toneLabel}

5. 角色人设（性格、说话风格、背景）：
   - 主角姓名: ${ds.charName}
   - 人设细节:
${ds.charPersonaText}

6. 用户绑定的用户设定（用户人设）：
   - 身份/昵称: ${ds.userPersonaName}
   - 人设描述: ${ds.userPersonaDesc}

7. 记忆库（剧情记忆 + 核心记忆 - 遵守核心记忆优先级规则）：
${ds.memoryText}

8. 当前上下文（最近 5 轮对话）：
${ds.contextText}

【剧情描写自然生成绝对法则】：
- 你的剧情描写与角色台词必须全面融合上述 8 大数据源，以极其自然流畅、有画面感且符合角色性格的沉浸式笔触展开。
- 【绝对严禁】：严禁输出任何互动选项、分支菜单、选项 Tag 或【互动关键点】区块！完全不要生成选项。
- 剧情结尾自然停留在当下的互动场景，由用户在输入框中自定义输入对话或动作来推进后续剧情。
`;

    let perspectiveInstruction = "";
    if (plotMode === "multi") {
      if (perspective === "second") {
        perspectiveInstruction = `【叙述视角绝对强制约束 - 第二人称】：
- 你必须严格以第二人称（“你”和角色姓名）进行全篇叙述。
- 角色必须直接称呼用户为“你”，角色自称使用姓名。
- 【绝对铁律】：视角必须严格保持一致，绝对不受用户输入内容影响！即便用户在对话中自称“我”或称呼你为“你”，你的描写叙述部分必须始终坚持使用角色姓名和“你”，绝不妥协！`;
      } else {
        perspectiveInstruction = `【叙述视角绝对强制约束 - 第三人称】：
- 你必须严格以第三人称（“他/她”和各自姓名）进行全篇叙述。
- 场景中所有角色（包括用户 ${currentUserName}）的所有动作、神态、心理描写必须统一使用各自的姓名或“他/她”。
- 【绝对铁律】：视角必须严格保持一致，绝对不受用户输入内容影响！即便用户在消息中使用了“我”、“你”或第一人称，你的剧情描写文字仍必须严格按照第三人称叙述，绝对不准切换视角或称呼！`;
      }
    } else {
      if (perspective === "first") {
        perspectiveInstruction = `【叙述视角绝对强制约束 - 第一人称】：
- 从角色 ${character.name} 的自身视角出发，使用第一人称（“我”）进行心理活动与动作描写。
- 【绝对铁律】：视角必须严格保持一致，绝对不受用户输入内容影响！全程维持第一人称“我”视角！`;
      } else if (perspective === "second") {
        perspectiveInstruction = `【叙述视角绝对强制约束 - 第二人称】：
- 你必须严格以第二人称（“你”）进行全篇叙述。角色使用角色名，直接称呼用户为“你”。
- 【绝对铁律】：视角必须严格保持一致，绝对不受用户输入内容影响！即使用户在输入中自称“我”，你在描写叙述中也必须且只能称呼用户为“你”，严格保持视角高度一致！`;
      } else {
        perspectiveInstruction = `【叙述视角绝对强制约束 - 第三人称】：
- 你必须严格以第三人称（“他/她”及角色名）来叙述角色的姿态、动作与心理。
- 严禁出现“我”、“你”等第一或第二人称的描述性文字。
- 【绝对铁律】：视角必须严格保持一致，绝对不受用户输入内容影响！即使当前用户在输入中使用了“我”或“你”，你也必须严格坚持第三人称叙述，绝不妥协，不切换视角！`;
      }
    }

    const wordCountInstruction = `
【字数严格控制规则 (绝对强制执行)】：
- 本段剧情描写的输出总字数必须【严格符合设定的字数要求】：最小 ${ds.minWords} 字，最大 ${ds.maxWords} 字（目标约 ${ds.wordLimit} 字）。
- 【绝对铁律】：必须严格符合字数要求，绝对不得低于下限 ${ds.minWords} 字，也绝对不得超过上限 ${ds.maxWords} 字！
`;

    let toneInstruction = "";
    if (writingTone === "literary") {
      toneInstruction = "【文风偏好绝对要求 - 文艺细腻】：句子稍长，极其注重氛围感与感官描写（光线、温度、雨声、微风），文笔优雅有呼吸感。绝对纯粹，不混用其他风格！";
    } else if (writingTone === "cold_restrained") {
      toneInstruction = "【文风偏好绝对要求 - 冷淡克制】：用词极少，语气收敛克制，不滥用修辞，依靠极少的眼神微动作与微小停顿传递情感。绝对纯粹，不混用其他风格！";
    } else if (writingTone === "warm_soft") {
      toneInstruction = "【文风偏好绝对要求 - 温暖柔和】：语气非常软，细节温馨细腻，充满关照与陪伴感，让人感觉被包容。绝对纯粹，不混用其他风格！";
    } else {
      toneInstruction = "【文风偏好绝对要求 - 日常白描】：句子短，动作具体，干净自然，呈现生活原本的节奏（日本电影台词本风格）。绝对纯粹，不混用其他风格！";
    }

    const customKwStr = customToneKeywords.trim()
      ? `\n【用户自定义文风要求】：${customToneKeywords.trim()}`
      : "";

    const formattingInstruction = `
【文本换行与格式排版规则 (绝对强制执行)】：
1. 叙述性内容（动作描写、环境烘托、肢体细节、心理活动、眼神交汇等）必须按自然饱满的段落排列，绝对禁止因句号、逗号、问号、感叹号等任何标点符号而强制换行或随手回车！
2. 只有在以下 3 种情况才允许换行/分段：
   ① 对话内容单独成行（例如：*“你来了。”* 必须独立成行，前后换行）。
   ② 一段完整的叙述段落自然结束后的分段（不准把一句话切碎）。
   ③ 场景切换或时间跳跃。
3. 所有的“对话内容”必须单独成行，并使用 *斜体* 显示（例如：*“你来了。”*）。
`;

    let multiRules = "";
    if (plotMode === "multi" && selectedMultiChars.length > 0) {
      multiRules = `
【线下见面多人模式核心规则（极其重要）】：
1. 参演的其他角色包括：${selectedMultiChars.map((c) => c.name).join("、")}。
2. 在当前的对话和动作场景中，请合理地将这些角色带入剧情，描述他们的站位、眼神、小动作以及自然的插话。
3. 严格遵循各参演角色的性格设定（${selectedMultiChars.map((c) => `${c.name}: ${c.description || "日常性格"}`).join("；")}）。
`;
    }

    return `${mandatoryDataSourcesBlock}\n${perspectiveInstruction}\n${wordCountInstruction}\n${toneInstruction}${customKwStr}\n${formattingInstruction}${multiRules}`;
  };

  // Helper to build progression prompt logic reading recent 5 online messages and current user input
  const getProgressionInstructions = (lastUserContent: string = "") => {
    let onlineContextStr = "";
    if (meetMode === "shared" && onlineMessages && onlineMessages.length > 0) {
      const recentOnline5 = onlineMessages
        .slice(-5)
        .map((m) => `${m.role === "user" ? "用户" : character.name}: ${m.content}`)
        .join("\n");

      onlineContextStr = `
【互通模式 - 线上记忆提取与线下剧情推进规则 (最高优先级)】：
以下是最近 5 条线上聊天记录：
${recentOnline5}

你在生成本段线下剧情时，必须严格遵守以下推进逻辑：
1. **提取信息点**：结合当前用户的输入/动作（“${lastUserContent || "无特殊动作"}”）和上述最近 5 条线上聊天记录，提炼出 1-2 个可以作为线下事件的信息点（如：用户提过喜欢猫、在找工作、爱喝某种饮料、提到的近况或共同承诺等）。
2. **引入环境/随机事件**：在当前线下场景中引入一个突发的环境变化或随机事件（如：天气变阴/下雨、店员送错餐品、路边偶遇小动物、旁边桌有动静、播放某首乐曲、物件意外掉落等）作为剧情推进支点。
3. **结合推演与事件优先级**：将【线上记忆/信息点】与【环境变化/随机事件】有机融合推演新剧情。事件优先级判定：【线上记忆 > 环境变化 > 随机事件】，确保剧情与角色和用户深厚关联。
4. **必须包含互动新元素**：本段剧情结尾必须至少包含 1 个【可以互动的新元素/新情境】（如：递过来的某种物品、发出的邀请、面对突发状况的选择题、呈现眼前的画面等），让用户不仅仅是接话，而是面对真实情境做出应对和行动！
`;
    } else {
      onlineContextStr = `
【架空模式 - 线下剧情推进规则】：
1. 在当前线下场景中加入一个环境变化或突发随机事件（如：环境细节变动、外部声音、突发插曲等）作为剧情推进支点。
2. 本段剧情结尾必须至少包含 1 个【可以互动的新元素/新情境】（如递出的物品、需要决策的选择、突发情境等），让用户能够针对真实情境做出响应和行动！
`;
    }
    return onlineContextStr;
  };

  // Helper to call apiChat with word count check & duplicate prevention
  const generateAiWithQuality = async (
    requestParams: any,
    minWords: number,
    maxWords: number,
    oldContentToAvoid?: string
  ): Promise<string> => {
    let response = await apiChat(requestParams);
    let aiText = response.text || "";

    // 1. Check if identical to old content (for reroll) -> Auto regenerate once
    if (oldContentToAvoid && aiText.trim() === oldContentToAvoid.trim()) {
      console.warn("Reroll content identical to original, auto regenerating...");
      const retryParams = {
        ...requestParams,
        messages: [
          ...(requestParams.messages || []),
          {
            id: `sys-retry-diff-${Date.now()}`,
            role: "user" as const,
            content: `【重新生成特别指令】：你刚才重roll输出的内容与上一个版本完全一致（原文字数为 ${oldContentToAvoid.trim().length}）。请重新构思全新的切入视角、环境细节、动作语气，【绝对不得与原版本重合】！`,
            timestamp: Date.now(),
          },
        ],
      };
      const secondRes = await apiChat(retryParams);
      if (secondRes.text && secondRes.text.trim() !== oldContentToAvoid.trim()) {
        aiText = secondRes.text;
      }
    }

    // 2. Check if word count is below minWords -> Auto expand / retry once
    if (aiText.trim().length < minWords) {
      console.warn(`Generated content too short (${aiText.trim().length} words < min ${minWords}), auto expanding...`);
      const expandParams = {
        ...requestParams,
        messages: [
          ...(requestParams.messages || []),
          {
            id: `asst-short-${Date.now()}`,
            role: "assistant" as const,
            content: aiText,
            timestamp: Date.now(),
          },
          {
            id: `sys-expand-${Date.now()}`,
            role: "user" as const,
            content: `【字数控制严格指令】：你刚才输出的内容字数不足（仅 ${aiText.trim().length} 字），低于用户设定的最少字数下限（${minWords} 字）。请大幅丰富肢体微动作、感官画面、眼神细节、心理活动与环境烘托，重新输出一篇至少 ${minWords} 字（在 ${minWords}~${maxWords} 字范围）的充实剧情描写！`,
            timestamp: Date.now(),
          },
        ],
      };
      const expandRes = await apiChat(expandParams);
      if (expandRes.text && expandRes.text.trim().length > aiText.trim().length) {
        aiText = expandRes.text;
      }
    }

    return aiText;
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
    const dataSources = validateAndGetMandatoryDataSources([]);
    if (!dataSources.isValid) {
      setApiError("设定缺失，请检查剧场配置");
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);
    setApiError(null);

    try {
      let contextPrompt = "";

      if (currentMode === "shared") {
        let recentOnlineStr = "";
        if (onlineMessages && onlineMessages.length > 0) {
          recentOnlineStr = onlineMessages
            .slice(-5)
            .map((m) => `${m.role === "user" ? "用户" : character.name}: ${m.content}`)
            .join("\n");
        }

        contextPrompt = `【开场设定与信息点提取依据】：
- 时间：${timeStr.trim() || "（AI根据线上聊天推断合适时间）"}
- 地点：${locStr.trim() || "（AI根据线上聊天推断合适地点）"}
- 见面原因：${reasonStr.trim() || "（AI根据线上聊天推断合适原因）"}
- 氛围关键词：${atmoStr.trim() || "（自然流畅）"}

【最近 5 条线上聊天记录（重点提取 1-2 个信息点）】：
${recentOnlineStr || "（此前在线上已有熟悉互动与交谈）"}

【开场剧情推进与互动元素要求】：
1. 从最近 5 条线上聊天记录中提取 1-2 个能够作为见面线索的信息点（如聊过的爱喝甜饮、喜欢猫、提到的习惯等）。
2. 在开场描写中加入一个环境变化或突发随机事件（天气变化、店员递餐、环境音效、小道具等）。
3. 事件优先级：线上记忆 > 环境变化 > 随机事件。
4. 开场结尾必须留下 1 个【可以互动的新元素/新情境】（如推到面前的茶杯、呈现眼前的画面或突发状况），方便用户开始第一步互动！`;
      } else {
        contextPrompt = `【开场设定依据（架空剧本背景设定）】：
${isoBg.trim() || "用户未指定架空背景。请依据你的角色性格（" + (character.description || "") + "）与世界观，完全自由地随机构思一个极具新意、悬念与吸引力的平行时空/独立剧本开场描写。忽略所有线上聊天记录。"}

【开场剧情推进与互动元素要求】：
1. 在开场描写中加入一个环境变化或突发随机事件作为剧情推进支点。
2. 结尾必须包含 1 个【可以互动的新元素/新情境】，方便用户回应或行动。`;
      }

      const minWords = Math.max(150, Math.floor(currentLimit * 0.75));
      const maxWords = Math.min(2500, Math.floor(currentLimit * 1.25));
      const styleRules = getPromptStyleInstructions();

      const openingInstruction = `【线下见面 - 第一段开场描写特别指令】：
you are generating the 【first opening scene description】 for "offline meeting".

【最高优先级规则】：
1. 【绝对严禁包含任何话语或对话内容】：第一段开场描写必须完全是环境渲染、动作细节、氛围布置、心理与眼神等叙述性画面文字。严禁出现角色说话、对话框、 quotes “...” 或任何言语台词！用户的第一次对话或行动将在开场之后由用户主动输入。
2. 【极其重要的剧情排版格式要求（绝对强制）】：
- 所有的“对话内容”必须单独成行，并使用 *斜体* 显示（例如：*“你来了。”*）。虽然此开场描述严禁对话，但此规则适用于后续剧情。
- 动作描写、环境描写、眼神姿态、感官细节、心理活动，必须合并在自然且连贯的完整段落中进行叙述，绝对不准刻意分行、另起新行、或把一两句零碎描写单独成行。
- 确保描写自然连贯，像读小说一样，不要出现碎裂的短格或多余的换行。
3. 【字数控制】：字数必须在 ${currentLimit} 字左右（要求 ${minWords}~${maxWords} 字）。
4. 【角色人设】：贴合 ${character.name} 的性格风格（${character.description || ""}）。
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

      const aiText = await generateAiWithQuality(requestParams, minWords, maxWords);
      const aiTextFinal = aiText || "（环境静谧，阳光斜斜照在地面上。你与对方在约定地点相遇，静静地凝视着彼此...）";

      const aiOpeningMsg: OfflineStoryMessage = {
        id: `ai-open-${Date.now()}`,
        role: "assistant",
        content: aiTextFinal,
        timestamp: Date.now(),
      };

      saveStory([aiOpeningMsg]);
      
      try {
        storeMemory(character.id, `线下见面开场：${aiTextFinal}`, "线下见面");
      } catch(e) {}

      if (currentMode === "shared" && onSyncToOnlineChat) {
        onSyncToOnlineChat(aiTextFinal);
      }
    } catch (err: any) {
      console.error("Failed to generate opening scene:", err);
      setApiError(err.message || "生成开场失败，已自动载入基础预设开场");

      const defaultOpening = `（环境静谧，阳光斜斜照在地面上。你与${character.name}在约定地点相遇，静静地凝视着对方...）\n\n【互动关键点】：直面 vs 回避 （面对眼前的见面与氛围，你决定以怎样的态度回应？）\n【分支选项1】：“抱歉，久等了。今天天气真不错。”\n【分支选项2】：“你今天看起来有些不一样。”\n【分支选项3】：静静凝视对方，等待对方先开口。\n【分支选项4】：故作轻松地挥了挥手，打破当下的沉寂。`;

      const fallbackOpeningMsg: OfflineStoryMessage = {
        id: `ai-open-fallback-${Date.now()}`,
        role: "assistant",
        content: defaultOpening,
        timestamp: Date.now(),
      };

      saveStory([fallbackOpeningMsg]);
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

  // Save Setup
  const handleSaveSetup = () => {
    saveConfigState(meetMode, wordLimit);
    try {
      localStorage.setItem(
        configKey,
        JSON.stringify({
          wordLimit,
          meetMode,
          plotMode,
          selectedMultiCharIds,
          timeSetting,
          locationSetting,
          reasonSetting,
          atmosphereSetting,
          isolatedBackground,
          theme: activeTheme,
          perspective,
          writingTone,
          customToneKeywords,
          customCss,
          savedCssPresets,
        })
      );
    } catch (e) {
      console.error("Failed to save offline config:", e);
    }
    setHasSavedSetup(true);
    setShowSetupModal(false);
  };

  // Reset scene
  const handleResetScene = () => {
    if (window.confirm("确定要重新配置并重置线下见面剧情吗？当前对话将自动存入历史记录。")) {
      if (messages.length > 0) {
        archiveCurrentSession(messages, meetMode);
      }
      setMessages([]);
      setHasSavedSetup(false);
      setShowSetupModal(true);
    }
  };

  // Opening setup apply handler with confirmation prompt
  const handleApplySetupWithConfirm = () => {
    const confirmed = window.confirm("应用新设定将结束当前见面并创建新见面，确定继续吗？");
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

  // Re-roll a character AI message (重新生成该条描写内容，替换原内容)
  const handleRerollMessage = async (targetMsgId: string) => {
    if (isGenerating) return;

    const targetIdx = messages.findIndex((m) => m.id === targetMsgId);
    if (targetIdx === -1) return;

    const oldMsg = messages[targetIdx];
    const oldContent = oldMsg ? oldMsg.content : "";
    const priorMsgs = messages.slice(0, targetIdx);

    const dataSources = validateAndGetMandatoryDataSources(priorMsgs);
    if (!dataSources.isValid) {
      setApiError("设定缺失，请检查剧场配置");
      return;
    }

    setIsGenerating(true);
    setApiError(null);

    try {
      const minWords = Math.max(150, Math.floor(wordLimit * 0.75));
      const maxWords = Math.min(2500, Math.floor(wordLimit * 1.25));

      let requestParams: any;

      if (targetIdx === 0) {
        // Re-rolling opening scene
        let contextPrompt = "";
        if (meetMode === "shared") {
          let recentOnlineStr = "";
          if (onlineMessages && onlineMessages.length > 0) {
            recentOnlineStr = onlineMessages
              .slice(-5)
              .map((m) => `${m.role === "user" ? "用户" : character.name}: ${m.content}`)
              .join("\n");
          }
          contextPrompt = `【开场设定与信息点提取依据】：
- 时间：${timeSetting.trim() || "（AI根据线上聊天推断合适时间）"}
- 地点：${locationSetting.trim() || "（AI根据线上聊天推断合适地点）"}
- 见面原因：${reasonSetting.trim() || "（AI根据线上聊天推断合适原因）"}
- 氛围关键词：${atmosphereSetting.trim() || "（自然流畅）"}

【最近 5 条线上聊天记录（重点提取 1-2 个信息点）】：
${recentOnlineStr || "（此前在线上已有熟悉互动与交谈）"}

【开场剧情推进与互动元素要求】：
1. 从最近 5 条线上聊天记录中提取 1-2 个能够作为见面线索的信息点。
2. 在开场描写中加入一个环境变化或突发随机事件。
3. 开场结尾必须留下 1 个【可以互动的新元素/新情境】。`;
        } else {
          contextPrompt = `【开场设定依据（架空剧本背景设定）】：
${isolatedBackground.trim() || "自由构思独立剧本开场描写。"}

【开场剧情推进与互动元素要求】：
1. 加入环境变化或突发随机事件。
2. 结尾包含 1 个【可以互动的新元素/新情境】。`;
        }

        const styleRules = getPromptStyleInstructions([]);
        const rerollOpeningInstruction = `【线下见面 - 开场描写重roll重新生成特别指令】：
你正在重新生成线下见面的【第一段开场描写】。

【重roll差异化与字数要求】：
1. 之前的开场描述为：「${oldContent.slice(0, 100)}...」。本次重新生成【绝对不能与旧开场重复】，请更换全新的环境细节、光影氛围或肢体感官着手描写。
2. 【绝对严禁包含任何话语或对话内容】：第一段开场描写必须完全是环境渲染、动作细节、氛围布置、心理与眼神等叙述性画面文字！
3. 【字数范围】：绝对严格要求在 ${minWords}~${maxWords} 字（目标约 ${wordLimit} 字），严禁生成低于 ${minWords} 字的短段落。
${styleRules}

${contextPrompt}`;

        const cleanCharacter = {
          name: character.name,
          description: character.description,
          systemInstruction: character.systemInstruction + "\n" + rerollOpeningInstruction,
        };

        requestParams = {
          messages: [{ id: `sys-open-reroll-${Date.now()}`, role: "user" as const, content: rerollOpeningInstruction, timestamp: Date.now() }],
          character: cleanCharacter,
          settings: settings,
          chatMode: "offline" as const,
          replyLength: "long",
          replyCount: 1,
        };
      } else {
        const lastUserObj = priorMsgs.filter((m) => m.role === "user").pop();
        const lastUserContent = lastUserObj ? lastUserObj.content : "";
        const progressionRules = getProgressionInstructions(lastUserContent);
        const styleRules = getPromptStyleInstructions(priorMsgs);

        const systemInstruction = `【线下见面剧情模式 - 重新生成重roll特别指令】：
你正在与用户进行“线下见面”互动。
${progressionRules}

${styleRules}

【重roll重新生成差异化要求】：
- 之前的旧描述为：「${oldContent.slice(0, 100)}...」。
- 本次重新生成【绝对不能与旧描述重复】，必须更换切入视角、肢体习惯或眼神描写，重新描写一段全新的剧情！
- 【字数控制】：字数必须严格在 ${minWords}~${maxWords} 字（目标约 ${wordLimit} 字），绝对严禁低于 ${minWords} 字！
`;

        const apiMessages = [
          {
            id: "sys-instruct",
            role: "user" as const,
            content: systemInstruction,
            timestamp: Date.now() - 10000,
          },
          ...priorMsgs
            .filter((m) => m.role !== "system")
            .map((m) => {
              if (m.role === "user") {
                const isQuoted = (m.content.startsWith("“") && m.content.endsWith("”")) || (m.content.startsWith('"') && m.content.endsWith('"'));
                const typeLabel = isQuoted ? "用户说出的台词（角色可直接听到并回应）" : "用户的动作、神态或心理描写";
                return {
                  id: m.id,
                  role: "user" as const,
                  content: `[${typeLabel}]: ${m.content}`,
                  timestamp: m.timestamp,
                };
              }
              return {
                id: m.id,
                role: m.role as "assistant",
                content: m.content,
                timestamp: m.timestamp,
              };
            }),
        ];

        const cleanCharacter = {
          name: character.name,
          description: character.description,
          systemInstruction: character.systemInstruction + "\n" + systemInstruction,
        };

        requestParams = {
          messages: apiMessages,
          character: cleanCharacter,
          settings: settings,
          chatMode: "offline" as const,
          replyLength: "long",
          replyCount: 1,
        };
      }

      const aiText = await generateAiWithQuality(requestParams, minWords, maxWords, oldContent);
      const aiTextFinal = aiText || "（对方微笑着看着你，没有说话。）";

      const updatedMsgs = messages.map((m, idx) =>
        idx === targetIdx ? { ...m, content: aiTextFinal, timestamp: Date.now() } : m
      );

      saveStory(updatedMsgs);

      if (meetMode === "shared" && onSyncToOnlineChat) {
        onSyncToOnlineChat(aiTextFinal);
      }
    } catch (err: any) {
      console.error("Failed to reroll message:", err);
      setApiError(err.message || "重roll 失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // Continue story / AI Advance
  const handleContinueStory = async (customMsgs?: Message[]) => {
    const msgsToUse = customMsgs || messages;
    if (isGenerating || msgsToUse.length === 0) return;

    const dataSources = validateAndGetMandatoryDataSources(msgsToUse);
    if (!dataSources.isValid) {
      setApiError("设定缺失，请检查剧场配置");
      return;
    }

    setIsGenerating(true);
    setApiError(null);

    try {
      const lastUserObj = msgsToUse.filter((m) => m.role === "user").pop();
      const lastUserContent = lastUserObj ? lastUserObj.content : "";
      const progressionRules = getProgressionInstructions(lastUserContent);

      const minWords = Math.max(150, Math.floor(wordLimit * 0.75));
      const maxWords = Math.min(2500, Math.floor(wordLimit * 1.25));
      const styleRules = getPromptStyleInstructions(msgsToUse);

      const systemInstruction = `【线下见面剧情模式特别指令】：
你正在与用户进行“线下见面”互动。这是一个纯剧情小说/剧本模式，以环境白描、肢体动作、感官细节与微小停顿为主，对话为辅。
${progressionRules}

${styleRules}

【线下见面与动作心理描写规则（极其重要）】：
1. 用户发送的【未加双引号】的内容（如：好想走啊、叹了口气、心神不定），视为动作、神态、心理活动或外部表现。角色无法直接“听到”或读取用户的内心原话或想法，只能通过观察用户的外部表现、动作、表情、语气来推测。
2. 用户发送的【加双引号】的内容（如：“我想走了”），视为用户明确说出来的话，角色可以直接听到并回应。
3. 角色在回应时，必须严格区分“听到的话”和“观察到的动作/心理”，绝对不能把用户的心理描写或未说出口的动作用作直接听到的对话进行回应。

【字数控制要求】：
请务必将你的每一轮描写控制在约 ${wordLimit} 字左右（范围：${minWords}~${maxWords} 字）。
`;

      const apiMessages = [
        {
          id: "sys-instruct",
          role: "user" as const,
          content: systemInstruction,
          timestamp: Date.now() - 10000,
        },
        ...msgsToUse
          .filter((m) => m.role !== "system")
          .map((m) => {
            if (m.role === "user") {
              const isQuoted = (m.content.startsWith("“") && m.content.endsWith("”")) || (m.content.startsWith('"') && m.content.endsWith('"'));
              const typeLabel = isQuoted ? "用户说出的台词（角色可直接听到并回应）" : "用户的动作、神态或心理描写（未加双引号，角色无法直接听到内心或原文，只能通过观察外部表现推测）";
              return {
                id: m.id,
                role: "user" as const,
                content: `[${typeLabel}]: ${m.content}`,
                timestamp: m.timestamp,
              };
            }
            return {
              id: m.id,
              role: m.role as "assistant",
              content: m.content,
              timestamp: m.timestamp,
            };
          }),
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

      const aiText = await generateAiWithQuality(requestParams, minWords, maxWords);
      const aiTextFinal = aiText || "（对方微笑着看着你，没有说话。）";

      const aiMsg: OfflineStoryMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: aiTextFinal,
        timestamp: Date.now(),
      };

      const finalStoryList = [...msgsToUse, aiMsg];
      saveStory(finalStoryList);
      
      try {
        const lastUser = msgsToUse.filter(m => m.role === 'user').pop();
        if (lastUser) {
           storeMemory(character.id, `线下见面：\n用户：${lastUser.content}\nAI：${aiTextFinal}`, "线下见面");
        }
      } catch(e) {}

      if (meetMode === "shared" && onSyncToOnlineChat) {
        onSyncToOnlineChat(aiTextFinal);
      }
    } catch (err: any) {
      console.error("Offline meet AI continue error:", err);
      setApiError(err.message || "推进失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate AI Reply or Opening Scene (triggered exclusively by clicking the Heart button)
  const handleGenerateAiReply = () => {
    if (isGenerating) return;
    if (messages.length === 0) {
      generateOpeningScene(
        meetMode,
        wordLimit,
        timeSetting,
        locationSetting,
        reasonSetting,
        atmosphereSetting,
        isolatedBackground
      );
    } else {
      handleContinueStory(messages);
    }
  };

  // Send User Action / Dialogue (Appends message directly without auto-generating AI reply)
  const handleUserSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating || !inputText.trim()) return;

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
    if (window.confirm("确定要删除这段剧情吗？")) {
      const updated = messages.filter((m) => m.id !== msgId);
      saveStory(updated);
      setSelectedMsgForMenu(null);
    }
  };

  // Helper to render narrative paragraphs and dialogue in unified card blocks
  const renderStoryContent = (msg: OfflineStoryMessage, isReadOnly = false) => {
    const { id, content, role, timestamp } = msg;

    if (role === "system") {
      return (
        <div key={id} className="text-center py-2 px-4 my-2 text-[#A8A39A] text-[11px] font-bold">
          {content}
        </div>
      );
    }

    let nameLabel = role === "user" ? "我" : character.name;
    if (role === "assistant" && plotMode === "multi") {
      const assocList = getAssociatedCharacters();
      const selectedMultiChars = assocList.filter((c) => selectedMultiCharIds.includes(c.id));
      if (selectedMultiChars.length > 0) {
        nameLabel = `剧情卡片 · ${[character.name, ...selectedMultiChars.map((c) => c.name)].join(" & ")}`;
      }
    }
    const { cleanStoryText, keyPoint } = parseInteractiveKeyPoint(content);
    const parsedParagraphs = parseStoryParagraphs(cleanStoryText);
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const d = new Date(timestamp);
    const timeFormattedFull = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}.${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const wordCount = cleanStoryText.length;

    return (
      <div
        key={id}
        className="meet-card mb-3 group relative text-left select-text animate-fade-in"
        onContextMenu={(e) => {
          e.preventDefault();
          if (!isReadOnly) {
            setSelectedMsgForMenu(msg);
          }
        }}
      >
        <div className="meet-card-separator" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="meet-title text-sm font-bold">
            {nameLabel}
          </span>
          <span className="text-[10px] text-[#A8A39A]">{timeFormatted}</span>
        </div>

        <div className="meet-body text-sm leading-relaxed space-y-2">
          {parsedParagraphs.map((paraObj, pIdx) => (
            <p 
              key={pIdx} 
              className={`whitespace-pre-wrap ${paraObj.isDialogue ? 'italic font-medium' : ''}`}
            >
              {paraObj.text.replace(/\*(.*?)\*/g, "$1")}
            </p>
          ))}
        </div>

        {/* Card Action Bar */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#EFECE8] text-[11px] text-[#A8A39A]">
          <div className="flex items-center gap-3">
            <span>{timeFormattedFull}</span>
            <span>共 {wordCount} 字</span>
          </div>
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              {role === "assistant" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleRerollMessage(id);
                  }}
                  disabled={isGenerating}
                  className="flex items-center gap-1 hover:text-[#1A1A1A] transition-colors cursor-pointer disabled:opacity-50"
                  title="重新生成该段剧情"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重roll</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDeleteMsg(id);
                }}
                className="flex items-center gap-1 hover:text-red-600 transition-colors cursor-pointer"
                title="删除卡片"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除</span>
              </button>
            </div>
          )}
        </div>
        
        {!isReadOnly && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMsgForMenu(msg);
              }}
              className="p-1 text-[#A8A39A] hover:text-[#1A1A1A] rounded cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
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
        fontFamily: '"Inter", sans-serif',
        backgroundColor: '#F8F6F3',
        color: '#1A1A1A',
      }}
      className="offline-meet-container fixed inset-0 z-50 flex flex-col max-w-md mx-auto sm:max-w-md overflow-hidden shadow-2xl animate-fade-in transition-colors duration-200"
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap');
          
          .offline-meet-container {
            font-family: 'Inter', sans-serif;
            background-color: #F8F6F3;
          }
          .meet-card {
            background-color: #FFFFFF;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.04);
            border: 1px solid #EFECE8;
          }
          .meet-card-separator {
            height: 1px;
            background-color: #EFECE8;
            margin: 0 -16px 12px -16px;
          }
          .meet-title {
            font-family: 'Playfair Display', serif;
            color: #1A1A1A;
          }
          .meet-body {
            color: #A8A39A;
          }
          .btn-black {
            background-color: #000000;
            color: #FFFFFF;
            border-radius: 8px;
            padding: 8px 16px;
            font-weight: 600;
            transition: opacity 0.2s;
          }
          .btn-black:active {
            opacity: 0.8;
          }
          .btn-outline {
            background-color: #FFFFFF;
            color: #000000;
            border: 1px solid #000000;
            border-radius: 8px;
            padding: 8px 16px;
            font-weight: 600;
            transition: background-color 0.2s;
          }
          .btn-outline:active {
            background-color: #F5F3F0;
          }
          .meet-input {
            background-color: #FFFFFF;
            border: 1px solid #E0E0E0;
            border-radius: 8px;
            padding: 8px 12px;
            width: 100%;
            outline: none;
            transition: border-color 0.2s;
          }
          .meet-input:focus {
            border-color: #000000;
          }
        `}
      </style>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in select-none">
          <div className="bg-white rounded-[16px] p-6 w-full max-w-sm shadow-xl space-y-4 border border-stone-100 animate-scale-up">
            <h3 className="meet-title font-bold text-stone-900 text-base text-center">确认退出见面？</h3>
            <div className="space-y-2.5">
              <button 
                onClick={() => { 
                  saveStory(messages);
                  setIsPaused(true); 
                  setShowExitModal(false); 
                  onClose(); 
                }} 
                className="w-full py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-900 text-xs font-bold rounded-[10px] transition-all cursor-pointer shadow-sm active:scale-[0.99]"
              >
                暂停并退出
              </button>
              <button 
                onClick={() => { 
                  const now = new Date();
                  const defaultTime = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                  const finalTime = timeSetting.trim() || defaultTime;
                  const finalLocation = locationSetting.trim() || "咖啡馆 · 窗边";

                  const summaryText = messages.length > 0
                    ? messages.map(m => m.content).join(" ")
                    : "与角色的线下见面过程。";

                  const memoryId = `meet-mem-${Date.now()}`;

                  if (onSyncToOnlineChat) {
                    onSyncToOnlineChat(summaryText, {
                      time: finalTime,
                      location: finalLocation,
                      memoryId: memoryId,
                    });
                  }

                  archiveCurrentSession(messages, meetMode); 
                  localStorage.removeItem(storageKey);
                  setMessages([]);
                  setShowExitModal(false); 
                  onClose(); 
                }} 
                className="w-full py-3 bg-black hover:bg-stone-900 text-white text-xs font-bold rounded-[10px] transition-all cursor-pointer shadow-sm active:scale-[0.99]"
              >
                结束
              </button>
            </div>
            <button 
              onClick={() => setShowExitModal(false)}
              className="w-full text-center text-[11px] text-stone-400 hover:text-stone-600 cursor-pointer pt-1"
            >
              取消
            </button>
          </div>
        </div>
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
        className="h-12 px-4 flex items-center justify-between shrink-0 z-10 border-b border-black/5 bg-white/40 backdrop-blur-md"
      >
        <button
          type="button"
          onClick={() => {
            if (viewMode === "history_replay") {
              setViewMode("mode_settings");
              setReplayingRecord(null);
            } else if (viewMode === "settings_view") {
              setViewMode("chat");
            } else {
              setShowExitModal(true);
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
              {/* 整合设置入口 */}
              <button
                type="button"
                onClick={() => setViewMode("settings_view")}
                className="p-1.5 rounded-full hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
                title="设置"
                style={{ color: currentTheme.subText }}
              >
                <Settings className="w-5 h-5" />
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
      {viewMode === "settings_view" ? (
        /* 统一设置页面 */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 ">
          <div className="space-y-6">
            {/* Visual Settings */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 space-y-3">
                <h3 className=" font-bold text-sm text-neutral-900">视觉主题</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {(Object.keys(THEME_STYLES) as VisualThemeType[]).map((tKey) => {
                    const tObj = THEME_STYLES[tKey];
                    const isActive = activeTheme === tKey;
                    return (
                      <button key={tKey} type="button" onClick={() => setActiveTheme(tKey)}
                              className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${isActive ? "border-black ring-1 ring-black bg-neutral-100" : "border-neutral-200 hover:border-neutral-300 bg-white"}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-900">{tObj.name}</span>
                            {isActive && <Check className="w-4 h-4 text-black shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
            </div>

            {/* Narrative Perspective */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 space-y-3">
                <h3 className=" font-bold text-sm text-neutral-900">叙述视角</h3>
                <div className="space-y-2">
                    {[
                        { id: "first", title: "第一人称", desc: "从角色自身视角出发，用“我”来叙述，代入感强。" },
                        { id: "second", title: "第二人称", desc: "叙述中直接称呼用户为“你”，拉近距离。" },
                        { id: "third", title: "第三人称", desc: "上帝视角，用“他/她”来叙述角色，客观观察。" },
                    ].map((pOpt) => (
                        <button key={pOpt.id} type="button" onClick={() => setPerspective(pOpt.id as PerspectiveType)}
                                className={`w-full p-3 rounded-xl border text-left transition-all ${perspective === pOpt.id ? "border-black bg-neutral-100" : "border-neutral-200 hover:border-neutral-300"}`}>
                            <span className="text-xs font-bold text-neutral-900 block mb-1">{pOpt.title}</span>
                            <span className="text-[10px] text-neutral-500 block leading-tight">{pOpt.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Writing Tone */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 space-y-3">
                <h3 className=" font-bold text-sm text-neutral-900">文风偏好</h3>
                <div className="space-y-2">
                    {[
                        { id: "daily_plain", name: "日常白描", desc: "句子短，动作具体，不加修饰，像在讲身边发生的事。" },
                        { id: "literary", name: "文艺细腻", desc: "注重氛围和感官描写，句子稍长，有呼吸感。" },
                        { id: "cold_restrained", name: "冷淡克制", desc: "用词少，情绪收着，不渲染，不煽情。" },
                        { id: "warm_soft", name: "温暖柔和", desc: "语气软，细节暖，节奏慢，适合温馨场景。" },
                    ].map((tOpt) => (
                        <button key={tOpt.id} type="button" onClick={() => setWritingTone(tOpt.id as ToneType)}
                                className={`w-full p-3 rounded-xl border text-left transition-all ${writingTone === tOpt.id ? "border-black bg-neutral-100" : "border-neutral-200 hover:border-neutral-300"}`}>
                            <span className="text-xs font-bold text-neutral-900 block mb-1">{tOpt.name}</span>
                            <span className="text-[10px] text-neutral-500 block leading-tight">{tOpt.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* CSS Customization */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200 space-y-3">
                <h3 className=" font-bold text-sm text-neutral-900">界面美化 (CSS)</h3>
                <textarea rows={5} value={customCss} onChange={(e) => setCustomCss(e.target.value)} className="w-full text-xs font-mono border border-neutral-200 rounded-xl p-3 bg-neutral-50 outline-none resize-none" />
                <button type="button" className="w-full py-2 border border-neutral-300 text-neutral-700 font-bold text-xs rounded-xl hover:bg-neutral-50 transition-all cursor-pointer">
                    上传自定义美化 (CSS)
                </button>
                <button type="button" className="w-full py-2 bg-black text-white font-bold text-xs rounded-xl transition-all cursor-pointer">
                    保存当前预设
                </button>
            </div>

             <button
                type="button"
                onClick={() => {
                  if (window.confirm("确定保存当前设置吗？")) {
                    saveAllConfig({
                        theme: activeTheme,
                        perspective: perspective,
                        writingTone: writingTone,
                        customCss: customCss
                    });
                    alert("设置已应用");
                    setViewMode("chat");
                  }
                }}
                className="w-full py-3 bg-white border border-black text-black hover:bg-neutral-50 font-bold rounded-xl shadow-xs transition-all cursor-pointer"
             >
                保存并设置
             </button>
          </div>
        </div>
      ) : viewMode === "history_replay" ? (
        /* 模式设置页面 (三条线图标) */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 ">
          {/* 板块一：模式选择 */}
          {/* 板块二：开场设定 */}
          <div className="bg-white/80 rounded-2xl p-4 shadow-xs border border-black/5 space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-stone-800" />
                <h3 className="font-bold text-xs text-stone-800">板块二：开场设定</h3>
              </div>
              <span className="text-stone-800 font-mono font-bold text-xs">{wordLimit} 字/轮</span>
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
                className="w-full accent-black cursor-pointer"
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
                        ? "bg-black text-white border-black font-bold"
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
                  <div className="bg-stone-50 border border-stone-100 p-2.5 rounded-xl text-[11px] text-stone-800 leading-relaxed">
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
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-stone-800"
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
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-stone-800"
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
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-stone-800"
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
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-stone-800"
                    />
                  </div>
                </div>
              ) : (
                /* 架空模式开场设定 */
                <div className="space-y-2">
                  <div className="bg-stone-50 border border-stone-100 p-2.5 rounded-xl text-[11px] text-stone-800 leading-relaxed">
                    🌌 <span className="font-bold">线下剧情设定：</span>自定义剧本或留空由 AI 随机构思。
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
                      className="w-full text-xs border border-stone-200 rounded-xl p-2 bg-white outline-none focus:border-stone-800 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* 应用开场设定并创建新见面按钮 */}
              <button
                type="button"
                onClick={handleApplySetupWithConfirm}
                className="w-full py-2.5 bg-black hover:bg-stone-800 text-white font-bold text-xs rounded-[8px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
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
                <Clock className="w-4 h-4 text-stone-800" />
                <h3 className="font-bold text-xs text-stone-800">板块三：历史见面记录</h3>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    archiveCurrentSession(messages, meetMode);
                    alert("当前见面会话已存档入历史记录！");
                  }}
                  className="text-[11px] text-stone-800 hover:underline font-medium cursor-pointer"
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
                      className="p-3 bg-white rounded-xl border border-stone-200 hover:border-stone-400 transition-all flex items-start justify-between gap-2 text-left"
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
                            className="px-1.5 py-0.5 rounded text-[10px] bg-stone-100 text-stone-800 font-bold"
                          >
                            互通模式
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
                          className="p-1 text-stone-800 hover:bg-stone-100 rounded cursor-pointer"
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
                          className="p-1 text-stone-400 hover:text-black hover:bg-stone-100 rounded cursor-pointer"
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
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 ">
          <div className="p-3 bg-stone-100 border border-stone-200 rounded-2xl text-xs space-y-1 text-stone-700">
            <div className="flex items-center justify-between font-bold">
              <span>见面时间：{new Date(replayingRecord.timestamp).toLocaleString()}</span>
              <span className="px-2 py-0.5 bg-stone-100 text-stone-800 rounded text-[10px] font-bold">
                {replayingRecord.meetMode === "shared" ? "互通模式" : "架空模式"}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              只读回放模式 · 共 {replayingRecord.totalTurns} 轮描写
            </p>
          </div>

          <div className="space-y-[12px]">
            {replayingRecord.messages.map((msg) => (
              <React.Fragment key={msg.id}>{renderStoryContent(msg, true)}</React.Fragment>
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
            className="flex-1 overflow-y-auto px-4 py-4 space-y-0 transition-colors duration-200"
            style={{ backgroundColor: '#F8F6F3' }}
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
              <div className="p-3 bg-stone-50 border border-stone-200 text-stone-800 text-xs rounded-[8px] text-center">
                {apiError}
              </div>
            )}
          </div>

          {/* Bottom Input Box Area */}
          <div className="p-4 border-t border-[#EFECE8] shrink-0" style={{ backgroundColor: '#F8F6F3' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-[#A8A39A]">线下剧情互动与行动表达</span>
              <button
                type="button"
                onClick={() => setIsInputZoomed(!isInputZoomed)}
                className="text-[10px] flex items-center gap-1 text-[#A8A39A] hover:text-[#1A1A1A] bg-white border border-[#EFECE8] px-2 py-0.5 rounded shadow-2xs transition-all cursor-pointer"
                title={isInputZoomed ? "恢复正常大小" : "放大输入框 (约4倍)"}
              >
                <span>{isInputZoomed ? "⤲ 恢复默认" : "⇱ 放大输入框"}</span>
              </button>
            </div>
            <form onSubmit={handleUserSend} className="flex items-end gap-3">
              <textarea
                style={{ fontFamily: '"Inter", sans-serif', color: '#1A1A1A', backgroundColor: '#FFFFFF' }}
                placeholder="输入你的行动或表达（双引号内为说出口的台词，不加引号则为动作/神态描述）..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isGenerating}
                rows={isInputZoomed ? 6 : 2}
                className={`flex-1 border border-[#EFECE8] rounded-[8px] px-[14px] py-[10px] text-[14px] placeholder-[#A8A39A] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:border-[#1A1A1A] resize-none ${isInputZoomed ? 'h-[160px]' : 'h-[44px]'}`}
              />

              <div className="flex items-center gap-[8px] shrink-0 pb-0.5">
                {/* 发送按钮 (发送用户消息) */}
                <button
                  type="submit"
                  disabled={isGenerating || !inputText.trim()}
                  className="px-4 h-[40px] rounded-[8px] bg-[#1A1A1A] hover:bg-black text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:bg-[#E5E2DC] disabled:text-[#A8A39A] disabled:cursor-not-allowed disabled:transform-none font-bold text-xs"
                  title="发送用户行动/台词"
                >
                  发送
                </button>

                {/* AI回复/爱心按钮 (❤️图标) */}
                <button
                  type="button"
                  onClick={handleGenerateAiReply}
                  disabled={isGenerating}
                  className="w-[40px] h-[40px] rounded-[8px] border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:bg-white disabled:border-[#E5E2DC] disabled:text-[#A8A39A] disabled:cursor-not-allowed disabled:transform-none"
                  title={isGenerating ? "正在生成中..." : messages.length === 0 ? "爱心：生成开场剧情" : "爱心：生成角色回复"}
                >
                  <Heart className={`w-4 h-4 ${isGenerating ? "animate-pulse text-rose-400" : "fill-rose-500 text-rose-500"}`} />
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
            className="bg-white border border-stone-200 rounded-3xl p-4 w-full max-w-xs shadow-2xl space-y-2  text-stone-800 animate-scale-up"
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
                  <Pencil className="w-4 h-4 text-stone-800" />
                  <span>编辑本条描写</span>
                </button>

                {/* 2. 复制 */}
                <button
                  type="button"
                  onClick={() => handleCopyMsg(selectedMsgForMenu.content)}
                  className="w-full flex items-center gap-3 p-3 text-xs font-bold text-stone-700 hover:bg-stone-50 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-stone-800" />
                  <span>复制内容</span>
                </button>

                {/* 3. 删除 */}
                <button
                  type="button"
                  onClick={() => handleDeleteMsg(selectedMsgForMenu.id)}
                  className="w-full flex items-center gap-3 p-3 text-xs font-bold text-stone-800 hover:bg-stone-50 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-stone-600" />
                  <span>删除本条描写</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* 角色描写菜单选项 */}
                <button
                  type="button"
                  onClick={() => {
                    const msgId = selectedMsgForMenu.id;
                    setSelectedMsgForMenu(null);
                    handleRerollMessage(msgId);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-xs font-bold text-stone-800 hover:bg-stone-50 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-stone-800" />
                  <div>
                    <div>重roll（重新生成本段描写）</div>
                    <div className="text-[10px] font-normal text-stone-400">
                      替换当前这一段描述，重新构思AI反应
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyMsg(selectedMsgForMenu.content)}
                  className="w-full flex items-center gap-3 p-3 text-xs font-bold text-stone-700 hover:bg-stone-50 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-stone-800" />
                  <span>复制内容</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteMsg(selectedMsgForMenu.id)}
                  className="w-full flex items-center gap-3 p-3 text-xs font-bold text-stone-800 hover:bg-stone-50 rounded-2xl transition-all text-left cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-stone-600" />
                  <span>删除本条描写</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Message Modal */}
      {editingMsg && (
        <div className="fixed inset-0 z-70 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-3  text-stone-800">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="font-bold text-sm text-stone-800 flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-stone-800" />
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
              className="w-full text-xs border border-stone-200 rounded-2xl p-3 bg-stone-50 outline-none focus:border-stone-800 resize-none "
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
                className="flex-1 py-2.5 bg-black hover:bg-stone-900 text-white font-bold text-xs rounded-xl cursor-pointer"
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
          <div className="bg-[#FAF8F5] border border-[#E8E2D7] rounded-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 text-[#2B2723]">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#EFECE5]">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-stone-800" />
                <h3 className="font-bold text-base">线下见面 · 开场设定</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (messages.length === 0) {
                    onClose();
                  } else {
                    setShowSetupModal(false);
                  }
                }}
                className="p-1.5 text-stone-400 hover:text-stone-800 rounded-full hover:bg-stone-200/60 cursor-pointer transition-colors"
                title="退出线下见面"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. 剧情模式选择 (单人 vs 多人) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1">
                <span>1. 剧情模式</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlotMode("single")}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    plotMode === "single"
                      ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                      : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      单人模式
                    </span>
                    {plotMode === "single" && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <p className={`text-[10px] leading-tight ${plotMode === "single" ? "text-stone-300" : "text-stone-400"}`}>
                    仅当前角色（{character.name}）参与
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlotMode("multi");
                    const assoc = getAssociatedCharacters();
                    if (selectedMultiCharIds.length === 0 && assoc.length > 0) {
                      setSelectedMultiCharIds(assoc.map((c) => c.id));
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    plotMode === "multi"
                      ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                      : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      多人模式
                    </span>
                    {plotMode === "multi" && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <p className={`text-[10px] leading-tight ${plotMode === "multi" ? "text-stone-300" : "text-stone-400"}`}>
                    当前角色及关联角色共同参与
                  </p>
                </button>
              </div>

              {/* 多人模式关联角色选择 */}
              {plotMode === "multi" && (
                <div className="mt-2.5 p-3 bg-stone-100/80 border border-stone-200/80 rounded-2xl space-y-2 animate-fade-in">
                  <div className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
                    <span>选择同场参演的关联角色：</span>
                    <span className="text-[10px] text-stone-400 font-normal">（当前角色为默认参演）</span>
                  </div>

                  {getAssociatedCharacters().length === 0 ? (
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                      💡 当前角色（{character.name}）暂无关联角色。你可以在角色列表中编辑该角色，添加与其他角色的关联关系。
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {/* 固定主角 */}
                      <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-stone-200 opacity-90">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-stone-200 flex items-center justify-center text-xs shrink-0">
                            {character.chatAvatar || character.avatar ? (
                              <img src={character.chatAvatar || character.avatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                              character.name[0]
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-stone-900">{character.name}</div>
                            <div className="text-[9.5px] text-stone-400">发起者 (主角)</div>
                          </div>
                        </div>
                        <span className="text-[10px] bg-stone-100 text-stone-500 font-medium px-2 py-0.5 rounded-full">固定</span>
                      </div>

                      {/* 关联角色列表 */}
                      {getAssociatedCharacters().map((assocChar) => {
                        const isChecked = selectedMultiCharIds.includes(assocChar.id);
                        const relationText = character.associatedRelations?.[assocChar.id] || assocChar.associatedRelations?.[character.id] || "关联角色";
                        return (
                          <button
                            key={assocChar.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setSelectedMultiCharIds(selectedMultiCharIds.filter((id) => id !== assocChar.id));
                              } else {
                                setSelectedMultiCharIds([...selectedMultiCharIds, assocChar.id]);
                              }
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left cursor-pointer ${
                              isChecked
                                ? "bg-white border-stone-900 shadow-xs"
                                : "bg-stone-50/50 border-stone-200 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-stone-200 flex items-center justify-center text-xs shrink-0">
                                {assocChar.chatAvatar || assocChar.avatar ? (
                                  <img src={assocChar.chatAvatar || assocChar.avatar} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  assocChar.name[0]
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-stone-900 truncate">{assocChar.name}</div>
                                <div className="text-[9.5px] text-stone-500 truncate">{relationText}</div>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isChecked ? "bg-black border-black text-white" : "border-stone-300 bg-white"
                            }`}>
                              {isChecked && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. 叙述视角选择 */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-stone-800 block">
                2. 叙述视角
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPerspective("second")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    perspective === "second"
                      ? "bg-black text-white border-black shadow-xs"
                      : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="text-xs font-bold">第二人称</div>
                  <div className={`text-[9.5px] ${perspective === "second" ? "text-stone-300" : "text-stone-400"}`}>
                    角色用角色名，用户用“你”
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPerspective("third")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    perspective === "third"
                      ? "bg-black text-white border-black shadow-xs"
                      : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div className="text-xs font-bold">第三人称</div>
                  <div className={`text-[9.5px] ${perspective === "third" ? "text-stone-300" : "text-stone-400"}`}>
                    角色和用户均用姓名
                  </div>
                </button>
              </div>
            </div>

            {/* 3. 字数限制 */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span>3. 生成字数限制</span>
                <span className="text-stone-800 font-mono font-bold">{wordLimit} 字/轮</span>
              </div>
              <input
                type="range"
                min={200}
                max={2000}
                step={50}
                value={wordLimit}
                onChange={(e) => setWordLimit(Number(e.target.value))}
                className="w-full accent-black cursor-pointer"
              />
              <div className="flex items-center gap-1">
                {[300, 600, 1000, 1500].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWordLimit(w)}
                    className={`flex-1 py-1 text-[11px] rounded-lg font-medium border transition-all cursor-pointer ${
                      wordLimit === w
                        ? "bg-black text-white border-black font-bold"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {w}字 {w === 600 ? "(默认)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. 模式对应的开场设定表单 */}
            <div className="space-y-3 pt-2 border-t border-[#EFECE5]">
              {meetMode === "shared" ? (
                /* 互通模式开场设定 */
                <div className="space-y-3">
                  <div className="bg-stone-50 border border-stone-100 p-2.5 rounded-2xl text-[11px] text-stone-800 leading-relaxed">
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
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-black"
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
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-black"
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
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-black"
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
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-black"
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
                /* 架空模式开场设定 (Fallback, though UI option removed) */
                <div className="space-y-2">
                  <div className="bg-stone-50 border border-stone-100 p-2.5 rounded-2xl text-[11px] text-stone-800 leading-relaxed">
                    🌌 <span className="font-bold">线下见面设定：</span> AI 将按照你的剧本或背景描述展开剧情。
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">
                      背景与场景描述 <span className="text-[10px] font-normal text-stone-400">（可选）</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="例如：某个周末下午，约好了在街角书店见面..."
                      value={isolatedBackground}
                      onChange={(e) => setIsolatedBackground(e.target.value)}
                      className="w-full text-xs border border-stone-200 rounded-xl p-2.5 bg-white outline-none focus:border-black resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveSetup}
                className="w-full py-3.5 bg-black hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>保存设定</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
