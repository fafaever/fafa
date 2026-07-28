const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function findBlob() {
  const dir = '.git/objects';
  const folders = fs.readdirSync(dir);
  for (const folder of folders) {
    if (folder.length === 2) {
      const files = fs.readdirSync(path.join(dir, folder));
      for (const file of files) {
        const filePath = path.join(dir, folder, file);
        const data = fs.readFileSync(filePath);
        try {
          const unzipped = zlib.inflateSync(data);
          const content = unzipped.toString('utf-8');
          if (content.includes('OfflineMeetView') && content.includes('function') && content.includes('interface OfflineMeetViewProps')) {
            console.log("Found blob:", folder + file);
            fs.writeFileSync('restored.tsx', content.substring(content.indexOf('import')));
          }
        } catch(e) {}
      }
    }
  }
}
findBlob();
