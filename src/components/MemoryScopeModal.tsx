import React, { useState } from "react";
import { X, CheckCircle2, Circle, Calendar, BookOpen, Layers } from "lucide-react";
import { ExtractionSettings } from "../types";

interface MemoryScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: ExtractionSettings["vectorScope"]) => void;
}

export function MemoryScopeModal({ isOpen, onClose, onConfirm }: MemoryScopeModalProps) {
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [storyEnabled, setStoryEnabled] = useState(true);
  const [otherEnabled, setOtherEnabled] = useState(true);
  const [otherTypes, setOtherTypes] = useState<string[]>(['game', 'universe', 'phone']);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      online: { enabled: onlineEnabled, startDate, endDate },
      story: { enabled: storyEnabled, selectAll: true },
      other: { enabled: otherEnabled, types: otherTypes }
    });
  };

  const toggleOtherType = (type: string) => {
    setOtherTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900">向量记忆提取设置</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <p className="text-xs text-neutral-400 leading-relaxed">
            向量记忆启动后，系统将根据您的选择对历史数据进行向量化处理，以便角色在聊天中实现精准的语义检索。
          </p>

          {/* Online Memories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">线上记忆</h4>
                  <p className="text-[11px] text-neutral-400">提取主聊天记录</p>
                </div>
              </div>
              <button onClick={() => setOnlineEnabled(!onlineEnabled)} className="text-neutral-900">
                {onlineEnabled ? <CheckCircle2 className="w-6 h-6 text-black" /> : <Circle className="w-6 h-6 text-neutral-200" />}
              </button>
            </div>
            
            {onlineEnabled && (
              <div className="grid grid-cols-2 gap-3 pl-11">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-400 font-bold ml-1 uppercase tracking-wider">起始日期</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-black transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-400 font-bold ml-1 uppercase tracking-wider">终止日期</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-black transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Story Memories */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-500 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">剧情记忆</h4>
                <p className="text-[11px] text-neutral-400">仅包含线下见面模式记忆</p>
              </div>
            </div>
            <button onClick={() => setStoryEnabled(!storyEnabled)} className="text-neutral-900">
              {storyEnabled ? <CheckCircle2 className="w-6 h-6 text-black" /> : <Circle className="w-6 h-6 text-neutral-200" />}
            </button>
          </div>

          {/* Other Memories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">其他记忆</h4>
                  <p className="text-[11px] text-neutral-400">游戏、宇宙、手机记录等</p>
                </div>
              </div>
              <button onClick={() => setOtherEnabled(!otherEnabled)} className="text-neutral-900">
                {otherEnabled ? <CheckCircle2 className="w-6 h-6 text-black" /> : <Circle className="w-6 h-6 text-neutral-200" />}
              </button>
            </div>

            {otherEnabled && (
              <div className="flex flex-wrap gap-2 pl-11">
                {[
                  { id: 'game', name: '游戏 (UNO/海龟汤)' },
                  { id: 'universe', name: '宇宙 (穿越游戏)' },
                  { id: 'phone', name: '查手机记录' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => toggleOtherType(type.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                      otherTypes.includes(type.id)
                        ? "bg-black text-white border-black"
                        : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-neutral-100 flex gap-3 bg-neutral-50/50">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-neutral-500 hover:bg-neutral-100 transition-all"
          >
            取消
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-[2] py-3.5 bg-black text-white rounded-2xl text-sm font-bold shadow-lg shadow-black/10 active:scale-[0.98] transition-all"
          >
            确认并开启向量化
          </button>
        </div>
      </div>
    </div>
  );
}
