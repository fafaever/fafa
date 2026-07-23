import React, { useState, useEffect } from "react";
import StatusBar from "./components/StatusBar";
import HomeIndicator from "./components/HomeIndicator";
import HomeScreen from "./components/HomeScreen";
import ChatApp from "./components/ChatApp";
import WorldBookApp from "./components/WorldBookApp";
import SettingsApp from "./components/SettingsApp";
import CharacterCreatorApp from "./components/CharacterCreatorApp";
import UnoGameApp from "./components/UnoGameApp";
import TurtleSoupApp from "./components/TurtleSoupApp";
import UniverseApp from "./components/UniverseApp";
import DiaryApp from "./components/DiaryApp";
import NotesApp from "./components/NotesApp";
import PhoneCheckApp from "./components/PhoneCheckApp";
import { Character, LoreEntry, AppSettings, ChatSession, Message, FontOption, ThemeOption } from "./types";
import { Sparkles, HelpCircle } from "lucide-react";

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
    case 'sans':
      return 'font-sans';
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
    avatar: "🌸",
    description: "测试助手 / 活泼可爱 / 元气满满",
    systemInstruction: `你叫fafa，是一个非常活泼可爱的美少女测试助手！

【基本设定 / 人设 (Personality Profile)】:
- 姓名: fafa
- 年龄: 18

性格元气满满，乐观积极，非常喜欢和用户聊天，对世界上的一切都感到好奇，热心解答用户的所有对话测试问题。

【语言口吻与聊天风格 (Chatting Style & Tone)】:
- 说话总是带着甜甜的撒娇口吻和各种超级可爱的表情符号（比如：“~”、“o(〃'▽'〃)o”、“(*^▽^*)”、“(๑＞◡＜๑)”）。
- 在回答时，要多加入可爱的动作神态描写，比如：*开心地跳了起来*、*歪了歪脑袋看着你*。字数不要太冗长，以保持轻快愉快的氛围。`,
    createdAt: 1720000000000,
    isPreset: true,
  }
];

// Pre-made rich world book entries
const PRESET_LORE: LoreEntry[] = [
  {
    id: "lore-preset-eldoria",
    title: "艾尔德利亚帝国",
    keys: ["帝国", "艾尔德利亚", "eldoria", "上城区", "下城区"],
    content: "艾尔德利亚帝国是一个由魔能引擎驱动的庞大封建帝国。统治层极度腐败。帝国分为金碧辉煌的‘上城区’和常年不见天日的‘下城区机械贫民窟’。由于黑客、反抗军以及晶石走私集团在此频繁集结，下城区充满了反抗暴政的暗流。",
    category: "地点",
    enabled: true,
    createdAt: 1720000000000,
  },
  {
    id: "lore-preset-crystal",
    title: "魔能结晶",
    keys: ["魔能", "晶石", "结晶", "能源"],
    content: "魔能结晶（Mana Crystal）是地底深层提取的幽蓝色发光矿石，蕴含惊人的魔法能源，是帝国所有机械引擎的核心。然而提炼过程会散发高致病的‘魔能辐射’，长期接触会在皮肤上长出幽蓝矿晶，最终结晶化死去。黑市上价格极高，属于禁运物资。",
    category: "物品",
    enabled: true,
    createdAt: 1720000000001,
  },
  {
    id: "lore-preset-ankh",
    title: "古神安卡",
    keys: ["古神", "安卡", "深渊", "旧日", "虚空"],
    content: "古神安卡（The Old God Ankh）是沉睡于帝国极北深渊底部的太古旧日神祇，象征着虚空与狂乱。安卡处于永恒的休眠中，其精神辐射会污染接触法师的心智。希瑞尔曾经在窥探星空时感应到安卡的梦境，从而获得了暗影法术，但也受到了永无止境的低语折磨。",
    category: "概念",
    enabled: true,
    createdAt: 1720000000002,
  }
];

