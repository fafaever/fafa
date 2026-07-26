const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/HomeScreen.tsx');
let code = fs.readFileSync(file, 'utf8');

// The Page 1 Theater that got corrupted to Memory:
const badTheater = `<button
              onClick={() => onOpenApp("memory")}
              className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] text-purple-600">
                <span className="text-2xl">🎭</span>
              </div>
              <span className="text-[11px] text-neutral-500 font-sans">小剧场</span>
            </button>`;

const fixedTheater = `<button
              onClick={() => onOpenApp("theater")}
              className="flex flex-col items-center gap-2 group focus:outline-none active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-white border border-neutral-100 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <span className="text-2xl">🎭</span>
              </div>
              <span className="text-[11px] text-neutral-500 font-sans">小剧场</span>
            </button>`;

code = code.replace(badTheater, fixedTheater);

const searchPage2TheaterCall = 'onClick={() => onOpenApp("theater")}\n              className="w-full flex items-center justify-between bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm active:scale-98 transition-all"';
const replacePage2MemoryCall = 'onClick={() => onOpenApp("memory")}\n              className="w-full flex items-center justify-between bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm active:scale-98 transition-all"';

code = code.replace(searchPage2TheaterCall, replacePage2MemoryCall);

fs.writeFileSync(file, code, 'utf8');
