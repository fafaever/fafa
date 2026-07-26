// Helper to generate a default avatar when realImage is missing
export const getCharacterAvatar = (
  character: {
    name: string;
    avatar?: string;
    realImage?: string;
    chatAvatar?: string;
  },
  context: 'chat' | 'forum' | 'other'
): string => {
  if (context === 'chat' && character.chatAvatar) return character.chatAvatar;
  // Forum context is handled by ForumApp itself, but here is a safe default
  if (context === 'other' && character.realImage) return character.realImage;

  // Fallback for context === 'other' when realImage is missing
  if (context === 'other' && !character.realImage) {
    return getDefaultAvatar(character.name);
  }

  // Fallback for chat avatar missing
  return character.avatar || getDefaultAvatar(character.name);
};

export const getDefaultAvatar = (name: string): string => {
    // Generate a pseudo-random deterministic avatar based on name
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const defaults = Array.from({ length: 17 }, (_, i) => `/images/luntan/luntan_${(i + 1).toString().padStart(2, '0')}.jpg`);
    return defaults[hash % defaults.length];
};