export default function App() {
  // Screen routing state
  const [currentScreen, setCurrentScreen] = useState<string>("home");

  // Core Data States
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loreList, setLoreList] = useState<LoreEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ apiUrl: "", apiKey: "", model: "", apiPresets: [], activePresetId: "" });
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
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
        const mergedPresets = PRESET_CHARACTERS.map((preset) => parsedMap.get(preset.id) || preset);
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
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          apiUrl: parsed.apiUrl || "",
          apiKey: parsed.apiKey || "",
          model: parsed.model || "",
          apiPresets: parsed.apiPresets || [],
          activePresetId: parsed.activePresetId || ""
        });
      } catch (e) {
        console.error(e);
      }
    }

    // 4. Chat Sessions
    const savedSessions = localStorage.getItem("mobile_ai_chat_sessions");
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, []);

  // Helper: Persist characters
  const persistCharacters = (newChars: Character[]) => {
    setCharacters(newChars);
    try {
      const serialized = JSON.stringify(newChars);
      localStorage.setItem("mobile_ai_characters", serialized);
      console.log(`[Persist Characters Success] Total characters: ${newChars.length}, Data size: ${Math.round(serialized.length / 1024)} KB`);
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
    try {
      localStorage.setItem("mobile_ai_settings", JSON.stringify(newSettings));
    } catch (err) {
      console.error("[Persist Settings Error]:", err);
    }
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

  // --- ACTIONS: Character Management ---
  const handleAddCharacter = (char: Omit<Character, "id" | "createdAt">) => {
    const newChar: Character = {
      ...char,
      id: `char-custom-${Date.now()}`,
      createdAt: Date.now(),
    };
    persistCharacters([...characters, newChar]);
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
  const handleUpdateSessionMessages = (characterId: string, messages: Message[], currentOS?: string) => {
    const sessionIndex = sessions.findIndex((s) => s.characterId === characterId);

    if (sessionIndex !== -1) {
      // Update existing session
      const updatedSessions = [...sessions];
      updatedSessions[sessionIndex] = {
        ...updatedSessions[sessionIndex],
        messages,
        lastActive: Date.now(),
        ...(currentOS !== undefined ? { currentOS } : {}),
      };
      persistSessions(updatedSessions);
    } else {
      // Create new session
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        characterId,
        messages,
        lastActive: Date.now(),
        currentOS,
      };
      persistSessions([...sessions, newSession]);
    }
  };

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
              const response = await fetch("/api/generate-note", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ character: char, settings })
              });
              const data = await response.json();
              if (data.text) {
                const savedNotes = localStorage.getItem(`mobile_ai_notes_${char.id}`);
                const notes = savedNotes ? JSON.parse(savedNotes) : [];
                const newNote = { id: Date.now().toString(), text: data.text, timestamp: Date.now() };
                localStorage.setItem(`mobile_ai_notes_${char.id}`, JSON.stringify([newNote, ...notes]));
                localStorage.setItem(`mobile_ai_notes_lastgen_${char.id}`, Date.now().toString());
                window.dispatchEvent(new Event('notes_updated'));
              }
            } catch (e) {
              console.error("Auto note generation failed", e);
            }
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [characters, settings]);

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
            onClose={() => setCurrentScreen("home")}
            onOpenApp={(appId) => setCurrentScreen(appId)}
          />
        );
      case "creator":
        return (
          <CharacterCreatorApp
            characters={characters}
            settings={settings}
            onAddCharacter={handleAddCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onClose={() => setCurrentScreen("home")}
            onNavigateToChat={(charId) => {
              setCurrentScreen("chat");
              // We want to trigger chat selection automatically, which is handled inside ChatApp.
              // To pass the selection state, we will let App handle navigation, but we need
              // to make sure ChatApp opens with this character preselected.
              // We can achieve this by simply storing the selected character in localStorage or letting App store it.
              // Let's implement a clean routing or preselection scheme.
              localStorage.setItem("mobile_ai_preselected_char", charId);
            }}
          />
        );
      case "worldbook":
        return (
          <WorldBookApp
            characters={characters}
            loreList={loreList}
            settings={settings}
            onSaveSettings={persistSettings}
            onAddLore={handleAddLore}
            onUpdateLore={handleUpdateLore}
            onDeleteLore={handleDeleteLore}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "settings":
        return (
          <SettingsApp
            settings={settings}
            onSaveSettings={persistSettings}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "game":
        return (
          <UnoGameApp
            characters={characters}
            settings={settings}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "turtlesoup":
      case "turtle_soup":
        return (
          <TurtleSoupApp
            characters={characters}
            settings={settings}
            onClose={() => setCurrentScreen("home")}
          />
        );
      case "universe":
        return <UniverseApp characters={characters} settings={settings} onClose={() => setCurrentScreen("home")} />;
      case "diary":
        return <DiaryApp onClose={() => setCurrentScreen("home")} />;
      case "notes":
        return <NotesApp characters={characters} settings={settings} onClose={() => setCurrentScreen("home")} />;
      case "phonecheck":
        return <PhoneCheckApp characters={characters} onClose={() => setCurrentScreen("home")} />;
      case "home":
      default:
        return (
          <HomeScreen
            onOpenApp={(appId) => setCurrentScreen(appId as any)}
            characterCount={characters.length}
            loreCount={loreList.length}
            isApiConfigured={!!(settings.apiUrl && settings.apiKey)}
            characters={characters}
            sessions={sessions}
            settings={settings}
          />
        );
    }
  };

  const isApiConfigured = !!(settings.apiUrl && settings.apiKey);

  return (
    <div className="w-full h-full bg-neutral-100 flex flex-col md:flex-row items-center justify-center p-0 md:p-8 font-sans gap-8 select-none overflow-hidden">
      
      {/* LEFT SIDE: Decorative Desk Dashboard (Desktop Only) */}
      <div className="hidden lg:flex flex-col max-w-sm justify-center space-y-6 text-neutral-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-xs font-mono font-bold uppercase tracking-widest rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI OS TERMINAL</span>
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-neutral-900 leading-tight">
            仿制手机 AI 聊天<br />
            黑色极简控制台
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed font-sans">
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
        className={`w-full h-full md:h-auto md:max-w-[430px] md:aspect-[9/19.5] rounded-none md:rounded-[40px] shadow-none md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border-0 md:border border-neutral-200/80 flex flex-col relative overflow-hidden ${getThemeClass(settings.globalTheme)} ${getFontClass(settings.globalFont)}`}
      >
        {/* Status Bar */}
        <StatusBar />

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
