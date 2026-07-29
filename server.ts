import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Global CORS middleware for /api routes
app.use("/api", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-goog-api-key");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Request logger for debugging 405/404 errors
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

let genAIClient: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return genAIClient;
}

function normalizeUrl(url: string): string {
  if (!url) return "";
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed;
  }
  return trimmed;
}

// Handle preflight requests
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-goog-api-key");
  res.sendStatus(200);
});

// API Proxy handler
async function handleProxyRequest(req: express.Request, res: express.Response) {
  try {
    let { url, method = "POST", headers = {}, body } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: "Missing target url" });
    }

    url = normalizeUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout for AI model proxy responses

    const fetchOptions: any = {
      method,
      headers: { ...headers },
      signal: controller.signal,
    };
    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    try {
      const targetRes = await fetch(url, fetchOptions);
      clearTimeout(timeout);
      const contentType = targetRes.headers.get("content-type") || "";
      const responseText = await targetRes.text();

      res.status(targetRes.status);
      if (contentType.includes("application/json")) {
        try {
          return res.json(JSON.parse(responseText));
        } catch (e) {
          return res.send(responseText);
        }
      }
      return res.send(responseText);
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const isTimeout = fetchErr.name === "AbortError";
      const errorMsg = isTimeout ? "代理请求超时 (45秒)" : `代理连接目标服务器失败: ${fetchErr.message}`;
      return res.status(502).json({ error: errorMsg });
    }
  } catch (err: any) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: `Proxy connection error: ${err.message}` });
  }
}

// API Proxy route to bypass browser CORS / mixed content issues
app.post(["/api/proxy", "/api/chat-forwarder"], handleProxyRequest);

// Server-side Gemini API route
async function generateGeminiResponse(ai: GoogleGenAI, contents: any[], systemInstruction?: string, temperature: number = 0.8) {
  const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastErr = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
        config: {
          systemInstruction,
          temperature: Number(temperature) || 0.8,
        },
      });
      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastErr = err;
      console.warn(`[Gemini Model ${model} failed, trying next]`, err.message);
    }
  }
  throw lastErr || new Error("Gemini generation failed for all models");
}

function formatGeminiContents(chatMsgs: any[]): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  const formattedContents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const m of chatMsgs) {
    const role = (m.role === "assistant" || m.role === "model") ? "model" : "user";
    const text = typeof m.content === "string" 
      ? m.content 
      : (Array.isArray(m.parts) ? m.parts.map((p: any) => p.text || "").join("\n") : String(m.content || ""));
    if (!text || !text.trim()) continue;

    if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
      formattedContents[formattedContents.length - 1].parts.push({ text });
    } else {
      formattedContents.push({ role, parts: [{ text }] });
    }
  }

  if (formattedContents.length > 0 && formattedContents[0].role === "model") {
    formattedContents.unshift({ role: "user", parts: [{ text: "（开启剧情对话）" }] });
  }

  if (formattedContents.length === 0) {
    formattedContents.push({ role: "user", parts: [{ text: "开始小剧场或对话" }] });
  }

  return formattedContents;
}

app.post("/api/gemini", async (req, res) => {
  try {
    const { messages = [], temperature = 0.8 } = req.body || {};
    const ai = getGenAI();
    if (!ai) {
      return res.status(400).json({ error: "Server GEMINI_API_KEY is not configured" });
    }

    const sysMsg = messages.find((m: any) => m.role === "system");
    const chatMsgs = messages.filter((m: any) => m.role !== "system");
    const contents = formatGeminiContents(chatMsgs);

    const text = await generateGeminiResponse(ai, contents, sysMsg?.content || undefined, temperature);
    return res.json({ text });
  } catch (err: any) {
    console.error("Gemini API error:", err);
    return res.status(500).json({ error: err.message || "Gemini generation failed" });
  }
});

