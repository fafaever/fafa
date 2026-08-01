with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const charNames =' in line and 'join("\\n")、");' in line:
        lines[i] = line.replace('join("\\n")、");', 'join("、");')
        
    if 'FACTION_CHAT' in line and '.join("\\n")})`' in line:
        lines[i] = line.replace('.join("\\n")})`', '.join("\\n")}\n`;')
        
    # Also I saw in my output:
    # response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt + (retryCount > 0 ? "
    # Wait, where is the end of that string?
    if 'prompt + (retryCount > 0 ? "' in line:
        if line.endswith('"\n'):
            pass # Oh no, the string was broken!
            
with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
