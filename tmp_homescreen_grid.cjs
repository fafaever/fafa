const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/HomeScreen.tsx');
let code = fs.readFileSync(file, 'utf8');

const searchGridStart = '<div className="grid grid-cols-3 gap-3 shrink-0">';
const searchGridEndStr = '              <span className="text-[11px] text-neutral-500 font-sans">记忆</span>\n            </button>\n          </div>';

const startIndex = code.indexOf(searchGridStart);
const endIndex = code.indexOf(searchGridEndStr, startIndex) + searchGridEndStr.length;

if (startIndex === -1 || code.indexOf(searchGridEndStr) === -1) {
  console.log("Could not find grid bounds.");
  process.exit(1);
}

const newGrid = `<div className="grid grid-cols-3 gap-3 shrink-0">
            <button
              onClick={() => onOpenApp("phonecheck")}
              className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-[1.5] stroke-neutral-900" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /></svg>
              </div>
              <span className="text-[11px] text-neutral-500 font-sans">查手机</span>
            </button>
            <button
              onClick={() => onOpenApp("universe")}
              className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-[1.5] stroke-neutral-900" fill="none"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              </div>
              <span className="text-[11px] text-neutral-500 font-sans">宇宙</span>
            </button>
            <button
              onClick={() => onOpenApp("theater")}
              className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] text-purple-600">
                <span className="text-2xl">🎭</span>
              </div>
              <span className="text-[11px] text-neutral-500 font-sans">小剧场</span>
            </button>
            <button
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
            </button>
            <button
              onClick={() => onOpenApp("gamelist")}
              className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all h-[88px] justify-end"
            >
              <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-[1.5] stroke-neutral-900" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 12h4m-2-2v4m10-2h-4" /></svg>
              </div>
              <span className="text-[11px] text-neutral-500 font-sans">游戏</span>
            </button>
          </div>`;

code = code.substring(0, startIndex) + newGrid + code.substring(endIndex);
fs.writeFileSync(file, code, 'utf8');
console.log("Grid replaced.");
