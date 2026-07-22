const fs = require('fs');
let notes = fs.readFileSync('src/components/NotesApp.tsx', 'utf8');

notes = notes.replace(/const data = await apiGenerateNote\(\{ character, settings \}\);\s*if \(data\.error\) \{\s*throw new Error\(data\.error \|\| "请求失败"\);\s*\}/, 
`const data = await apiGenerateNote({ character: selectedChar, settings });`);

fs.writeFileSync('src/components/NotesApp.tsx', notes);
