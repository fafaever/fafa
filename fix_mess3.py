with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '任务清单' in line and '${activeWorld.tasks.map' in lines[i+1]:
        lines[i+1] = '${activeWorld.tasks.map((t) => `${t.id}. [${t.completed ? "已完成" : "未完成"}] ${t.description}`).join("\\n")}\n'
    if '请根据剧情走向，生成参与角色' in line:
        lines[i] = '请根据剧情走向，生成参与角色（${activeChars.map((c) => c.name).join("、")}）的场景描写与台词。\n'

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(''.join(lines))
