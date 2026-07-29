
function getVectorApiConfig() {
  const settings = JSON.parse(localStorage.getItem('mobile_ai_settings') || '{}');
  return {
    baseUrl: settings.vectorApiUrl || 'https://api.siliconflow.cn/v1',
    apiKey: settings.vectorApiKey || settings.apiKey || '',
    model: settings.vectorModel || 'BAAI/bge-m3',
    rerankModel: settings.rerankModel || 'bge-reranker-v2-m3',
    dimension: settings.vectorDimension || 1024,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function storeMemory(characterId: string, text: string, source: string) {
  if (!text || !text.trim()) return;
  const config = getVectorApiConfig();
  if (!config.apiKey) {
    console.warn("Vector API key not configured, skipping memory storage.");
    return;
  }

  const trimmedText = text.trim();
  const memories = JSON.parse(localStorage.getItem('vector_memories') || '[]');
  
  // Prevent duplicate storage of exact same memory for same character
  if (memories.some((m: any) => m.characterId === characterId && m.text === trimmedText)) {
    return;
  }

  try {
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'BAAI/bge-m3',
        input: trimmedText,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    const vector = data.data?.[0]?.embedding || data.embeddings?.[0];

    if (!vector) {
      throw new Error("No vector returned from API");
    }

    memories.push({
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      characterId,
      text: trimmedText,
      vector,
      timestamp: Date.now(),
      source,
    });
    localStorage.setItem('vector_memories', JSON.stringify(memories));
  } catch (err) {
    console.error("storeMemory error:", err);
  }
}

export async function retrieveMemories(characterId: string, query: string, topK: number = 5) {
  if (!query || !query.trim()) return [];
  const config = getVectorApiConfig();
  if (!config.apiKey) {
    console.warn("Vector API key not configured, skipping memory retrieval.");
    return [];
  }

  try {
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'BAAI/bge-m3',
        input: query.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    const queryVector = data.data?.[0]?.embedding || data.embeddings?.[0];

    if (!queryVector) {
      throw new Error("No query vector returned from API");
    }

    const memories = JSON.parse(localStorage.getItem('vector_memories') || '[]')
      .filter((m: any) => m.characterId === characterId || m.characterId === 'all' || m.characterId === 'universe' || m.characterId === 'uno' || m.characterId === 'turtlesoup');

    if (memories.length === 0) return [];

    // 计算余弦相似度并排序取 Top-K
    const scored = memories.map((m: any) => ({
      ...m,
      score: cosineSimilarity(queryVector, m.vector),
    }));
    
    scored.sort((a: any, b: any) => b.score - a.score);
    return scored.slice(0, topK);
  } catch (err) {
    console.error("retrieveMemories error:", err);
    return [];
  }
}
