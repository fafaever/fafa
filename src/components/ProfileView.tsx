import React, { useState } from "react";
import { ChevronLeft, Edit, MessageSquare } from "lucide-react";
import { Character } from "../types";

interface ProfileViewProps {
  character: Character;
  allCharacters: Character[];
  onBack: () => void;
  onUpdateCharacter: (char: Character) => void;
  onStartChat: (id: string) => void;
  onCreateSubAccount?: (parentId: string) => void;
}

export default function ProfileView({ character, allCharacters, onBack, onUpdateCharacter, onStartChat, onCreateSubAccount }: ProfileViewProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(character.notes || "");
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [group, setGroup] = useState(character.group || "其它");

  const existingGroups = Array.from(new Set(allCharacters.map(c => c.group || "其它")));

  const handleSaveNotes = () => {
    onUpdateCharacter({ ...character, notes });
    setIsEditingNotes(false);
  };

  const handleSaveGroup = () => {
    onUpdateCharacter({ ...character, group });
    setIsEditingGroup(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-50 h-full animate-fade-in">
      {/* Header */}
      <div className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-3 shrink-0">
        <button onClick={onBack} className="p-1.5 hover:bg-neutral-100 rounded-lg transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm text-neutral-900">角色资料</span>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-sm border border-neutral-200">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 flex items-center justify-center text-4xl shadow-inner shrink-0">
            {character.chatAvatar ? (
              <img src={character.chatAvatar} alt={character.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              character.avatar || "🤖"
            )}
          </div>
          <h2 className="text-xl font-bold text-neutral-950">{character.name}</h2>
          <p className="text-sm text-neutral-500 text-center">{character.description}</p>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl p-4 space-y-4 shadow-sm border border-neutral-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">拉黑</span>
            <button 
              onClick={() => onUpdateCharacter({ 
                ...character, 
                isBlocked: !character.isBlocked,
                blockedAt: !character.isBlocked ? Date.now() : undefined 
              })}
              className={`text-sm ${character.isBlocked ? 'text-red-600' : 'text-neutral-400'}`}
            >
              {character.isBlocked ? '已拉黑' : '拉黑'}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">分组</span>
            <div className="flex items-center gap-2">
              {isEditingGroup ? (
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="text-sm border rounded-lg p-1"
                >
                  {existingGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  <option value="NEW">自定义...</option>
                </select>
              ) : (
                <span className="text-sm font-medium text-neutral-900">{character.group || "其它"}</span>
              )}
              <button onClick={() => isEditingGroup ? handleSaveGroup() : setIsEditingGroup(true)} className="text-blue-600 text-sm">
                <Edit className="w-4 h-4" />
              </button>
            </div>
          </div>
          {isEditingGroup && (
            <input
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="输入新分组名称"
            />
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">备注</span>
            <button onClick={() => setIsEditingNotes(true)} className="text-blue-600 text-sm">
              <Edit className="w-4 h-4" />
            </button>
          </div>
          {isEditingNotes ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
              rows={3}
            />
          ) : (
            <p className="text-sm text-neutral-900">{notes || "暂无备注"}</p>
          )}
          {isEditingNotes && (
            <button onClick={handleSaveNotes} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm">保存</button>
          )}
        </div>

        {/* Start Chat Button */}
        <button 
          onClick={() => onStartChat(character.id)}
          className="w-full py-3 bg-white border border-neutral-200 rounded-2xl flex items-center justify-center gap-2 text-blue-600 font-bold shadow-sm"
        >
          <MessageSquare className="w-5 h-5" />
          发信息
        </button>

        {!character.isSubAccount && onCreateSubAccount && (
          <button 
            onClick={() => onCreateSubAccount(character.id)}
            className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-2xl flex items-center justify-center gap-2 text-neutral-800 font-bold shadow-sm transition active:scale-95"
          >
            👤 创建小号 (Create Sub-Account)
          </button>
        )}
      </div>
    </div>
  );
}
