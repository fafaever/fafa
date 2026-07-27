import re

with open('./src/components/ForumApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """          if (parsed && parsed.content) {
            
            if (isFoundPhone && parsed.isFoundPhone) {
               validParsed = {
                 ...parsed,
                 isFoundPhone: true,
                 title: parsed.title || "捡到了手机",
                 chatLogs: parsed.chatLogs || []
               };
               break;
            }
const text = parsed.content.trim();
            const hasFirstPerson = text.includes("我");
            const isHorrorValid = !isHorror || (parsed.isHorrorTheme !== false && isContentHorrorThemed(text));
            const isLengthOk = text.length >= 120;
            const isTooSimilar = checkIsPostTooSimilar(text, [...posts, ...generatedPosts]);

            if ((hasFirstPerson && isHorrorValid && isLengthOk && !isTooSimilar) || attempts >= 3) {
              validParsed = parsed;
            }
          }"""

replacement = """          if (parsed) {
            if (isFoundPhone && parsed.isFoundPhone) {
               validParsed = {
                 ...parsed,
                 content: parsed.content || "[聊天记录]",
                 isFoundPhone: true,
                 title: parsed.title || "捡到了手机",
                 chatLogs: parsed.chatLogs || []
               };
               break;
            }
            if (parsed.content) {
              const text = parsed.content.trim();
              const hasFirstPerson = text.includes("我");
              const isHorrorValid = !isHorror || (parsed.isHorrorTheme !== false && isContentHorrorThemed(text));
              const isLengthOk = text.length >= 120;
              const isTooSimilar = checkIsPostTooSimilar(text, [...posts, ...generatedPosts]);

              if ((hasFirstPerson && isHorrorValid && isLengthOk && !isTooSimilar) || attempts >= 3) {
                validParsed = parsed;
              }
            }
          }"""

content = content.replace(target, replacement)

with open('./src/components/ForumApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

