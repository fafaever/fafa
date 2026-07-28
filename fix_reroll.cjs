const fs = require('fs');
let code = fs.readFileSync('src/components/OfflineMeetView.tsx', 'utf-8');

const regex = /let systemInstruction = `--- 线下见面（Offline Meet）剧情演绎规则 ---([\s\S]*?)if \(customToneKeywords\.trim\(\)\) \{\n        systemInstruction \+= `\\n- 自定义文风\/词汇要求：\$\{customToneKeywords\}`;\n      \}/g;

const replacement = `const styleRules = getPromptStyleInstructions();
      let systemInstruction = \`--- 线下见面（Offline Meet）剧情演绎规则 ---
- 你正在与用户进行面对面的沉浸式剧情互动（线下见面模式）。
\${styleRules}
- 目标字数限制：请输出约 \${wordLimit} 字左右的细腻剧情与互动描写。\`;

      if (meetMode === "isolated") {
        systemInstruction += \`\\n- 架空剧情背景设定：\${isolatedBackground || "无特定背景，自由发挥"}\`;
      } else {
        systemInstruction += \`\\n- 共享模式开场情境：时间「\${timeSetting || "未知"}」，地点「\${locationSetting || "未知"}」，缘由「\${reasonSetting || "未知"}」，氛围「\${atmosphereSetting || "未知"}」。\`;
      }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/OfflineMeetView.tsx', code);
