const fs = require('fs');
let code = fs.readFileSync('src/components/OfflineMeetView.tsx', 'utf-8');

const regex = /const systemInstruction = `【线下见面剧情模式特别指令】：([\s\S]*?)表现出 \$\{character\.name\} 的独特性格细节（\$\{character\.description \|\| ""\}）。`;/g;

const replacement = `const styleRules = getPromptStyleInstructions();

      const systemInstruction = \`【线下见面剧情模式特别指令】：
你正在与用户进行“线下见面”互动。这是一个纯剧情小说/剧本模式，以环境白描、肢体动作、感官细节与微小停顿为主，对话为辅。
\${onlineContextStr}

【线下见面与动作心理描写规则（极其重要）】：
1. 用户发送的【未加双引号】的内容（如：好想走啊、叹了口气、心神不定），视为动作、神态、心理活动或外部表现。角色无法直接“听到”或读取用户的内心原话或想法，只能通过观察用户的外部表现、动作、表情、语气来推测。
2. 用户发送的【加双引号】的内容（如：“我想走了”），视为用户明确说出来的话，角色可以直接听到并回应。
3. 角色在回应时，必须严格区分“听到的话”和“观察到的动作/心理”，绝对不能把用户的心理描写或未说出口的动作用作直接听到的对话进行回应。

【字数控制要求】：
请务必将你的每一轮描写控制在约 \${wordLimit} 字左右（范围：\${minWords}~\${maxWords} 字）。

\${styleRules}

规则：
1. 严禁单纯输出网聊短句，不要使用任何聊天气泡视角。
2. 动作与心理描写可以用 *...* 或 （...） 包裹，说话内容放在 quotes “...” 中。
3. 表现出 \${character.name} 的独特性格细节（\${character.description || ""}）。\`;`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/OfflineMeetView.tsx', code);
