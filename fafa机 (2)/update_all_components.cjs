const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const endpoints = [
    { url: '/api/fetch-models', func: 'apiFetchModels' },
    { url: '/api/analyze-character-file', func: 'apiAnalyzeCharacterFile' },
    { url: '/api/chat', func: 'apiChat' },
    { url: '/api/generate-note', func: 'apiGenerateNote' },
    { url: '/api/uno-dialogue', func: 'apiUnoDialogue' },
    { url: '/api/uno-move', func: 'apiUnoMove' },
    { url: '/api/generate-turtlesoup-batch', func: 'apiGenerateTurtlesoupBatch' },
  ];

  let addedImports = new Set();

  endpoints.forEach(ep => {
    // Basic naive replacement.
    // If the file contains `fetch("${ep.url}"`
    if (content.includes(`fetch("${ep.url}"`)) {
      addedImports.add(ep.func);
      
      // Let's replace:
      // const response = await fetch("/api/xxx", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ... }) });
      // const data = await response.json();
      // With:
      // const data = await apiXxx({ ... });
      
      // We can do this with regex, but it's tricky since the body might be multi-line.
      // So we will just replace the `fetch` call block manually.
    }
  });

  if (addedImports.size > 0) {
    const importStr = `\nimport { ${Array.from(addedImports).join(', ')} } from "../lib/api";\n`;
    content = content.replace(/import \{[\s\S]*?\} from ["']lucide-react["'];/, match => match + importStr);
    
    // Now replace the fetches
    endpoints.forEach(ep => {
      let fetchRegex = new RegExp(`const response = await fetch\\("${ep.url}", \\{[\\s\\S]*?body: JSON\\.stringify\\((.*?)\\),[\\s\\S]*?\\}\\);`, 'g');
      content = content.replace(fetchRegex, `const data = await ${ep.func}($1);`);
      
      // also match `let response; try { response = await fetch... }`
      let fetchRegex2 = new RegExp(`response = await fetch\\("${ep.url}", \\{[\\s\\S]*?body: JSON\\.stringify\\((.*?)\\),[\\s\\S]*?\\}\\);`, 'g');
      content = content.replace(fetchRegex2, `data = await ${ep.func}($1);`);
    });
    
    // Remove `const data = await response.json();`
    content = content.replace(/const data = await response\.json\(\);/g, `// data already parsed`);
    
    // Remove `if (!response.ok) { ... throw new Error(...) }`
    content = content.replace(/if \(!response\.ok\) \{[\s\S]*?throw new Error[\s\S]*?\}/g, `// response error checked internally`);
    content = content.replace(/if \(!response \|\| !response\.ok\) \{[\s\S]*?throw new Error[\s\S]*?\}/g, `// response error checked internally`);

    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
