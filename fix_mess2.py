with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '各伙伴在本世界的扮演身份及属性' in line or '任务清单：' in line or '最新玩家发言' in line or '请根据剧情走向，生成参与角色' in line:
        pass # just to locate

    lines[i] = line.replace('}).join("\\n")\\n")}', '}).join("\\n")}')
    lines[i] = line.replace('.join("\\n")\\n")}")}', '.join("\\n")}')
    lines[i] = line.replace('.join("\\n")、")}', '.join("、")}')
    lines[i] = line.replace('}).join("\\n")\\n")}', '}).join("\\n")}')

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
