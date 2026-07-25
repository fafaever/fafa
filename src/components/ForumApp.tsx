import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, MessageCircle, Heart, Search, User, Sparkles, X, Compass, Mail, Edit3, MessageSquare, Plus, Skull, Smartphone, Heart as HeartIcon, RefreshCw } from "lucide-react";
import { Character, AppSettings, LoreEntry } from "../types";
import { apiChat } from "../lib/api";
import { ConfirmModal } from "./ConfirmModal";

interface Board {
  id: string;
  name: string;
  icon: 'love' | 'skull' | 'phone' | 'plus';
  description: string;
  commentRequirement: string;
}

interface ForumPost {
  id: string;
  boardId: string; // New field
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
  loreList?: LoreEntry[];
  onClose: () => void;
}

const generateAnonymousAvatar = (seed: string) => {
  // Simple deterministic random based on seed string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const shapes = [
    `<circle cx="50" cy="50" r="30" stroke="black" stroke-width="2" fill="none" />`,
    `<rect x="25" y="25" width="50" height="50" stroke="black" stroke-width="2" fill="none" />`,
    `<path d="M50 20 L80 80 L20 80 Z" stroke="black" stroke-width="2" fill="none" />`,
    `<path d="M20 50 Q50 20 80 50 Q50 80 20 50" stroke="black" stroke-width="2" fill="none" />`,
    `<path d="M30 30 L70 70 M70 30 L30 70" stroke="black" stroke-width="2" fill="none" />`,
    `<circle cx="50" cy="50" r="15" stroke="black" stroke-width="2" fill="none" />`,
    `<path d="M50 20 V80 M20 50 H80" stroke="black" stroke-width="2" fill="none" />`
  ];
  
  const shapeIndex = Math.abs(hash) % shapes.length;
  const rotation = (Math.abs(hash) % 8) * 45;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <g transform="rotate(${rotation} 50 50)">
      ${shapes[shapeIndex]}
    </g>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export function ForumApp({ characters, settings, loreList = [], onClose }: ForumAppProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'profile'>('public');
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [boards, setBoards] = useState<Board[]>([
    { id: 'board-1', name: '不可以涩涩', icon: 'love', description: '关于性爱、xp分享、亲密关系讨论的板块。', commentRequirement: '字数不限' },
    { id: 'board-2', name: '深夜食堂', icon: 'skull', description: '关于灵异事件、恐怖经历的分享板块。', commentRequirement: '字数不限，支持颜文字' },
    { id: 'board-3', name: '捡手机文学', icon: 'phone', description: '太太们创作的捡手机文学板块。', commentRequirement: '字数不限' },
  ]);
  const [activeFilterTag, setActiveFilterTag] = useState<string>('全部');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  const [randomizedContacts, setRandomizedContacts] = useState<Character[]>([]);

  // Settings
  const [postGenCount, setPostGenCount] = useState<number>(3);
  const [commentGenCount, setCommentGenCount] = useState<number>(3);
  
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);

  // Load posts and boards
  useEffect(() => {
    const savedPosts = localStorage.getItem("mobile_ai_forum_posts");
    if (savedPosts) {
      try {
        setPosts(JSON.parse(savedPosts));
      } catch (e) {}
    }
    const savedBoards = localStorage.getItem("mobile_ai_forum_boards");
    if (savedBoards) {
      try {
        setBoards(JSON.parse(savedBoards));
      } catch (e) {}
    }
  }, []);

  // Save posts and boards
  useEffect(() => {
    localStorage.setItem("mobile_ai_forum_posts", JSON.stringify(posts));
    localStorage.setItem("mobile_ai_forum_boards", JSON.stringify(boards));
  }, [posts, boards]);

  // Randomize DM contacts
  useEffect(() => {
    if (characters.length > 0) {
      // Pick 2-4 random characters as "system generated" contacts
      const shuffled = [...characters].sort(() => 0.5 - Math.random());
      const count = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 2);
      setRandomizedContacts(shuffled.slice(0, count));
    }
  }, [characters]);

  // Load config
  useEffect(() => {
    const pCount = localStorage.getItem("mobile_ai_forum_p_count");
    if (pCount) setPostGenCount(parseInt(pCount, 10));
    const cCount = localStorage.getItem("mobile_ai_forum_c_count");
    if (cCount) setCommentGenCount(parseInt(cCount, 10));
  }, []);

  const handleSaveBoard = (board: Board) => {
    if (editingBoard) {
      setBoards(boards.map(b => b.id === board.id ? board : b));
    } else {
      setBoards([...boards, { ...board, id: `board-${Date.now()}` }]);
    }
    setIsEditingBoard(false);
    setEditingBoard(null);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const saveConfig = (p: number, c: number) => {
    setPostGenCount(p);
    setCommentGenCount(c);
    localStorage.setItem("mobile_ai_forum_p_count", p.toString());
    localStorage.setItem("mobile_ai_forum_c_count", c.toString());
  };

  const [selectedLoreIds, setSelectedLoreIds] = useState<string[]>([]);
  const [isGeneratingPostsModalOpen, setIsGeneratingPostsModalOpen] = useState(false);
  const [genBoardId, setGenBoardId] = useState<string>('');
  const [genCount, setGenCount] = useState<number>(3);

  const handleGeneratePosts = async (boardId: string, count: number, loreIds: string[]) => {
    if (isGeneratingPosts || characters.length === 0) return;
    setIsGeneratingPosts(true);
    
    const board = boards.find(b => b.id === boardId);
    const selectedLores = loreList.filter(l => loreIds.includes(l.id));
    const loreContent = selectedLores.map(l => `【${l.title}】:\n${l.content}`).join("\n\n");
    
    try {
      const generatedPosts: ForumPost[] = [];
      for (let i = 0; i < count; i++) {
        const activeChar = characters[Math.floor(Math.random() * characters.length)];
        const prompt = `你是角色：${activeChar.name}。简介：${activeChar.description}。
${loreContent ? `以下是本次生成挂载的世界观设定：\n${loreContent}\n` : ""}
论坛板块：${board?.name}。板块简介/方向：${board?.description}。
请以该角色的口吻，在匿名论坛的该板块下发布一篇简短的帖子（50-150字）。
要求输出JSON格式：
{
  "tag": "发帖标签",
  "content": "帖子的正文内容"
}`;
        const response = await apiChat({ 
          messages: [{ role: "user", content: prompt }], 
          character: activeChar,
          memories: activeChar.memories,
          matchedLore: selectedLores,
          settings, 
          systemInstruction: "你是一个只能输出JSON的API。" 
        });
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
            boardId: boardId,
            authorId: activeChar.id,
            authorName: "匿名用户",
            authorAvatar: generateAnonymousAvatar(activeChar.id),
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
      setIsGeneratingPostsModalOpen(false);
      setSelectedLoreIds([]);
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

        const response = await apiChat({ 
          messages: [{ role: "user", content: prompt }], 
          character: activeChar,
          memories: activeChar.memories,
          matchedLore: loreList,
          settings 
        });
        const cleanText = (response.text || "").trim();
        
        if (cleanText) {
          newComments.push({
            id: Date.now().toString() + "-" + i,
            authorId: activeChar.id,
            authorName: "匿名用户",
            authorAvatar: generateAnonymousAvatar(activeChar.id),
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

  const renderBoardIcon = (icon: Board['icon']) => {
    switch (icon) {
      case 'love': return <HeartIcon className="w-8 h-8 text-neutral-900" />;
      case 'skull': return <Skull className="w-8 h-8 text-neutral-900" />;
      case 'phone': return <Smartphone className="w-8 h-8 text-neutral-900" />;
      case 'plus': return <Plus className="w-8 h-8 text-neutral-900" />;
    }
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
                    <div className="text-sm font-bold text-neutral-900">匿名用户</div>
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
                      <span className="text-xs font-bold text-neutral-900">匿名用户</span>
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
        <div className="w-8" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-row bg-neutral-50 relative">
        {/* Sidebar */}
        {activeTab === 'public' && (
          <div className="w-16 flex flex-col items-center py-4 bg-white border-r border-neutral-100 space-y-4">
            {boards.map(board => (
              <button 
                key={board.id} 
                onClick={() => setActiveBoardId(board.id)}
                className={`p-3 rounded-2xl ${activeBoardId === board.id ? 'bg-neutral-100' : ''}`}
              >
                {renderBoardIcon(board.icon)}
              </button>
            ))}
            <button 
              onClick={() => { setEditingBoard(null); setIsEditingBoard(true); }}
              className="p-3 rounded-2xl border-2 border-dashed border-neutral-200"
            >
              {renderBoardIcon('plus')}
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'public' && !activeBoardId && (
            <div className="flex-1 p-4 flex flex-col items-center justify-center text-neutral-400 text-sm">
              选择一个板块开始交流
            </div>
          )}
          
          {isGeneratingPostsModalOpen && (
            <div className="absolute inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
                <div className="font-bold text-base">AI 生成帖子</div>
                <select 
                  value={genBoardId} 
                  onChange={(e) => setGenBoardId(e.target.value)}
                  className="w-full bg-neutral-100 p-3 rounded-xl text-sm"
                >
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <input 
                  type="number" 
                  min="1" 
                  max="12" 
                  value={genCount} 
                  onChange={(e) => setGenCount(Math.min(12, Math.max(1, parseInt(e.target.value)||1)))} 
                  className="w-full bg-neutral-100 p-3 rounded-xl text-sm" 
                  placeholder="生成条数 (1-12)"
                />
                <div className="text-xs font-bold text-neutral-500">挂载世界书:</div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {loreList.map(l => (
                    <label key={l.id} className="flex items-center gap-2 text-xs">
                      <input 
                        type="checkbox"
                        checked={selectedLoreIds.includes(l.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedLoreIds([...selectedLoreIds, l.id]);
                          else setSelectedLoreIds(selectedLoreIds.filter(id => id !== l.id));
                        }}
                      />
                      {l.title}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsGeneratingPostsModalOpen(false)} className="flex-1 bg-neutral-100 py-3 rounded-xl text-xs font-bold">取消</button>
                  <button onClick={() => handleGeneratePosts(genBoardId, genCount, selectedLoreIds)} className="flex-1 bg-black text-white py-3 rounded-xl text-xs font-bold">生成</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'public' && activeBoardId && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-neutral-100 shrink-0">
                <button onClick={() => setActiveBoardId(null)} className="p-1 -ml-1 text-neutral-500 hover:text-black">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{boards.find(b => b.id === activeBoardId)?.name}</span>
                  <button 
                    onClick={() => { 
                      setGenBoardId(activeBoardId || ''); 
                      setIsGeneratingPostsModalOpen(true); 
                    }}
                    className="text-neutral-900"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => { setEditingBoard(boards.find(b => b.id === activeBoardId) || null); setIsEditingBoard(true); }} className="text-xs font-medium text-neutral-500">编辑</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {posts.filter(p => p.boardId === activeBoardId).map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => setSelectedPost(post)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 cursor-pointer active:scale-[0.99] transition-transform relative"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                         <div className="text-xs font-bold text-neutral-900">匿名用户</div>
                      </div>
                      <span className="text-[10px] bg-neutral-50 text-neutral-500 px-2 py-0.5 rounded border border-neutral-100">
                        {post.tag}
                      </span>
                    </div>
                    <p className="text-[13px] text-neutral-800 leading-relaxed font-medium mb-3 line-clamp-3">
                      {post.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Board Edit Modal */}
        {isEditingBoard && (
          <div className="absolute inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
              <div className="font-bold text-base">{editingBoard ? "编辑板块" : "新建板块"}</div>
              <input type="text" placeholder="板块名称" defaultValue={editingBoard?.name} className="w-full bg-neutral-100 p-3 rounded-xl text-sm" id="board-name-input" />
              <textarea placeholder="板块介绍" defaultValue={editingBoard?.description} className="w-full bg-neutral-100 p-3 rounded-xl text-sm h-24" id="board-desc-input" />
              <input type="text" placeholder="评论要求" defaultValue={editingBoard?.commentRequirement} className="w-full bg-neutral-100 p-3 rounded-xl text-sm" id="board-req-input" />
              <div className="flex gap-2">
                <button onClick={() => setIsEditingBoard(false)} className="flex-1 bg-neutral-100 py-3 rounded-xl text-xs font-bold">取消</button>
                <button onClick={() => {
                  const name = (document.getElementById('board-name-input') as HTMLInputElement).value;
                  const description = (document.getElementById('board-desc-input') as HTMLTextAreaElement).value;
                  const commentRequirement = (document.getElementById('board-req-input') as HTMLInputElement).value;
                  handleSaveBoard({ ...editingBoard, id: editingBoard?.id || '', name, icon: editingBoard?.icon || 'phone', description, commentRequirement } as Board);
                }} className="flex-1 bg-black text-white py-3 rounded-xl text-xs font-bold">保存</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'private' && (
          <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto w-full max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="text-sm font-bold text-neutral-800">论坛私信</p>
              <button 
                onClick={() => {
                   const shuffled = [...characters].sort(() => 0.5 - Math.random());
                   const count = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 2);
                   setRandomizedContacts(shuffled.slice(0, count));
                }} 
                className="p-1 text-neutral-500 hover:text-black"
              >
                 <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            {randomizedContacts.map(char => (
              <div 
                key={char.id}
                onClick={() => {
                  localStorage.setItem("mobile_ai_preselected_chat_char", char.id);
                  onClose(); 
                }}
                className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <img src={generateAnonymousAvatar(char.id)} className="w-10 h-10 rounded-full object-cover border border-neutral-100" />
                  <div>
                    <div className="text-sm font-bold text-neutral-900">{char.name}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">点击进入私聊...</div>
                  </div>
                </div>
                <MessageCircle className="w-4 h-4 text-neutral-300" />
              </div>
            ))}
            {randomizedContacts.length === 0 && (
              <div className="text-center py-20 text-neutral-400 text-sm">
                暂无私信联系人
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="flex-1 flex flex-col p-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm flex items-center gap-4">
              <img src={generateAnonymousAvatar("me-user")} className="w-16 h-16 rounded-full border border-neutral-100" />
              <div>
                <div className="font-bold text-base text-neutral-900">我 (匿名用户)</div>
                <div className="text-xs text-neutral-400 mt-0.5">发帖数: {posts.filter(p => p.authorId === 'user').length}</div>
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
