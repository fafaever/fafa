const fs = require('fs');
let s = fs.readFileSync('server.ts', 'utf8');

function extractFuncBody(name) {
  let start = s.indexOf(`app.post("/api/${name}"`);
  if (start === -1) return null;
  let end = s.indexOf('app.post("/api/', start + 20);
  if (end === -1) end = s.indexOf('app.use(', start + 20);
  return s.substring(start, end);
}

// 1. Generate Analyze Character File
let analyzeBody = extractFuncBody('analyze-character-file');
let analyzePromptBlock = analyzeBody.match(/try \{[\s\S]*?(?=const customApiUrl = settings\?\.apiUrl;)/)[0];

// 2. Chat
let chatBody = extractFuncBody('chat');
// The prompt logic in chat is very long, it goes up to `let rawText = "";`
let chatPromptBlock = chatBody.match(/try \{[\s\S]*?(?=let rawText = "";)/)[0];

// 3. Generate Note
let noteBody = extractFuncBody('generate-note');
let notePromptBlock = noteBody.match(/const prompt = `[\s\S]*?`;/)[0];

// 4. UNO Dialogue
let unoDialogueBody = extractFuncBody('uno-dialogue');
let unoDialoguePromptBlock = unoDialogueBody.match(/const parsedInfo = parseCharacterInstruction[\s\S]*?const prompt = `[\s\S]*?`;/)[0];

// 5. UNO Move
let unoMoveBody = extractFuncBody('uno-move');
let unoMovePromptBlock = unoMoveBody.match(/const prompt = `[\s\S]*?`;/)[0];

// 6. TurtleSoup
let turtleSoupBody = extractFuncBody('generate-turtlesoup-batch');
let turtleSoupPromptBlock = turtleSoupBody.match(/const prompt = `[\s\S]*?`;/)[0];


let apiFile = `import mammoth from 'mammoth';

export async function callOpenAI(apiUrl: string, apiKey: string, model: string, messages: any[], temperature = 0.8) {
  if (!apiUrl || !apiKey) {
    throw new Error("请先在设置页配置 API 地址和 API Key");
  }

  const endpoint = \`\${apiUrl.replace(/\\/+$/, "")}/chat/completions\`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": \`Bearer \${apiKey}\`,
    },
    body: JSON.stringify({
      model: model || "gpt-3.5-turbo",
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    let errText = "";
    try { errText = await response.text(); } catch (e) {}
    throw new Error(\`API 调用失败: \${response.status} \${errText}\`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Helper functions
${s.match(/function parseCharacterInstruction[\\s\\S]*?\\}\\n/)[0]}
${s.match(/function sanitizeBannedPhrases[\\s\\S]*?\\}\\n/)[0]}
${s.match(/function extractJson[\\s\\S]*?\\}\\n/)[0]}

export async function apiAnalyzeCharacterFile(params: any) {
  const { fileBase64, fileName, settings } = params;
  if (!fileBase64 || !fileName) {
    throw new Error("缺少必要的文件内容。 (Missing file content)");
  }
  \${analyzePromptBlock}
    const responseText = await callOpenAI(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.3);
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("\`\`\`json")) {
      cleanedText = cleanedText.substring(7);
    } else if (cleanedText.startsWith("\`\`\`")) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith("\`\`\`")) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();
    const parsedData = extractJson(cleanedText);
    parsedData.personality = text;
    return { success: true, data: parsedData };
  } catch (error: any) {
    throw new Error(error.message || "文档分析失败，请检查文件格式或重试。");
  }
}

export async function apiChat(params: any) {
  const { messages, character, settings, matchedLore, chatMode, replyLength, replyCount, mood, memories, userDidNotReply, isBlocked } = params;
  \${chatPromptBlock}
    let rawText = "";
    const formattedMessages = [
      { role: "system", content: currentSysInstruction },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }))
    ];
    rawText = await callOpenAI(settings?.apiUrl, settings?.apiKey, settings?.model, formattedMessages, 0.8);
    
    let finalCleanText = "";
    let finalOs = "";

    const osMatch = rawText.match(/\\[OS_INNER\\](.*?)$/is);
    if (osMatch) {
      finalOs = osMatch[1].trim();
      finalCleanText = rawText.replace(/\\[OS_INNER\\](.*?)$/is, "").trim();
    } else {
      finalCleanText = rawText.trim();
    }

    const { cleanText, osText } = sanitizeBannedPhrases(finalCleanText, finalOs, character, parsedInfo);
    finalCleanText = cleanText;
    finalOs = osText;

    return { text: finalCleanText, os: finalOs };
  } catch (err: any) {
    throw new Error(err.message || "对话生成失败，请重试。");
  }
}

export async function apiGenerateNote(params: any) {
  const { character, settings } = params;
  if (!character) throw new Error("Missing character parameter");
  \${notePromptBlock}
  try {
    const text = await callOpenAI(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.8);
    return { text: text.trim() };
  } catch (err: any) {
    throw new Error(err.message || "随笔生成失败");
  }
}

export async function apiUnoDialogue(params: any) {
  const { character, event, cardDetails, context, settings } = params;
  if (!character) throw new Error("Missing character parameter");
  \${unoDialoguePromptBlock}
  try {
    const text = await callOpenAI(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.8);
    return { text: text.trim() };
  } catch (err: any) {
    throw new Error(err.message || "生成失败");
  }
}

export async function apiUnoMove(params: any) {
  const { character, playableCards, topCard, currentColor, context, settings } = params;
  if (!playableCards || playableCards.length === 0) {
    return { cardId: null, chosenColor: null, dialogue: "没有能出的牌，摸一张看看吧。" };
  }
  \${unoMovePromptBlock}
  try {
    const text = await callOpenAI(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.7);
    const parsed = JSON.parse(text.trim().replace(/\`\`\`json/g, "").replace(/\`\`\`/g, ""));
    return parsed;
  } catch (err: any) {
    throw new Error(err.message || "生成出牌策略失败");
  }
}

export async function apiGenerateTurtlesoupBatch(params: any) {
  const { settings } = params;
  \${turtleSoupPromptBlock}
  try {
    const text = await callOpenAI(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.7);
    const parsed = JSON.parse(text.trim().replace(/\`\`\`json/g, "").replace(/\`\`\`/g, ""));
    return { puzzles: parsed };
  } catch (err: any) {
    throw new Error(err.message || "批量生成海龟汤失败");
  }
}

export async function apiTestConnection(params: any) {
  const { apiUrl, apiKey, model } = params;
  try {
    await callOpenAI(apiUrl, apiKey, model, [{ role: "user", content: "Hello" }]);
    return { success: true, message: "连接成功" };
  } catch (e: any) {
    throw new Error(e.message || "连接失败");
  }
}

export async function apiFetchModels(params: any) {
  const { apiUrl, apiKey } = params;
  try {
    const response = await fetch(\`\${apiUrl.replace(/\\/+$/, "")}/models\`, {
      headers: { "Authorization": \`Bearer \${apiKey}\` },
    });
    if (!response.ok) throw new Error("Fetch models failed");
    const data = await response.json();
    let models = [];
    if (data && data.data && Array.isArray(data.data)) {
      models = data.data.map((m: any) => m.id);
    }
    return { success: true, models };
  } catch (e: any) {
    throw new Error(e.message || "Fetch failed");
  }
}
`;

fs.writeFileSync('src/lib/api.ts', apiFile);
console.log('Clean build done.');
