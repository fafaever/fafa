const fs = require('fs');
const content = fs.readFileSync('src/components/HomeScreen.tsx', 'utf8');
console.log(content.indexOf('便签'));
console.log(content.indexOf('New 3x2 App Grid'));
