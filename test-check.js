const fs = require('fs');
const content = fs.readFileSync('src/components/ChatApp.tsx', 'utf8');
if (content.includes('contentStartsWithSpecial')) {
  console.log('Exists!');
} else {
  console.log('Not exists!');
}
