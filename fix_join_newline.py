import re

with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# find where it says }).join(" and then newline
content = re.sub(r'\}\)\.join\(" *\n *"\)\}', '}).join("\\n")}', content)

# same for activeWorld.factions... join("\n")
content = re.sub(r'\}\)\.join\(" *\n *"\)\}\n`;', '}).join("\\n")}\n`;', content)

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

