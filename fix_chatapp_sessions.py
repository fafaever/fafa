import re

with open('src/components/ChatApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'if \(session\) \{\n\s*const updatedSession = \{ \.\.\.session, messages: \[\.\.\.session\.messages, proactiveMsg\], updatedAt: Date\.now\(\) \};\n\s*const updatedSessions = sessions\.map\(\(s\) => \(s\.id === session!\.id \? updatedSession : s\)\);\n\s*setSessions\(updatedSessions\);\n\s*localStorage\.setItem\("mobile_ai_chat_sessions_v1", JSON\.stringify\(updatedSessions\)\);\n\s*\} else \{\n\s*const newSession: ChatSession = \{\n\s*id: `session-\$\{Date\.now\(\)\}`,\n\s*characterId: randomChar\.id,\n\s*messages: \[proactiveMsg\],\n\s*updatedAt: Date\.now\(\),\n\s*\};\n\s*const updatedSessions = \[newSession, \.\.\.sessions\];\n\s*setSessions\(updatedSessions\);\n\s*localStorage\.setItem\("mobile_ai_chat_sessions_v1", JSON\.stringify\(updatedSessions\)\);\n\s*\}')

replacement = """              if (session) {
                onUpdateSessionMessages(session.id, [...session.messages, proactiveMsg], undefined, { lastActive: Date.now() });
              } else {
                onUpdateSessionMessages(randomChar.id, [proactiveMsg], undefined, { lastActive: Date.now() });
              }"""

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open('src/components/ChatApp.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed ChatApp sessions")
else:
    print("Pattern not found")
