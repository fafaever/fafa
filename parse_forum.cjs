const fs = require('fs');
const code = fs.readFileSync('src/components/ForumApp.tsx', 'utf8');

const listLines = code.split('\n').map((l, i) => i+1 + ': ' + l).filter(l => l.includes('handleDeletePost'));
console.log(listLines.join('\n'));
