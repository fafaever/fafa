import re

with open('./src/components/ForumApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """4. 请在生成前判断审查，确保内容 100% 属于恐怖/灵异主题，并在 JSON 中输出 "isHorrorTheme": true。`;
          } else if (isFoundPhone) {
            boardRequirementNotice = `--- 【捡手机文学板块特别硬性规则（最高优先级）】 ---
1. 本板块帖子必须是虚构的聊天记录，以“捡到了 [某人] 的手机”为标题。
2. 题材不限（搞笑、日常、悬疑、恋爱均可），核心是通过角色A与角色B（或多人）的聊天对话推动剧情。
3. 内容风格：日常口语化对话，可包含语气词、表情符号（用文字描述）、时间戳等细节，符合角色的设定。
4. 【必须在 JSON 中输出 "isFoundPhone": true 以及 "title"（如“捡到了 [某人] 的手机”），还有 "chatLogs" 数组（不可省略，不少于6条）。】
5. "chatLogs" 的格式要求：每个元素是 { "sender": "发送者昵称", "time": "14:30", "content": "消息内容", "isRight": true 或 false (true代表手机主人，false代表对方) }。`;"""

content = re.sub(r'4\. 请在生成前判断审查，确保内容 100% 属于恐怖/灵异主题，并在 JSON 中输出 "isHorrorTheme": true。`;', replacement, content)

with open('./src/components/ForumApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

