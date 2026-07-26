const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/HomeScreen.tsx');
let code = fs.readFileSync(file, 'utf8');

const oldForumButton = `<button
              onClick={() => onOpenApp("forum")}
              className="col-span-2 relative h-[88px] rounded-[24px] overflow-hidden focus:outline-none active:scale-98 transition-all flex flex-col items-start justify-center p-4 text-left border border-white/40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
              style={{
                background: "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)"
              }}
            >
              <div className="absolute top-3 right-3 text-neutral-400">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <span className="text-[10px] font-bold text-neutral-500 mb-1 z-10">{latestForumBoardName || "深夜食堂"}</span>
              <p className="text-[11px] text-neutral-800 font-medium line-clamp-2 w-11/12 z-10 leading-snug">
                {latestForumPost ? (latestForumPost.comments?.length > 0 ? latestForumPost.comments[latestForumPost.comments.length - 1].content : latestForumPost.content) : "暂时没有新的帖子更新..."}
              </p>
            </button>`;

const newForumButton = `<button
              onClick={() => onOpenApp("forum")}
              className="col-span-2 relative h-[88px] rounded-[24px] overflow-hidden focus:outline-none active:scale-98 transition-all flex flex-col items-start justify-center p-4 text-left shadow-none"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "0.5px solid rgba(255, 255, 255, 0.2)"
              }}
            >
              <div className="absolute bottom-3 right-3 text-white/60">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <span className="absolute top-3 left-4 text-[10px] font-bold text-[#A8A39A] z-10">{latestForumBoardName || "深夜食堂"}</span>
              <p className="text-[11px] text-neutral-700 font-medium line-clamp-2 w-11/12 z-10 leading-snug mt-3">
                {latestForumPost ? (latestForumPost.comments?.length > 0 ? latestForumPost.comments[latestForumPost.comments.length - 1].content : latestForumPost.content) : "暂时没有新的帖子更新..."}
              </p>
            </button>`;

code = code.replace(oldForumButton, newForumButton);

fs.writeFileSync(file, code, 'utf8');
