const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Replace express boilerplate with pure TS functions
let newContent = `import { callOpenAI } from './openai';\n\n`;

// Helper: parseCharacterInstruction (needed by some endpoints)
const parseCharRegex = /function parseCharacterInstruction[\s\S]*?\n\}\n/m;
const parseCharMatch = content.match(parseCharRegex);
if (parseCharMatch) {
  newContent += parseCharMatch[0] + '\n\n';
}

// Extract endpoints and wrap in export async function
const endpointRegex = /app\.post\("\/api\/([a-zA-Z0-9-]+)", async \(req, res\) => {([\s\S]*?)(?=\napp\.post|\napp\.use|\n\/\*|\n\/\/ \-\-\-|\n\/\/ Error handler)/g;

let match;
while ((match = endpointRegex.exec(content)) !== null) {
  let endpointPath = match[1];
  let body = match[2];
  
  let funcName = endpointPath.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  funcName = 'api' + funcName.charAt(0).toUpperCase() + funcName.slice(1);
  
  // We want to transform the body
  // replace req.body with params
  body = body.replace(/req\.body/g, 'params');
  
  // replace `return res.status(XYZ).json(...)` with `throw new Error(...)` or `return ...`
  // Actually, to keep it simple, we can provide a dummy `res` object inside the function
  
  let funcBody = `export async function ${funcName}(params: any) {
  const req = { body: params };
  let responseData = null;
  let errorData = null;
  const res = {
    status: (code) => res,
    json: (data) => {
      if (data.error || data.success === false) {
        errorData = data;
      } else {
        responseData = data;
      }
      return data;
    },
  };

  ${body}

  if (errorData) throw new Error(errorData.error || errorData.message || JSON.stringify(errorData));
  return responseData;
}
`;

  newContent += funcBody + '\n';
}

fs.writeFileSync('src/lib/api.ts', newContent);
console.log('Done rewriting api.ts structure');
