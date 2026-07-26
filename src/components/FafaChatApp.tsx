import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, Send, Heart } from "lucide-react";
import { Character, Message, ChatSession, AppSettings } from "../types";

interface FafaChatAppProps {
  characters: Character[];
  sessions: ChatSession[];
  settings: AppSettings;
  onUpdateSessionMessages: (targetId: string, messages: Message[], currentOS?: string, extraFields?: Partial<ChatSession>) => void;
  onTriggerAiReply: (characterId: string, customMessages?: Message[]) => Promise<void>;
  onClose: () => void;
}

export default function FafaChatApp({
  characters,
  sessions,
  settings,
  onUpdateSessionMessages,
  onTriggerAiReply,
  onClose
}: FafaChatAppProps) {
  const fafa = characters.find(c => c.id === 'char-preset-fafa');
  const session = sessions.find(s => s.characterId === 'char-preset-fafa');
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !fafa || isSending) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
      timestamp: Date.now()
    };

    const currentMessages = session?.messages || [];
    const updatedMessages = [...currentMessages, newMessage];
    
    onUpdateSessionMessages(fafa.id, updatedMessages);
    setInputText("");
    setIsSending(true);

    try {
      await onTriggerAiReply(fafa.id, updatedMessages);
    } finally {
      setIsSending(false);
    }
  };

  const handleAiTrigger = async () => {
    if (!fafa || isSending) return;
    setIsSending(true);
    try {
      await onTriggerAiReply(fafa.id);
    } finally {
      setIsSending(false);
    }
  };

  if (!fafa) return null;

  return (
    <div className="h-full flex flex-col bg-white text-black font-sans relative overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-neutral-100 flex items-center px-4 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 hover:bg-neutral-50 rounded-full transition-colors active:scale-95"
        >
          <ChevronLeft className="w-6 h-6 text-neutral-600" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <img 
            src="/images/fafa/fafa.jpg" 
            alt="fafa"
            className="w-6 h-6 rounded-full object-cover border border-neutral-100"
            referrerPolicy="no-referrer"
          />
          <span className="font-bold text-sm tracking-tight text-neutral-900">fafa 助手</span>
        </div>
        <div className="w-10" /> {/* Balance for back button */}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {session?.messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2'} animate-fade-in`}
          >
            {msg.role !== 'user' && (
              <img 
                src="/images/fafa/fafa.jpg" 
                alt="fafa"
                className="w-7 h-7 rounded-full object-cover border border-neutral-100 shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-neutral-900 text-white rounded-tr-none' 
                : 'bg-neutral-50 text-neutral-800 border border-neutral-100 rounded-tl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-100 bg-white">
        <div className="flex items-end gap-2 bg-neutral-50 border border-neutral-200 rounded-2xl p-2 transition-all focus-within:border-neutral-400 focus-within:bg-white focus-within:shadow-sm">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="有什么可以帮你的吗？"
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-1.5 px-2 text-[13px] min-h-[38px] max-h-32 text-neutral-900"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isSending}
              className="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-300 text-neutral-800 rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
              title="发送用户消息 (仅发送，不生成AI回复)"
            >
              <Send className="w-4 h-4 stroke-[1.75]" />
            </button>
            <button
              onClick={handleAiTrigger}
              disabled={isSending}
              className="w-10 h-10 bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-300 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
              title="生成AI回复 (点击生成一轮回复)"
            >
              <div className="w-5 h-5 rounded-full border-[2px] border-white bg-white flex items-center justify-center shadow-sm">
                <Heart className={`w-3 h-3 text-black stroke-[2] fill-none ${isSending ? 'fill-black animate-pulse' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
