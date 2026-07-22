import React, { useState, useEffect } from "react";
import { ChevronLeft, Search, List, MessageCircle, FileText, User } from "lucide-react";
import { Character } from "../types";

interface PhoneCheckAppProps {
  characters: Character[];
  onClose: () => void;
}

interface PhoneData {
  memos: string[];
  searches: string[];
  shopping: string[];
  messages: { sender: string; content: string; time: string }[];
}

export default function PhoneCheckApp({ characters, onClose }: PhoneCheckAppProps) {
  const [activeTab, setActiveTab] = useState<"memos" | "searches" | "shopping" | "messages">("searches");
  const [selectedCharId, setSelectedCharId] = useState<string>(characters.length > 0 ? characters[0].id : "");
  const [phoneData, setPhoneData] = useState<PhoneData>({ memos: [], searches: [], shopping: [], messages: [] });
  const [inputText, setInputText] = useState("");

  const selectedChar = characters.find(c => c.id === selectedCharId);

  useEffect(() => {
    if (!selectedCharId) return;
    const saved = localStorage.getItem(`mobile_ai_phonecheck_${selectedCharId}`);
    if (saved) {
      try {
        setPhoneData(JSON.parse(saved));
      } catch (e) {}
    } else {
      // Dummy initial data to make it look like a real phone
      const initial: PhoneData = {
        memos: ["要记住的事：...", "密码：1234"],
        searches: ["怎么假装不在意", "今天天气"],
        shopping: ["咖啡", "猫粮"],
        messages: [{ sender: "未知联系人", content: "你今天到底来不来？", time: "昨天" }]
      };
      setPhoneData(initial);
      localStorage.setItem(`mobile_ai_phonecheck_${selectedCharId}`, JSON.stringify(initial));
    }
  }, [selectedCharId]);

  const saveData = (data: PhoneData) => {
    setPhoneData(data);
    localStorage.setItem(`mobile_ai_phonecheck_${selectedCharId}`, JSON.stringify(data));
  };

  const handleAdd = () => {
    if (!inputText.trim()) return;
    const newData = { ...phoneData };
    if (activeTab === "memos") newData.memos = [inputText.trim(), ...newData.memos];
    if (activeTab === "searches") newData.searches = [inputText.trim(), ...newData.searches];
    if (activeTab === "shopping") newData.shopping = [inputText.trim(), ...newData.shopping];
    if (activeTab === "messages") {
      newData.messages = [{ sender: "新信息", content: inputText.trim(), time: "刚刚" }, ...newData.messages];
    }
    saveData(newData);
    setInputText("");
  };

  const handleDelete = (index: number) => {
    const newData = { ...phoneData };
    if (activeTab === "memos") newData.memos = newData.memos.filter((_, i) => i !== index);
    if (activeTab === "searches") newData.searches = newData.searches.filter((_, i) => i !== index);
    if (activeTab === "shopping") newData.shopping = newData.shopping.filter((_, i) => i !== index);
    if (activeTab === "messages") newData.messages = newData.messages.filter((_, i) => i !== index);
    saveData(newData);
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-100 animate-fade-in relative h-full">
      {/* Header */}
      <div className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-3 shrink-0 z-10">
        <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm text-neutral-900 font-sans tracking-wide">偷看手机 (Spy)</span>
        <div className="w-8" />
      </div>

      {/* Character Selector */}
      <div className="bg-white px-4 py-3 border-b border-neutral-100 flex items-center gap-3 shrink-0 overflow-x-auto scrollbar-none">
        {characters.map(char => (
          <button
            key={char.id}
            onClick={() => setSelectedCharId(char.id)}
            className={`flex flex-col items-center gap-1 min-w-[50px] shrink-0 transition-opacity ${selectedCharId === char.id ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl bg-neutral-100 border-2 ${selectedCharId === char.id ? 'border-black' : 'border-transparent'}`}>
              {char.chatAvatar ? <img src={char.chatAvatar} className="w-full h-full rounded-full object-cover" /> : char.avatar || "👤"}
            </div>
            <span className="text-[10px] font-bold text-neutral-800 truncate w-full text-center">{char.name}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-neutral-200 shrink-0">
        <TabButton active={activeTab === "searches"} onClick={() => setActiveTab("searches")} icon={<Search className="w-3.5 h-3.5" />} label="搜索记录" />
        <TabButton active={activeTab === "memos"} onClick={() => setActiveTab("memos")} icon={<FileText className="w-3.5 h-3.5" />} label="备忘录" />
        <TabButton active={activeTab === "shopping"} onClick={() => setActiveTab("shopping")} icon={<List className="w-3.5 h-3.5" />} label="购物清单" />
        <TabButton active={activeTab === "messages"} onClick={() => setActiveTab("messages")} icon={<MessageCircle className="w-3.5 h-3.5" />} label="信息" />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-b border-neutral-100 shrink-0 flex gap-2">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`添加一条新的${activeTab === "memos" ? "备忘" : activeTab === "searches" ? "搜索" : activeTab === "shopping" ? "清单" : "信息"}...`}
          className="flex-1 text-xs border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-black bg-neutral-50"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-black text-white px-3 py-2 rounded-lg text-xs font-bold active:scale-95 transition">添加</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {selectedChar && (
          <div className="text-center mb-4">
            <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">{selectedChar.name}'s Privacy Data</span>
          </div>
        )}

        {activeTab === "memos" && phoneData.memos.map((item, idx) => (
          <ListItem key={idx} content={item} onDelete={() => handleDelete(idx)} />
        ))}
        {activeTab === "searches" && phoneData.searches.map((item, idx) => (
          <ListItem key={idx} content={item} onDelete={() => handleDelete(idx)} />
        ))}
        {activeTab === "shopping" && phoneData.shopping.map((item, idx) => (
          <ListItem key={idx} content={item} onDelete={() => handleDelete(idx)} />
        ))}
        {activeTab === "messages" && phoneData.messages.map((item, idx) => (
          <div key={idx} className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm flex items-start justify-between group">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-neutral-900">{item.sender}</span>
                <span className="text-[9px] text-neutral-400">{item.time}</span>
              </div>
              <p className="text-xs text-neutral-600">{item.content}</p>
            </div>
            <button onClick={() => handleDelete(idx)} className="opacity-0 group-hover:opacity-100 lg:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all border-b-2 ${
        active ? "border-black text-black bg-neutral-50/50" : "border-transparent text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50"
      }`}
    >
      {icon}
      <span className="text-[9px] font-bold tracking-wider">{label}</span>
    </button>
  );
};

const ListItem: React.FC<{ content: string, onDelete: () => void }> = ({ content, onDelete }) => {
  return (
    <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between group">
      <span className="text-xs text-neutral-800">{content}</span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 lg:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity">
        ✕
      </button>
    </div>
  );
};
