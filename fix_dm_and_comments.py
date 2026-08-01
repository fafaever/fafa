import re

with open('src/components/ChatApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the DM logic
dm_pattern = re.compile(
    r'// 3\. 概率触发可见角色的主动私信询问.*?(?=    \/\/ 仅当前Tab如果是).*?$',
    re.DOTALL | re.MULTILINE
)

new_dm_logic = """// 3. 概率触发可见角色的主动私信询问（随机挑选1个可见角色，约 35% 概率触发，现在使用AI生成个性化私信）
    if (visibleChars.length > 0 && Math.random() < 0.35) {
      const randomChar = visibleChars[Math.floor(Math.random() * visibleChars.length)];
      setTimeout(async () => {
        try {
          if (settings && (settings.apiKey || settings.apiUrl)) {
            let session = sessions.find((s) => s.characterId === randomChar.id);
            const currentMsgs = session ? session.messages : [];
            
            const prompt = `用户刚刚发布了一条朋友圈动态：
内容：“${newPost.content || '(图片动态)'}”
时间：${new Date().toLocaleDateString()}

请你作为角色“${randomChar.name}”（人设：${randomChar.description}），先在内心分析这条朋友圈的内容、配文语气和所传达的情感，形成对该内容的真实理解。
然后，根据你的人设以及和用户的关系，主动发起一条私聊消息。
要求：
1. 消息内容必须基于对这条朋友圈的个性化解读，切忌套话。
2. 符合你的人设和当前关系阶段，可以是关心、调侃、好奇、共鸣或追问。
3. 绝对不能使用“你发的朋友圈我看到了”这类模板式或老套的开头，要显得自然。
4. 你的分析作为内部逻辑，不要展示出来，只需输出最终发给用户的私聊消息文本即可（不要输出任何心理描写、动作或括号内的分析内容）。
`;
            
            const res = await apiChat({
              character: randomChar,
              messages: [{ role: "user", content: prompt }],
              settings,
              systemInstruction: "你现在是该角色，根据用户发布的朋友圈，主动发起一条生动自然的私聊回复。只输出要发送的文本，不要带任何其他格式或前缀文字。"
            });
            
            let dmText = res.text || "";
            // Clean up any potential markdown or prefixes if present
            dmText = dmText.replace(/^["']|["']$/g, '').trim();
            
            if (dmText) {
              const proactiveMsg: Message = {
                id: `msg-${Date.now()}-proactive-moment`,
                role: "assistant",
                content: dmText,
                timestamp: Date.now(),
              };
              if (session) {
                const updatedSession = { ...session, messages: [...session.messages, proactiveMsg], updatedAt: Date.now() };
                const updatedSessions = sessions.map((s) => (s.id === session!.id ? updatedSession : s));
                setSessions(updatedSessions);
                localStorage.setItem("mobile_ai_chat_sessions_v1", JSON.stringify(updatedSessions));
              } else {
                const newSession: ChatSession = {
                  id: `session-${Date.now()}`,
                  characterId: randomChar.id,
                  messages: [proactiveMsg],
                  updatedAt: Date.now(),
                };
                const updatedSessions = [newSession, ...sessions];
                setSessions(updatedSessions);
                localStorage.setItem("mobile_ai_chat_sessions_v1", JSON.stringify(updatedSessions));
              }
            }
          }
        } catch (e) {
          console.error("Failed to generate proactive DM for moment:", e);
        }
      }, 500); // Wait a bit before generating
    }
"""

content = dm_pattern.sub(new_dm_logic, content)

# 2. Replace the comments prompt
comments_prompt_pattern = re.compile(
    r'【评论互动与角色约束规则 \(严格遵从\)】.*?6\. 【核心绝对禁用项】：绝对禁止 AI 代表“用户”（或用户使用的账号昵称如：\$\{momentsUserNickname \|\| \'用户\'\}）发表任何评论或回复！所有生成的评论必须仅来自于可见角色或绑定NPC！',
    re.DOTALL
)

new_comments_prompt = """【评论互动与角色约束规则 (严格遵从)】：
1. 多个可见角色/NPC可以在评论区互动交流，但交流内容必须围绕用户发布的【朋友圈主题】展开，绝不涉及对其他角色私人事务的打探或表态。
2. 角色【绝对不能】替用户回应NPC的问题或评论！也不能对NPC与用户之间的互动做出“我知道了”、“我会处理”等越位式回应。
3. 角色在评论区的交流对象主要应为【用户或帖子本身】，而非直接对NPC的评论进行指挥、安排或回应。
4. 如果NPC给用户说了某件事，角色可以发表自己的看法和感慨，但【不能代表用户】做出任何回应或承诺。
5. 【禁止动作描写（最高级别红线）】：
   - 所有评论（包括角色、NPC、用户的评论）中，**严禁出现任何动作描写**（如“他笑了一下”、“她低下头”、“拍了拍对方的肩膀”等）。
   - 评论内容必须且仅限于纯文字表达，不包含任何 *动作*、（动作）或描述肢体行为、神态、表情的词句。
   - 如需表达情绪，请用文字直接陈述（如“我笑死了”、“哈哈哈哈哈”），禁止使用任何动作描述格式。
6. 【三大绝对禁止项】：
   - 严禁质问对方身份（绝对不能问“你是谁”、“不认识你”）。
   - 严禁询问对方与发布者/用户的关系（绝对不能问“你和TA什么关系”）。
   - 严禁追问对方隐私。
7. 所有互动停留在评论区，绝不因评论而在私信中找用户对质。
8. NPC评论可先于或与角色同时出现，角色看到NPC评论可接茬回应（遵守上述越位规则），但绝不暴露与用户的私密关系。
9. 【核心绝对禁用项】：绝对禁止 AI 代表“用户”（或用户使用的账号昵称如：${momentsUserNickname || '用户'}）发表任何评论或回复！所有生成的评论必须仅来自于可见角色或绑定NPC！"""

content = comments_prompt_pattern.sub(new_comments_prompt, content)

with open('src/components/ChatApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
