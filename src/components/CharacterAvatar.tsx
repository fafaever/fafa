import React from 'react';
import { Character } from '../types';

interface CharacterAvatarProps {
  character?: Character;
  avatar?: string;
  name?: string;
  mode?: 'chat' | 'real';
  className?: string;
  size?: number;
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ 
  character, 
  avatar: rawAvatar,
  name: rawName,
  mode = 'real', 
  className = "", 
  size = 40 
}) => {
  const avatar = rawAvatar || (mode === 'chat' 
    ? (character?.chatAvatar || character?.realAvatar || character?.realImage || character?.avatar)
    : (character?.realAvatar || character?.realImage || character?.avatar));

  const name = rawName || character?.name || "Avatar";

  const isImageUrl = typeof avatar === 'string' && (avatar.startsWith('/') || avatar.startsWith('data:') || avatar.startsWith('http'));

  // Default Line Art SVG
  const DefaultLineArt = () => (
    <svg 
      viewBox="0 0 100 100" 
      className="w-full h-full bg-neutral-50 text-neutral-400"
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
    >
      <circle cx="50" cy="40" r="15" />
      <path d="M25 85 C 25 65, 75 65, 75 85" strokeLinecap="round" />
      <rect x="0" y="0" width="100" height="100" stroke="none" fill="none" />
    </svg>
  );

  return (
    <div 
      className={`rounded-full overflow-hidden flex items-center justify-center bg-neutral-100 border border-neutral-100 shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {isImageUrl ? (
        <img 
          src={avatar as string} 
          alt={name} 
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement?.classList.add('bg-neutral-50');
          }}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
           {typeof avatar === 'string' && avatar.length <= 2 ? (
             <span style={{ fontSize: size * 0.6 }}>{avatar}</span>
           ) : (
             <DefaultLineArt />
           )}
        </div>
      )}
    </div>
  );
};
