type PagesFunction = (context: any) => Promise<Response> | Response;

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  });
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = await context.request.json().catch(() => ({}));
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
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
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

    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(reqBody)
      });
    } catch (fetchErr: any) {
      return new Response(JSON.stringify({ 
        error: `后端转发 Fetch 异常: ${fetchErr?.message || String(fetchErr)}`,
        targetUrl 
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const responseText = await res.text();
    
    if (!res.ok) {
      return new Response(JSON.stringify({ 
        error: `中转站返回 HTTP ${res.status}`, 
        details: responseText,
        targetUrl
      }), {
        status: res.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(responseText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ 
      error: `Cloudflare Function 内部错误: ${err?.message || String(err)}` 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
};
