const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ForumApp.tsx');
let code = fs.readFileSync(file, 'utf8');

const searchProfileHeader1 = `<div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">
                              {post.tag}
                            </span>
                            <span className="text-[10px] text-neutral-400">{formatTime(post.timestamp)}</span>
                          </div>`;

const newProfileHeader1 = `<div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-medium">
                              {post.tag}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-neutral-400">{formatTime(post.timestamp)}</span>
                              <button onClick={(e) => handleDeletePost(post.id, e)} className="text-neutral-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>`;

code = code.replace(searchProfileHeader1, newProfileHeader1);

const searchProfileHeader2 = `<div className="flex items-center gap-2">
                              <img src={post.authorAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                              <span className="text-xs font-bold text-neutral-800">{post.authorName}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400">{formatTime(post.timestamp)}</span>`;

const newProfileHeader2 = `<div className="flex items-center gap-2">
                              <img src={post.authorAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                              <span className="text-xs font-bold text-neutral-800">{post.authorName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-neutral-400">{formatTime(post.timestamp)}</span>
                              <button onClick={(e) => handleDeletePost(post.id, e)} className="text-neutral-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>`;

code = code.replace(searchProfileHeader2, newProfileHeader2);
fs.writeFileSync(file, code, 'utf8');
