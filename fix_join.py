with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_str1 = """}).join("
")}"""
content = content.replace(bad_str1, '}).join("\\n")}')

bad_str2 = """}).join("
")}
`;"""
content = content.replace(bad_str2, '}).join("\\n")}\n`;')

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
