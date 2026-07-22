export async function callOpenAI(apiUrl: string, apiKey: string, model: string, messages: any[], temperature = 0.8) {
  if (!apiUrl || !apiKey) {
    throw new Error("请先在设置页配置 API 地址和 API Key");
  }

  const endpoint = `${apiUrl.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-3.5-turbo",
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    let errText = "";
    try {
      errText = await response.text();
    } catch (e) {}
    throw new Error(`API 调用失败: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
