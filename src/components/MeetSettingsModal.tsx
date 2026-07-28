import React, { useState } from "react";
import { X } from "lucide-react";

interface MeetSettingsModalProps {
  onClose: () => void;
  onStartMeet: (plot: string) => void;
}

export const MeetSettingsModal: React.FC<MeetSettingsModalProps> = ({ onClose, onStartMeet }) => {
  const [plot, setPlot] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl border border-neutral-100">
        <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
          <span className="font-bold text-sm text-neutral-900">线下见面设定</span>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">剧情描述</label>
            <textarea
              placeholder="设定这次见面的缘由和剧情..."
              value={plot}
              onChange={(e) => setPlot(e.target.value)}
              className="w-full text-xs border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none h-24"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50"
            >
              取消
            </button>
            <button
              onClick={() => onStartMeet(plot)}
              className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              开始见面
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
