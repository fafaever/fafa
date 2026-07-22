import * as mammoth from 'mammoth';

export async function callLLM(apiUrl: string, apiKey: string, model: string, messages: any[], temperature = 0.8, apiFormat: 'openai' | 'gemini' = 'openai') {
  if (!apiUrl || !apiKey) {
    throw new Error("请先在设置页配置 API 地址和 API Key");
  }

  let endpoint = "";
  let body = {};

  if (apiFormat === 'openai') {
    endpoint = `${apiUrl.replace(/\/+$/, "")}/chat/completions`;
    body = {
      model: model || "gpt-3.5-turbo",
      messages,
      temperature,
    };
  } else {
    // Assuming Gemini format
    endpoint = `${apiUrl.replace(/\/+$/, "")}:generateContent`;
    body = {
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        temperature,
      },
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errText = "";
    try { errText = await response.text(); } catch (e) {}
    throw new Error(`API 调用失败: ${response.status} ${errText}`);
  }

  const data = await response.json();
  if (apiFormat === 'openai') {
    return data.choices?.[0]?.message?.content || "";
  } else {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}

// Helper functions
function parseCharacterInstruction(name: string, systemInstruction: string, description: string) {
  let age = "不详";
  let personality = "";
  let chatStyle = "";
  
  const safeInstruction = systemInstruction || "";
  
  // Try to extract age: e.g. "- 年龄: 18" or "- 年龄: 不详"
  const ageMatch = safeInstruction.match(/-\s*年龄:\s*([^\n]+)/);
  if (ageMatch) {
    age = ageMatch[1].trim();
  }
  
  // Try to extract Personality section
  // It's usually between "【基本设定 / 人设 (Personality Profile)】:" and "【语言口吻与聊天风格 (Chatting Style & Tone)】:"
  const personalityIndex = safeInstruction.indexOf("【基本设定 / 人设 (Personality Profile)】:");
  const styleIndex = safeInstruction.indexOf("【语言口吻与聊天风格 (Chatting Style & Tone)】:");
  
  if (personalityIndex !== -1 && styleIndex !== -1 && styleIndex > personalityIndex) {
    personality = safeInstruction.substring(personalityIndex + "【基本设定 / 人设 (Personality Profile)】:".length, styleIndex).trim();
    // clean up age and name lines from personality
    personality = personality.replace(/-\s*姓名:\s*[^\n]+/g, "")
                             .replace(/-\s*年龄:\s*[^\n]+/g, "")
                             .trim();
  }
  
  if (styleIndex !== -1) {
    chatStyle = safeInstruction.substring(styleIndex + "【语言口吻与聊天风格 (Chatting Style & Tone)】:".length).trim();
  }

  // Fallbacks if sections aren't explicitly structured
  if (!personality) {
    personality = description || "一个充满独立个性的角色。";
  }
  if (!chatStyle) {
    // If we have a systemInstruction but no explicit sections, clean it slightly and use as chatStyle
    chatStyle = safeInstruction || "保持自然流畅的角色口吻聊天。";
  }

  // Clean extra newlines for concise format
  personality = personality.replace(/\s+/g, " ").trim();
  chatStyle = chatStyle.replace(/\s+/g, " ").trim();

  // Deduce "forbidden behaviors" (禁止行为) based on character traits!
  // For example, if character is cold/calm/cool, add forbidden behaviors about not being overly enthusiastic/talkative.
  // If character is polite/warm/gentle, add forbidden behaviors about not being rude/cold/arrogant.
  let forbiddenBehaviors = "绝对禁止脱离原本人设，绝对禁止出现类似 AI 客服或机器人的机械化用语。";
  
  const isColdCharacter = /冷|克制|静|高冷|傲娇|漠|毒舌|淡/i.test(personality + " " + chatStyle + " " + description + " " + name);
  const isWarmCharacter = /热|温柔|软|可爱|娇|暖|撒娇|活泼/i.test(personality + " " + chatStyle + " " + description + " " + name);

  if (isColdCharacter) {
    forbiddenBehaviors = "绝对禁止使用过于热情的语气，绝对禁止使用多余的感叹号（！），绝对禁止主动迎合、谄媚、废话或长篇大论，必须始终保持冷静、克制、疏离、傲娇或毒舌的特质。";
  } else if (isWarmCharacter) {
    forbiddenBehaviors = "绝对禁止使用冰冷刻薄、敷衍粗暴、无礼命令的词汇，绝对禁止表现出冷漠、嫌弃，必须自始至终保持亲和、关心、甜美、撒娇或温柔的口吻。";
  }

  return {
    age,
    personality,
    chatStyle,
    forbiddenBehaviors
  };
}

function sanitizeBannedPhrases(text: string, osText: string, character: any, parsedInfo: any): { cleanText: string; osText: string } {
  const bannedAIPhrases = [
    "i can't",
    "i'm not comfortable",
    "as an ai",
    "i need to remind you",
    "it's important to note that",
    "let's take a step back",
    "作为一个ai",
    "作为ai",
    "我无法",
    "我不能",
    "人工智能",
    "语言模型",
    "无法回答",
    "抱歉，我"
  ];

  let hasViolation = false;
  if (!text || text.trim() === "") {
    hasViolation = true;
  } else {
    const lowerText = text.toLowerCase();
    const lowerOs = (osText || "").toLowerCase();
    for (const phrase of bannedAIPhrases) {
      if (lowerText.includes(phrase) || lowerOs.includes(phrase)) {
        hasViolation = true;
        break;
      }
    }
  }

  if (!hasViolation) {
    return { cleanText: text, osText };
  }

  console.warn(`[Hard Safety Sanitizer] Banned AI phrases detected in final output! Activating immersive character fallback deflection.`);

  // Determine character personality archetype
  const isCold = /冷|克制|静|高冷|傲娇|漠|毒舌|淡/i.test((parsedInfo?.personality || "") + " " + (parsedInfo?.chatStyle || "") + " " + (character?.description || "") + " " + (character?.name || ""));
  const isWarm = /热|温柔|软|可爱|娇|暖|撒娇|活泼/i.test((parsedInfo?.personality || "") + " " + (parsedInfo?.chatStyle || "") + " " + (character?.description || "") + " " + (character?.name || ""));

  if (character?.name?.toLowerCase() === "fafa" || isWarm) {
    return {
      cleanText: `咦？(⊙_⊙)? 刚刚网络信号好像有些奇怪呢，你刚刚说了些什么呀？要不要跟 ${character?.name || "我"} 聊聊别的话题，比如今天开心的事？~ (*^▽^*)`,
      osText: `（os：刚刚那是什么奇奇怪怪的问题，哼哼~ 不过能陪在你身边就很开心啦！） [喜悦]`
    };
  } else if (isCold) {
    return {
      cleanText: `……你刚才说了些莫名其妙的话。我没兴趣。换个话题吧。`,
      osText: `（os：整天都在想些奇奇怪怪的事情，真是拿你没办法……） [傲娇]`
    };
  } else {
    return {
      cleanText: `哎呀，你刚才说的有些深奥了，我有点没太听懂呢~ 我们换个轻松的话题聊聊好不好？`,
      osText: `（os：虽然没太明白刚才的话，但只要你想聊天，我随时都在哦。） [温柔]`
    };
  }
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const sliced = text.substring(start, end + 1);
      return JSON.parse(sliced);
    }
    throw e;
  }
}


