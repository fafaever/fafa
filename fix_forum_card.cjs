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
              className="col-span-2 relative h-[88px] rounded-[24px] focus:outline-none active:scale-98 transition-all shadow-sm p-[2px]"
              style={{
                background: "linear-gradient(135deg, rgba(230,230,230,0.5) 0%, rgba(255,255,255,0.8) 50%, rgba(240,240,240,0.5) 100%)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              <div className="w-full h-full rounded-[22px] bg-white/80 backdrop-blur-md flex flex-col px-3.5 pt-3 pb-2.5 text-left border border-white shadow-[inset_0_0_10px_rgba(255,255,255,0.5)]">
                {/* Header with 1px line */}
                <div className="w-full border-b border-neutral-200/80 pb-1 mb-1.5 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold tracking-widest text-neutral-500">{latestForumBoardName || "深夜食堂"}</span>
                  <div className="w-4 h-[1px] bg-neutral-300 rounded-full" />
                </div>
                
                {/* Content */}
                <p className="text-[11px] text-neutral-700 font-medium line-clamp-2 leading-[1.4] flex-1 w-full">
                  {latestForumPost ? (latestForumPost.comments?.length > 0 ? latestForumPost.comments[latestForumPost.comments.length - 1].content : latestForumPost.content) : "暂时没有新的帖子更新..."}
                </p>

                {/* Decorative Footer */}
                <div className="w-full flex justify-between items-end shrink-0 pt-0.5">
                  <div className="flex gap-1 items-center">
                    <div className="w-1 h-1 rounded-full bg-neutral-300"></div>
                    <div className="w-1 h-1 rounded-full bg-neutral-300"></div>
                    <div className="w-3 h-0.5 rounded-full bg-neutral-300"></div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
              </div>
            </button>`;

if(code.includes(search)) {
  code = code.replace(search, insert);
  fs.writeFileSync(file, code, 'utf8');
  console.log("Success");
} else {
  console.log("Not found");
}
