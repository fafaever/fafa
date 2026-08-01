with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('join("\\n")\\n");', 'join("\\n");')

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
