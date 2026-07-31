
import { safeJsonParse } from '../utils/safeJson';

function getVectorApiConfig(customSettings?: any) {
  let settings = customSettings;
  if (!settings) {
    try {
      const saved = localStorage.getItem('mobile_ai_settings');
      if (saved) settings = JSON.parse(saved);
    } catch (e) {}
  }
  if (!settings) settings = {};

  const baseUrl = String(
    settings.vectorApiUrl ||
    localStorage.getItem('vectorApiUrl') ||
    'https://api.siliconflow.cn/v1'
  ).trim().replace(/\/+$/, '');

  const apiKey = String(
    settings.vectorApiKey ||
    localStorage.getItem('vectorApiKey') ||
    settings.apiKey ||
    localStorage.getItem('apiKey') ||
    ''
  ).trim();

  const model = String(
    settings.vectorModel ||
    localStorage.getItem('vectorModel') ||
    'BAAI/bge-m3'
  ).trim();

  const rerankModel = String(
    settings.rerankModel ||
    localStorage.getItem('rerankModel') ||
    'bge-reranker-v2-m3'
  ).trim();

  const dimension = Number(
    settings.vectorDimension ||
    localStorage.getItem('vectorDimension') ||
    1024
  );

  return { baseUrl, apiKey, model, rerankModel, dimension };
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

export async function storeMemory(characterId: string, text: string, source: string, customSettings?: any) {
  if (!text || !text.trim()) return;
  const config = getVectorApiConfig(customSettings);

  if (!config.apiKey) {
    throw new Error("未检测到向量 API Key。请先在【设置 -> 向量 API 配置】中填写 Vector API Key（例如 SiliconFlow 或 OpenAI 密钥）。");
  }

  const trimmedText = text.trim();
  const memories = safeJsonParse<any[]>(localStorage.getItem('vector_memories'), []);
  
  // Prevent duplicate storage of exact same memory for same character
  if (memories.some((m: any) => m.characterId === characterId && m.text === trimmedText)) {
    return;
  }

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
    const errText = await response.text().catch(() => "");
    throw new Error(`向量 API [${config.baseUrl}/embeddings] 请求失败 (${response.status}): ${errText || response.statusText}`);
  }

  const data = await response.json();
  const vector = data.data?.[0]?.embedding || data.embeddings?.[0];

  if (!vector || !Array.isArray(vector)) {
    throw new Error("向量 API 返回数据中未获得有效的 embedding 向量。");
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
}

export async function retrieveMemories(characterId: string, query: string, topK: number = 5, customSettings?: any) {
  if (!query || !query.trim()) return [];
  const config = getVectorApiConfig(customSettings);
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

    if (!queryVector || !Array.isArray(queryVector)) {
      throw new Error("No query vector returned from API");
    }

    const memories = safeJsonParse<any[]>(localStorage.getItem('vector_memories'), [])
      .filter((m: any) => m.characterId === characterId || m.characterId === 'all' || m.characterId === 'universe' || m.characterId === 'uno' || m.characterId === 'turtlesoup');

    if (memories.length === 0) return [];

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
