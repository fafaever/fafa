export function safeJsonParse<T>(input: string | null | undefined, fallback: T): T {
  if (!input) return fallback;
  if (input === "[object Object]") return fallback;
  try {
    const parsed = JSON.parse(input);
    return parsed !== undefined && parsed !== null ? parsed : fallback;
  } catch (e) {
    console.warn("[safeJsonParse] Failed to parse JSON, returning fallback:", e);
    return fallback;
  }
}

export function sanitizeLocalStorage() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key);
        if (val === "[object Object]" || val === "undefined") {
          console.warn(`[Sanitize] Removing invalid localStorage key: ${key}`);
          localStorage.removeItem(key);
        }
      }
    }
  } catch (e) {
    console.error("Error sanitizing localStorage:", e);
  }
}
