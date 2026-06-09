export function withBasePath(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${base}${normalized}`;
}

export function normalizeAudioUrl(url?: string): string {
  if (!url) return "";
  const clean = url.replace(/^output\/audio\//, "/audio/");
  return withBasePath(clean);
}
