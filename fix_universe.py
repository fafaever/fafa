import re

with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modify favorChanges type
content = content.replace(
    'const favorChanges: Record<string, number> = {};',
    'const favorChanges: Record<string, { diff: number, reason: string }> = {};'
)

# 2. Modify FAVORABILITY prompt
old_favor_rule = r'3\. 好感度结算：每个角色好感度 0-100。用户通过对话和行动提升/改变好感度。好感度达到 100 时攻略完成。每轮剧情结束后输出 \[FAVORABILITY: 角色真实名字, \+数或-数\] 标签结算好感度变化。'
new_favor_rule = r'3. 好感度结算：好感度增长速度减缓，每次有效互动提升 1-3 点，最多不超过 5 点。如果玩家做出不符合期待或伤害角色的行为，好感度下降 1-5 点。每轮结束后输出 [FAVORABILITY: 角色真实名字, +数或-数, 原因说明] 标签，必须附带简短原因（如“因为你记住了他上次提过的事”）。'
content = re.sub(old_favor_rule, new_favor_rule, content)

old_favor_tag = r'\[FAVORABILITY: 伙伴真实名字, \+数或-数\] \(调整该伙伴的好感度，例如 \[FAVORABILITY: \$\{activeChars\[0\]\?\.name \|\| "角色"\}, \+10\]\)'
new_favor_tag = r'[FAVORABILITY: 伙伴真实名字, +数或-数, 原因说明] (调整该伙伴的好感度，例如 [FAVORABILITY: ${activeChars[0]?.name || "角色"}, +2, 因为你关心了他的伤势])'
content = content.replace(old_favor_tag, new_favor_tag)

# 3. Add Story Progression and Repetition Rule
old_story_rule_start = r'【快穿世界完整玩法规则与描写规范】：'
new_story_rule = r'''【快穿世界完整玩法规则与描写规范】：
0. 【剧情推进与防重复原则】：
   - 剧情推进必须以“事件”为单位进行实质性发展，而不是停留在无意义的日常对话中。每次生成前请读取当前剧情状态，确保新内容自然承接，不跳跃。
   - **绝对禁止**在连续 3 轮内出现相同或高度相似的情节描述、对话走向或情绪反应！如果发现与上文相似，请立即引入新事件或改变走向。'''
content = content.replace(old_story_rule_start, new_story_rule)

# 4. Remove SUSPICION and USER_SUSPICION tags from prompt
suspicion_tag_re = r'\[SUSPICION: 伙伴真实名字, \+数或-数\] \(仅当玩家主动做出明显不符合当前世界设定或人设的异常行为时.*?不要增加怀疑度！\)\n?'
user_suspicion_tag_re = r'\[USER_SUSPICION: \+数或-数\] \(调整玩家当前的暴露度（当前为 \$\{currentExposure\}%\）。仅当玩家主动做出明显不符合设定的行为.*?界面操作”等内容。\)\n?'

content = re.sub(suspicion_tag_re, '', content)
content = re.sub(user_suspicion_tag_re, '', content)

# 5. Parse new FAVORABILITY tag
old_parse_favor = r'''        } else if \(tagType === "FAVORABILITY"\) \{
          const parts = valStr\.split\(","\);
          if \(parts\.length === 2\) \{
            const charName = parts\[0\]\.trim\(\);
            const val = parseInt\(parts\[1\]\.trim\(\), 10\);
            if \(!isNaN\(val\)\) favorChanges\[charName\] = val;
          \}'''

new_parse_favor = r'''        } else if (tagType === "FAVORABILITY") {
          const parts = valStr.split(",");
          if (parts.length >= 2) {
            const charName = parts[0].trim();
            const val = parseInt(parts[1].trim(), 10);
            const reason = parts.slice(2).join(",").trim();
            if (!isNaN(val)) favorChanges[charName] = { diff: val, reason };
          }'''

content = re.sub(old_parse_favor, new_parse_favor, content)

# 6. Apply favorChanges with reason
old_apply_favor = r'''        if \(favDiff \!== undefined\) \{
          let updatedFav = \(cState\.favorability \|\| 50\) \+ favDiff;
          if \(updatedFav > 100\) updatedFav = 100;
          if \(updatedFav < 0\) updatedFav = 0;
          favDiff = updatedFav - \(cState\.favorability \|\| 50\);
          
          updatedCharStates\[c\.id\] = \{
            \.\.\.cState,
            favorability: updatedFav,
            innerThought: innerT \|\| cState\.innerThought
          \};
        \}'''

new_apply_favor = r'''        if (favDiff !== undefined) {
          let updatedFav = (cState.favorability || 50) + favDiff;
          if (updatedFav > 100) updatedFav = 100;
          if (updatedFav < 0) updatedFav = 0;
          favDiff = updatedFav - (cState.favorability || 50);
          
          updatedCharStates[c.id] = {
            ...cState,
            favorability: updatedFav,
            innerThought: innerT || cState.innerThought
          };
        }'''
# Wait, favDiff in loop is accessing `favorChanges[c.name]`.
# Let's replace the whole character loop logic.
