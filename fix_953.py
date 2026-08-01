import re
with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\$\{activeWorld\.tasks\.map\(\(t\) => `\$\{t\.id\}\. \[\$\{t\.completed \? "已完成" : "未完成"\}\] \$\{t\.description\}`\)\.join\(".*?', r'${activeWorld.tasks.map((t) => `${t.id}. [${t.completed ? "已完成" : "未完成"}] ${t.description}`).join("\\n")}', content)

# just specifically find the broken line:
content = content.replace('.join("\n")}', '.join("\\n")}')
content = content.replace('.join("\n")\n")}', '.join("\\n")}')
content = content.replace('.join("")', '.join("\\n")')
content = content.replace('.join("', '.join("\\n")')

# wait, fixing `.join("` will break if there are `.join(", ")`. Let's just fix the exact line using sed.

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
