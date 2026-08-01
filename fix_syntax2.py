with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_str = """      if (gameEnding) {
         nextActionOptions = [];
         if (gameEnding === "perfect") finalSysStr += "✨ 【世界结局达成：Perfect Ending】✨所有任务均已完美完成。";
         else if (gameEnding === "failed") finalSysStr += "☠️ 【世界结局：Failed】☠️任务失败或暴露度过高，世界线崩溃。";
         else finalSysStr += "⚠️ 【世界结局：Partial】⚠️部分任务完成，世界线已强行收束。";
      }"""

good_str = """      if (gameEnding) {
         nextActionOptions = [];
         if (gameEnding === "perfect") { finalSysStr += "\\n\\n✨ 【世界结局达成：Perfect Ending】✨\\n所有任务均已完美完成。"; }
         else if (gameEnding === "failed") { finalSysStr += "\\n\\n☠️ 【世界结局：Failed】☠️\\n任务失败或暴露度过高，世界线崩溃。"; }
         else { finalSysStr += "\\n\\n⚠️ 【世界结局：Partial】⚠️\\n部分任务完成，世界线已强行收束。"; }
      }"""

content = content.replace(bad_str, good_str)
with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
