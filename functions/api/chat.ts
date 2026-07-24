export const onRequestOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-goog-api-key",
    },
  });
};

export const onRequestPost = async (context: { request: Request }) => {
  try {
    const body = await context.request.json().catch(() => ({})) as any;
    
    let targetUrl = body?.url;
    let fetchHeaders = body?.headers || {};
    let fetchBody = body?.body || body;
    let method = body?.method || "POST";

    if (!targetUrl && body?.settings?.apiUrl) {
      let cleanUrl = body.settings.apiUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = "https://" + cleanUrl;
      cleanUrl = cleanUrl.replace(/\/+$/, "");
      targetUrl = cleanUrl.endsWith("/chat/completions") ? cleanUrl : `${cleanUrl}/chat/completions`;
      fetchHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${body.settings.apiKey}`,
      };
      fetchBody = {
        model: body.settings.model || "gpt-3.5-turbo",
        messages: body.messages,
        temperature: body.temperature || 0.8,
      };
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing target URL or API settings" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const res = await fetch(targetUrl, {
      method,
      headers: fetchHeaders,
      body: JSON.stringify(fetchBody),
    });

    const responseText = await res.text();
    return new Response(responseText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const onRequest = async (context: { request: Request }) => {
  if (context.request.method === "OPTIONS") {
    return onRequestOptions();
  }
  if (context.request.method === "POST") {
    return onRequestPost(context);
  }
  return new Response(JSON.stringify({ error: "Method Not Allowed. Expected POST." }), {
    status: 405,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
