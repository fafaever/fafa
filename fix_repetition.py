import re

with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

similarity_func = '''function calculateSimilarity(str1: string, str2: string) {
  const getNgrams = (s: string, n: number) => {
    const ngrams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) ngrams.add(s.substring(i, i + n));
    return ngrams;
  };
  const set1 = getNgrams(str1, 5);
  const set2 = getNgrams(str2, 5);
  if (set1.size === 0 || set2.size === 0) return 0;
  let intersection = 0;
  for (const gram of set1) {
    if (set2.has(gram)) intersection++;
  }
  return intersection / (set1.size + set2.size - intersection);
}
'''

# Insert similarity_func before handleTransmigrationUserSend
content = content.replace(
  '  const handleTransmigrationUserSend = async',
  similarity_func + '\n  const handleTransmigrationUserSend = async'
)

call_llm_re = r'''    try \{
      const response = await callLLM\(settings\.apiUrl, settings\.apiKey, settings\.model, \[\{ role: "user", content: prompt \}\], 0\.8, settings\.apiFormat\);'''

new_call_llm = r'''    try {
      let response = "";
      let isRepetitive = true;
      let retryCount = 0;
      
      while (isRepetitive && retryCount < 2) {
        response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: prompt + (retryCount > 0 ? "\n\n【系统警告：请注意！你上一次生成的内容与历史重复度过高，请立即更换全新的剧情事件、对话走向或冲突点，切勿重复！】" : "") }], 0.8, settings.apiFormat);
        
        // Repetition check against last 2 assistant messages
        const cleanContent = response.replace(/\[[A-Z_]+:.*?\]/g, "").trim();
        const lastAssistantMsgs = updatedMessages.filter(m => m.role === "assistant").slice(-2);
        
        isRepetitive = false;
        for (const msg of lastAssistantMsgs) {
          const sim = calculateSimilarity(cleanContent, msg.content.replace(/\[[A-Z_]+:.*?\]/g, "").trim());
          if (sim > 0.15) { // If more than 15% 5-grams overlap, consider it repetitive
            isRepetitive = true;
            break;
          }
        }
        retryCount++;
      }
'''

content = re.sub(call_llm_re, new_call_llm, content, flags=re.DOTALL)

with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
