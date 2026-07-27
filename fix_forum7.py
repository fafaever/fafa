import re

with open('./src/components/ForumApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """<div className={`p-3 rounded-2xl text-xs leading-relaxed font-medium shadow-sm ${log.isRight ? 'bg-neutral-900 text-white rounded-tr-xs' : 'bg-white text-neutral-800 border border-neutral-200 rounded-tl-xs'}`}>"""

replacement = """<div className={`p-3 rounded-2xl text-xs leading-relaxed font-medium shadow-sm ${log.isRight ? 'bg-black text-white rounded-tr-xs' : 'bg-neutral-200 text-neutral-800 rounded-tl-xs'}`}>"""

content = content.replace(target, replacement)

with open('./src/components/ForumApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

