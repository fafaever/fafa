import React, { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, Edit3, Check, Wand2, Loader2, Share2, Lock } from "lucide-react";
import { apiGenerateNote } from "../lib/api";

import { Character, AppSettings } from "../types";

interface Note {
  id: string;
  text: string;
  timestamp: number;
  isShared?: boolean;
}

interface NotesAppProps {
  characters: Character[];
  settings: AppSettings;
  onClose: () => void;
}

export default function NotesApp({ characters, settings, onClose }: NotesAppProps) {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoGenerateInterval, setAutoGenerateInterval] = useState(0);
  const [shareEnabled, setShareEnabled] = useState(false);

  // Load notes for selected character
  useEffect(() => {
    if (!selectedCharId) return;
    
    const saved = localStorage.getItem(`mobile_ai_notes_${selectedCharId}`);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {}
    } else {
      setNotes([]);
    }
    
    const savedInterval = localStorage.getItem(`mobile_ai_notes_interval_${selectedCharId}`);
    setAutoGenerateInterval(savedInterval ? Number(savedInterval) : 0);

    const savedSharePref = localStorage.getItem(`mobile_ai_notes_share_${selectedCharId}`);
    setShareEnabled(savedSharePref === "true");

    const handleNotesUpdated = () => {
      const updatedSaved = localStorage.getItem(`mobile_ai_notes_${selectedCharId}`);
      if (updatedSaved) {
        try {
          setNotes(JSON.parse(updatedSaved));
        } catch (e) {}
      }
    };
    window.addEventListener('notes_updated', handleNotesUpdated);
    return () => window.removeEventListener('notes_updated', handleNotesUpdated);
  }, [selectedCharId]);

  const handleIntervalChange = (val: number) => {
    setAutoGenerateInterval(val);
    if (selectedCharId) {
      localStorage.setItem(`mobile_ai_notes_interval_${selectedCharId}`, val.toString());
    }
  };

  const toggleShare = () => {
    const newVal = !shareEnabled;
    setShareEnabled(newVal);
    if (selectedCharId) {
      localStorage.setItem(`mobile_ai_notes_share_${selectedCharId}`, newVal.toString());
    }
  };

  const saveNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    if (selectedCharId) {
      localStorage.setItem(`mobile_ai_notes_${selectedCharId}`, JSON.stringify(newNotes));
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("确定删除这条随笔吗？")) {
      saveNotes(notes.filter(n => n.id !== id));
    }
  };

  const handleGenerate = async () => {
    const selectedChar = characters.find(c => c.id === selectedCharId);
    if (!selectedChar) return;
    
    setIsGenerating(true);
    try {
      const data = await apiGenerateNote({ character: selectedChar, settings });
      if (data.text) {
        const isSharedRandomly = shareEnabled && Math.random() > 0.5; // Randomly share some if global share is on
        const newNote: Note = { 
          id: Date.now().toString(), 
          text: data.text, 
          timestamp: Date.now(),
          isShared: isSharedRandomly
        };
        saveNotes([newNote, ...notes]);
      }
    } catch (e: any) {
      console.error("生成随笔失败:", e);
      alert(`生成失败，请重试 (${e.message})`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Gallery View
  if (!selectedCharId) {
    return (
      <div className="flex-1 flex flex-col bg-neutral-50 animate-fade-in relative h-full">
        <div className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-3 shrink-0 sticky top-0 z-10">
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-neutral-900">角色随笔</span>
          <div className="w-8" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {characters.length === 0 ? (
            <div className="text-center text-xs text-neutral-400 mt-10 font-sans">
              暂无角色，请先创建角色
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {characters.map(char => {
                const charNotes = JSON.parse(localStorage.getItem(`mobile_ai_notes_${char.id}`) || "[]");
                const notesCount = charNotes.length;
                // Just as a visual cue, if they have notes, maybe show a dot
                const hasNew = notesCount > 0 && Math.random() > 0.7; // Simulated unread dot

                return (
                  <button
                    key={char.id}
                    onClick={() => setSelectedCharId(char.id)}
                    className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col items-center justify-center gap-3 transition-all hover:shadow-md active:scale-95 relative group"
                  >
                    {hasNew && (
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" />
                    )}
                    <div className="w-16 h-16 rounded-full bg-neutral-100 border border-neutral-200/50 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                      {char.chatAvatar ? (
                        <img src={char.chatAvatar} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        char.avatar || "👤"
                      )}
                    </div>
                    <div className="text-center w-full">
                      <div className="font-bold text-sm text-neutral-900 truncate mb-1">{char.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono bg-neutral-50 px-2 py-0.5 rounded-full inline-block border border-neutral-100">
                        {notesCount} 篇随笔
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Notes List View
  const selectedChar = characters.find(c => c.id === selectedCharId);

  return (
    <div className="flex-1 flex flex-col bg-neutral-50 animate-fade-in relative h-full">
      <div className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-3 shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedCharId(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200/50">
              {selectedChar?.chatAvatar ? (
                <img src={selectedChar.chatAvatar} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-xs">{selectedChar?.avatar || "👤"}</span>
              )}
            </div>
            <span className="font-bold text-sm text-neutral-900 truncate max-w-[120px]">
              {selectedChar?.name}的随笔
            </span>
          </div>
        </div>
        <button 
          onClick={toggleShare}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all ${
            shareEnabled 
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
              : "bg-neutral-100 text-neutral-500 border border-neutral-200 hover:bg-neutral-200"
          }`}
        >
          {shareEnabled ? <Share2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {shareEnabled ? "分享到聊天" : "不分享"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Controls Section */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col gap-4 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800">生成设置</span>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-black rounded-lg active:scale-95 transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {isGenerating ? "生成中..." : "生成"}
            </button>
          </div>
          <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border border-neutral-100">
            <span className="text-xs text-neutral-600">自动生成频率</span>
            <div className="flex items-center gap-1.5 text-xs text-neutral-900 font-bold font-mono">
              <input 
                type="number" 
                min="0" 
                max="72"
                value={autoGenerateInterval}
                onChange={(e) => handleIntervalChange(Number(e.target.value) || 0)}
                className="w-12 px-2 py-1 text-center bg-white rounded-md outline-none border border-neutral-200 focus:border-black transition-colors"
              />
              <span className="text-neutral-500 font-sans font-normal">小时/篇</span>
            </div>
          </div>
        </div>

        {/* Notes List */}
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 opacity-60">
            <div className="text-4xl mb-4 grayscale">🪶</div>
            <p className="text-center text-xs text-neutral-500 font-sans tracking-wide">
              ta还没写什么…<br/>也许在等一个安静的时刻。
            </p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col gap-3 group relative overflow-hidden">
              <p className="text-sm text-neutral-800 whitespace-pre-wrap font-sans leading-relaxed">
                {note.text}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-2">
                  {formatRelativeTime(note.timestamp)}
                  {note.isShared && (
                    <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 text-[9px] font-sans">
                      已分享
                    </span>
                  )}
                </span>
                
                <button 
                  onClick={() => handleDelete(note.id)} 
                  className="opacity-0 group-hover:opacity-100 lg:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Helper for relative time formatting
function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}