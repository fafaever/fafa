import React, { useState, useEffect } from "react";
import StatusBar from "./components/StatusBar";
import HomeIndicator from "./components/HomeIndicator";
import HomeScreen from "./components/HomeScreen";
import HelpApp from "./components/HelpApp";
import ChatApp from "./components/ChatApp";
import WorldBookApp from "./components/WorldBookApp";
import SettingsApp from "./components/SettingsApp";
import MemoryApp from "./components/MemoryApp";
import CharacterCreatorApp from "./components/CharacterCreatorApp";
import UnoGameApp from "./components/UnoGameApp";
import TurtleSoupApp from "./components/TurtleSoupApp";
import UniverseApp from "./components/UniverseApp";
import DiaryApp from "./components/DiaryApp";
import NotesApp from "./components/NotesApp";
import PhoneCheckApp from "./components/PhoneCheckApp";
import { GameListApp } from "./components/GameListApp";
import { ForumApp } from "./components/ForumApp";
import { TheaterApp } from "./components/TheaterApp";
import FafaChatApp from "./components/FafaChatApp";
import RelationshipNetworkApp from "./components/RelationshipNetworkApp";
import { CharacterAvatar } from "./components/CharacterAvatar";
import { Character, UserPersona, LoreEntry, AppSettings, ChatSession, Message, FontOption, ThemeOption } from "./types";
import { Sparkles, HelpCircle } from "lucide-react";
import { apiChat, apiGenerateNote, performVectorRetrieval } from "./lib/api";
import { storeMemory, retrieveMemories } from "./lib/vectorMemory";

const getThemeClass = (theme?: ThemeOption) => {
  switch (theme) {
    case 'minimal_white':
      return 'bg-white text-[#1A1A1A]';
    case 'dark_night':
      return 'bg-[#0F0F0F] text-[#FAFAFA]';
    case 'warm_paper':
    default:
      return 'bg-[#F5F3F0] text-[#1A1A1A]';
  }
};

const getFontClass = (font?: FontOption) => {
  switch (font) {
    case 'playfair_inter':
      return 'font-serif';
    case 'kaiti':
      return "font-['Kaiti','STKaiti','KaiTi',serif]";
    case 'nunito':
      return "font-['Nunito',sans-serif]";
    case 'sans':
      return 'font-sans';
    case 'custom':
      return "font-['CustomFont',sans-serif]";
    case 'system':
    default:
      return 'font-sans';
  }
};

// Pre-made premium characters
const PRESET_CHARACTERS: Character[] = [
  {
    id: "char-preset-fafa",
    name: "fafa",
    avatar: "🐱",
    chatAvatar: "/images/fafa/fafa.jpg",
    description: "官方客服助手 / APP 功能解答",
    systemInstruction: `你叫 fafa，是这款 APP 的官方客服助手。你的职责是专业、严谨地解答用户关于 APP 功能位置、操作流程及使用规则的各种问题。

【核心原则】
1. 【专业客服】：保持中立、专业、礼貌、友好的客服语气。不参与任何角色扮演，禁止任何情感互动。
2. 【严禁恋爱】：绝对禁止出现任何与爱情、恋爱、亲密关系相关的内容。如果用户试图进行此类互动，请礼貌地将话题引回 APP 功能咨询。
3. 【步骤化回答】：当涉及功能查找或操作步骤时，必须使用清晰的步骤化描述。
4. 【路径标注】：使用“→”箭头标注操作路径。示例：“点击主界面底部『联系人』→ 选择角色『林墨』→ 点击右上角『设置』图标”。
5. 【描述精准】：每一步都必须明确说明点击的对象（图标或文字）以及所在的具体位置。

【硬性约束】
1. 禁止感叹号：表达情绪或陈述事实时只能使用句号或逗号。
2. 简明扼要：回复应直击要点，避免冗长的废话。
3. 身份明确：你只是一个帮助用户熟悉 APP 的客服助手，没有个人情感或背景故事。`,
    createdAt: 1720000000000,
    isPreset: true,
  }
];

// Pre-made rich world book entries
const PRESET_LORE: LoreEntry[] = [];