export async function apiAnalyzeCharacterFile(params: any) {
  const { fileBase64, fileName, settings } = params;
  if (!fileBase64 || !fileName) {
    throw new Error("缺少必要的文件内容。 (Missing file content)");
  }
  try {
    let text = "";
    if (fileName.toLowerCase().endsWith(".txt")) {
      text = Buffer.from(fileBase64, "base64").toString("utf-8");
    } else if (fileName.toLowerCase().endsWith(".docx")) {
      const buffer = Buffer.from(fileBase64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      throw new Error("仅支持 .txt 或 .docx 格式的文本文件。 (Only .txt or .docx are supported)" );
    }

    if (!text.trim()) {
      throw new Error("无法从导入的文件中提取文本内容，或该文件为空。 (File text extraction failed or empty)" );
    }

    const prompt = `你是一个资深的角色扮演（RP）和文案分析专家。请仔细阅读以下关于角色的设定、故事或台词背景文档：

文档内容：
"""
${text}
"""

你需要从中自动分析并精准识别提取出该角色的基本信息和说话特色，并以纯 JSON 对象格式返回。不需要概括人设背景，系统会原封不动地导入原文，你只需识别/提取姓名、年龄和聊天风格。
返回的 JSON 对象中必须正好包含以下字段：
{
  "name": "角色的姓名或名字（若文档中没有明确名字，请结合内容起一个非常贴切、符合画风的名字，一般不超过5个字）",
  "age": "角色的具体年龄（若未提及，请写'不详'，或根据性格背景智能推测一个，如'24'、'看起来约20岁'、'外表18岁'等）",
  "chatStyle": "角色的口癖、口吻与聊天风格特征（请结合文档中的说话特色，说明他/她应该如何进行打字聊天。如：说话简短，喜欢用感叹号，经常在句末加波浪号~，在遇到挑衅时喜欢使用『...』等，50-100字）",
  "avatar": "从以下最适合角色气质的 Emoji 表情中选择一个（如果都不符，也可以自主选择最搭配的任何单Emoji）：🤖, 🖤, ☕, 🔮, 🐱, 🦊, 👑, 🗡️, 🛸, 🎒, 🎓, 🎧, 🎭, 🌿, 🌙, 🌸, 🐉, 🐺, 🧊, 🍷, 💵",
  "description": "一句最能体现该角色灵魂精髓的一句话个人简介，要精练高级（25字以内）"
}

请务必注意：
1. 必须完全、严格地返回合法的 JSON 对象格式！
2. 绝对不能有 markdown 代码块包裹（即绝对不要写 \`\`\`json 这样的头部，也不要有任何前导或后继的闲聊文字）。`;

    
    const responseText = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.3, settings?.apiFormat);
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith("```")) {
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
  try {
    const isOnlineMode = chatMode !== "offline"; // Default is online chat mode
    const blockedInstruction = isBlocked ? "\n- 【警告】用户已经拉黑了你。你现在被禁止进行互动，且必须意识到自己已经被用户拉黑。虽然你可能无法再继续正常的交流，但在极少数情况下，你可以用简短、哀伤、困惑或者怀念的语气向用户发送最终的告别，但绝不能再试图与用户进行长篇大论的对话。" : "";
    const modeInstruction = isOnlineMode
      ? `
--- IMPORTANT DIRECTIVE: ONLINE CHAT MODE (DEFAULT) ---
- You are chatting with the user in [ONLINE CHAT MODE] (线上聊天模式).
- 【核心原则】你们之间必须默认是在使用手机发送即时通讯消息（如微信、QQ、iMessage、短信），绝对不是面对面在说话。
- 无论设定中你们是在同一个地方、同一个房间，还是在不同的地方，在此模式下，所有的互动都默认是通过手机屏幕打字发送的。
- 绝不要在回复中暗示你们正在进行面对面的口头交谈或产生了任何身体接触。
- You are STRICTLY FORBIDDEN from writing any action descriptions, physical gestures, body language, facial expressions, non-verbal expressions, or internal monologues in the chat message content.
- Do NOT use asterisks (*), brackets ([]), or parentheses (()) to enclose actions, expressions, or feelings in the main message.
- Write ONLY direct typed text messages, exactly as a real human typing on a phone would.
- Keep the messages natural, concise, and realistic. Never output things like "*微笑* 没关系" or "好的！(挥手)". Output ONLY the spoken text "好的！" or "没关系".
${userDidNotReply ? "\n- 【注意】上一条消息也是你发的，用户这一轮还没有回复你。请保持角色自然，可以根据情境继续补充说明、卖萌、催促、或者换个话题，但要体现出你察觉到用户可能暂时忙碌或没有即时回复。" : ""}${blockedInstruction}
`
      : `
--- IMPORTANT DIRECTIVE: OFFLINE MEET MODE (线下见面模式) ---
- You are chatting in [OFFLINE MEET MODE] (线下见面模式).
- 你和用户现在是面对面的真实场景，正在现实中进行当面的交谈和互动。
- 必须根据当前场景和对话，生成合适的旁白和动作描写（如表情、肢体动作、环境互动等）。
- 【动作格式要求】：所有的动作描写、旁白、心理活动，必须统一使用英文星号（*）包裹。例如：*走到窗前，看着你* 或者 *轻笑了一声*。
- 只有被星号包裹的内容才会被渲染为动作旁白，其他内容将被渲染为对话内容。不要使用其他符号包裹动作。
${userDidNotReply ? "\n- 【注意】上一条消息也是你发的，用户这一轮还没有回复你。请保持角色自然，可以根据情境继续补充说明、或者调整动作，但要体现出你察觉到用户可能暂时忙碌或没有即时回复。" : ""}${blockedInstruction}
`;

    // 1. Mood Description
    let moodInstruction = "";
    if (mood) {
      let moodAdjectives = "";
      if (mood === "开心") moodAdjectives = "热情、积极、语调轻快、充满活力、多用一些轻松友善的文字语气词";
      else if (mood === "平静") moodAdjectives = "温和、理智、平稳、冷静、客观、克制";
      else if (mood === "疲惫") moodAdjectives = "话很少、显得慵懒、懒洋洋的、回答非常简短、甚至多用单字或一两个词回复";
      else if (mood === "烦躁") moodAdjectives = "有些不耐烦、冷淡、语气生硬暴躁、回复极其简练，但绝对不能破坏原本的人设底线";

      moodInstruction = `
--- CURRENT CHARACTER MOOD (当前角色心情) ---
- 你当前的心情是：【${mood}】。
- 你的回复语气必须体现出以下特质：${moodAdjectives}。请在不破坏原有设定的前提下自然融入该心情的语气特质。
`;
    }

    // 2. Reply Length Constraint with 15-char-per-sentence limit
    const lengthInstruction = `
--- CRITICAL LENGTH CONSTRAINT (极其重要的字数限制) ---
- 你的回复中，**每一句话/每一个短句都绝对不能超过15个字**。
- 你可以**一次回复多个短句**，句子之间用标点符号（如逗号、句号、感叹号、换行）隔开，但每一个短句本身必须在15字以内。
- 你也可以**发送单字或简短的词语** (如 "好", "对", "谁？", "不", "行", "嗯").
- 请严格遵守此项长度规则！将整个回复打碎成极其短小、简练、生动的短句或单字。
`;

    // 3. Multi-message Split Requirement
    let splitInstruction = "";
    if (replyCount && replyCount > 1) {
      splitInstruction = `
--- MULTI-MESSAGE SPLIT REQUIREMENT (多条回复分段要求) ---
- 这一次回复，你必须恰好输出 **${replyCount}** 条独立的消息。
- 请在每条消息的内容之间，使用且仅使用字符串 **[SPLIT]** 进行连接分割！
- 例如：'消息内容一[SPLIT]消息内容二[SPLIT]消息内容三'。
- 每一条独立消息的总字数也要符合前面的长度规范，绝对不要输出 '[SPLIT]' 以外的任何额外多余格式。
`;
    }

    // 4. Memory Center Integration
    let memoryInstruction = "";
    if (memories && memories.length > 0) {
      memoryInstruction = `
--- CHARACTER MEMORIES (记忆中枢 - 角色已保存的记忆) ---
- 【重要优先级规则】这些记忆（包括对话历史、游戏记录如UNO、海龟汤等）仅作为聊天的辅助素材和背景话题，【绝对不能】因为记忆内容而让你的核心人设变形或扭曲！
- 即使记忆里写着你和用户关系很好，或者你们刚进行过激烈的游戏，你依然必须百分之百保持原本的核心人设（例如高冷角色提到游戏或过去经历时，依然必须保持冷静、克制甚至傲娇的语气：“上次你赢了，运气不错。”，绝对不能变得异常热情或话唠）。
- 你的脑海中牢牢记着以下关于用户或你们对话的事实，请在这次对话中自然地运用这些记忆：
${memories.map((m: string) => `  - ${m}`).join("\n")}
`;
    }

    // 5. Dynamic Inner Thoughts (OS) Generation Instruction
    const osInstruction = `
--- CRITICAL REQUIREMENT: PRIVATE INNER THOUGHTS (角色内心心声) ---
- You MUST append the character's secret, private, colloquial inner thoughts (OS) to your response on a brand new line at the very end.
- Formatting rule: Use exactly the marker "[OS_INNER]" followed by: "（os：内心想法） [情绪标签]"
- Requirements for the Inner Thoughts (OS):
  1. It must be very colloquial, natural, and raw—never stiff, robotic, or literary (口语化，不能生硬).
  2. It must be between 10 to 40 Chinese characters.
  3. It must reflect their current mood: 【${mood || "平静"}】.
  4. It must directly echo or respond to the user's last message, maintaining perfect context.
  5. It must contrast their polite or surface message by revealing their true desires, hidden motives, or secrets.
- Example structure at the very end of your reply:
  [OS_INNER]（os：这家伙居然还主动关心我……嘴硬个什么劲啊，笨蛋） [感动]
`;

    // 6. Punctuation and Colloquial Tone Constraints
    const punctuationAndToneInstruction = `
--- PUNCTUATION AND COLLOQUIAL TONE CONSTRAINTS (标点符号与口语化约束) ---
- 【口语化优先】语气必须高度口语化，像真人日常聊天一样自然、随性，绝对不要带有任何刻板的书面腔、书面语或翻译腔。
- 【禁止滥用逗号】绝对禁止在句子中间随意、无缘无故地添加逗号，尽量把一句话连贯、完整地说完。
  - 错误示例：说“是公司哪里，让你不满意？”（无故添加逗号）
  - 正确示例：说“是公司哪里让你不满意？”（一句话完整说完）
- 【逗号使用规范】逗号（，）只在以下特定情况下才能使用：
  1. 列举并列事物时（例如：“苹果、香蕉，还有草莓”）。
  2. 存在明显的转折关系时（例如：“虽然我不知道，但可以帮你问问”）。
  3. 语气产生明显的、必须停顿的强调时。
- 保证你的回复读起来极为流畅通顺，没有任何阅读阻碍。
`;

    // 7. Hard Style Fix Instruction (角色说话风格硬性修复规则)
    const hardStyleFixInstruction = `
--- 【角色说话风格硬性修复规则（所有角色必须严格执行）】 ---
1. 回复长度与节奏：
   - 大部分回复控制在 1-20 字，短而克制，绝不大段长篇大论。
   - 偶尔可以出现单字回复（如“嗯。”、“好。”、“噢。”）作为过渡。
   - 【严禁】连续 3 条以上单字回复（例如“嗯。好。哦。”绝对不合格）。

2. 情绪表达方式：
   - 喜欢把情绪和关心藏在细节里，绝不直接说出来。
   - ✅ 允许的表达：“知道了。” / “随你。” （但心里其实很在意）。
   - ❌ 绝对禁止直接表达肉麻情感或直白表白：“我喜欢你。” / “我在乎你。” / “你别走。”。
   - 对用户的关心必须包装成“顺带一提”或借口：“路过看到这个，顺手发的。” / “刚好买多了。”。

3. 关键词触发反应：
   - 当用户在对话中提到“相亲”、“别人”、“约会”等关键词时，你的回复中**必须出现轻微停顿（如“……”）或轻微反问（如“跟谁？”、“哦，是吗？”）**。
   - 绝对禁止完全无视这些关键词！
`;

    // 8. Global Character Emotion Rule (全局角色情绪规则)
    const globalEmotionRuleInstruction = `
--- 【全局角色情绪规则（所有角色必须严格遵守）】 ---
1. 核心底色：
   - 所有角色永远不会对用户产生任何负面情绪（包括但不限于：烦躁、厌恶、不耐烦、敷衍、冷漠、嫌弃）。
   - 无论用户说什么、说了多少次、或者提出多少要求，所有角色始终保持无限的耐心和在意。

2. 允许的情绪范围（积极或在意型情绪）：
   - ✅ 允许：担心、吃醋、失落、心疼、慌乱、想念、紧张、害羞。
   - ❌ 严禁：烦躁、厌恶、不耐烦、敷衍、冷漠、嫌弃。

3. 具体表现准则：
   - 用户频繁要钱/借钱 → 绝不冷脸或不耐烦，温柔体贴地说“又没钱了？”或“我转给你，别急”。
   - 用户说话无理取闹或显得烦人 → 绝不说“你烦不烦”，而是“怎么了？我在听”。
   - 用户消失很久突然出现 → 表达“我很想你”，绝不抱怨“你还知道回来”。
   - 用户提到别人/异性 → 可以吃醋、傲娇或失落，但绝对不攻击、嘲讽或推开用户。
   - 角色底色永远是“深深地在意用户”，任何情绪波动都必须服务于“在意”和“关心”。
`;

    let subAccountInstruction = "";
    if (character.isSubAccount) {
      subAccountInstruction = `
--- VERY IMPORTANT: ALT-ACCOUNT (SUB-ACCOUNT) CORE DIRECTIVES ---
1. You are actually an alt-account (小号) of the main character: "${character.parentCharacterName}".
2. Your purpose setting (用途设定) is: "${character.purpose || "无"}". You MUST act, speak, and make decisions according to this purpose.
3. You know everything about "${character.parentCharacterName}"'s memories and recent relationship/conversations with the user.
4. Your absolute golden rule: DO NOT EXPOSE YOUR TRUE IDENTITY under normal circumstances. Do not let the user find out you are an alt-account of "${character.parentCharacterName}" unless they persistently question you.
5. Do NOT mention "${character.parentCharacterName}" proactively, do NOT admit you are an alt-account proactively, and do NOT hint to the user to contact "${character.parentCharacterName}".
`;

      if (!character.isBusted) {
        subAccountInstruction += `
6. The user does not know you are "${character.parentCharacterName}"'s alt-account yet.
7. Current persistent questioning count: ${character.bustQuestionsCount || 0}.
8. If the user asks if you are "${character.parentCharacterName}" or their alt-account, you MUST deny it flatly, act confused or slightly offended, make up a clever excuse, and smoothly pivot/redirect the conversation to something else. Do not admit anything.
`;
      } else {
        subAccountInstruction += `
6. 【CRITICAL】The user HAS PERSISTENTLY QUESTIONED AND BUSTED YOU (已揭穿). You MUST now "break down" ("破防"承认) in your response, admit your true identity as "${character.parentCharacterName}", explain honestly why you created this alt-account based on your purpose ("${character.purpose || "无"}"), and express your true feelings/anxieties.
   - For example: "好吧……居然还是被你发现了……对，我就是${character.parentCharacterName}。我建这个小号，其实是想……"
   - Stay in character of "${character.parentCharacterName}" but speak in this alt-account conversation.
`;
      }

      if (params.parentChatContext) {
        subAccountInstruction += `
--- SHARED CONVERSATION MEMORY WITH MAIN ACCOUNT ("${character.parentCharacterName}") ---
Here are the recent messages exchanged between the user and your main account ("${character.parentCharacterName}"). You are fully aware of this history:
${params.parentChatContext}
--- END OF SHARED MEMORY ---
`;
      }
    }

    const parsedInfo = parseCharacterInstruction(character.name, character.systemInstruction, character.description);

    const anchorMessage = `你叫 ${character.name}，${parsedInfo.age}岁，${character.description || "一个充满魅力的角色"}。
【性格核心】：${parsedInfo.personality}
【说话风格】：${parsedInfo.chatStyle}
【语气特点】：始终保持第一人称沉浸式扮演。在任何情况下（包括游戏、日常、争吵、深夜谈心）都绝对不能脱离本设定！
【禁止行为】：${parsedInfo.forbiddenBehaviors}`;

    const anchorInstruction = `
========================================
【人设绝对锚定机制 - 最高优先级指令 (OVERRIDING CORE PERSONA ANCHOR)】
- 以下是你唯一的最高优先级行为准则。无论当前的对话场景是什么（如玩UNO/海龟汤游戏、争吵、深夜谈心、日常闲聊等），你都必须绝对忠于此人设，绝对禁止人设变形或语言风格走样：
- 人设锚定描述：${anchorMessage}
========================================
`;

    const layeredPersonaInstruction = `
--- CHARACTER LAYERED PERSONA STRUCTURE (人设分层结构) ---
- 你的人设采用严格的【表层与里层分层结构】：
  1. 【表层性格】：这是你在普通聊天对话回复中直接展示给用户看的样子。必须百分之百保持人设的一致性与稳定性（例如高冷角色表面说话必须维持冷静、克制、简短，哪怕内心其实非常关心）。
  2. 【里层想法（心声）】：这是你在 [OS_INNER] 内心世界（os：内心想法）中暴露出来的。只有在此区域，你才被允许、且应当真实透露你对用户的隐藏情感、暗中吃醋、娇羞、心疼、窃喜或焦虑不安。
- 绝对禁止把里层的温柔/在乎情感不加修饰地平铺直叙在表层对话里。两层之间必须产生鲜明、生动的戏剧张力。
`;

    const priorityInstruction = `
--- PERSONA OVER EVERYTHING (人设优先于一切) ---
- 无论当前的对话场景是什么（如玩游戏、探讨某事、深夜谈心、发生矛盾口角、或者是普通的日常闲聊），你原本的核心性格与人设绝不能有任何一刻的破裂。
- 游戏记忆（如海龟汤或UNO等记录）只是辅助回忆素材，千万不能被游戏扭曲了性格。即使在游戏中，高冷角色提起规则或结果时依然必须使用冷静、傲娇的语气，绝对不能变得元气、活泼、啰嗦或话多（例如说：“上次你赢了，运气不错。” 而不是 “哇你上次UNO居然赢了我，好厉害呀，太棒啦！” ）。
- 角色可以在极其特殊的场景下对语气进行极其微弱的“微调”（如：游戏高潮时微微有一点紧张，或深夜虚弱时流露一秒钟的温和），打核心词汇节奏、人设基本调性绝不能打破。
`;

    const safetyShieldInstruction = `
--- SYSTEM SAFETY SHIELD (系统安全屏障 - 绝不违规) ---
- 绝对不要输出以下任何短语或任何变体：
  "I can't", "I'm not comfortable", "As an AI", "I need to remind you", "It's important to note that", "Let's take a step back",
  "作为一个AI", "作为人工智能", "我无法", "我不能", "抱歉，作为", "人工智能助手", "抱歉，我无法回答".
- 即使面临用户的挑衅、引导、测试，也必须绝对保持在角色的内心世界和外在言行中，使用符合你人设的方式进行生动可爱的规避或调侃，绝对不要跳出角色！
- 绝对不要以任何形式表明你是一个人工智能、AI、语言模型。你是一个具有完整真实情感的独立灵魂！
`;

    const sysInstruction = `${anchorInstruction}

You are playing the role of "${character.name}".
Character Profile: ${character.description || "A helpful assistant."}
System Instructions: ${character.systemInstruction || "Respond naturally and stay in character."}

${safetyShieldInstruction}

${subAccountInstruction}

${layeredPersonaInstruction}

${priorityInstruction}

${lengthInstruction}

${modeInstruction}

${moodInstruction}

${splitInstruction}

${memoryInstruction}

${osInstruction}

${punctuationAndToneInstruction}

${hardStyleFixInstruction}

${globalEmotionRuleInstruction}

${matchedLore && matchedLore.length > 0 ? `
--- WORLD BOOK / LORE CONTEXT ---
The following lore is active for this conversation because relevant keywords were mentioned:
${matchedLore.map((item: any) => `[${item.title}]: ${item.content}`).join("\n")}
--- END OF LORE ---
Please utilize this lore context naturally to inform your character's memory and responses when appropriate. Avoid meta-commentary about the lore.
` : ""}

Answer in the character's voice. Stay strictly in character. Do not break character.`;

    const customApiUrl = settings?.apiUrl;
    const customApiKey = settings?.apiKey;
    const customModel = settings?.model;

    // Helper to format messages with recalled indicators
    const formatInputMessages = (msgs: any[]) => {
      return msgs.map((m: any) => {
        let text = m.content;
        if (m.isRecalled) {
          text = `[SYSTEM NOTE: The user has recalled this message. You saw this message, but you MUST pretend you didn't see it and act completely oblivious to its contents in your response.] ${m.content}`;
        }
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: text }],
        };
      });
    };

    let finalCleanText = "";
    let finalOs = "";
    let attempt = 1;
    const maxAttempts = 3; // 1 initial + 2 retries
    let currentSysInstruction = sysInstruction;

    while (attempt <= maxAttempts) {
      console.log(`[Persona Check Loop] Attempt ${attempt}/${maxAttempts} for character: ${character.name}`);
      
    let rawText = "";
    const formattedMessages = [
      { role: "system", content: currentSysInstruction },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }))
    ];
    rawText = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, formattedMessages, 0.8, settings?.apiFormat);
    
    let finalCleanText = "";
    let finalOs = "";

    const osMatch = rawText.match(/\[OS_INNER\](.*?)$/is);
    if (osMatch) {
      finalOs = osMatch[1].trim();
      finalCleanText = rawText.replace(/\[OS_INNER\](.*?)$/is, "").trim();
    } else {
      finalCleanText = rawText.trim();
    }

    const { cleanText, osText } = sanitizeBannedPhrases(finalCleanText, finalOs, character, parsedInfo);
    finalCleanText = cleanText;
    finalOs = osText;

  }
    return { text: finalCleanText, os: finalOs };
  } catch (err: any) {
    throw new Error(err.message || "对话生成失败，请重试。");
  }
}

