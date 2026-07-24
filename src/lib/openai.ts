import { callLLM } from "./api";

export async function callOpenAI(apiUrl?: string, apiKey?: string, model?: string, messages: any[] = [], temperature = 0.8) {
  return callLLM(apiUrl, apiKey, model, messages, temperature);
}
