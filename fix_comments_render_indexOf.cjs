const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ForumApp.tsx');
let code = fs.readFileSync(file, 'utf8');

const startStr = '{[...selectedPost.comments]\n                .reverse()\n                .filter(c => {';
const endStr = '                );\n              })}';

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.log("Not found.");
  process.exit(1);
}

const insert = `{(() => {
                const map = new Map<number, any>();
                const topLevel: any[] = [];
                
                const sorted = [...selectedPost.comments].sort((a, b) => a.floor - b.floor);
                sorted.forEach(c => map.set(c.floor, { ...c, children: [], level: 0 }));
                
                sorted.forEach(c => {
                  const tc = map.get(c.floor)!;
                  if (c.replyTo && map.has(c.replyTo.floor)) {
                    const parent = map.get(c.replyTo.floor)!;
                    tc.level = Math.min(parent.level + 1, 3);
                    parent.children.push(tc);
                  } else {
                    topLevel.push(tc);
                  }
                });
                
                const renderCommentNode = (c: any) => {
                  if (showOpOnly && c.authorId !== selectedPost.authorId && !c.isOpUpdate) {
                    return null;
                  }
                  
                  const isExpanded = expandedReplies[c.id];
                  
                  return (
                    <div key={c.id} className={\`\${c.level > 0 ? (c.level === 1 ? 'ml-6' : c.level === 2 ? 'ml-10' : 'ml-14') : ''}\`}>
                      {(() => {
                        if (c.isRecalled) {
                          return (
                            <div className="bg-white rounded-xl p-3 shadow-xs border border-neutral-100 text-xs text-neutral-400 italic flex items-center justify-between mb-3">
                              <span>#{c.floor} [该评论已被作者撤回]</span>
                              <span className="text-[10px]">{formatTime(c.timestamp)}</span>
                            </div>
                          );
                        }
                        const isUserComment = c.authorId === 'user';
                        return (
                          <div 
                            onMouseDown={(e) => handleCommentTouchStart(e, c)}
                            onMouseUp={handleCommentTouchEnd}
                            onMouseLeave={handleCommentTouchEnd}
                            onTouchStart={(e) => handleCommentTouchStart(e, c)}
                            onTouchEnd={handleCommentTouchEnd}
                            onContextMenu={(e) => handleCommentContextMenu(e, c)}
                            className={\`bg-white rounded-xl p-3 shadow-xs border flex gap-3 relative transition-all mb-3 \${
                              isUserComment 
                                ? 'border-neutral-200 hover:border-neutral-400 cursor-pointer hover:shadow-sm select-none' 
                                : 'border-neutral-100 hover:border-neutral-300'
                            }\`}
                            title={isUserComment ? "长按或右键弹出编辑/复制/删除菜单" : undefined}
                          >
                            <img src={c.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover bg-neutral-100 shrink-0 border border-neutral-200/50" />
                            <div className="flex-1 space-y-2.5 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-neutral-900">{c.authorName}</span>
                                  {c.authorId === selectedPost.authorId && (
                                    <span className="text-[9px] bg-neutral-900 text-white px-1.5 py-0.5 rounded-sm font-bold shrink-0">
                                      楼主
                                    </span>
                                  )}
                                  {c.isOpUpdate && (
                                    <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5 shrink-0 animate-pulse">
                                      📢 楼主更新
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-neutral-400">#{c.floor}</span>
                              </div>
                              
                              {c.replyTo && c.level === 0 && (
                                <div className="bg-neutral-50 border-l-2 border-neutral-300 px-2 py-1 rounded text-[11px] text-neutral-500 flex items-center gap-1 my-1">
                                  <CornerDownRight className="w-3 h-3 text-neutral-400 shrink-0" />
                                  <span>回复 #{c.replyTo.floor} @{c.replyTo.authorName}: {c.replyTo.content}</span>
                                </div>
                              )}
                              
                              {editingCommentId === c.id ? (
                                <div className="space-y-2">
                                  <textarea 
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    className="w-full bg-neutral-50 p-2 text-xs border border-neutral-300 rounded-lg outline-none resize-none"
                                    rows={2}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button 
                                      onClick={() => setEditingCommentId(null)}
                                      className="text-[11px] px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 rounded font-medium text-neutral-600"
                                    >
                                      取消
                                    </button>
                                    <button 
                                      onClick={() => handleSaveEditComment(c.id)}
                                      className="text-[11px] px-2.5 py-1 bg-black text-white rounded font-medium"
                                    >
                                      保存
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-neutral-800 font-medium break-all whitespace-pre-wrap leading-relaxed">
                                  {c.content}
                                </p>
                              )}
                              <div className="text-[11px] text-neutral-400 pt-1 flex items-center justify-between border-t border-neutral-50">
                                <span>{formatTime(c.timestamp)}</span>
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => handleLikeComment(c.id)}
                                    className={\`flex items-center gap-1 font-medium transition-colors \${c.isLiked ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-black'}\`}
                                    title={c.isLiked ? "取消点赞" : "点赞评论"}
                                  >
                                    <ThumbsUp className={\`w-3.5 h-3.5 \${c.isLiked ? 'fill-neutral-900 text-neutral-900' : ''}\`} />
                                    <span>{c.likes || 0}</span>
                                  </button>
                                  <button 
                                    onClick={() => handleDislikeComment(c.id)}
                                    className="flex items-center gap-1 text-neutral-400 hover:text-black font-medium transition-colors"
                                    title="点踩评论"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    <span>{c.dislikes || 0}</span>
                                  </button>
                                  <button 
                                    onClick={() => setReplyingToComment(c)}
                                    className="flex items-center gap-1 text-neutral-400 hover:text-black font-medium transition-colors"
                                    title="回复此评论"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>回复</span>
                                  </button>
                                  <button 
                                    onClick={() => setShareModalData({ type: 'comment', itemContent: c.content, postId: selectedPost.id, commentId: c.id })}
                                    className="flex items-center gap-1 text-neutral-400 hover:text-black font-medium transition-colors"
                                    title="分享给角色"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>分享</span>
                                  </button>
                                  {!isUserComment && (
                                    <button 
                                      onClick={() => handleCopyComment(c.content)}
                                      className="text-neutral-400 hover:text-black transition-colors"
                                      title="复制内容"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {c.children.length > 0 && (
                        <div className="mb-2 mt-[-4px]">
                          <button
                            onClick={() => setExpandedReplies(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                            className="text-[11px] font-bold text-neutral-500 hover:text-black transition-colors flex items-center gap-1 mb-2 bg-neutral-100/50 px-2 py-1 rounded-md"
                          >
                            <span className="w-4 h-0.5 bg-neutral-400 rounded inline-block" />
                            {isExpanded ? "收起回复" : \`展开 \${c.children.length} 条回复\`}
                          </button>
                          {isExpanded && (
                            <div className="space-y-1">
                              {c.children.map((child: any) => renderCommentNode(child))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                };

                return topLevel.reverse().map(renderCommentNode);
              })()}`;

code = code.substring(0, startIdx) + insert + code.substring(endIdx + endStr.length);
fs.writeFileSync(file, code, 'utf8');