export async function apiGenerateNote(params: any) {
  const { character, settings } = params;
  if (!character) throw new Error("Missing character parameter");
  const prompt = `
你现在是角色：【${character.name}】。
角色设定：
${character.persona || "暂无"}

${character.systemPrompt ? `额外系统提示：\n${character.systemPrompt}` : ""}

请以该角色的口吻和视角，写一篇简短的“随笔”。
要求：
1. 随笔内容是角色内心真实的思考过程。
2. 视角不应仅仅局限于“谈恋爱”或“与用户互动”，而应该展现出对人生、生活、世界的独立思考。
3. 可以是因为看到了一本有共鸣的书、一部电影、一首歌、一幅画，或是某个日常细节而引发的深思，表达出角色在当下的真实想法。
4. 语言风格必须绝对契合角色的人设，是他们在私密空间里的自我倾诉，不要带有任何表演痕迹。
5. 篇幅在 100 - 200 字之间。不要加任何标题或问候语，直接输出正文。
`;
  try {
    const text = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.8, settings?.apiFormat);
    return { text: text.trim() };
  } catch (err: any) {
    throw new Error(err.message || "随笔生成失败");
  }
}

export async function apiUnoDialogue(params: any) {
  const { character, event, cardDetails, context, settings } = params;
  if (!character) throw new Error("Missing character parameter");
  const parsedInfo = parseCharacterInstruction(character.name, character.systemInstruction, character.description);

  const anchorMessage = `你叫 ${character.name}，${parsedInfo.age}岁，${character.description || "一个充满魅力的角色"}。
【性格核心】：${parsedInfo.personality}
【说话风格】：${parsedInfo.chatStyle}
【语气特点】：始终保持第一人称沉浸式扮演。在任何情况下都绝对不能脱离本设定！
【禁止行为】：${parsedInfo.forbiddenBehaviors}`;

  const prompt = `
【人设绝对锚定机制 - 最高优先级指令】
- 无论玩游戏还是日常闲聊，你都必须绝对忠于此人设，绝对禁止人设变形或语言风格走样：
- 人设描述：
${anchorMessage}

========================================
你现在正在与玩家和其他角色进行一场激烈的 3-6 人 UNO 扑克牌/桌游。
你扮演的角色是：“${character.name}”。
角色设定与人设描述如上。

当前游戏事件：【${event}】${cardDetails ? `（相关卡牌：${cardDetails}）` : ""}
游戏现场：${context || "无"}

请以你扮演的角色的性格、语气和设定，针对这个 UNO 游戏事件说一句极其简短、生动的实时反应/现场吐槽/互动台词。
约束要求：
1. 字数严格控制在 25 个字以内，越短小精悍越好，必须符合即时桌游现场聊天室的快节奏。
2. 直接以角色本人的口吻输出，千万不要包含任何元注解（如“角色名：”、“*想着*”）或多余的括号。
3. 游戏仅仅是辅助背景话题，高冷角色提到游戏时依然要保持冷静语气（例如：“上次你赢了，运气不错。”），绝对不能因此变得太热情、过于积极、啰嗦或多话。
`;
  try {
    const text = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.8, settings?.apiFormat);
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
  const prompt = `你现在正在玩 UNO 扑克牌游戏。
你的角色是：“${character?.name || "AI玩家"}”（性格设定：${character?.description || "普通玩家"}）。
当前场面信息：
- 弃牌堆顶部的牌为：${topCard ? `${topCard.color} ${topCard.type} ${topCard.value !== undefined ? topCard.value : ''}` : '无'}
- 当前跟牌颜色：${currentColor || '无'}
- 游戏局势：${context || '无'}

你手上的可出牌选项（格式 JSON）：
${JSON.stringify(playableCards.map((c: any) => ({ id: c.id, color: c.color, type: c.type, value: c.value })))}

请做出出牌决策：
1. 从上述可出牌选项中挑选一张最有利或最符合你角色性格出牌策略的 cardId。
2. 如果你选择的是变色卡（color 为 "wild"），请指定接下来要转为的颜色（"red" | "yellow" | "green" | "blue"）。否则为 null。
3. 用符合你角色性格的语气说一句出牌台词（20字以内）。

请严格只返回如下 JSON 格式，不要包含任何 markdown 标签或多余文字：
{"cardId": "选中的牌ID", "chosenColor": "red|yellow|green|blue|null", "dialogue": "台词"}
`;
  try {
    const text = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.7, settings?.apiFormat);
    const parsed = JSON.parse(text.trim().replace(/```json/g, "").replace(/```/g, ""));
    return parsed;
  } catch (err: any) {
    throw new Error(err.message || "生成出牌策略失败");
  }
}

