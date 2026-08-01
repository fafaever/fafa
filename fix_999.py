with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'content: prompt + (retryCount > 0 ? "' in line and line.strip().endswith('? "'):
        # join with the next line and the line after
        lines[i] = line.rstrip() + lines[i+1].lstrip() + lines[i+2].lstrip()
        lines[i+1] = ""
        lines[i+2] = ""
        
with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

