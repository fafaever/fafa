import re

with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the block line by line carefully
lines = content.split('\n')
new_lines = []
skip = False

for i, line in enumerate(lines):
    if line.startswith('      if (gameEnding) {') and 'nextActionOptions = actionOptions;' in lines[i-1]:
        # We found the block
        new_lines.append('      if (gameEnding) {')
        new_lines.append('         nextActionOptions = [];')
        new_lines.append('         if (gameEnding === "perfect") finalSysStr += "\\n\\n✨ 【世界结局达成：Perfect Ending】✨\\n所有任务均已完美完成。";')
        new_lines.append('         else if (gameEnding === "failed") finalSysStr += "\\n\\n☠️ 【世界结局：Failed】☠️\\n任务失败或暴露度过高，世界线崩溃。";')
        new_lines.append('         else finalSysStr += "\\n\\n⚠️ 【世界结局：Partial】⚠️\\n部分任务完成，世界线已强行收束。";')
        new_lines.append('      }')
        skip = True
    elif skip and line == '      }':
        skip = False
    elif not skip:
        new_lines.append(line)

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))
