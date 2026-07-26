const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ForumApp.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startTag = '  const handleGenerateComments = async (post: ForumPost) => {';
const endTag = `        if (selectedPost && selectedPost.id === post.id) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingComments(false);
    }
  }`;

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find boundaries", startIndex, endIndex);
  process.exit(1);
}

const originalBlock = content.substring(startIndex, endIndex + endTag.length);

const newBlock = `  const generateCommentsInternal = async (post: ForumPost, countRange: string): Promise<ForumComment[]> => {
    const charInfos = characters.map(char => {
      const profile = getOrInitCharForumProfile(char);
      return {
        id: char.id,
        forumName: profile.forumName,
        description: char.description,
        systemInstruction: char.systemInstruction
      };
    });

    const npcInfos = FIXED_NPCS.map(npc => ({
      id: npc.id,
      name: npc.name,
      description: "匿名热心网友"
    }));

    const existingCommentsFormatted = post.comments.length > 0
      ? post.comments.filter(c => !c.isRecalled).map(c => \`[已有评论 floor: #\${c.floor}, 作者: \${c.authorName}]内容: "\${c.content}"\`).join("\\n")
      : "（暂无现有评论）";

    const prompt = \`你是匿名社交论坛模拟引擎。你的任务是根据给定的帖子内容、已有评论和可选角色池，批量生成一组数量在 \${countRange} 条之间的互动评论，并以 JSON 数组格式输出。

--- 【帖子信息】 ---
版块名称: "\${boards.find(b => b.id === post.boardId)?.name || ""}"
版块设定与方向: "\${boards.find(b => b.id === post.boardId)?.description || ""}"
楼主名字: "\${post.authorName}"
帖子正文: "\${post.content}"
帖子点赞数: \${post.likes || 0}
帖子当前评论数: \${post.comments.length}

--- 【角色池 (Character Pool)】 ---
以下是论坛的可选发帖角色（如果评论作者为他们之一，请使用对应的 id 和 forumName）：
\${JSON.stringify(charInfos, null, 2)}

--- 【NPC 角色池 (NPC Pool)】 ---
以下是论坛固定的 NPC 角色（如果选择这些 NPC 发言，使用对应的 id 和 name）：
\${JSON.stringify(npcInfos, null, 2)}

以及以下备用网名（可以作为普通 NPC 用户）：
\${JSON.stringify(DEFAULT_LINE_HANDLES)}

--- 【评论生成核心机制（必须严格执行！）】 ---
1. 【动态条数 (\${countRange}条)】：
   根据帖子的点赞数和话题热度（如恐怖、日常、XP倾诉、树洞吐槽等），动态决定生成的总评论条数。条数必须在 \${countRange} 条之间。

2. 【构建多层对话链 (Dialogue Chains)】：
   - 严禁每个评论都是独立发表的观点！
   - 评论之间必须产生相互回复和吐槽。每条评论要么回复帖子（楼主），要么回复之前已有的评论，要么回复刚刚在数组中生成的更早的评论。
   - 形成多条深入的回复树/对话链（例如：评论 A 对帖子发表看法 -> 评论 B 回复 A 的看法 -> 评论 C 针对 B 表达不同意见 -> 评论 D 出来吐槽 B 和 C -> 评论 E 又跑出来解答 A 之前的疑问）。

3. 【角色专属语言风格 (Persona Styling)】：
   当选择角色池中的特定角色发表评论时，他的内容和语气必须完全符合他的人设类型。并且我们将人设语气划分为三类：
   - 活泼型角色 (如活泼话唠、猫咪女孩、元气少年等)：强烈好奇心，多使用追问细节的问句，语气亢奋，多用感叹号（!）和问号（?）。例如：“哇塞真的吗？！求细节！你当时怎么想的呀？”。
   - 高冷型角色 (如高冷、内敛、克制、傲娇等)：用语极其简短、高傲、冷酷。不带多余情绪，少用或不用多余表情/标点。例如：“建议报警。” “无聊。” “純屬自找。”。
   - 温和型角色 (如温柔、成熟、治愈、大姐姐等)：提供补充解释、安抚情绪、科普背景或理性的善意建议。常使用波浪号（~）或平和的省略号。例如：“楼主别太难过，其实这也是难免的~ 下次注意就好啦。”。

4. 【NPC 插话与搞笑吐槽】：
   - 固定 NPC 或普通网友要善于插话、吐槽其他角色的观点，或者在评论区带节奏、玩梗、当吃瓜群众。
   - 吐槽要生动有趣，有真正的网民讨论感。例如：“楼上的傲娇退退退，什么都建议报警笑死我了。” “前排围观，这楼里的讨论比原帖还精彩。”。

5. 【绝对禁止】：
   - 严禁机械在句尾使用句号！多使用自然口语（无标点）、波浪号~、感叹号!、问号?或省略号...。
   - 不要千篇一律开头。
   - 输出必须是严格的合法的 JSON 数组，不包含任何 Markdown 代码块包裹（如 json 格式等）或其他文字说明。

--- 【已有评论列表】 ---
\${existingCommentsFormatted}

--- 【输出 JSON 格式要求】 ---
请仅输出一个 JSON 数组，数组中的每个元素必须符合以下格式：
[
  {
    "authorId": "选用的角色 id（如 char-xxx）或 npc-xxx，或者普通网民使用 'npc-random'",
    "authorName": "角色对应的 forumName，如果是 FIXED_NPC 使用其 name，如果是普通网民则从备用网名中随机挑选一个，或者你自己根据人设生成一个新潮匿名网名",
    "content": "评论文本正文（10-60字，口语化，强烈的人设口吻或网民讨论风格，绝对执行句尾标点规范，不带句号）",
    "replyToType": "post" 或 "existing_comment" 或 "generated_index",
    "replyToValue": 如果是 post 则为 null；如果是 existing_comment，则填已有评论的 floor 数值（如有）；如果是 generated_index，则填当前正在生成的数组中被回复的那条评论的 0 索引 index（必须严格小于当前评论自身的索引 index）
  }
]\`;

    const responseText = await callLLM(
      settings.apiUrl,
      settings.apiKey,
      settings.model,
      [{ role: "user", content: prompt }],
      0.85
    );

    const trimmed = (responseText || "").trim();
    let generatedSpecs = [];
    try {
      const jsonMatch = trimmed.match(/\\[[\\s\\S]*\\]/);
      generatedSpecs = JSON.parse(jsonMatch ? jsonMatch[0] : trimmed);
    } catch (e) {
      console.error("Failed to parse AI interactive comments JSON", e);
      return [];
    }

    if (!Array.isArray(generatedSpecs) || generatedSpecs.length === 0) {
      return [];
    }

    const newComments: ForumComment[] = [];
    const usedNicknames = getAllUsedNicknames(posts, privateContacts, userNickname);

    for (let i = 0; i < generatedSpecs.length; i++) {
      const spec = generatedSpecs[i];
      const specAuthorId = spec.authorId;
      
      let finalAuthorName = spec.authorName || "普通网友";
      let finalAuthorAvatar = "";
      
      const char = characters.find(ch => ch.id === specAuthorId);
      if (char) {
        const profile = getOrInitCharForumProfile(char);
        finalAuthorName = profile.forumName;
        finalAuthorAvatar = profile.avatar;
      } else {
        const npc = FIXED_NPCS.find(n => n.id === specAuthorId);
        if (npc) {
          finalAuthorName = npc.name;
          finalAuthorAvatar = getBlackWhiteLineAvatar(npc.avatarSeed);
        } else {
          finalAuthorName = makeUniqueNickname(finalAuthorName, usedNicknames);
          usedNicknames.add(finalAuthorName);
          const randomNpcSeed = FIXED_NPCS[i % FIXED_NPCS.length].avatarSeed;
          finalAuthorAvatar = getBlackWhiteLineAvatar(randomNpcSeed);
        }
      }
      
      let replyToObj: any = undefined;
      if (spec.replyToType === "existing_comment") {
        const existingC = post.comments.find(c => c.floor === spec.replyToValue);
        if (existingC) {
          replyToObj = {
            floor: existingC.floor,
            authorName: existingC.authorName,
            content: existingC.content.length > 30 ? existingC.content.slice(0, 30) + "..." : existingC.content
          };
        }
      } else if (spec.replyToType === "generated_index" && typeof spec.replyToValue === "number" && spec.replyToValue >= 0 && spec.replyToValue < i) {
        const targetGenerated = newComments[spec.replyToValue];
        if (targetGenerated) {
          replyToObj = {
            floor: targetGenerated.floor,
            authorName: targetGenerated.authorName,
            content: targetGenerated.content.length > 30 ? targetGenerated.content.slice(0, 30) + "..." : targetGenerated.content
          };
        }
      }
      
      const nextFloor = post.comments.length + newComments.length + 1;
      
      newComments.push({
        id: Date.now().toString() + "-gen-" + i + "-" + Math.random().toString(36).substr(2, 4),
        authorId: specAuthorId || \`npc-random-\${i}\`,
        authorName: finalAuthorName,
        authorAvatar: finalAuthorAvatar,
        content: spec.content,
        timestamp: Date.now() + i * 10,
        floor: nextFloor,
        replyTo: replyToObj,
        likes: Math.floor(Math.random() * 8),
        dislikes: 0
      });
    }

    if (newComments.length > 0) {
      if (post.authorId !== 'user') {
        let opChar = characters.find(ch => ch.id === post.authorId);
        let opName = post.authorName;
        let opDesc = opChar ? opChar.description : "论坛NPC用户";
        
        const commentsToConsider = newComments.filter(c => c.authorId !== post.authorId);
        if (commentsToConsider.length > 0) {
          const opReplyPrompt = \`你现在是该论坛帖子的楼主。
楼主角色名字：\${opName}
\${opChar ? \`楼主角色设定：\${opDesc}\` : ""}
原帖内容：“\${post.content}”

以下是评论区里的新评论列表：
\${commentsToConsider.map((c, idx) => \`[评论编号 \${idx + 1}] floor: #\${c.floor || (post.comments.length + idx + 1)}, 作者: \${c.authorName}, 内容: "\${c.content}"\`).join('\\n')}

请根据你的人设性格，选择性地决定回复其中某些评论。不需要每条都回复：
- 如果你是一个活泼、热情、话唠、爱社交的角色，你应该多回复几条评论（比如 3-5 条）。
- 如果你是一个高冷、冷漠、内敛、克制、安静的角色，你应该回复得极少或不回复（比如 0-1 条）。
- 其他性格则中等（1-2 条）。
请用你的口吻和第一人称“我”写回复。

请严格返回以下格式 of JSON 数组（如果决定不回复任何评论，返回空数组 []）：
[
  {
    "commentIndex": 评论编号数字,
    "replyContent": "你的角色口吻回复内容"
  }
]\`;

          try {
            const opResponse = await apiChat({
              messages: [{ role: "user", content: opReplyPrompt }],
              character: opChar || { id: "npc", name: opName, description: opDesc } as any,
              settings,
              systemInstruction: "你是一个严格按照规则输出JSON数组的API。"
            });
            
            const opResponseText = (opResponse.text || "").trim();
            let opParsed = [];
            try {
              const jsonMatch = opResponseText.match(/\\[[\\s\\S]*\\]/);
              opParsed = JSON.parse(jsonMatch ? jsonMatch[0] : opResponseText);
            } catch (e) {
              console.error("Failed to parse OP replies JSON", e);
            }

            if (Array.isArray(opParsed) && opParsed.length > 0) {
              opParsed.forEach((rep) => {
                const idx = rep.commentIndex - 1;
                const replyContent = rep.replyContent;
                if (idx >= 0 && idx < commentsToConsider.length && replyContent) {
                  const targetComment = commentsToConsider[idx];
                  newComments.push({
                    id: Date.now().toString() + "-op-reply-" + Math.random().toString(36).substr(2, 4),
                    authorId: post.authorId,
                    authorName: post.authorName,
                    authorAvatar: post.authorAvatar,
                    content: replyContent,
                    timestamp: Date.now() + 500 + Math.random() * 50,
                    floor: post.comments.length + newComments.length + 1,
                    replyTo: {
                      floor: targetComment.floor || 0,
                      authorName: targetComment.authorName,
                      content: targetComment.content.length > 30 ? targetComment.content.slice(0, 30) + "..." : targetComment.content
                    }
                  });
                }
              });
            }
          } catch (errOp) {
            console.error("OP interaction reply error:", errOp);
          }
        }
      }
    }
    return newComments;
  };

  const handleGenerateComments = async (post: ForumPost) => {
    if (isGeneratingComments || characters.length === 0) return;
    setIsGeneratingComments(true);
    
    try {
      const newComments = await generateCommentsInternal(post, "15 到 20");
      if (newComments.length === 0) {
        alert("AI 评论生成失败或格式解析失败，请重试。");
        return;
      }
      const updatedPost = { ...post, comments: [...post.comments, ...newComments] };
      setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));
      if (selectedPost && selectedPost.id === post.id) {
        setSelectedPost(updatedPost);
      }
    } catch (e) {
      console.error(e);
      alert("生成出错：" + (e)?.message);
    } finally {
      setIsGeneratingComments(false);
    }
  };`;

const newContent = content.substring(0, startIndex) + newBlock + content.substring(startIndex + originalBlock.length);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Replaced comments logic successfully");
