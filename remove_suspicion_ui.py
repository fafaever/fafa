import re

with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

suspicion_ui_re = r'''                      <div className="bg-\[#FAFAF9\] p-2\.5 rounded-xl border border-\[#EFECE8\]">\s*<span className="text-\[#78716C\] text-\[10px\] block">怀疑度：</span>\s*<span className="text-\[#1A1A1A\] font-semibold font-mono text-base">\{charState\.suspicion \|\| 0\}%</span>\s*</div>'''

content = re.sub(suspicion_ui_re, '', content)

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
