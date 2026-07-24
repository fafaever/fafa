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
      genAIClient = new GoogleGenAI({ apiKey });
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

// API Proxy route to bypass browser CORS / mixed content issues
app.post("/api/proxy", async (req, res) => {
  try {
    let { url, method = "POST", headers = {}, body } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: "Missing target url" });
    }

    url = normalizeUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout for AI model responses

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
});

// Server-side Gemini API route
app.post("/api/gemini", async (req, res) => {
  try {
    const { messages = [], temperature = 0.8 } = req.body || {};
    const ai = getGenAI();
    if (!ai) {
      return res.status(400).json({ error: "Server GEMINI_API_KEY is not configured" });
    }

    const sysMsg = messages.find((m: any) => m.role === "system");
    const chatMsgs = messages.filter((m: any) => m.role !== "system");

    const contents = chatMsgs.map((m: any) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content || "" }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
      config: {
        systemInstruction: sysMsg?.content || undefined,
        temperature: Number(temperature) || 0.8,
      },
    });

    return res.json({ text: response.text || "" });
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

// Alias for chat to support legacy or alternative calls
app.post("/api/chat", (req, res) => {
  // Redirect internally to proxy
  req.url = "/api/proxy";
  return app._router.handle(req, res, () => {});
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

