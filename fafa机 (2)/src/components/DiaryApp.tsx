import React, { useState, useEffect } from "react";
import { ChevronLeft, Save } from "lucide-react";

interface DiaryAppProps {
  onClose: () => void;
}

export default function DiaryApp({ onClose }: DiaryAppProps) {
  const [diaryText, setDiaryText] = useState("");
  const [mood, setMood] = useState("平静");
  const [isSaved, setIsSaved] = useState(false);
  const dateKey = new Date().toISOString().split("T")[0]; // Use today's date as key

  useEffect(() => {
    const saved = localStorage.getItem(`mobile_ai_diary_${dateKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDiaryText(parsed.text || "");
        setMood(parsed.mood || "平静");
      } catch (e) {}
    }
  }, [dateKey]);

  const handleSave = () => {
    localStorage.setItem(`mobile_ai_diary_${dateKey}`, JSON.stringify({ text: diaryText, mood }));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const moods = ["开心", "平静", "疲惫", "烦躁", "难过", "惊喜"];

  return (
    <div className="flex-1 flex flex-col bg-neutral-50 animate-fade-in relative h-full">
      <div className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-3 shrink-0 sticky top-0 z-10">
        <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm text-neutral-900">日记</span>
        <button onClick={handleSave} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95 text-neutral-900">
          <Save className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-bold font-mono text-neutral-800">{dateKey}</h2>
          <p className="text-xs text-neutral-500">记录今天发生过的事及心情</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col gap-3">
          <span className="text-xs font-bold text-neutral-600">今天的心情：</span>
          <div className="flex flex-wrap gap-2">
            {moods.map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  mood === m ? "bg-black text-white border-black" : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm min-h-[200px] flex flex-col">
          <textarea
            value={diaryText}
            onChange={(e) => setDiaryText(e.target.value)}
            placeholder="写点什么吧..."
            className="flex-1 w-full resize-none outline-none text-sm leading-relaxed text-neutral-800 font-sans bg-transparent"
          />
        </div>

        {isSaved && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-4 py-2 rounded-full shadow-lg pointer-events-none transition-opacity">
            保存成功
          </div>
        )}
      </div>
    </div>
  );
}
