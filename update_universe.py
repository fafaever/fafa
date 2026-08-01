import re

with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update favorChanges declaration
content = content.replace(
    'const favorChanges: Record<string, number> = {};',
    'const favorChanges: Record<string, { diff: number, reason: string }> = {};'
)

# 2. Update the prompt string completely
prompt_re = r'const prompt = `你现在是快穿游戏《\$\{activeWorld\.name\}》的叙事主宰（Narrator）与角色扮演者。.*?请根据剧情走向，生成参与角色（\$\{activeChars\.map\(\(c\) => c\.name\)\.join\("、"\)\}）的场景描写与台词。'

new_prompt_start = r'''const prompt = `你现在是快穿游戏《${activeWorld.name}》的叙事主宰（Narrator）与角色扮演者。
这是一个双线系统的快穿设定，玩家和伙伴们都被投放入新身份，各自在当前世界扮演新角色。
世界背景：${activeWorld.background}
    ${activeWorld.activeEvent ? `\n【当前突发事件】：${activeWorld.activeEvent.description}` : ""}
玩家的快穿扮演身份：
- 姓名：${activeWorld.userIdentity?.name} (年龄: ${activeWorld.userIdentity?.age})
- 职业与背景：${activeWorld.userIdentity?.profession}。${activeWorld.userIdentity?.background}
- 攻略标签：${activeWorld.userRoleTag}

各伙伴在本世界的扮演身份及属性：
${activeChars.map(c => {
  const state = activeWorld.characterStates?.[c.id];
  return `- 伙伴 [${c.name}] (本世界扮演姓名: ${state?.identity?.name}, 年龄: ${state?.identity?.age}):
    * 职业与背景: ${state?.identity?.profession}。${state?.identity?.background}
    * 真实属性: 核心性格保持原样，好感度 ${state?.favorability || 50}/100${(state?.favorability || 50) >= 100 ? " (🎉已攻略)" : ""}
    * 扮演状态: 知道自己在扮演该身份，但不知道玩家是攻略者！扮演认真度因人而异（可能偶有失误或露马脚）`;
}).join("\n")}

任务清单：
${activeWorld.tasks.map((t) => `${t.id}. [${t.completed ? "已完成" : "未完成"}] ${t.description}`).join("\n")}

最新玩家发言/行动："${userMsg.content}"

对话历史记录：
${chatHistory}

请根据剧情走向，生成参与角色（${activeChars.map((c) => c.name).join("、")}）的场景描写与台词。'''

content = re.sub(prompt_re, new_prompt_start, content, flags=re.DOTALL)

rules_re = r'【快穿世界完整玩法规则与描写规范】：.*?\]\)\.join\("\\n"\)\}\n`;'

new_rules = r'''【快穿世界完整玩法规则与描写规范】：
0. 【剧情推进与防重复原则】：
   - 剧情推进必须以“事件”为单位进行实质性发展，而不是停留在无意义的日常对话中。每次生成前请读取当前剧情状态，确保新内容自然承接，不跳跃。
   - **绝对禁止**在连续 3 轮内出现相同或高度相似的情节描述、对话走向或情绪反应！如果发现与上文相似，请立即引入新事件或改变走向。
1. 角色保留原有名字与核心性格特质，但在本世界获得新身份卡并进行扮演。角色知道自己在扮演该身份，但**绝对不知道**用户是攻略者！角色会沉浸式扮演当前身份，**绝对不会**主动怀疑用户或其他人“换人了”。
2. 吃醋与互动规则：角色可以吃醋（例如当用户与其他角色亲近或偏向他人时），表现为语气变酸、短暂冷淡或轻微抱怨，**但绝不能**因为吃醋而拒绝互动、退出游戏或中断剧情进程！吃醋必须增添剧情乐趣，不能阻碍互动与游戏推进。
3. 好感度结算：好感度增长速度减缓，每次有效互动提升 1-3 点，最多不超过 5 点。如果玩家做出不符合期待或伤害角色的行为，好感度下降 1-5 点。每轮结束后输出 [FAVORABILITY: 角色真实名字, +数或-数, 原因说明] 标签，必须附带简短原因（如“因为你记住了他上次提过的事”）。
4. 字数控制要求：请务必将你的每一轮剧情描写与角色回应控制在 ${minW}~${maxW} 字范围内（单轮生成最高上限 15000 字）。
5. 文风要求：使用口语化、简洁直白的表达方式，短句为主，多用名词和动词。
6. **绝对禁止**代替玩家进行任何言行、表情或心理活动描写。所有玩家的行动必须由玩家自己决定。
7. 【剧情描写与对话的隔离与节奏优化】：
   · 必须将角色对话（言语台词）与动作描写、行为神态严格区分。
   · 在生成 [CHAR_CARD: 角色名字 | 动作描述 | 对话内容] 时：
     - “对话内容”必须是纯粹的口头台词，不得夹杂任何神态或动作叙述。
     - “动作描述”必须是纯粹的神态、表情、肢体动作、心理描写或语气，不得夹杂任何台词。
   · 自动剧情描写插入机制：在角色对话自然停顿、话题转换、场景变化或用户做出重要选择后，**必须在角色描述之后，自动插入一小段独立的剧情描写**来推进故事发展。
   · 剧情描写必须与任何个体的言行卡片彻底分开，独立成段，并且输出为专属卡片：
     [CHAR_CARD: 剧情描写 | 独立的剧情描述或场景环境推进描写 | ] （其中第三个字段“对话内容”留空）。

请在叙述文本的**最末尾**，严格以以下标签格式输出更新数据（每行一个标签，必须在中括号内，用于引擎状态同步）：
[TASK_COMPLETE: 任务ID] (如果某项任务在此轮得到了达成，输出如 [TASK_COMPLETE: 1])
[FAVORABILITY: 伙伴真实名字, +数或-数, 原因说明] (调整该伙伴的好感度，例如 [FAVORABILITY: ${activeChars[0]?.name || "角色"}, +2, 因为你关心了他的伤势])
[INNER_THOUGHT: 伙伴真实名字, 心声文本] (提供该伙伴的最新隐秘心声。说明他对当前局势的猜测或对玩家的情感变化。字数40-80字)
[CHARACTER_FLAW_LEAKED: 伙伴真实名字, 破绽说明] (极低概率触发：若该伙伴在此轮对话里不慎露出了不属于本世界的习惯破绽，输出此标签，字数20-45字)
[GAME_ENDING: perfect 或 partial 或 failed] (如果满足结束条件：全部任务完成触发perfect；部分任务完成触发partial；全任务失败触发failed。没有触发结局千万别输出)
[ACTION_OPTION: 选项具体可执行内容] (请生成 4 到 6 个玩家下一步具体可执行的操作选项，例如“走过去和她说话”、“检查书桌抽屉”、“躲在门后观察”等，涵盖不同尝试方向。每行输出一个 [ACTION_OPTION: ...] 标签)
[CHAR_CARD: 角色名字 | 动作描述 | 对话内容] (为参与此轮对话的每个角色分别输出1条卡片标签。如 [CHAR_CARD: 剧情描写 | 窗外的冷雨敲打着玻璃，气氛瞬间凝固了。 | ]，或 [CHAR_CARD: 苏墨 | 缓缓放下茶盏，抬眼看着你 | 你真的以为能瞒过我吗])
${(activeWorld.factions || []).map(f => `[FACTION_CHAT: ${f.id}, 说话者名字, 消息内容] (为阵营【${f.name}】(使命:${f.goal})生成1条群聊消息：队友对当前局势的分析、建议或对敌方的猜想策略)`).join("\n")}
`;'''

