export async function requestBrowserTranslation(text: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("translation request failed");
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
    return data[0]
      .map((part: unknown[]) => String(part?.[0] || ""))
      .join("")
      .trim();
  } finally {
    globalThis.clearTimeout(timer);
  }
}
