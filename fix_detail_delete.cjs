const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ForumApp.tsx');
let code = fs.readFileSync(file, 'utf8');

const oldDetailDelete = `{selectedPost.authorId === 'user' && (
                  <button 
                    onClick={(e) => handleDeletePost(selectedPost.id, e)} 
                    className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium transition-colors"
                    title="删除帖子"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除</span>
                  </button>
                )}`;

const newDetailDelete = `<button 
                    onClick={(e) => handleDeletePost(selectedPost.id, e)} 
                    className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium transition-colors"
                    title="删除帖子"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除</span>
                  </button>`;

code = code.replace(oldDetailDelete, newDetailDelete);
fs.writeFileSync(file, code, 'utf8');