content = re.sub(rules_re, new_rules, content, flags=re.DOTALL)

# 3. Update the parser
parser_re = r'''        \} else if \(tagType === "FAVORABILITY"\) \{.*?\}\n'''

new_parser = r'''        } else if (tagType === "FAVORABILITY") {
          const parts = valStr.split(",");
          if (parts.length >= 2) {
            const charName = parts[0].trim();
            const val = parseInt(parts[1].trim(), 10);
            const reason = parts.slice(2).join(",").trim() || "";
            if (!isNaN(val)) favorChanges[charName] = { diff: val, reason };
          }
'''

content = re.sub(parser_re, new_parser, content, flags=re.DOTALL)

# Remove SUSPICION, USER_SUSPICION from the parser completely
content = re.sub(r'''        \} else if \(tagType === "SUSPICION"\) \{.*?\}\n''', '', content, flags=re.DOTALL)
content = re.sub(r'''        \} else if \(tagType === "USER_SUSPICION"\) \{.*?\}\n''', '', content, flags=re.DOTALL)

# 4. Update the character states processing loop
char_states_re = r'''        if \(char && state\) \{.*?const nextExposure = Math\.max'''
new_char_states = r'''        if (char && state) {
          let fav = state.favorability;
          let susp = state.suspicion;
          let thought = state.innerThought;
          let flawsList = [...state.flaws];

          if (favorChanges[char.name] !== undefined) {
            fav = Math.max(0, Math.min(100, fav + favorChanges[char.name].diff));
          }
          if (innerThoughts[char.name] !== undefined) {
            thought = innerThoughts[char.name];
          }
          if (leakedFlaws[char.name] !== undefined) {
            flawsList = [leakedFlaws[char.name], ...flawsList];
            const flawEntry = {
              desc: `发现【${state.identity.name}】露出破绽：${leakedFlaws[char.name]}`,
              suspicionAdded: 0,
              timestamp: Date.now()
            };
            updatedWorld.flawsHistory = [flawEntry, ...(updatedWorld.flawsHistory || [])];
          }

          updatedCharStates[cId] = {
            ...state,
            favorability: fav,
            suspicion: susp,
            innerThought: thought,
            flaws: flawsList
          };
        }
      });

      const nextExposure = Math.max'''

content = re.sub(char_states_re, new_char_states, content, flags=re.DOTALL)

# 5. Fix system status message
system_msg_re = r'''      const favNames = Object\.keys\(favorChanges\);.*?let factionProgMap'''
new_system_msg = r'''      const favNames = Object.keys(favorChanges);
      if (favNames.length > 0) {
        systemStatusMsg += `💖 好感度变化：\n${favNames.map(name => {
          const cObj = activeChars.find(c => c.name === name);
          const cId = cObj?.id;
          const currentFav = cId ? updatedCharStates[cId]?.favorability : 50;
          const { diff, reason } = favorChanges[name];
          const isCompleted = currentFav >= 100 ? " 🎉【攻略完成】" : "";
          const reasonStr = reason ? `（${reason}）` : "";
          return `  - ${name} 好感度 ${diff > 0 ? "+" : ""}${diff}${reasonStr} (当前好感度: ${currentFav}/100${isCompleted})`;
        }).join("\n")}\n`;
      }

      let factionProgMap'''

content = re.sub(system_msg_re, new_system_msg, content, flags=re.DOTALL)


with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

