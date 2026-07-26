const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/HomeScreen.tsx');
let code = fs.readFileSync(file, 'utf8');

const search = `            <button
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

const insert = `            <button
              onClick={() => onOpenApp("forum")}
              className="col-span-2 relative h-[88px] rounded-[24px] focus:outline-none active:scale-98 transition-all shadow-sm p-[2px] bg-white group text-left"
              style={{
                background: "linear-gradient(135deg, rgba(240,240,240,1) 0%, rgba(255,255,255,1) 50%, rgba(245,245,245,1) 100%)",
                boxShadow: "0 2px 10px -4px rgba(0,0,0,0.05)"
              }}
            >
              <div className="w-full h-full rounded-[22px] bg-white/60 backdrop-blur-md flex flex-col justify-between px-4 pt-3 pb-2 border border-neutral-100/50 shadow-[inset_0_1px_4px_rgba(255,255,255,0.8)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-full border-b border-neutral-200/80 pb-1 mb-2 flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-bold tracking-widest text-[#A8A39A]">{latestForumBoardName || "深夜食堂"}</span>
                    <div className="w-4 h-[1px] bg-neutral-300 rounded-full" />
                  </div>
                  <p className="text-[11px] text-neutral-700 font-medium line-clamp-2 leading-[1.4] w-11/12">
                    {latestForumPost ? (latestForumPost.comments?.length > 0 ? latestForumPost.comments[latestForumPost.comments.length - 1].content : latestForumPost.content) : "暂时没有新的帖子更新..."}
                  </p>
                </div>
                <div className="w-full flex justify-between items-end shrink-0 pt-0.5 relative z-10">
                  <div className="flex gap-1 items-center opacity-40">
                    <div className="w-1 h-1 rounded-full bg-neutral-500"></div>
                    <div className="w-1 h-1 rounded-full bg-neutral-500"></div>
                    <div className="w-3 h-0.5 rounded-full bg-neutral-500"></div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300 opacity-80"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
              </div>
            </button>`;

const startStr = `            <button\n              onClick={() => onOpenApp("forum")}`;
const endStr = `暂时没有新的帖子更新..."}\n              </p>\n            </button>`;

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + insert + code.substring(endIdx + endStr.length);
  fs.writeFileSync(file, code, 'utf8');
  console.log("Success");
} else {
  console.log("Not found with indexOf");
}
