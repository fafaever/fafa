const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ForumApp.tsx');
let code = fs.readFileSync(file, 'utf8');

const oldHeader = `{/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0 shadow-sm z-10 relative">
        <button
          onClick={onClose}
          className="p-1 -ml-1 text-neutral-500 hover:text-black rounded-lg active:scale-95 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-sans font-bold text-base tracking-wide text-neutral-950">
          {activeTab === 'public' ? '匿名论坛' : activeTab === 'private' ? '论坛私信' : '我的'}
        </span>
        <div className="w-8" />
      </div>`;

const newHeader = `{/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0 shadow-sm z-10 relative">
        <button
          onClick={onClose}
          className="p-1 -ml-1 text-neutral-500 hover:text-black rounded-lg active:scale-95 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-sans font-bold text-base tracking-wide text-neutral-950">
          {activeTab === 'public' ? '匿名论坛' : activeTab === 'private' ? '论坛私信' : '我的'}
        </span>
        <div className="w-8 flex items-center justify-end">
          {activeTab === 'private' && !activePrivateContact && (
             <button onClick={handleRefreshPrivateMessages} disabled={isGeneratingPrivateRequest} className="text-neutral-500 hover:text-black transition-colors" title="接收新私信">
               <RefreshCw className={\`w-5 h-5 \${isGeneratingPrivateRequest ? 'animate-spin' : ''}\`} />
             </button>
          )}
        </div>
      </div>`;

code = code.replace(oldHeader, newHeader);
fs.writeFileSync(file, code, 'utf8');
