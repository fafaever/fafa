const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/PhoneCheckApp.tsx');
let code = fs.readFileSync(file, 'utf8');

// Replace todo memos onClick
code = code.replace(
  /                  onClick=\{\(\) => toggleMemoStatus\(memo\.id\)\}\n                  className="bg-white p-3\.5 rounded-2xl border border-neutral-200\/70 shadow-xs hover:border-neutral-300 transition-all cursor-pointer group"/g,
  '                  className="bg-white p-3.5 rounded-2xl border border-neutral-200/70 shadow-xs transition-all"'
);

// Remove group-hover from todo checkbox
code = code.replace(
  /<div className="w-4 h-4 rounded border-2 border-neutral-300 mt-0\.5 flex items-center justify-center shrink-0 group-hover:border-black transition-colors" \/>/g,
  '<div className="w-4 h-4 rounded border-2 border-neutral-300 mt-0.5 flex items-center justify-center shrink-0" />'
);

// Replace done memos onClick
code = code.replace(
  /                  onClick=\{\(\) => toggleMemoStatus\(memo\.id\)\}\n                  className="bg-white\/60 p-3\.5 rounded-2xl border border-neutral-200\/50 shadow-xs hover:border-neutral-300 transition-all cursor-pointer opacity-80"/g,
  '                  className="bg-white/60 p-3.5 rounded-2xl border border-neutral-200/50 shadow-xs transition-all opacity-80"'
);

fs.writeFileSync(file, code, 'utf8');
console.log("Success");
