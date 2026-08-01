with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Use regex to find the problematic gameEnding block that spans multiple lines
bad_block_pattern = r'if \(gameEnding\) \{.*?else finalSysStr \+= "[^"]*";\n\s*\}'

# The replacement block
good_block = """if (gameEnding) {
         nextActionOptions = [];
         if (gameEnding === "perfect") finalSysStr += "\\n\\n✨ 【世界结局达成：Perfect Ending】✨\\n所有任务均已完美完成。";
         else if (gameEnding === "failed") finalSysStr += "\\n\\n☠️ 【世界结局：Failed】☠️\\n任务失败或暴露度过高，世界线崩溃。";
         else finalSysStr += "\\n\\n⚠️ 【世界结局：Partial】⚠️\\n部分任务完成，世界线已强行收束。";
      }"""

content = re.sub(bad_block_pattern, good_block, content, flags=re.DOTALL)

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
