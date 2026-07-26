const fs = require('fs');
const code = fs.readFileSync('src/components/ForumApp.tsx', 'utf8');

const start = code.indexOf('{[...selectedPost.comments]');
const end = code.indexOf('              {selectedPost.comments.length === 0 && (');
console.log(code.substring(start, end));
