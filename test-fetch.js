fetch("http://localhost:3000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "hello" }],
    character: { name: "test", description: "test", systemInstruction: "test" },
    chatMode: "online",
    replyCount: 1,
    mood: "平静"
  })
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
}).catch(e => {
  console.error("Error:", e);
});
