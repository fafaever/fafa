import re

with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-[#A8A39A]"',
    'className="flex items-center gap-1.5 mb-1 px-1 text-[12px] text-[#A8A39A]"'
)

content = content.replace(
    'className="text-[10px] opacity-70"',
    'className="text-[10px] opacity-70"'
)

content = content.replace(
    'text-xs sm:text-sm',
    'text-[14px]'
)

content = content.replace(
    'rounded-2xl text-xs text-[#78716C]',
    'rounded-2xl text-[14px] text-[#78716C]'
)

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
