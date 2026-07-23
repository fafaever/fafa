import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, MessageCircle, Heart, Search, User, Sparkles, X, Compass, Mail, Edit3, MessageSquare } from "lucide-react";
import { Character, AppSettings } from "../types";
import { apiChat } from "../lib/api";
import { ConfirmModal } from "./ConfirmModal";

interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  tag: string;
  timestamp: number;
  likes: number;
  comments: ForumComment[];
}

interface ForumComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: number;
  floor: number;
}

interface ForumAppProps {
  characters: Character[];
  settings: AppSettings;
  onClose: () => void;
}

export function ForumApp({ characters, settings, onClose }: ForumAppProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'profile'>('public');
  const [activeFilterTag, setActiveFilterTag] = useState<string>('全部');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  // Settings
  const [postGenCount, setPostGenCount] = useState<number>(3);
  const [commentGenCount, setCommentGenCount] = useState<number>(3);
  
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);

  // Load posts
  useEffect(() => {
    const saved = localStorage.getItem("mobile_ai_forum_posts");
    if (saved) {
      try {
        setPosts(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Save posts
  useEffect(() => {
    localStorage.setItem("mobile_ai_forum_posts", JSON.stringify(posts));
  }, [posts]);

  // Load config
  useEffect(() => {
    const pCount = localStorage.getItem("mobile_ai_forum_p_count");
    if (pCount) setPostGenCount(parseInt(pCount, 10));
    const cCount = localStorage.getItem("mobile_ai_forum_c_count");
    if (cCount) setCommentGenCount(parseInt(cCount, 10));
  }, []);

  const saveConfig = (p: number, c: number) => {
    setPostGenCount(p);
    setCommentGenCount(c);
    localStorage.setItem("mobile_ai_forum_p_count", p.toString());
    localStorage.setItem("mobile_ai_forum_c_count", c.toString());
  };

  const handleGeneratePosts = async () => {
    if (isGeneratingPosts || characters.length === 0) return;
    setIsGeneratingPosts(true);
    
    try {
      const generatedPosts: ForumPost[] = [];
      for (let i = 0; i < postGenCount; i++) {
        const activeChar = characters[Math.floor(Math.random() * characters.length)];
        const prompt = `你是角色：${activeChar.name}。简介：${activeChar.description}。设定：${activeChar.systemInstruction}。
请以该角色的口吻，在匿名论坛上发布一篇简短的帖子（50-150字）。
要求输出JSON格式：
{
  "tag": "必须从[日常, 吐槽, 恐怖, 闲聊, 求助]中选择一个",
  "content": "帖子的正文内容"
}`;
        const response = await apiChat({ messages: [{ role: "user", content: prompt }], settings, systemInstruction: "你是一个只能输出JSON的API。" });
        const responseText = response.text || "";
        
        let parsed = null;
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
        } catch (e) {
          console.error("Failed to parse", e);
        }

        if (parsed && parsed.content) {
          generatedPosts.push({
            id: Date.now().toString() + "-" + i,
            authorId: activeChar.id,
            authorName: activeChar.name,
            authorAvatar: activeChar.chatAvatar || activeChar.avatar || "👤",
            title: "匿名帖子",
            content: parsed.content,
            tag: parsed.tag || "日常",
            timestamp: Date.now(),
            likes: Math.floor(Math.random() * 20),
            comments: [] as ForumComment[]
          });
        }
      }
      setPosts(prev => [...generatedPosts, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPosts(false);
    }
  };

  const handleGenerateComments = async (post: ForumPost) => {
    if (isGeneratingComments || characters.length === 0) return;
    setIsGeneratingComments(true);
    
    try {
      const newComments: ForumComment[] = [];
      for (let i = 0; i < commentGenCount; i++) {
        const activeChar = characters[Math.floor(Math.random() * characters.length)];
        const prompt = `你是角色：${activeChar.name}。简介：${activeChar.description}。
现在你在一个论坛里看到了一篇帖子，内容是：“${post.content}”。
请以你的口吻写一条简短的回复（10-50字）。
输出纯文本，不要包含任何格式。`;

        const response = await apiChat({ messages: [{ role: "user", content: prompt }], settings });
        const cleanText = (response.text || "").trim();
        
        if (cleanText) {
          newComments.push({
            id: Date.now().toString() + "-" + i,
            authorId: activeChar.id,
            authorName: activeChar.name,
            authorAvatar: activeChar.chatAvatar || activeChar.avatar || "👤",
            content: cleanText,
            timestamp: Date.now(),
            floor: post.comments.length + newComments.length + 1
          });
        }
      }

      if (newComments.length > 0) {
        const updatedPost = { ...post, comments: [...post.comments, ...newComments] };
        setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));
        if (selectedPost && selectedPost.id === post.id) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingComments(false);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-50 text-neutral-900 select-none animate-slide-up h-full min-h-0 relative font-sans overflow-hidden">
      
      {/* Detail View Overlay */}
      {selectedPost && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col animate-slide-left">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white">
            <button onClick={() => setSelectedPost(null)} className="p-1 -ml-1 text-neutral-500 hover:text-black">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-sm">帖子详情</span>
            <div className="w-7" />
          </div>
          <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {selectedPost.authorAvatar.length > 2 ? (
                    <img src={selectedPost.authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover bg-neutral-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-xl border border-neutral-200/50">
                      {selectedPost.authorAvatar}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-neutral-900">{selectedPost.authorName}</div>
                    <div className="text-[10px] text-neutral-400">{formatTime(selectedPost.timestamp)}</div>
                  </div>
                </div>
                <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2.5 py-1 rounded-full font-medium">
                  {selectedPost.tag}
                </span>
              </div>
              <p className="text-[13px] text-neutral-800 leading-relaxed font-medium whitespace-pre-wrap">
                {selectedPost.content}
              </p>
            </div>

            <div className="flex items-center justify-between px-1 pt-2">
              <span className="font-bold text-sm text-neutral-900">全部回复 ({selectedPost.comments.length})</span>
              <button 
                onClick={() => handleGenerateComments(selectedPost)}
                disabled={isGeneratingComments}
                className="text-[11px] font-bold bg-neutral-900 hover:bg-black text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingComments ? "生成中..." : "AI 生成评论"}
              </button>
            </div>

            <div className="space-y-3 pb-8">
              {[...selectedPost.comments].reverse().map(c => (
                <div key={c.id} className="bg-white rounded-xl p-3 shadow-sm border border-neutral-100 flex gap-3 relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDialog({
                        title: "删除评论",
                        message: "确定要删除此评论吗？此操作不可撤销。",
                        onConfirm: () => {
                          const updatedComments = selectedPost.comments.filter(comm => comm.id !== c.id);
                          const updatedPost = { ...selectedPost, comments: updatedComments };
                          setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
                          setSelectedPost(updatedPost);
                          setConfirmDialog(null);
                        }
                      });
                    }}
                    className="absolute top-2 right-2 text-neutral-300 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {c.authorAvatar.length > 2 ? (
                    <img src={c.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover bg-neutral-100 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-lg border border-neutral-200/50 shrink-0">
                      {c.authorAvatar}
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">{c.authorName}</span>
                      <span className="text-[10px] text-neutral-400">#{c.floor}</span>
                    </div>
                    <p className="text-xs text-neutral-700 font-medium break-all whitespace-pre-wrap leading-relaxed">
                      {c.content}
                    </p>
                    <div className="text-[10px] text-neutral-400 pt-1 flex items-center justify-between">
                      <span>{formatTime(c.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {selectedPost.comments.length === 0 && (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  暂无回复，点击右上角生成一条吧
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0 shadow-sm z-10 relative">
        <button
          onClick={onClose}
          className="p-1 -ml-1 text-neutral-500 hover:text-black rounded-lg active:scale-95 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-sans font-bold text-base tracking-wide text-neutral-950">
          匿名论坛
        </span>
        <div className="w-7 h-7" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-neutral-50 relative">
        {activeTab === 'public' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-neutral-100 shrink-0">
              <div className="flex gap-2 overflow-x-auto no-scrollbar mask-edges pr-4">
                {["全部", "日常", "吐槽", "恐怖", "闲聊", "求助", "情感"].map(tag => (
                  <span 
                    key={tag} 
                    onClick={() => setActiveFilterTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap cursor-pointer ${activeFilterTag === tag ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button 
                onClick={handleGeneratePosts}
                disabled={isGeneratingPosts}
                className="shrink-0 ml-2 bg-neutral-900 hover:bg-black text-white px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingPosts ? "生成中..." : "AI 生成"}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {posts.filter(p => activeFilterTag === "全部" || p.tag === activeFilterTag).map(post => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPost(post)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 cursor-pointer active:scale-[0.99] transition-transform relative"
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDialog({
                        title: "删除帖子",
                        message: "确定要删除此帖子吗？此操作不可撤销。",
                        onConfirm: () => {
                          setPosts(prev => prev.filter(p => p.id !== post.id));
                          setConfirmDialog(null);
                        }
                      });
                    }}
                    className="absolute top-4 right-4 text-neutral-300 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {post.authorAvatar.length > 2 ? (
                        <img src={post.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover bg-neutral-100" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm border border-neutral-200/50">
                          {post.authorAvatar}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-neutral-900">{post.authorName}</div>
                        <div className="text-[10px] text-neutral-400">{formatTime(post.timestamp)}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-neutral-50 text-neutral-500 px-2 py-0.5 rounded border border-neutral-100">
                      {post.tag}
                    </span>
                  </div>
                  <p className="text-[13px] text-neutral-800 leading-relaxed font-medium mb-3 line-clamp-3">
                    {post.content}
                  </p>
                  <div className="flex items-center justify-between border-t border-neutral-50 pt-3">
                    <div className="flex items-center gap-4 text-neutral-400">
                      <div className="flex items-center gap-1 text-[11px] font-medium">
                        <Heart className="w-3.5 h-3.5" /> {post.likes}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-medium">
                        <MessageSquare className="w-3.5 h-3.5" /> {post.comments.length}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {posts.length === 0 && (
                <div className="text-center py-20 text-neutral-400 text-xs">
                  暂无帖子，点击右上角生成一些吧
                </div>
              )}
            </div>
          </div>
        )}
        
        {confirmDialog && (
          <ConfirmModal 
            title={confirmDialog.title} 
            message={confirmDialog.message} 
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />
        )}

        {activeTab === 'private' && (
          <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm mb-2">
              <p className="text-xs font-bold text-neutral-800 mb-1">论坛私信</p>
              <p className="text-[10px] text-neutral-500">此处的私聊将转至系统的主要对话功能。</p>
            </div>
            
            {characters.map(char => (
              <div 
                key={char.id}
                onClick={() => {
                  localStorage.setItem("mobile_ai_preselected_chat_char", char.id);
                  onClose(); // This sends them back to home. To go to chat directly we'd need onNavigateToChat.
                }}
                className="bg-white p-3 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex items-center gap-3">
                  {char.chatAvatar || char.avatar ? (
                    char.chatAvatar ? (
                      <img src={char.chatAvatar} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-xl">{char.avatar}</div>
                    )
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-xl">👤</div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-neutral-900">{char.name}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{char.description || "暂无简介"}</div>
                  </div>
                </div>
                <MessageCircle className="w-4 h-4 text-neutral-300" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="flex-1 flex flex-col p-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-3xl">👤</div>
              <div>
                <div className="font-bold text-base text-neutral-900">我 (匿名用户)</div>
                <div className="text-xs text-neutral-400 mt-0.5">发帖数: 0</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm space-y-4">
              <div className="font-bold text-sm text-neutral-900">自动生成设置</div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-500 uppercase">每次生成帖子数量</label>
                <input 
                  type="number" 
                  value={postGenCount}
                  onChange={(e) => saveConfig(parseInt(e.target.value)||1, commentGenCount)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-500 uppercase">每次生成评论数量</label>
                <input 
                  type="number" 
                  value={commentGenCount}
                  onChange={(e) => saveConfig(postGenCount, parseInt(e.target.value)||1)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tabs */}
      <div className="shrink-0 bg-white border-t border-neutral-100 px-8 py-2 flex items-center justify-between shadow-sm pb-safe z-10 relative">
        <button
          onClick={() => setActiveTab('public')}
          className={`flex flex-col items-center gap-1 py-1 transition-all ${activeTab === 'public' ? 'text-black scale-105' : 'text-neutral-400'}`}
        >
          <Compass className={`w-5 h-5 ${activeTab === 'public' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className={`text-[10px] ${activeTab === 'public' ? 'font-bold' : 'font-medium'}`}>广场</span>
        </button>
        <button
          onClick={() => setActiveTab('private')}
          className={`flex flex-col items-center gap-1 py-1 transition-all ${activeTab === 'private' ? 'text-black scale-105' : 'text-neutral-400'}`}
        >
          <Mail className={`w-5 h-5 ${activeTab === 'private' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className={`text-[10px] ${activeTab === 'private' ? 'font-bold' : 'font-medium'}`}>私信</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 transition-all ${activeTab === 'profile' ? 'text-black scale-105' : 'text-neutral-400'}`}
        >
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className={`text-[10px] ${activeTab === 'profile' ? 'font-bold' : 'font-medium'}`}>我的</span>
        </button>
      </div>

    </div>
  );
}
