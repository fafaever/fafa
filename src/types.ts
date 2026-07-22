export interface Character {
  id: string;
  name: string;
  avatar: string; // Emoji or image URL
  description: string;
  systemInstruction: string;
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
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  matchedLoreKeys?: string[];
  isRecalled?: boolean;
  quotedMsg?: Message;
  type?: 'transfer' | 'text' | string;
  transferData?: {
    amount: string;
    note: string;
    status: 'pending' | 'collected' | 'returned';
    transferId: string;
  };
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
}

export interface AppSettings {
  apiUrl: string;
  apiKey: string;
  model: string;
  apiPresets?: ApiPreset[];
  activePresetId?: string;
  worldBookGroups?: string[];
}

export interface ChatSession {
  id: string;
  characterId: string;
  messages: Message[];
  lastActive: number;
  currentOS?: string;
}
