const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/HomeScreen.tsx');
let code = fs.readFileSync(file, 'utf8');

const searchTheater = '<h3 className="font-bold text-sm text-neutral-900">小剧场</h3>';
const replaceMemory = '<h3 className="font-bold text-sm text-neutral-900">记忆</h3>\n                  <p className="text-[10px] text-neutral-500 mt-0.5">角色记忆与设定</p>';

const searchTheaterAppCall = 'onClick={() => onOpenApp("theater")}';
const replaceMemoryAppCall = 'onClick={() => onOpenApp("memory")}';

const searchTheaterIcon = '<div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">\n                  <span className="text-xl">🎭</span>\n                </div>';
const replaceMemoryIcon = `<div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                  <span className="text-xl">🧠</span>
                </div>`;

// First replace the onClick
code = code.replace(searchTheaterAppCall, replaceMemoryAppCall);
// Then the icon
code = code.replace(searchTheaterIcon, replaceMemoryIcon);
// Then the title
code = code.replace('<h3 className="font-bold text-sm text-neutral-900">小剧场</h3>\n                  <p className="text-[10px] text-neutral-500 mt-0.5">独立架空演绎模式</p>', replaceMemory);

fs.writeFileSync(file, code, 'utf8');
console.log("Page 2 replaced.");
