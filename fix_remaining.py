import re

with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove suspicion from Prompt in handleTransmigrationUserSend (Wait, let's just replace the whole text in the prompt)
content = re.sub(r'\[USER_SUSPICION:.*?\]\n', '', content)
content = re.sub(r'\[SUSPICION:.*?\]\n', '', content)

# Remove the line 916 `const currentExposure = ...;`
content = re.sub(r'\s*const currentExposure = activeWorld\.exposureLevel \|\| 0;\n', '\n', content)

# handleAccuseCharacter fixes
content = content.replace(
    '[SUSPICION_CHANGE: ${charState.favorability >= 50 ? "-10" : "+15"}]',
    ''
)
content = content.replace(
    '[EXPOSURE_CHANGE: 0]',
    ''
)

content = re.sub(r'\s*let suspDiff = 35;\n\s*let expDiff = 20;\n', '\n', content)
content = re.sub(r'''        } else if \(type === "SUSPICION_CHANGE"\) \{
          suspDiff = parseInt\(val, 10\) \|\| 35;
        \} else if \(type === "EXPOSURE_CHANGE"\) \{
          expDiff = parseInt\(val, 10\) \|\| 20;''', '', content)

content = re.sub(r'''          let updatedSusp = \(cState\.suspicion \|\| 0\) \+ suspDiff;
          if \(updatedSusp > 100\) updatedSusp = 100;
          if \(updatedSusp < 0\) updatedSusp = 0;''', '', content)
content = re.sub(r'''\s*suspicion: updatedSusp,''', '', content)

# Fix the nextExposure logic in handleAccuseCharacter
accuse_ending_re = r'''      const nextExposure = Math\.max.*?if \(nextExposure >= 100\) \{.*?\} else \{'''

new_accuse_ending = r'''      const nextExposure = 0;
      if (false) {
      } else {'''
content = re.sub(accuse_ending_re, new_accuse_ending, content, flags=re.DOTALL)

# Fix accuse message
content = content.replace(
    '你与伙伴【${charState.identity.name}】成功揭开了穿越者的面纱，灵魂频率达到绝对共鸣！好感度增加 30，怀疑度降低 40！',
    '你与伙伴【${charState.identity.name}】成功揭开了穿越者的面纱，灵魂频率达到绝对共鸣！好感度增加 30！'
)
content = content.replace(
    '伙伴【${charState.identity.name}】对你露出了看疯子一样的神色，并将防备提到了最高！好感度降低 20，怀疑度暴涨 35！你的暴露度上升了 20% （当前：${nextExposure}%）',
    '伙伴【${charState.identity.name}】对你露出了看疯子一样的神色，并将防备提到了最高！好感度降低 20！'
)

# Fix the card summary
content = content.replace(
    '- 身份暴露值：${activeWorld.exposureLevel || 0}%',
    ''
)

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

