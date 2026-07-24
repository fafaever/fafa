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
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  try {
    const reqJson = await context.request.json().catch(() => ({})) as any;

    if (pathname.startsWith("/api/")) {
      let targetUrl = reqJson?.url;
      let headers = reqJson?.headers || {};
      let body = reqJson?.body || reqJson;
      let method = reqJson?.method || "POST";

      if (!targetUrl && reqJson?.settings?.apiUrl) {
        let cleanUrl = reqJson.settings.apiUrl.trim();
        if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = "https://" + cleanUrl;
        cleanUrl = cleanUrl.replace(/\/+$/, "");
        targetUrl = cleanUrl.endsWith("/chat/completions") ? cleanUrl : `${cleanUrl}/chat/completions`;
        headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${reqJson.settings.apiKey}`,
        };
        body = {
          model: reqJson.settings.model || "gpt-3.5-turbo",
          messages: reqJson.messages,
          temperature: reqJson.temperature || 0.8,
        };
      }

      if (!targetUrl) {
        return new Response(JSON.stringify({ error: "Missing target url or settings" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const res = await fetch(targetUrl, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      const responseText = await res.text();
      return new Response(responseText, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("content-type") || "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(JSON.stringify({ error: `Unhandled API endpoint: ${pathname}` }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const onRequest = async (context: { request: Request }) => {
  if (context.request.method === "OPTIONS") {
    return onRequestOptions();
  }
  return onRequestPost(context);
};
