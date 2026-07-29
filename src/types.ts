export interface BoundNPC {
  id: string;
  name: string;
  avatar?: string; // Emoji or image
  relationship?: string; // 身份/关系 (如: "大学室友", "社团学长", "咖啡馆店长")
  description?: string; // 简短描述/性格特点
}

export interface ExtractionSettings {
  dailyExtractionTime?: string; // e.g. "23:00"
  lastExtractionTimestamp?: number;
  vectorScope?: {
    online?: { enabled: boolean; startDate?: string; endDate?: string; };
    story?: { enabled: boolean; selectAll?: boolean; };
    other?: { enabled: boolean; types: string[]; };
  };
}

export interface Character {
  id: string;
  name: string;
  nickname?: string;
  avatar: string; // Emoji or image URL
  description: string;
  systemInstruction: string;
  model?: string; // Specific AI model for this character
  createdAt: number;
  isPreset?: boolean;
  realImage?: string;  // Base64 or Image URL for real appearance
  chatAvatar?: string; // Base64 or Image URL for chat avatar
  group?: string; // Grouping for contacts
  notes?: string; // Personal notes for this character
  isBlocked?: boolean; // Block status
  blockedAt?: number; // Time when blocked
  isSubAccount?: boolean; // Whether this is an alt-account
  parentCharacterId?: string; // Parent character ID
  parentCharacterName?: string; // Parent character name
  purpose?: string; // Alt-account purpose setting
  isBusted?: boolean; // Whether the alt-account is busted
  bustQuestionsCount?: number; // Count of persistent questioning
  memories?: any[]; // Character long term memories
  lores?: any[]; // Character world book settings
  userPersonaId?: string; // Bound User Persona ID
  boundNpcs?: BoundNPC[]; // 角色专属绑定的 NPC 好友列表 (至少 3 个)
  associatedCharacterIds?: string[]; // 关联角色 ID 列表
  associatedRelations?: Record<string, string>; // 关联关系设定映射 { [characterId]: 关系设定描述 }
  extractionSettings?: ExtractionSettings;
  personality?: string;
  background?: string;
  persona?: string;
}

export interface UserPersona {
  id: string;
  name: string;
  avatar: string; // Base64 or Image URL or Emoji
  description: string; // The introduction (自由文本输入框)
  createdAt: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  matchedLoreKeys?: string[];
  isRecalled?: boolean;
  quotedMsg?: Message;
  type?: 'transfer' | 'text' | 'moment' | string;
  transferData?: {
    amount: string;
    note: string;
    status: 'pending' | 'collected' | 'returned';
    transferId: string;
  };
  momentData?: MomentPost;
  image?: string;
  os?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  offlineMeetCardData?: any;
}

export interface LoreEntry {
  id: string;
  title: string;
  keys: string[]; // Keyword triggers for retrieval
  content: string;
  category: string; // e.g., "人物" (Character), "地点" (Place), "物品" (Item), "概念" (Concept), "其它" (Other)
  enabled: boolean;
  createdAt: number;
  characterIds?: string[]; // Empty/undefined means all characters, otherwise specific characters
  priority?: "pre" | "mid" | "post"; // Priority level: pre (前), mid (中), post (后)
  mountType?: "always" | "trigger"; // Mounting type: always (始终常规挂载), trigger (关键词触发)
}

export interface ApiPreset {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  apiFormat?: 'openai' | 'gemini';
}

export interface ImageGenPreset {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
}

export type FontOption = 'system' | 'playfair_inter' | 'kaiti' | 'nunito' | 'sans' | 'custom';
export type ThemeOption = 'minimal_white' | 'warm_paper' | 'dark_night';

export interface ThemePreset {
  id: string;
  name: string;
  homeWallpaper?: string;
  homeWallpaper2?: string;
  appIcons?: Record<string, string>;
  globalFont?: FontOption;
  customFontUrl?: string;
  fontColorMode?: 'black' | 'solid' | 'gradient';
  fontColor?: string;
  fontGradient?: string;
  fontGradientFrom?: string;
  fontGradientTo?: string;
  fontGradientDirection?: 'to bottom' | 'to right';
}

export interface AppSettings {
  apiUrl: string;
  apiKey: string;
  model: string;
  apiFormat?: 'openai' | 'gemini';
  temperature?: number;
  subApiUrl?: string;
  subApiKey?: string;
  subModel?: string;
  subApiFormat?: 'openai' | 'gemini';
  subTemperature?: number;
  vectorApiUrl?: string;
  vectorApiKey?: string;
  vectorModel?: string;
  vectorDimension?: number;
  rerankModel?: string;
  apiPresets?: ApiPreset[];
  activePresetId?: string;
  worldBookGroups?: string[];
  homeWallpaper?: string;
  homeWallpaper2?: string;
  chatWallpaper?: string;
  globalFont?: FontOption;
  customFontUrl?: string; // For custom TTF upload
  fontColorMode?: 'black' | 'solid' | 'gradient';
  fontColor?: string;
  fontGradient?: string;
  fontGradientFrom?: string;
  fontGradientTo?: string;
  fontGradientDirection?: 'to bottom' | 'to right';
  globalTheme?: ThemeOption;
  groupChatMinReplies?: number;
  groupChatMaxReplies?: number;
  appIcons?: Record<string, string>; // appKey -> iconUrl (Base64)
  themePresets?: ThemePreset[];
  activeThemePresetId?: string;
  imageGenApiUrl?: string;
  imageGenApiKey?: string;
  imageGenModel?: string;
  imageGenPresets?: ImageGenPreset[];
}

export interface ChatSession {
  id: string;
  characterId?: string;
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  memberIds?: string[];
  syncMemory?: boolean;
  worldSetting?: string;
  messages: Message[];
  lastActive: number;
  currentOS?: string;
}

export interface Memory {
  id: string;
  characterId: string;
  text: string;
  timestamp: number;
  layer: 1 | 2 | 3;
  source: string;
  isShared?: boolean;
  isSimplified?: boolean;
  sourceDialogue?: string;
}

export interface MomentComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  isNpc?: boolean;
  characterId?: string;
  content: string;
  replyToName?: string;
  timestamp: number;
}

export interface MomentPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  characterId?: string;
  isCharacter?: boolean;
  content: string;
  image?: string;
  mediaEmojis?: string;
  timestamp: number;
  likes: number;
  likedByUser?: boolean;
  visibility?: "all" | "visible_some" | "invisible_some";
  targetCharacterIds?: string[];
  comments?: MomentComment[];
}
