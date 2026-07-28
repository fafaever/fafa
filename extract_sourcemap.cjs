const fs = require('fs');

const data = fs.readFileSync('downloaded.tsx', 'utf-8');
const match = data.match(/sourceMappingURL=data:application\/json;base64,(.*)$/);
if (match) {
  const base64 = match[1];
  const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
  const sourcemap = JSON.parse(jsonStr);
  const sourceCode = sourcemap.sourcesContent[0];
  fs.writeFileSync('restored.tsx', sourceCode);
  console.log("Restored successfully from sourcemap!");
} else {
  console.log("Sourcemap not found!");
}
