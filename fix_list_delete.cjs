const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ForumApp.tsx');
let code = fs.readFileSync(file, 'utf8');

const searchMainListHeader = `<div className="flex items-center gap-2">
                            <span className="text-[10px] bg-neutral-50 text-neutral-500 px-2 py-0.5 rounded border border-neutral-100">
                              {post.tag}
                            </span>
                            <button 
                              onClick={(e) => toggleBookmark(post.id, e)}
                              className="p-1 text-neutral-400 hover:text-amber-500 transition-colors"
                            >
                              <Bookmark className={\`w-4 h-4 \${userBookmarks.includes(post.id) ? 'fill-amber-500 text-amber-500' : ''}\`} />
                            </button>
                          </div>`;

const newMainListHeader = `<div className="flex items-center gap-2">
                            <span className="text-[10px] bg-neutral-50 text-neutral-500 px-2 py-0.5 rounded border border-neutral-100">
                              {post.tag}
                            </span>
                            <button 
                              onClick={(e) => toggleBookmark(post.id, e)}
                              className="p-1 text-neutral-400 hover:text-amber-500 transition-colors"
                              title="收藏"
                            >
                              <Bookmark className={\`w-4 h-4 \${userBookmarks.includes(post.id) ? 'fill-amber-500 text-amber-500' : ''}\`} />
                            </button>
                            <button 
                              onClick={(e) => handleDeletePost(post.id, e)}
                              className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                              title="删除帖子"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>`;

code = code.replace(searchMainListHeader, newMainListHeader);
fs.writeFileSync(file, code, 'utf8');
