type PagesFunction = (context: any) => Promise<Response> | Response;

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = await context.request.json() as any;
    const { url, headers: clientHeaders, body: clientBody, settings } = body || {};

    let targetUrl = url;
    const apiKey = settings?.apiKey;
    const apiUrl = settings?.apiUrl;

    if (!targetUrl && apiUrl) {
      const clean = apiUrl.replace(/\/+$/, "");
      targetUrl = clean.endsWith('/chat/completions') ? clean : `${clean}/chat/completions`;
    }

    if (!targetUrl || !apiKey) {
      return new Response(JSON.stringify({ error: "请先在设置页配置 API 地址和 API Key" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(clientHeaders || {}),
    };
    if (apiKey && !reqHeaders["Authorization"]) {
      reqHeaders["Authorization"] = `Bearer ${apiKey}`;
    }

    const reqBody = clientBody || {
      model: settings?.model || "gpt-3.5-turbo",
      messages: body.messages || [],
      temperature: body.temperature ?? 0.8
    };

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify(reqBody)
    });

    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
};