// Auto-generate note API route
app.post("/api/generate-note", async (req, res) => {
  try {
    const { character, settings } = req.body;
    if (!character || !settings || !settings.apiUrl || !settings.apiKey) {
      return res.status(400).json({ error: "Missing character or API settings" });
    }

    const prompt = `你现在是 ${character.name}，请写一条符合你人设的简短手记/动态（50字以内）。`;
    const normalizedApiUrl = normalizeUrl(settings.apiUrl);
    const endpoint = `${normalizedApiUrl.replace(/\/+$/, "")}/chat/completions`;
    
    const targetRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!targetRes.ok) {
      return res.status(targetRes.status).json({ error: "LLM call failed" });
    }

    const data = await targetRes.json();
    const text = data.choices?.[0]?.message?.content || "";
    return res.json({ text });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Alias & direct handler for /api/chat and OpenAI standard completions paths
app.post(["/api/chat", "/api/chat/completions", "/api/chat/v1/chat/completions", "/api/v1/chat/completions"], async (req, res) => {
  if (req.body && req.body.url) {
    return handleProxyRequest(req, res);
  }

  const { messages, settings, temperature } = req.body || {};
  if (settings?.apiUrl && settings?.apiKey) {
    let cleanUrl = normalizeUrl(settings.apiUrl);
    let endpoint = cleanUrl.endsWith("/chat/completions") ? cleanUrl : `${cleanUrl}/chat/completions`;
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s fast proxy timeout to avoid client network drop

      const fetchOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model || "gpt-3.5-turbo",
          messages,
          temperature: temperature || 0.8,
          max_tokens: 2048,
          stream: false,
        }),
        signal: controller.signal,
      };

      const targetRes = await fetch(endpoint, fetchOptions);
      clearTimeout(timeout);

      if (targetRes.ok) {
        const contentType = targetRes.headers.get("content-type") || "";
        const responseText = await targetRes.text();
        if (contentType.includes("application/json")) {
          try {
            return res.json(JSON.parse(responseText));
          } catch (e) {
            return res.send(responseText);
          }
        }
        return res.send(responseText);
      } else {
        console.warn(`[Proxy attempt failed with status ${targetRes.status}, falling back to Gemini]`);
      }
    } catch (proxyErr: any) {
      console.warn(`[Proxy connection failed: ${proxyErr.message}, falling back to Gemini]`);
    }
  }

  // Fallback to Gemini
  const ai = getGenAI();
  if (ai) {
    try {
      const sysMsg = (messages || []).find((m: any) => m.role === "system");
      const chatMsgs = (messages || []).filter((m: any) => m.role !== "system");
      const contents = formatGeminiContents(chatMsgs);

      const text = await generateGeminiResponse(ai, contents, sysMsg?.content || undefined, temperature);
      return res.json({ text });
    } catch (err: any) {
      console.error("[Server Gemini generation error]", err);
    }
  }

  // Final fallback text if both custom API proxy and Gemini server failed
  const defaultFallbackText = `（环境静谧，对方眼神中带有一丝思索，静静地注视着你，等待着你的进一步行动...）\n\n【互动关键点】：直面 vs 回避 （面对眼前的变化与气氛，你打算做出什么回应？）\n【分支选项1】：“抱歉，刚才有些走神了。”\n【分支选项2】：“你现在在想什么呢？”\n【分支选项3】：保持沉默，回以温和的眼神。\n【分支选项4】：轻声开口，尝试换个轻松的话题。`;

  return res.json({ text: defaultFallbackText });
});

// GET route to support pulling models from local API proxy or default list
app.get(["/api/models", "/api/v1/models", "/api/chat/models"], (req, res) => {
  res.json({
    data: [
      { id: "gemini-3.6-flash" },
      { id: "gemini-2.5-flash" },
      { id: "gemini-2.0-flash" },
      { id: "gemini-1.5-flash" },
      { id: "gpt-4o" },
      { id: "gpt-3.5-turbo" }
    ]
  });
});

// POST route to proxy fetching models
app.post("/api/models", async (req, res) => {
  try {
    const { apiUrl, apiKey } = req.body || {};
    if (!apiUrl || !apiKey) {
      return res.status(400).json({ error: "Missing apiUrl or apiKey" });
    }

    let cleanApiUrl = apiUrl.trim();
    cleanApiUrl = cleanApiUrl.replace(/\/chat\/completions\/?$/, '')
                             .replace(/\/v1\/chat\/completions\/?$/, '')
                             .replace(/\/v1\/models\/?$/, '')
                             .replace(/\/models\/?$/, '')
                             .replace(/\/v1\/?$/, '');
    
    const targetUrl = `${cleanApiUrl}/v1/models`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let fetchRes;
    try {
      // Try with /v1/models first, then fallback or just try base URL if it's already a /models endpoint
      const targetUrl = cleanApiUrl.endsWith('/models') ? cleanApiUrl : `${cleanApiUrl}/v1/models`;

      fetchRes = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        },
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      return res.status(502).json({ error: `后端转发 Fetch 异常: ${fetchErr?.message || String(fetchErr)}` });
    }
    clearTimeout(timeout);

    const responseText = await fetchRes.text();
    if (!fetchRes.ok) {
      console.error(`[Backend Proxy] /models failed: ${fetchRes.status} ${fetchRes.statusText}`, responseText);
      return res.status(fetchRes.status).json({
        error: `中转站返回 HTTP ${fetchRes.status}`,
        details: responseText,
        targetUrl
      });
    }

    if (responseText.trim().startsWith("<") || responseText.trim().startsWith("<!DOCTYPE")) {
      console.error(`[Backend Proxy] /models returned HTML, likely not a /models endpoint`, responseText);
      return res.status(502).json({
        error: "API 地址返回了 HTML 页面（可能是 404 或代理错误），请检查 API 地址是否正确。",
        details: responseText,
        targetUrl
      });
    }

    res.set("Content-Type", fetchRes.headers.get("Content-Type") || "application/json");
    res.send(responseText);
  } catch (err: any) {
    console.error("[Backend Proxy] /models internal error:", err);
    res.status(500).json({ error: `Server API 内部错误: ${err?.message || String(err)}` });
  }
});

// Explicitly handle GET on API routes to avoid confusing 405s from static middleware
app.get("/api/*", (req, res) => {
  res.status(405).json({ error: "Method Not Allowed. This API endpoint requires POST." });
});

// Catch-all for undefined API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

