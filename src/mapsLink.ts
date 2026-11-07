import { CapacitorHttp } from "@capacitor/core";
import { extractUrl, isShortMapsLink, nameBeforeUrl, parseMapsPage, parseMapsUrl, parsePlainCoords, type LinkPoint } from "./mapsParse";

export type LinkResult = { kind: "none" } | { kind: "ok"; point: LinkPoint } | { kind: "fail" };

const looksLikeMaps = (url: string) => /(^|\.)(google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|share\.google)/i.test(url.replace(/^https?:\/\//i, ""));

const header = (h: Record<string, string> | undefined, k: string) => {
  if (!h) return "";
  const key = Object.keys(h).find((x) => x.toLowerCase() === k);
  return key ? h[key] : "";
};

// Link rút gọn (maps.app.goo.gl/...) phải đi theo chuyển hướng để ra địa chỉ đầy đủ. Dùng lớp mạng của Android nên không dính CORS.
async function follow(start: string): Promise<LinkPoint | null> {
  let url = start;
  for (let hop = 0; hop < 6; hop++) {
    const res = await CapacitorHttp.get({
      url,
      disableRedirects: true,
      responseType: "text",
      headers: { "Accept-Language": "vi,en;q=0.8" },
      connectTimeout: 10000,
      readTimeout: 10000,
    });
    const loc = header(res.headers, "location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).toString();
      const p = parseMapsUrl(url);
      if (p) return p;
      continue;
    }
    const fin = (res as { url?: string }).url;
    const p = (fin && parseMapsUrl(String(fin))) || null;
    if (p) return p;
    const body = typeof res.data === "string" ? res.data : "";
    const q = parseMapsPage(body);
    if (q) return q;
    return null;
  }
  return null;
}

/** Nhận chữ người dùng gõ/dán ở ô tìm. none = không phải link hay tọa độ (tìm bình thường), fail = là link nhưng không đọc được. */
export async function resolveMapsInput(text: string): Promise<LinkResult> {
  const plain = parsePlainCoords(text);
  if (plain) return { kind: "ok", point: plain };

  const url = extractUrl(text);
  if (!url || !looksLikeMaps(url)) return { kind: "none" };

  const shared = nameBeforeUrl(text);
  const direct = parseMapsUrl(url);
  if (direct) return { kind: "ok", point: { ...direct, name: direct.name || shared } };
  if (!isShortMapsLink(url) && !/google\./i.test(url)) return { kind: "fail" };
  try {
    const p = await follow(url);
    if (p) return { kind: "ok", point: { ...p, name: p.name || shared } };
  } catch {
    /* mất mạng hoặc bị chặn */
  }
  return { kind: "fail" };
}
