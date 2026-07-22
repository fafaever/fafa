const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('fetch("/api/chat"')) {
    content = content.replace(/import \{[\s\S]*?\} from ["']lucide-react["'];/, match => match + '\nimport { apiChat } from "../lib/api";');
    content = content.replace(/let response;\s*try \{\s*response = await fetch\("\/api\/chat", \{\s*method: "POST",\s*headers: \{ "Content-Type": "application\/json" \},\s*body: JSON.stringify\(requestParams\),\s*\}\);\s*\} catch \(networkErr: any\) \{/g, 
      `let data;\n      try {\n        data = await apiChat(requestParams);\n      } catch (networkErr: any) {`);
    
    content = content.replace(/if \(!response \|\| !response\.ok\) \{\s*let errorMsg = "网络连接失败或响应异常。";\s*try \{\s*const errData = await response\?.json\(\);\s*errorMsg = errData\?.error \|\| errorMsg;\s*\} catch \(e\) \{\}\s*throw new Error\(errorMsg\);\s*\}/g,
      `// Error handled inside apiChat`);
    
    // Also remove const data = await response.json();
    content = content.replace(/const data = await response\.json\(\);/g, `// data already parsed`);

    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
