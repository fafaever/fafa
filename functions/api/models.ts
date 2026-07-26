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
    const { apiUrl, apiKey } = body || {};

    if (!apiUrl || !apiKey) {
      return new Response(JSON.stringify({ error: "Missing apiUrl or apiKey" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    let cleanApiUrl = apiUrl.trim();
    cleanApiUrl = cleanApiUrl.replace(/\/chat\/completions\/?$/, '')
                             .replace(/\/v1\/chat\/completions\/?$/, '')
                             .replace(/\/v1\/?$/, '');
    
    const targetUrl = cleanApiUrl.endsWith('/models') ? cleanApiUrl : `${cleanApiUrl}/models`;

    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        }
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
