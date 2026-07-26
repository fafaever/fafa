const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/HomeScreen.tsx');
let code = fs.readFileSync(file, 'utf8');

// Replace Page 2 content
const startStr = `        {/* Page 2: Second Screen View */}`;
const endStr = `      {/* Pagination Indicators - Sticky Footer */}`;

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const insert = `        {/* Page 2: Second Screen View */}
        <div className="w-full min-w-full shrink-0 snap-start flex flex-col px-5 pt-8 pb-4 text-neutral-900 select-none overflow-y-auto h-full">
          
          <div className="mt-8 mb-8 text-center animate-fade-in">
            <h1 className="text-2xl font-serif tracking-tight font-bold text-neutral-900">扩展应用</h1>
            <p className="text-xs text-neutral-500 mt-1 font-sans">更多系统功能</p>
          </div>

          <div className="grid grid-cols-3 gap-x-4 gap-y-8 px-2 justify-items-center">
            {/* Memory */}
            <button
              onClick={() => onOpenApp("memory")}
              className="flex flex-col items-center gap-2.5 group focus:outline-none active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-white border border-neutral-100 rounded-[20px] flex items-center justify-center shadow-sm">
                <span className="text-2xl">🧠</span>
              </div>
              <span className="text-[11px] font-bold tracking-tight text-neutral-600 font-sans">记忆</span>
            </button>

            {/* Cloud */}
            <button
              onClick={() => alert("云端服务即将开放...")}
              className="flex flex-col items-center gap-2.5 group focus:outline-none active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-white border border-neutral-100 rounded-[20px] flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-neutral-700">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold tracking-tight text-neutral-600 font-sans">云端</span>
            </button>

            {/* Help */}
            <button
              onClick={() => onOpenApp("help")}
              className="flex flex-col items-center gap-2.5 group focus:outline-none active:scale-95 transition-all"
            >
              <div className="w-16 h-16 bg-white border border-neutral-100 rounded-[20px] flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-neutral-700">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <span className="text-[11px] font-bold tracking-tight text-neutral-600 font-sans">帮助</span>
            </button>
          </div>
        </div>
      </div>
`;
  code = code.substring(0, startIdx) + insert + code.substring(endIdx);
  fs.writeFileSync(file, code, 'utf8');
  console.log("Success");
} else {
  console.log("Not found with indexOf");
}