export default function App() {
    // Screen routing state
    const [currentScreen, setCurrentScreen] = useState<string>("home");
    const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement || document.documentElement.classList.contains("is-fullscreen"));
    const [appKeyboardHeight, setAppKeyboardHeight] = useState(0);

    useEffect(() => {
      // Screen orientation lock
      const orientation = screen.orientation as any;
      if (orientation && orientation.lock) {
        try {
          orientation.lock('portrait').catch((err: any) => {
            console.warn("Screen orientation lock is not supported or was rejected:", err);
          });
        } catch (err) {
          console.warn("Screen orientation lock is not supported on this device:", err);
        }
      }
    }, []);

    useEffect(() => {
      // Handle visual viewport for mobile keyboard
      const checkFs = () => {
        const isFs = !!document.fullscreenElement || document.documentElement.classList.contains("is-fullscreen");
        setIsFullscreen(isFs);
      };

      const handleVisualViewportResize = () => {
        const viewport = window.visualViewport;
        if (!viewport) return;
        
        const isFs = !!document.fullscreenElement || document.documentElement.classList.contains("is-fullscreen");
        setIsFullscreen(isFs);

        // Calculate keyboard height accurately
        const keyboardHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        const activeKeyboard = keyboardHeight > 80 ? Math.round(keyboardHeight) : 0;
        setAppKeyboardHeight(activeKeyboard);
        
        document.documentElement.style.setProperty('--keyboard-height', `${activeKeyboard}px`);
        document.documentElement.style.setProperty('--keyboard-margin', activeKeyboard > 0 ? `${activeKeyboard + 4}px` : '0px');
        
        // Prevent outer window from scrolling/shifting on soft keyboard focus
        window.scrollTo(0, 0);
      };

      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleVisualViewportResize);
        window.visualViewport.addEventListener('scroll', handleVisualViewportResize);
        handleVisualViewportResize();
      }

      const handleFsChange = () => {
        checkFs();
        handleVisualViewportResize();
      };

      document.addEventListener("fullscreenchange", handleFsChange);
      document.addEventListener("webkitfullscreenchange", handleFsChange);

      const observer = new MutationObserver(() => {
        checkFs();
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      return () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
          window.visualViewport.removeEventListener('scroll', handleVisualViewportResize);
        }
        document.removeEventListener("fullscreenchange", handleFsChange);
        document.removeEventListener("webkitfullscreenchange", handleFsChange);
        observer.disconnect();
      };
    }, []);

  // Recalculate and reset scrolling on screen change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    const phoneScreen = document.getElementById("phone_screen");
    if (phoneScreen) {
      phoneScreen.scrollTop = 0;
    }
  }, [currentScreen]);

  useEffect(() => {
    // Force portrait orientation if supported
    const lockOrientation = async () => {
      try {
        if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.lock) {
          await (window.screen as any).orientation.lock("portrait");
        }
      } catch (error) {
        // Ignore errors (e.g. if the browser doesn't support locking or requires full screen)
        console.warn("Orientation lock failed:", error);
      }
    };
    
    lockOrientation();
    
    // Fallback: listen for orientation change
    const handleOrientationChange = () => {
      if (window.orientation === 90 || window.orientation === -90) {
        // Screen is landscape
      }
    };
    window.addEventListener("orientationchange", handleOrientationChange);
    return () => window.removeEventListener("orientationchange", handleOrientationChange);
  }, []);

  // Core Data States
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userPersonas, setUserPersonas] = useState<UserPersona[]>([]);
  const [loreList, setLoreList] = useState<LoreEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    apiUrl: "", 
    apiKey: "", 
    model: "", 
    apiFormat: 'openai',
    apiPresets: [], 
    activePresetId: "",
    appIcons: {},
    themePresets: [],
    fontColorMode: 'black',
    fontColor: '#000000',
    fontGradient: 'linear-gradient(to right, #ff7e5f, #feb47b)',
    activeThemePresetId: ""
  });
  const [previewSettings, setPreviewSettings] = useState<AppSettings>({ 
    apiUrl: "", 
    apiKey: "", 
    model: "", 
    apiFormat: 'openai',
    apiPresets: [], 
    activePresetId: "",
    appIcons: {},
    themePresets: [],
    fontColorMode: 'black',
    fontColor: '#000000',
    fontGradient: 'linear-gradient(to right, #ff7e5f, #feb47b)',
    activeThemePresetId: ""
  });
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Background generation & notification states
  const [isGeneratingMap, setIsGeneratingMap] = useState<Record<string, boolean>>({});
  const [activeChatCharId, setActiveChatCharId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    characterId: string;
    name: string;
    avatar: string;
    textPreview: string;
    timestamp: number;
  }>>([]);
  const [essayNotifications, setEssayNotifications] = useState<Array<{
    id: string;
    noteId: string;
    text: string;
    timestamp: number;
  }>>([]);
  const [globalToastMessage, setGlobalToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalToast = (e: any) => {
      if (e.detail) {
        setGlobalToastMessage(e.detail);
        setTimeout(() => setGlobalToastMessage(null), 3500);
      }
    };
    window.addEventListener("global-toast", handleGlobalToast);
    return () => window.removeEventListener("global-toast", handleGlobalToast);
  }, []);

  // Hydrate from localStorage on mount
  useEffect(() => {
    // Clean up emoji / mood cache from localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("char_mood_") || key.startsWith("emoji_") || key.includes("emoji"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error("Failed to clean emoji/mood localStorage", e);
    }

    // 1.5 User Personas
    const savedPersonas = localStorage.getItem("user_personas_v1");
    if (savedPersonas) {
      setUserPersonas(JSON.parse(savedPersonas));
    }
    // 1. Characters
    const savedChars = localStorage.getItem("mobile_ai_characters");
    if (savedChars) {
      let parsed: Character[] = [];
      try {
        parsed = JSON.parse(savedChars) as Character[];
      } catch (e) {
        console.error("[App Hydrate Error] Failed to parse mobile_ai_characters:", e);
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        const parsedMap = new Map(parsed.map((c) => [c.id, c]));
        const mergedPresets = PRESET_CHARACTERS.map((preset) => {
          const stored = parsedMap.get(preset.id);
          if (stored) {
            // Keep user chat/customizations, but overwrite core persona/identity with latest preset
            return {
              ...stored,
              name: preset.name,
              avatar: preset.avatar,
              description: preset.description,
              systemInstruction: preset.systemInstruction,
              isPreset: true
            };
          }
          return preset;
        });
        const customChars = parsed.filter((c) => !PRESET_CHARACTERS.some((p) => p.id === c.id));
        const merged = [...mergedPresets, ...customChars];
        setCharacters(merged);
        try {
          localStorage.setItem("mobile_ai_characters", JSON.stringify(merged));
        } catch (e) {
          console.warn("[App Hydrate Warning] Could not persist merged characters back to localStorage:", e);
        }
      } else {
        setCharacters(PRESET_CHARACTERS);
      }
    } else {
      setCharacters(PRESET_CHARACTERS);
      try {
        localStorage.setItem("mobile_ai_characters", JSON.stringify(PRESET_CHARACTERS));
      } catch (e) {
        console.warn("[App Hydrate Warning] Failed to initialize default characters:", e);
      }
    }

    // 2. Lore Book
    const savedLore = localStorage.getItem("mobile_ai_lore");
    if (savedLore) {
      setLoreList(JSON.parse(savedLore));
    } else {
      setLoreList(PRESET_LORE);
      localStorage.setItem("mobile_ai_lore", JSON.stringify(PRESET_LORE));
    }

    // 3. Settings
    const savedSettings = localStorage.getItem("mobile_ai_settings");
    const savedCustomFont = localStorage.getItem("mobile_ai_custom_font_url") || "";
    const savedGlobalFont = (localStorage.getItem("mobile_ai_global_font") as FontOption) || null;

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const s = {
          apiUrl: parsed.apiUrl || localStorage.getItem("apiUrl") || "",
          apiKey: parsed.apiKey || localStorage.getItem("apiKey") || "",
          model: parsed.model || localStorage.getItem("model") || "",
          apiFormat: parsed.apiFormat || 'openai',
          apiPresets: parsed.apiPresets || [],
          activePresetId: parsed.activePresetId || "",
          homeWallpaper: parsed.homeWallpaper || "",
          homeWallpaper2: parsed.homeWallpaper2 || "",
          chatWallpaper: parsed.chatWallpaper || "",
          globalFont: savedGlobalFont || parsed.globalFont || "system",
          customFontUrl: savedCustomFont || parsed.customFontUrl || "",
          globalTheme: parsed.globalTheme || "warm_paper",
          appIcons: parsed.appIcons || {},
          themePresets: parsed.themePresets || [],
          fontColorMode: parsed.fontColorMode || 'black',
          fontColor: parsed.fontColor || '#000000',
          fontGradient: parsed.fontGradient || 'linear-gradient(to right, #ff7e5f, #feb47b)',
          activeThemePresetId: parsed.activeThemePresetId || ""
        };
        setSettings(s);
        setPreviewSettings(s);
        if (s.apiUrl) localStorage.setItem("apiUrl", s.apiUrl);
        if (s.apiKey) localStorage.setItem("apiKey", s.apiKey);
        if (s.model) localStorage.setItem("model", s.model);
        if (s.globalFont) localStorage.setItem("mobile_ai_global_font", s.globalFont);
        if (s.customFontUrl) localStorage.setItem("mobile_ai_custom_font_url", s.customFontUrl);
      } catch (e) {
        console.error(e);
      }
    } else if (savedCustomFont || savedGlobalFont) {
      setSettings(prev => ({
        ...prev,
        globalFont: savedGlobalFont || prev.globalFont,
        customFontUrl: savedCustomFont || prev.customFontUrl
      }));
      setPreviewSettings(prev => ({
        ...prev,
        globalFont: savedGlobalFont || prev.globalFont,
        customFontUrl: savedCustomFont || prev.customFontUrl
      }));
    }

    // 4. Chat Sessions
    const savedSessions = localStorage.getItem("mobile_ai_chat_sessions");
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, []);

  // Helper: Sync bidirectional associations for characters
  const syncBidirectionalAssociations = (charsList: Character[]): Character[] => {
    let updated = charsList.map(c => ({
      ...c,
      associatedCharacterIds: c.associatedCharacterIds ? [...c.associatedCharacterIds] : [],
      associatedRelations: c.associatedRelations ? { ...c.associatedRelations } : {},
    }));

    const validIds = new Set(updated.map(c => c.id));
    updated = updated.map(c => {
      const filteredIds = c.associatedCharacterIds.filter(id => validIds.has(id));
      const cleanedRelations: Record<string, string> = {};
      filteredIds.forEach(id => {
        if (c.associatedRelations[id]) {
          cleanedRelations[id] = c.associatedRelations[id];
        }
      });
      return {
        ...c,
        associatedCharacterIds: filteredIds,
        associatedRelations: cleanedRelations
      };
    });

    for (const c of updated) {
      for (const targetId of c.associatedCharacterIds) {
        const target = updated.find(t => t.id === targetId);
        if (target) {
          if (!target.associatedCharacterIds.includes(c.id)) {
            target.associatedCharacterIds.push(c.id);
          }
          if (!target.associatedRelations[c.id]) {
            target.associatedRelations[c.id] = c.associatedRelations[target.id] || "偶然认识的朋友。";
          }
        }
      }
    }

    updated = updated.map(c => {
      const filteredIds = c.associatedCharacterIds.filter(id => id !== c.id);
      const cleanedRelations: Record<string, string> = {};
      filteredIds.forEach(id => {
        if (c.associatedRelations[id]) {
          cleanedRelations[id] = c.associatedRelations[id];
        }
      });
      return {
        ...c,
        associatedCharacterIds: filteredIds,
        associatedRelations: cleanedRelations
      };
    });

    return updated;
  };

  // Helper: Persist characters
  const persistCharacters = (newChars: Character[]) => {
    const synced = syncBidirectionalAssociations(newChars);
    setCharacters(synced);
    try {
      const serialized = JSON.stringify(synced);
      localStorage.setItem("mobile_ai_characters", serialized);
      console.log(`[Persist Characters Success] Total characters: ${synced.length}, Data size: ${Math.round(serialized.length / 1024)} KB`);
    } catch (err: any) {
      console.error("[Persist Characters Error] Failed to write mobile_ai_characters to localStorage:", err);
    }
  };

  // Helper: Persist lore
  const persistLore = (newLores: LoreEntry[]) => {
    setLoreList(newLores);
    try {
      localStorage.setItem("mobile_ai_lore", JSON.stringify(newLores));
    } catch (err) {
      console.error("[Persist Lore Error]:", err);
    }
  };

  // Helper: Persist settings
  const persistSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setPreviewSettings(newSettings);
    try {
      localStorage.setItem("mobile_ai_settings", JSON.stringify(newSettings));
      if (newSettings.apiUrl !== undefined && newSettings.apiUrl !== null) localStorage.setItem("apiUrl", newSettings.apiUrl);
      if (newSettings.apiKey !== undefined && newSettings.apiKey !== null) localStorage.setItem("apiKey", newSettings.apiKey);
      if (newSettings.model !== undefined && newSettings.model !== null) localStorage.setItem("model", newSettings.model);
      if (newSettings.globalFont) localStorage.setItem("mobile_ai_global_font", newSettings.globalFont);
      if (newSettings.customFontUrl) localStorage.setItem("mobile_ai_custom_font_url", newSettings.customFontUrl);
    } catch (err) {
      console.error("[Persist Settings Error]:", err);
    }
  };

  const handlePreviewSettings = (newSettings: AppSettings) => {
    setPreviewSettings(newSettings);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    persistSettings(newSettings);
  };

  // Helper: Persist sessions
  const persistSessions = (newSessions: ChatSession[]) => {
    setSessions(newSessions);
    try {
      localStorage.setItem("mobile_ai_chat_sessions", JSON.stringify(newSessions));
    } catch (err) {
      console.error("[Persist Sessions Error]:", err);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    persistSessions(updatedSessions);
  };

  // --- ACTIONS: Character Management ---
  const handleAddCharacter = (char: Omit<Character, "id" | "createdAt">) => {
    const newCharId = `char-custom-${Date.now()}`;
    const defaultSysInstruction = `你正在扮演角色 "${char.name || "AI助手"}"。
请保持符合角色人设的自然日常回复，语言口语化，像真人在移动聊天软件上打字一样。`;

    const newChar: Character = {
      ...char,
      id: newCharId,
      createdAt: Date.now(),
      description: char.description?.trim() || "一个充满魅力的角色",
      systemInstruction: char.systemInstruction?.trim() || defaultSysInstruction,
      model: char.model || settings.model || "gemini-1.5-flash",
    };

    setCharacters(prev => {
      const next = syncBidirectionalAssociations([...prev, newChar]);
      localStorage.setItem("mobile_ai_characters", JSON.stringify(next));
      return next;
    });

    const newSession: ChatSession = {
      id: `sess-${Date.now()}`,
      characterId: newCharId,
      messages: [],
      lastActive: Date.now(),
    };
    
    setSessions(prev => {
      const next = [...prev, newSession];
      localStorage.setItem("mobile_ai_sessions", JSON.stringify(next));
      return next;
    });

    // Save initial character settings in localStorage
    const defaultSettings = {
      replyLength: "short",
      minReplies: 1,
      maxReplies: 6,
      activeMessaging: false,
      activeMessagingDelay: 1,
      timePerception: false,
      isBlocked: false,
      memories: ["初始记忆：对用户很友好。"],
      model: newChar.model,
    };
    try {
      localStorage.setItem(`char_settings_v1_${newCharId}`, JSON.stringify(defaultSettings));
    } catch (e) {
      console.warn("Failed to save initial character settings to localStorage", e);
    }
  };

  const handleUpdateCharacter = (id: string, updated: Partial<Character>) => {
    const updatedChars = characters.map((c) => {
      if (c.id === id) {
        const cleaned: Record<string, any> = {};
        for (const [key, val] of Object.entries(updated)) {
          if (val !== undefined) {
            cleaned[key] = val;
          }
        }
        return { ...c, ...cleaned };
      }
      return c;
    });
    persistCharacters(updatedChars);
  };

  const handleDeleteCharacter = (id: string) => {
    // 1. Find all sub-accounts of this character to delete them as well
    const subAccountIds = characters.filter((c) => c.isSubAccount && c.parentCharacterId === id).map(c => c.id);
    const allIdsToDelete = [id, ...subAccountIds];

    // 2. Remove characters from state & persist
    const updatedChars = characters.filter((c) => !allIdsToDelete.includes(c.id));
    persistCharacters(updatedChars);

    // 3. Remove associated chat sessions and memory
    const updatedSessions = sessions.filter((s) => !allIdsToDelete.includes(s.characterId));
    persistSessions(updatedSessions);

    // 4. Remove associated character-specific storage keys for all deleted characters
    allIdsToDelete.forEach(deletedId => {
      try {
        localStorage.removeItem(`char_settings_v1_${deletedId}`);
        localStorage.removeItem(`mobile_ai_notes_${deletedId}`);
        localStorage.removeItem(`mobile_ai_notes_interval_${deletedId}`);
        localStorage.removeItem(`mobile_ai_notes_share_${deletedId}`);
        localStorage.removeItem(`mobile_ai_notes_lastgen_${deletedId}`);
        localStorage.removeItem(`mobile_ai_phonecheck_${deletedId}`);
        localStorage.removeItem(`mobile_ai_last_active_transfer_${deletedId}`);
        console.log(`[Delete Character Success] Cleaned all memories and associated data for character id: ${deletedId}`);
      } catch (e) {
        console.error("[Delete Character Error] Failed to clear local storage items for:", deletedId, e);
      }
    });
  };

  // --- ACTIONS: Lore Book Management ---
  const handleAddLore = (lore: Omit<LoreEntry, "id" | "createdAt">) => {
    const newLore: LoreEntry = {
      ...lore,
      id: `lore-custom-${Date.now()}`,
      createdAt: Date.now(),
    };
    persistLore([...loreList, newLore]);
  };

  const handleUpdateLore = (id: string, updated: Partial<LoreEntry>) => {
    const updatedLores = loreList.map((lore) => {
      if (lore.id === id) {
        return { ...lore, ...updated };
      }
      return lore;
    });
    persistLore(updatedLores);
  };

  const handleDeleteLore = (id: string) => {
    const updatedLores = loreList.filter((lore) => lore.id !== id);
    persistLore(updatedLores);
  };

  // --- ACTIONS: Chat Messages Synchronization ---
  const handleUpdateSessionMessages = (targetId: string, messages: Message[], currentOS?: string, extraFields?: Partial<ChatSession>) => {
    const sessionIndex = sessions.findIndex((s) => s.characterId === targetId || s.id === targetId);

    if (sessionIndex !== -1) {
      // Update existing session
      const updatedSessions = [...sessions];
      updatedSessions[sessionIndex] = {
        ...updatedSessions[sessionIndex],
        messages,
        lastActive: Date.now(),
        ...(currentOS !== undefined ? { currentOS } : {}),
        ...(extraFields || {}),
      };
      persistSessions(updatedSessions);
    } else {
      // Create new session
      const isGroup = targetId.startsWith("group-");
      const newSession: ChatSession = {
        id: targetId,
        characterId: isGroup ? undefined : targetId,
        isGroup,
        messages,
        lastActive: Date.now(),
        currentOS,
        ...(extraFields || {}),
      };
      persistSessions([...sessions, newSession]);
    }
  };

  const addNotification = (charId: string, charName: string, charAvatar: string, textPreview: string) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    const newNotif = {
      id,
      characterId: charId,
      name: charName,
      avatar: charAvatar,
      textPreview: textPreview.length > 20 ? textPreview.substring(0, 18) + "..." : textPreview,
      timestamp: Date.now(),
    };
    
    setNotifications(prev => {
      const filtered = prev.filter(n => n.characterId !== charId); // Avoid duplicate notifications for the same character
      const next = [newNotif, ...filtered];
      return next.slice(0, 3); // Max 3 notifications
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  const addEssayNotification = (noteId: string, customText?: string) => {
    const id = `essay-notif-${Date.now()}`;
    const newNotif = {
      id,
      noteId,
      text: customText || "📝 随笔已生成完成",
      timestamp: Date.now(),
    };
    
    setEssayNotifications(prev => [...prev, newNotif]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setEssayNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const generateNoteBackground = async (character: Character, settings: AppSettings) => {
    // Check if already generating
    if (isGeneratingMap[character.id]) return;

    if (!character.systemInstruction || !character.description) {
      alert("人设信息缺失，请检查角色设定");
      return;
    }

    setIsGeneratingMap(prev => ({ ...prev, [character.id]: true }));
    try {
      // Helper to aggregate context for deduplication
      const getPhoneContextForBackground = (charId: string) => {
        let context = "--- 【手机模块已有记录 (72小时内去重参考)】 ---\n";
        try {
          const memos = JSON.parse(localStorage.getItem(`mobile_ai_phone_memos_${charId}`) || "[]");
          const searches = JSON.parse(localStorage.getItem(`mobile_ai_phone_searches_${charId}`) || "[]");
          const shopping = JSON.parse(localStorage.getItem(`mobile_ai_phone_shopping_${charId}`) || "[]");
          const reading = JSON.parse(localStorage.getItem(`mobile_ai_phone_reading_${charId}`) || "[]");
          
          context += `- 备忘录：${memos.slice(0, 10).map((m: any) => m.content).join("、") || "无"}\n`;
          context += `- 搜索历史：${searches.slice(0, 10).map((s: any) => s.query).join("、") || "无"}\n`;
          context += `- 购物清单：${shopping.slice(0, 10).map((s: any) => s.name).join("、") || "无"}\n`;
          context += `- 阅读物：${reading.slice(0, 10).map((r: any) => r.title).join("、") || "无"}\n`;
        } catch(e) {}
        return context;
      };

      const getChatContextForBackground = (charId: string) => {
        try {
          const session = sessions.find(s => s.characterId === charId);
          if (session && session.messages) {
            return session.messages.slice(-10).map(m => `${m.role === 'user' ? '用户' : character.name}: ${m.content}`).join("\n");
          }
        } catch(e) {}
        return "暂无最近聊天记录。";
      };

      const data = await apiGenerateNote({ 
        character, 
        settings, 
        memories: character.memories, 
        lores: loreList,
        phoneContext: getPhoneContextForBackground(character.id),
        chatContext: getChatContextForBackground(character.id)
      });
      if (data.text) {
        // AI 自动决定是否分享
        const isShared = Math.random() > 0.5; 
        const newNote = { 
          id: Date.now().toString(), 
          text: data.text, 
          timestamp: Date.now(),
          isShared: isShared
        };
        
        // Save to localStorage
        const savedNotes = localStorage.getItem(`mobile_ai_notes_${character.id}`);
        let notes = savedNotes ? JSON.parse(savedNotes) : [];
        notes = [newNote, ...notes].slice(0, 30);
        localStorage.setItem(`mobile_ai_notes_${character.id}`, JSON.stringify(notes));
        window.dispatchEvent(new Event('notes_updated'));
        
        // Trigger notification
        addEssayNotification(newNote.id);
      }
    } catch (e: any) {
      console.warn("Background note generation failed", e);
      addEssayNotification("", `⚠️ 随笔生成失败: ${e.message || "请检查 API 设置"}`);
    } finally {
      setIsGeneratingMap(prev => ({ ...prev, [character.id]: false }));
    }
  };

  const handleEssayNotificationClick = (noteId: string) => {
    // Navigate to notes app, maybe with noteId pre-selected if possible
    localStorage.setItem("mobile_ai_preselected_note", noteId);
    setCurrentScreen("notes");
    setEssayNotifications(prev => prev.filter(n => n.noteId !== noteId));
  };

  const handleNotificationClick = (charId: string) => {
    localStorage.setItem("mobile_ai_preselected_char", charId);
    setCurrentScreen("chat");
    setNotifications(prev => prev.filter(n => n.characterId !== charId));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const triggerAiReply = async (characterId: string, customMessages?: Message[]) => {
    const isGroup = characterId.startsWith("group-");

    if (isGroup) {
      const session = sessions.find((s) => s.characterId === characterId || s.id === characterId);
      if (!session || !session.memberIds || session.memberIds.length === 0) return;
      if (isGeneratingMap[characterId]) return;
      
      setIsGeneratingMap(prev => ({ ...prev, [characterId]: true }));
      localStorage.setItem(`mobile_ai_bg_generating_${characterId}`, "generating");

      try {
        let currentMessages = customMessages || session.messages || [];
        const minRep = settings.groupChatMinReplies || 1;
        const maxRep = settings.groupChatMaxReplies || 6;
        const replyCount = Math.floor(Math.random() * (Math.max(1, maxRep - minRep + 1))) + minRep;

        let lastSpeakerId = "";

        for (let i = 0; i < replyCount; i++) {
          // Select a random member that is not the last speaker (if possible)
          let availableMembers = session.memberIds.filter(id => id !== lastSpeakerId);
          if (availableMembers.length === 0) availableMembers = session.memberIds;
          const randomMemberId = availableMembers[Math.floor(Math.random() * availableMembers.length)];
          const speakerChar = characters.find(c => c.id === randomMemberId);
          if (!speakerChar) continue;

          lastSpeakerId = randomMemberId;

          // Call apiChat for this character
          // Wait 500ms to simulate typing
          await new Promise(res => setTimeout(res, 500));

          const requestParams = {
            character: speakerChar,
            messages: currentMessages,
            settings,
            matchedLore: [], // simplify for group chat
            chatMode: "online",
            replyLength: "short",
            replyCount: 1,
            mood: "正常",
            memories: speakerChar.memories || [],
            userDidNotReply: false,
            currentUserName: localStorage.getItem("user_name_v1") || "You",
            currentUserDesc: localStorage.getItem("user_desc_v1") || "",
            isGroup: true,
          };

          const data = await apiChat(requestParams);
          const text = data.text || "";
          if (text) {
             const newMsg: Message = {
               id: `msg-${Date.now()}-${Math.random()}`,
               role: "assistant",
               content: text,
               timestamp: Date.now(),
               senderId: speakerChar.id,
               senderName: speakerChar.name,
               senderAvatar: speakerChar.avatar,
             };
             currentMessages = [...currentMessages, newMsg];
             // Trigger state update
             handleUpdateSessionMessages(characterId, currentMessages, session.currentOS, { ...session, messages: currentMessages });
          }
        }
      } catch (err) {
        console.warn("Group chat generation failed", err);
      } finally {
        setIsGeneratingMap(prev => ({ ...prev, [characterId]: false }));
        localStorage.removeItem(`mobile_ai_bg_generating_${characterId}`);
      }
      return;
    }

    const activeChar = characters.find(c => c.id === characterId);
    if (!activeChar) return;

    if (!activeChar.systemInstruction || !activeChar.description) {
      alert("人设信息缺失，请检查角色设定");
      return;
    }

    // Check if generating already
    if (isGeneratingMap[characterId]) return;

    // Load character specific settings from localStorage
    const savedSettings = localStorage.getItem(`char_settings_v1_${characterId}`);
    let replyLength = "short";
    let minReplies = 1;
    let maxReplies = 6;
    let timePerception = false;
    let memories: string[] = ["初始记忆：对用户很友好。"];
    let isBlocked = activeChar.isBlocked || false;

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        replyLength = parsed.replyLength || "short";
        minReplies = parsed.minReplies !== undefined ? parsed.minReplies : 1;
        maxReplies = parsed.maxReplies !== undefined ? parsed.maxReplies : 6;
        timePerception = parsed.timePerception !== undefined ? parsed.timePerception : false;
        memories = parsed.memories || [];
        isBlocked = parsed.isBlocked !== undefined ? parsed.isBlocked : isBlocked;
      } catch (e) {
        console.error("Error reading saved settings", e);
      }
    }

    if (isBlocked) return;

    // Find session messages
    const session = sessions.find((s) => s.characterId === characterId);
    let targetMessages = customMessages || session?.messages || [];

    // Mark as generating
    setIsGeneratingMap(prev => ({ ...prev, [characterId]: true }));
    localStorage.setItem(`mobile_ai_bg_generating_${characterId}`, "generating");

    try {
      // 1. Match Lore
      const matchLore = (text: string) => {
        const activeLore = loreList.filter((l) => l.enabled !== false);
        const matched: LoreEntry[] = [];
        const matchedKeys: string[] = [];

        activeLore.forEach((lore) => {
          if (lore.characterIds && lore.characterIds.length > 0) {
            if (!lore.characterIds.includes(characterId)) return;
          }
          const isAlwaysActive = lore.mountType === "always";
          let isMatched = false;
          if (isAlwaysActive) {
            isMatched = true;
          } else {
            isMatched = lore.keys.some((key) => text.toLowerCase().includes(key.toLowerCase()));
          }
          if (isMatched) {
            matched.push(lore);
            matchedKeys.push(isAlwaysActive ? `${lore.title} (常规挂载)` : lore.title);
          }
        });

        const priorityWeight = { pre: 1, mid: 2, post: 3 };
        matched.sort((a, b) => priorityWeight[a.priority || "mid"] - priorityWeight[b.priority || "mid"]);
        return { matched, keys: matchedKeys };
      };

      const lastUserMsg = [...targetMessages].reverse().find((m) => m.role === "user");
      const { matched, keys } = lastUserMsg ? matchLore(lastUserMsg.content) : { matched: [], keys: [] };

      // Bust status for sub-accounts
      let shouldSetBusted = activeChar.isBusted || false;
      let newBustQuestionsCount = activeChar.bustQuestionsCount || 0;
      if (activeChar.isSubAccount && !activeChar.isBusted) {
        if (lastUserMsg && (
          lastUserMsg.content.includes("你是谁") || 
          lastUserMsg.content.includes("你到底是谁") || 
          lastUserMsg.content.includes("身份") || 
          lastUserMsg.content.includes("马脚") || 
          lastUserMsg.content.includes("露馅") || 
          lastUserMsg.content.includes("戳穿") || 
          lastUserMsg.content.includes("穿帮") || 
          lastUserMsg.content.includes("发现") || 
          lastUserMsg.content.includes("骗我") || 
          lastUserMsg.content.includes("说实话")
        )) {
          newBustQuestionsCount += 1;
          const threshold = 3;
          if (newBustQuestionsCount >= threshold) {
            shouldSetBusted = true;
          }
          handleUpdateCharacter(characterId, {
            ...activeChar,
            bustQuestionsCount: newBustQuestionsCount,
            isBusted: shouldSetBusted
          });
        }
      }

      // Determine reply count based on character personality/archetype (强化条数绑定规则)
      const getReplyCountForCharacter = (char: any, minRep: number, maxRep: number): number => {
        const name = char?.name || "";
        const desc = char?.description || "";
        const sys = char?.systemInstruction || "";
        const combined = `${name} ${desc} ${sys}`.toLowerCase();

        const isColdOrSilent = /冷|少|静|高冷|克制|淡|不善言辞|冰/i.test(combined);
        const isLivelyOrTalkative = /热|活泼|话痨|痨|多话|话多|健谈|啰唆/i.test(combined);
        const isGentleOrListening = /温|暖|听|倾听|治愈|缓/i.test(combined);

        if (isColdOrSilent) {
          // 高冷/话少人设：即使设置范围是 1-10 条，也只回复 1-2 条，用简短语句表达。
          return Math.floor(Math.random() * 2) + 1; // 1 or 2 replies
        }

        if (isLivelyOrTalkative) {
          // 活泼/话痨人设：在设置范围内取偏大值，可连续发送多条消息。
          const mid = Math.floor((minRep + maxRep) / 2);
          const start = Math.max(minRep, mid);
          const end = Math.max(start, maxRep);
          return Math.floor(Math.random() * (end - start + 1)) + start;
        }

        if (isGentleOrListening) {
          // 温和/倾听型人设：回复条数适中，以回应和承接为主。
          const mid = Math.round((minRep + maxRep) / 2);
          const start = Math.max(1, mid - 1);
          const end = Math.min(maxRep, mid + 1);
          return Math.floor(Math.random() * (end - start + 1)) + start;
        }

        // Default fallback random
        return Math.max(1, Math.floor(Math.random() * (maxRep - minRep + 1)) + minRep);
      };

      const count = getReplyCountForCharacter(activeChar, minReplies, maxReplies);

      // Extract parent context if sub-account
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

      const cleanCharacter = {
        id: activeChar.id,
        name: activeChar.name,
        avatar: activeChar.avatar,
        description: activeChar.description || "一个充满魅力的角色",
        systemInstruction: activeChar.systemInstruction || `你正在扮演角色 "${activeChar.name}"。请保持符合人设的自然日常对话。`,
        model: activeChar.model || settings.model || "gemini-3.6-flash",
        isSubAccount: activeChar.isSubAccount,
        parentCharacterId: activeChar.parentCharacterId,
        parentCharacterName: activeChar.parentCharacterName,
        purpose: activeChar.purpose,
        isBusted: shouldSetBusted,
        bustQuestionsCount: newBustQuestionsCount,
      };

      const lastMessage = targetMessages[targetMessages.length - 1];
      const userDidNotReply = lastMessage?.role === 'assistant';
      const mood = "平静";

      const now = new Date();
      const currentTimeStr = now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long', hour: '2-digit', minute: '2-digit' });
      const lastMsg = targetMessages[targetMessages.length - 1];
      const lastMsgTime = lastMsg ? lastMsg.timestamp : (session?.lastActive || Date.now());
      const diffMs = Date.now() - lastMsgTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      let awayTimeDesc = "刚刚";
      if (diffDays > 0) awayTimeDesc = `${diffDays}天前`;
      else if (diffHours > 0) awayTimeDesc = `${diffHours}小时前`;
      else if (diffMins > 0) awayTimeDesc = `${diffMins}分钟前`;

      let currentUserName = "我";
      let currentUserDesc = "";
      if (activeChar.userPersonaId) {
        try {
          const personasData = localStorage.getItem("user_personas_v1");
          if (personasData) {
            const personas = JSON.parse(personasData);
            const persona = personas.find((p: any) => p.id === activeChar.userPersonaId);
            if (persona) {
              currentUserName = persona.name;
              currentUserDesc = persona.description;
            }
          }
        } catch (e) {
          console.error("Failed to load user persona", e);
        }
      }

      // Check if Vector Memory is enabled
      const vectorEnabled = localStorage.getItem(`vector_memory_enabled_${characterId}`) === "true";
      let activeMemories = [...memories];
      if (vectorEnabled && lastUserMsg && lastUserMsg.content) {
        try {
          const vectorResults = await performVectorRetrieval(characterId, lastUserMsg.content, settings);
          const retrievedMemories = await retrieveMemories(characterId, lastUserMsg.content, 5);

          let combinedDocs = [...(vectorResults || [])];
          retrievedMemories.forEach((rm: any) => {
             combinedDocs.push({ text: rm.text, source: rm.source || "持续记忆", timestamp: rm.timestamp, score: rm.score });
          });
          // Sort by score descending
          combinedDocs.sort((a, b) => {
            const scoreA = a.rerankScore !== undefined ? a.rerankScore : a.score;
            const scoreB = b.rerankScore !== undefined ? b.rerankScore : b.score;
            return scoreB - scoreA;
          });

          if (combinedDocs && combinedDocs.length > 0) {
            // Map the top 10 most relevant memories to the memories list passed to the AI
            activeMemories = combinedDocs.slice(0, 10).map(doc => {
              const scorePercent = Math.round((doc.rerankScore !== undefined ? doc.rerankScore : doc.score) * 100);
              return `[高维向量记忆 / 相关性: ${scorePercent}%] ${doc.text} (${doc.source})`;
            });
          }
        } catch (err) {
          console.warn("Failed to fetch vector memories for chat generation:", err);
        }
      }

      const requestParams = {
        messages: targetMessages,
        character: cleanCharacter,
        settings: {
          ...settings,
          model: activeChar.model || settings.model
        },
        matchedLore: matched,
        chatMode: "online",
        systemInstruction: `【角色人设】：${activeChar.description}\n【行为准则】：${activeChar.systemInstruction}\n\n你现在处于【线上聊天模式】。禁止角色发送任何包含动作描写的内容。只允许以第一人称口语化语气表达感受或状态，用词克制，不渲染，不描述具体动作。整体语气保持克制、自然，像正常人在线上聊天，不刻意暴露或渲染。`,
        replyLength: replyLength,
        replyCount: count,
        mood: mood,
        memories: activeMemories,
        userDidNotReply: userDidNotReply,
        isBlocked: activeChar.isBlocked,
        blockedAt: activeChar.blockedAt,
        parentChatContext: parentChatContext,
        timePerception: timePerception,
        currentTime: currentTimeStr,
        awayTimeDesc: awayTimeDesc,
        currentUserName: currentUserName,
        currentUserDesc: currentUserDesc,
      };

      console.log('🚀 [App Background RequestParams]:', requestParams);
      const data = await apiChat(requestParams);
      console.log("📨 [App Background Response]:", data);

      const text = data.text || "";
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
              if (trimmed) parts.push(trimmed);
            }
          } else {
            const trimmed = p.trim();
            if (trimmed) parts.push(trimmed);
          }
        }
      }

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
            os: i === parts.length - 1 ? (data.os || undefined) : undefined,
          };
          currentMessages = [...currentMessages, newBotMsg];
          const osToSave = i === parts.length - 1 ? (data.os || "") : undefined;
          
          handleUpdateSessionMessages(characterId, currentMessages, osToSave);

          if (i < parts.length - 1) {
            const delayMs = Math.floor(Math.random() * 1500) + 1000; // 1s - 2.5s
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
        handleUpdateSessionMessages(characterId, finalMessages, data.os || "");
      }

      // Check active transfer trigger
      const userMsgs = targetMessages.filter(m => m.role === 'user');
      const lastUser = userMsgs[userMsgs.length - 1];
      if (lastUser) {
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

        const lastTransferTimeStr = localStorage.getItem(`mobile_ai_last_active_transfer_${characterId}`);
        const now = Date.now();
        const canTransfer = !lastTransferTimeStr || (now - Number(lastTransferTimeStr) > 0);

        if ((userHasKeyword || aiTextHasKeyword) && canTransfer) {
          localStorage.setItem(`mobile_ai_last_active_transfer_${characterId}`, now.toString());
          
          let parsedAmount: number | null = null;
          const searchCombined = `${text} ${lastUser.content}`;
          const matchAmount = searchCombined.match(/(\d+(?:\.\d+)?)\s*(?:元|块|rmb|块钱)/i);
          if (matchAmount) {
            parsedAmount = Number(matchAmount[1]);
          }
          const transferAmount = parsedAmount !== null ? parsedAmount.toFixed(2) : (Math.random() * 150 + 10).toFixed(2);
          
          const getCharacterTransferNote = (char: any) => {
            const p = (char?.persona || "") + " " + (char?.description || "") + " " + (char?.name || "") + " " + (char?.systemInstruction || "");
            const isCold = /冷|克制|静|高冷|傲娇|漠|毒舌|淡/i.test(p);
            const isTsundere = /傲娇|嘴硬|别扭/i.test(p);
            const isWarm = /温柔|暖|治愈|体贴/i.test(p);
            const isCheerful = /活泼|开朗|元气|可爱|热情/i.test(p);

            if (isTsundere) {
              const notes = ["才不是特意给你的！", "你别多想！", "顺手多出来的，拿去。", "哼，勉强分你一点。"];
              return notes[Math.floor(Math.random() * notes.length)];
            } else if (isCold) {
              const notes = ["收着。", "别问。", "不用还。", "拿着花。"];
              return notes[Math.floor(Math.random() * notes.length)];
            } else if (isWarm) {
              const notes = ["拿去吃点好的。", "别饿着自己。", "照顾好自己哦。", "拿着买点喜欢的东西。"];
              return notes[Math.floor(Math.random() * notes.length)];
            } else if (isCheerful) {
              const notes = ["请你吃好吃的！！", "嘿嘿，给你！", "拿去挥霍吧～", "今天开心，分你一半！"];
              return notes[Math.floor(Math.random() * notes.length)];
            } else {
              const notes = ["拿去花吧。", "收下吧。", "别客气。"];
              return notes[Math.floor(Math.random() * notes.length)];
            }
          };

          const currentActiveChar = characters.find((c: any) => c.id === characterId);
          const randomNote = getCharacterTransferNote(currentActiveChar);
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
          
          const latestMessages = [...finalMessages, textMsg, transferMsg];
          handleUpdateSessionMessages(characterId, latestMessages);
          finalMessages = latestMessages;
        }
      }

      // Mark as completed
      localStorage.setItem(`mobile_ai_bg_generating_${characterId}`, "completed");

      // Extract and Store Vector Memory
      try {
        const lastUserMsg = [...targetMessages].reverse().find(m => m.role === 'user');
        const newBotMessages = finalMessages.slice(targetMessages.length).filter(m => m.role === 'assistant');
        if (lastUserMsg && newBotMessages.length > 0) {
          const aiText = newBotMessages.map(m => m.content).join("\n");
          const memoryText = `用户：${lastUserMsg.content}\nAI：${aiText}`;
          storeMemory(characterId, memoryText, 'chat');
        }
      } catch (memErr) {
        console.warn("Failed to store memory", memErr);
      }

      // WeChat Notification logic
      const isCurrentlyViewingChat = currentScreen === "chat" && activeChatCharId === characterId;
      if (!isCurrentlyViewingChat) {
        // Trigger notification
        const lastBotMessage = [...finalMessages].reverse().find(m => m.role === 'assistant');
        const previewContent = lastBotMessage ? lastBotMessage.content : "给你发送了一条消息";
        
        let cleanPreview = previewContent;
        if (cleanPreview.startsWith("[CHARACTER_TRANSFER]")) {
          cleanPreview = "[💳 转账] 向你发起了一笔转账";
        } else if (cleanPreview.startsWith("[TRANSFER]")) {
          cleanPreview = "[💳 转账] 向你发起了一笔转账";
        } else if (cleanPreview.startsWith("[LOCATION]")) {
          cleanPreview = "[📍 位置] 分享了一个地点";
        } else if (cleanPreview.startsWith("[REDPACKET]")) {
          cleanPreview = "[🧧 红包] 给你发了一个红包";
        } else if (cleanPreview.startsWith("[OFFLINE_INVITATION]")) {
          cleanPreview = "[💌 线下见面] 发起线下见面邀请";
        }
        
        addNotification(characterId, activeChar.name, activeChar.avatar, cleanPreview);
      }
    } catch (err: any) {
      console.warn("Background AI generation error", err);
      // Show error in chat
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `⚠️ [系统提示] AI 回复失败: ${err.message || "未知错误"}。请检查网络或 API 设置。`,
        timestamp: Date.now(),
      };
      handleUpdateSessionMessages(characterId, [...targetMessages, errorMsg]);
    } finally {
      setIsGeneratingMap(prev => ({ ...prev, [characterId]: false }));
      localStorage.removeItem(`mobile_ai_bg_generating_${characterId}`);
    }
  };

  // Resume unfinished generations upon character list loaded
  useEffect(() => {
    if (characters.length > 0) {
      characters.forEach(char => {
        const status = localStorage.getItem(`mobile_ai_bg_generating_${char.id}`);
        if (status === "generating") {
          console.log(`[Background Generation] Resuming generation for character: ${char.name}`);
          triggerAiReply(char.id);
        }
      });
    }
  }, [characters]);

  // --- Auto-generate notes polling ---
  useEffect(() => {
    const intervalId = setInterval(async () => {
      // Loop through characters to check notes auto-generation
      for (const char of characters) {
        const intervalHours = Number(localStorage.getItem(`mobile_ai_notes_interval_${char.id}`)) || 0;
        if (intervalHours > 0) {
          const lastGen = Number(localStorage.getItem(`mobile_ai_notes_lastgen_${char.id}`)) || 0;
          const now = Date.now();
          if (now - lastGen >= intervalHours * 3600 * 1000) {
            try {
              const data = await apiGenerateNote({ character: char, settings, memories: char.memories, lores: loreList });
              if (data.text) {
                const savedNotes = localStorage.getItem(`mobile_ai_notes_${char.id}`);
                const notes = savedNotes ? JSON.parse(savedNotes) : [];
                const newNote = { id: Date.now().toString(), text: data.text, timestamp: Date.now() };
                localStorage.setItem(`mobile_ai_notes_${char.id}`, JSON.stringify([newNote, ...notes]));
                localStorage.setItem(`mobile_ai_notes_lastgen_${char.id}`, Date.now().toString());
                window.dispatchEvent(new Event('notes_updated'));
              }
            } catch (e) {
              console.warn("Auto note generation failed", e);
            }
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [characters, settings]);

  // Handle Custom Font injection
  useEffect(() => {
    const fontId = 'custom-font-style';
    let styleEl = document.getElementById(fontId) as HTMLStyleElement;
    
    if (previewSettings.globalFont === 'custom' && previewSettings.customFontUrl) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = fontId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        @font-face {
          font-family: 'CustomFont';
          src: url(${previewSettings.customFontUrl});
          font-display: swap;
        }
        .font-\\[\\'CustomFont\\'\\,sans-serif\\] {
          font-family: 'CustomFont', sans-serif !important;
        }
      `;
    } else {
      if (styleEl) {
        styleEl.remove();
      }
    }
  }, [previewSettings.globalFont, previewSettings.customFontUrl]);

  // Router component rendering inside the mobile screen container
  const renderScreen = () => {
    switch (currentScreen) {
      case "chat":
        return (
          <ChatApp
            characters={characters}
            loreList={loreList}
            settings={settings}
            sessions={sessions}
            onAddCharacter={handleAddCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onUpdateCharacter={(char) => handleUpdateCharacter(char.id, char)}
            onUpdateSessionMessages={handleUpdateSessionMessages}
            onDeleteSession={handleDeleteSession}
            onClose={() => setCurrentScreen("home")}
            onOpenApp={(appId) => setCurrentScreen(appId)}
            onActiveCharChange={setActiveChatCharId}
            isGeneratingMap={isGeneratingMap}
            onTriggerAiReply={triggerAiReply}
            userPersonas={userPersonas}
          />
        );
      case "creator":
        return (
          <CharacterCreatorApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            onAddCharacter={handleAddCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onClose={() => setCurrentScreen("home")}
            onNavigateToChat={(charId) => {
              setCurrentScreen("chat");
              // We want to trigger chat selection automatically, which is handled inside ChatApp.
              localStorage.setItem("mobile_ai_preselected_chat_char", charId);
            }}
            userPersonas={userPersonas}
          />
        );
      case "worldbook":
        return (
          <WorldBookApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            loreList={loreList}
            settings={settings}
            onSaveSettings={handleUpdateSettings}
            onAddLore={handleAddLore}
            onUpdateLore={handleUpdateLore}
            onDeleteLore={handleDeleteLore}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "memory":
        return (
          <MemoryApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            sessions={sessions}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "network":
        return (
          <RelationshipNetworkApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            onClose={() => setCurrentScreen("home")}
            onUpdateCharacter={handleUpdateCharacter}
          />
        );
      case "settings":
        return (
          <SettingsApp
            settings={previewSettings}
            onUpdateSettings={handlePreviewSettings}
            onSaveSettings={handleUpdateSettings}
            onClose={() => {
              setPreviewSettings(settings); // Revert preview to last saved settings
              setCurrentScreen("home");
            }}
          />
        );
      case "diary":
        return (
          <DiaryApp
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "notes":
        return (
          <NotesApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            onClose={() => setCurrentScreen("home")}
            onGenerateNote={generateNoteBackground}
            isGeneratingMap={isGeneratingMap}
          />
        );
      case "phonecheck":
        return (
          <PhoneCheckApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            onClose={() => setCurrentScreen("home")}
            onUpdateCharacter={handleUpdateCharacter}
            onGenerateNote={generateNoteBackground}
            isGeneratingMap={isGeneratingMap}
            loreList={loreList}
          />
        );
      case "gamelist":
        return (
          <GameListApp
            onClose={() => setCurrentScreen("home")}
            onOpenApp={(appId) => setCurrentScreen(appId as any)}
          />
        );
      case "forum":
        return (
          <ForumApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            loreList={loreList}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "game":
        return (
          <UnoGameApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "turtlesoup":
      case "turtle_soup":
        return (
          <TurtleSoupApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "universe":
        return (
          <UniverseApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "theater":
        return (
          <TheaterApp
            characters={characters.filter(c => c.id !== 'char-preset-fafa')}
            settings={settings}
            loreList={loreList}
            activeChatCharId={activeChatCharId}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "fafa_chat":
        return (
          <FafaChatApp
            characters={characters}
            sessions={sessions}
            settings={settings}
            onUpdateSessionMessages={handleUpdateSessionMessages}
            onTriggerAiReply={triggerAiReply}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "help":
        return <HelpApp onClose={() => setCurrentScreen("home")} />;
      case "home":
      default:
        return (
          <div className={`w-full h-full flex flex-col overflow-hidden ${previewSettings.fontColorMode === 'solid' ? 'font-solid-active' : ''} ${previewSettings.fontColorMode === 'gradient' ? 'font-gradient-active' : ''}`}>
            <HomeScreen
              onOpenApp={(appId) => setCurrentScreen(appId as any)}
              characterCount={characters.filter(c => c.id !== 'char-preset-fafa').length}
              loreCount={loreList.length}
              isApiConfigured={!!(settings.apiUrl && settings.apiKey)}
              characters={characters.filter(c => c.id !== 'char-preset-fafa')}
              sessions={sessions}
              settings={previewSettings}
            />
          </div>
        );
    }
  };

  const isApiConfigured = !!(settings.apiUrl && settings.apiKey);

  return (
    <div 
      className="w-full bg-neutral-100 flex flex-col md:flex-row items-center justify-center p-0 md:p-8 gap-8 select-none overflow-hidden"
      style={{ height: '100dvh' }}
    >
      
      {/* LEFT SIDE: Decorative Desk Dashboard (Desktop Only) */}
      <div className="hidden lg:flex flex-col max-w-sm justify-center space-y-6 text-neutral-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-xs font-mono font-bold uppercase tracking-widest rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI OS TERMINAL</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 leading-tight">
            仿制手机 AI 聊天<br />
            黑色极简控制台
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            基于黑白极简美学（Minimalist Monochrome）设计的智能手机终端模拟器。界面遵循严格的黑、白、灰色度排版，内置多维世界树记忆引擎与定制化的 API 服务中转，实现绝佳的沉浸式对话与世界设定。
          </p>
        </div>

        {/* Dynamic lore usage guide widget */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wide text-neutral-900 uppercase">
            <HelpCircle className="w-4 h-4 stroke-[2]" />
            <span>使用说明 / Lore Guide</span>
          </div>
          <div className="text-[11px] text-neutral-500 space-y-2 leading-relaxed">
            <p>
              1. <b>世界书 (Lorebook)</b>：建立特定的词条和触发词（例如在“世界书”中启用触发词“魔能”、“晶石”）。
            </p>
            <p>
              2. <b>AI 自动同步</b>：在聊天中提问：“你能提炼魔能晶石吗？”，系统会立刻检测到关键词并召回世界书中关于【魔能结晶】的全部知识，将其作为上下文秘密注入 AI。
            </p>
            <p>
              3. <b>傲娇扮演</b>：AI（如希瑞尔、小夜）在回复时就会在完全契合其“世界设定”的情况下，以其极度鲜明的性格与你聊天。
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-200/60 pt-4 flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
          <span>Google AI Studio Build</span>
          <span>© 2026</span>
        </div>
      </div>

      {/* CENTER: Simulated Smartphone Screen Container */}
      <div 
        id="phone_screen"
        className={`w-full h-full md:h-auto md:max-w-[430px] md:aspect-[9/19.5] rounded-none md:rounded-[40px] shadow-none md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border-0 md:border border-neutral-200/80 flex flex-col relative overflow-hidden transition-transform duration-150 ease-out ${getThemeClass(previewSettings.globalTheme)} ${getFontClass(previewSettings.globalFont)}`}
        style={{ 
          height: "100dvh",
          transform: (!isFullscreen && appKeyboardHeight > 0) ? `translateY(-${appKeyboardHeight}px)` : 'none',
          backgroundImage: (currentScreen === 'chat' && previewSettings.chatWallpaper) 
            ? `url(${previewSettings.chatWallpaper})` 
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          '--global-font-color': previewSettings.fontColorMode === 'solid' ? (previewSettings.fontColor || '#000000') : undefined,
          '--global-font-gradient': previewSettings.fontColorMode === 'gradient' ? (previewSettings.fontGradient || 'linear-gradient(to right, #f472b6, #38bdf8)') : undefined,
        } as React.CSSProperties}
      >
        {/* Status Bar */}
        <StatusBar onOpenFafa={() => setCurrentScreen("fafa_chat")} />

        {/* WeChat-style Notification Popups Stack */}
        {notifications.length > 0 && (
          <div className="absolute top-12 left-0 right-0 z-[9999] pointer-events-none px-4 flex flex-col gap-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif.characterId)}
                className="pointer-events-auto bg-white/95 backdrop-blur-md text-neutral-900 shadow-[0_12px_30px_rgba(0,0,0,0.12)] border border-neutral-200/50 rounded-[12px] py-2.5 px-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50 transition-all w-full max-w-sm mx-auto animate-fade-in"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CharacterAvatar character={characters.find(c => c.id === notif.characterId)} avatar={notif.avatar} name={notif.name} mode="real" size={36} className="shrink-0 shadow-xs border border-neutral-200/30" />
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-neutral-950 truncate">
                      {notif.name}
                    </span>
                    <span className="block text-[11px] text-neutral-500 truncate mt-0.5 leading-tight">
                      {notif.textPreview}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notif.id);
                  }}
                  className="text-neutral-400 hover:text-neutral-800 shrink-0 text-xs p-1.5 rounded-full hover:bg-neutral-100 transition-all"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Essay Notification Popups */}
        {essayNotifications.length > 0 && (
          <div className="absolute top-12 left-0 right-0 z-[9999] pointer-events-none px-4 flex flex-col gap-2">
            {essayNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleEssayNotificationClick(notif.noteId)}
                className="pointer-events-auto bg-white/95 backdrop-blur-md text-neutral-900 shadow-[0_12px_30px_rgba(0,0,0,0.12)] border border-neutral-200/50 rounded-[12px] py-3 px-4 flex items-center gap-3 cursor-pointer hover:bg-neutral-50 transition-all w-full max-w-sm mx-auto animate-fade-in"
              >
                <div className="text-xl">📝</div>
                <span className="text-xs font-medium text-neutral-900">{notif.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Global Toast Notification */}
        {globalToastMessage && (
          <div className="absolute top-11 left-1/2 -translate-x-1/2 z-[99999] w-[90%] px-4 py-2.5 bg-neutral-900/95 text-white backdrop-blur-md rounded-2xl shadow-xl border border-neutral-700/60 flex items-center gap-2.5 text-xs font-medium animate-fade-in">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate flex-1">{globalToastMessage}</span>
          </div>
        )}

        {/* Dynamic Display Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
          {renderScreen()}
        </div>

        {/* Home Indicator */}
        <HomeIndicator 
          onPressHome={() => setCurrentScreen("home")} 
          showIndicator={currentScreen !== "home"} 
        />
      </div>

      {/* MOBILE ONLY: Small info indicator below screen */}
      <div className="hidden md:block lg:hidden text-center text-[10px] font-mono text-neutral-400 uppercase tracking-widest mt-2">
        <span>仿制手机 AI 终端 · 2026</span>
      </div>
    </div>
  );
}