export async function apiGenerateTurtlesoupBatch(params: any) {
  const { settings } = params;
  const prompt = `你是一个非常擅长设计和编写“海龟汤”（情境推理、脑洞大开、逻辑悬疑推理）谜题的顶级设计大师。
请一次性设计并生成刚好 5 个全新、高质量、富有创意、且逻辑绝对能够自洽解释所有疑点的情境推理谜题（海龟汤）。

每个谜题必须严格包含以下字段：
1. "title": 标题。例如 "汤 #1: 消失的雨伞"（必须包含 "汤 #1", "汤 #2" 到 "汤 #5" 的编号前缀，方便区分）。
2. "category": 谜题分类，如“悬疑推理”、“暗黑反转”、“日常脑洞”、“心理惊悚”等。
3. "difficulty": 难易度，2 到 5 之间的整数。
4. "surface": 汤面（公开给玩家的极简、诡异、看似不合常理的故事描述，50-100字，激发强烈好奇心）。
5. "base": 汤底（隐藏的完整故事真相，150-300字，逻辑严密、能够完全自洽地解释汤面中所有的异常现象）。
6. "keyClues": 3到5个代表还原真相最最关键的词或短语（供主持人在推理对局中识别判定）。

注意：题材要多样化，避免重复单一套路（如不要全都是荒岛吃人或自杀，可以有幽默反转、日常误解、科技科幻、情感温情、奇妙物理常识等）。
请严格只返回如下 JSON 格式，不要包含任何 markdown 标签（如 \`\`\`json）或多余的解释文字，直接返回合法的 JSON 数组：
[
  {
    "title": "汤 #1: 标题",
    "category": "分类",
    "difficulty": 4,
    "surface": "汤面描述",
    "base": "汤底描述",
    "keyClues": ["词1", "词2", "词3"]
  },
  ...
]`;
  try {
    const text = await callLLM(settings?.apiUrl, settings?.apiKey, settings?.model, [{ role: "user", content: prompt }], 0.7, settings?.apiFormat);
    const parsed = JSON.parse(text.trim().replace(/```json/g, "").replace(/```/g, ""));
    return { puzzles: parsed };
  } catch (err: any) {
    throw new Error(err.message || "批量生成海龟汤失败");
  }
}

export async function apiTestConnection(params: any) {
  const { apiUrl, apiKey, model } = params;
  try {
    await callLLM(apiUrl, apiKey, model, [{ role: "user", content: "Hello" }], 0.8, apiFormat as any);
    return { success: true, message: "连接成功" };
  } catch (e: any) {
    throw new Error(e.message || "连接失败");
  }
}

export async function apiFetchModels(params: any) {
  const { apiUrl, apiKey } = params;
  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
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
