import * as L from "leaflet";

// Lưu ô bản đồ và đường đi vào IndexedDB để dùng khi mất sóng.
// - Ô bản đồ nào đã xem một lần sẽ được giữ lại (tối đa MAX_TILES ô, ô cũ nhất bị xóa trước).
// - Đường đi thật (OSRM) của từng ngày được giữ lại để lần sau offline vẫn xem được quãng đường.
// Ô tải qua <img crossOrigin> rồi vẽ vào canvas để lấy ảnh, không dùng fetch (fetch bị CapacitorHttp can thiệp).

// Nguồn ô bản đồ. prefix là tiền tố khóa trong IndexedDB (osm để trống để giữ các ô đã lưu từ bản cũ).
export type TileSrc = { id: "osm" | "sat" | "lbl"; url: string; prefix: string; maxNative: number; attribution: string };
export const SRC_OSM: TileSrc = {
  id: "osm",
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  prefix: "",
  maxNative: 19,
  attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
};
// Ảnh vệ tinh Esri World Imagery (không cần khóa API) và lớp tên địa danh trong suốt phủ lên trên. Lưu ý thứ tự {z}/{y}/{x}
export const SRC_SAT: TileSrc = {
  id: "sat",
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  prefix: "sat:",
  maxNative: 18,
  attribution: "Ảnh vệ tinh © Esri, Maxar, Earthstar Geographics",
};
export const SRC_LABELS: TileSrc = {
  id: "lbl",
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  prefix: "lbl:",
  maxNative: 18,
  attribution: "",
};
export type LayerId = "sat" | "osm";
/** Các nguồn ô cần để vẽ một lớp (vệ tinh = ảnh + tên địa danh) */
export const layerSources = (l: LayerId): TileSrc[] => (l === "sat" ? [SRC_SAT, SRC_LABELS] : [SRC_OSM]);
const DB = "hanh-trinh-offline";
const TILES = "tiles";
const ROUTES = "routes";
const MAX_TILES = 5000;
const MAX_ROUTES = 60;

let dbp: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  if (!dbp) {
    dbp = new Promise((resolve) => {
      try {
        if (typeof indexedDB === "undefined") return resolve(null);
        const rq = indexedDB.open(DB, 1);
        rq.onupgradeneeded = () => {
          const d = rq.result;
          d.createObjectStore(TILES).createIndex("t", "t");
          d.createObjectStore(ROUTES).createIndex("t", "t");
        };
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => resolve(null);
        rq.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbp;
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const d = await db();
  if (!d) return undefined;
  return new Promise((resolve) => {
    try {
      const rq = fn(d.transaction(store, mode).objectStore(store));
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

// Xóa các mục cũ nhất khi vượt giới hạn
async function evict(store: string, max: number, slack: number) {
  const n = (await run(store, "readonly", (s) => s.count())) ?? 0;
  if (n <= max) return;
  let drop = n - max + slack;
  const d = await db();
  if (!d) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = d.transaction(store, "readwrite");
      const cur = tx.objectStore(store).index("t").openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (c && drop-- > 0) {
          c.delete();
          c.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/* ───────────── Ô bản đồ ───────────── */

type Tile = { z: number; x: number; y: number };
const tileKey = (t: Tile) => `${t.z}/${t.x}/${t.y}`;
const tileUrl = (t: Tile, src: TileSrc) => src.url.replace("{z}", String(t.z)).replace("{x}", String(t.x)).replace("{y}", String(t.y));

async function getTile(key: string): Promise<Blob | null> {
  const r = (await run(TILES, "readonly", (s) => s.get(key))) as { b?: Blob } | undefined;
  return r?.b instanceof Blob ? r.b : null;
}

let puts = 0;
async function putTile(key: string, b: Blob) {
  await run(TILES, "readwrite", (s) => s.put({ b, t: Date.now() }, key));
  if (++puts % 50 === 0) void evict(TILES, MAX_TILES, 200);
}

const hasTile = async (key: string) => ((await run(TILES, "readonly", (s) => s.count(key))) ?? 0) > 0;

function saveFromImg(key: string, img: HTMLImageElement) {
  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || 256;
    c.height = img.naturalHeight || 256;
    c.getContext("2d")?.drawImage(img, 0, 0);
    c.toBlob((b) => b && void putTile(key, b), "image/png");
  } catch {
    /* canvas bị chặn: chỉ không lưu được ô này */
  }
}

// Lớp ô bản đồ: có trong máy thì dùng ngay, chưa có thì tải từ mạng rồi lưu lại
export class CachedTileLayer extends L.TileLayer {
  private src: TileSrc;
  constructor(src: TileSrc, options: L.TileLayerOptions = {}) {
    super(src.url, { maxZoom: 19, maxNativeZoom: src.maxNative, attribution: src.attribution, ...options });
    this.src = src;
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement("img");
    tile.alt = "";
    tile.setAttribute("role", "presentation");
    const t: Tile = { z: coords.z, x: coords.x, y: coords.y };
    const key = this.src.prefix + tileKey(t);
    const url = this.getTileUrl(coords);
    let finished = false;
    const finish = (err?: Error) => {
      if (finished) return;
      finished = true;
      done(err, tile);
    };

    const fromNet = () => {
      tile.crossOrigin = "anonymous";
      tile.onload = () => {
        finish();
        saveFromImg(key, tile);
      };
      tile.onerror = () => {
        // Máy chủ không cho đọc ảnh kiểu CORS: vẫn hiện ô bình thường, chỉ không lưu được
        tile.removeAttribute("crossorigin");
        tile.onload = () => finish();
        tile.onerror = () => finish(new Error("tile"));
        tile.src = url;
      };
      tile.src = url;
    };

    void getTile(key).then((blob) => {
      if (!blob) return fromNet();
      const u = URL.createObjectURL(blob);
      tile.onload = () => {
        URL.revokeObjectURL(u);
        finish();
      };
      tile.onerror = () => {
        URL.revokeObjectURL(u);
        fromNet();
      };
      tile.src = u;
    });
    return tile;
  }
}

const lng2x = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
const lat2y = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

export const MAX_PREFETCH = 400; // mỗi lần bấm "Lưu bản đồ" chỉ tải tối đa ngần này ô mỗi lớp (nguồn miễn phí chỉ cho dùng ít)

/** Danh sách ô phủ vùng bounds, từ mức zoom z0 đi sâu dần (tối đa z0+2, không quá 17) cho đến khi chạm giới hạn MAX_PREFETCH. */
export function planTiles(b: L.LatLngBounds, z0: number): Tile[] {
  const out: Tile[] = [];
  const zs = [Math.max(3, z0 - 2), Math.max(3, z0 - 1), z0, z0 + 1, z0 + 2].filter((z, i, a) => z <= 17 && a.indexOf(z) === i);
  for (const z of zs) {
    const x1 = lng2x(b.getWest(), z);
    const x2 = lng2x(b.getEast(), z);
    const y1 = lat2y(b.getNorth(), z);
    const y2 = lat2y(b.getSouth(), z);
    const n: Tile[] = [];
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) n.push({ z, x, y });
    }
    if (out.length + n.length > MAX_PREFETCH) {
      if (z >= z0) break; // mức zoom đang xem trở đi: dừng khi vượt giới hạn
      continue;
    }
    out.push(...n);
  }
  return out;
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("tile"));
    img.src = url;
  });
}

/** Tải sẵn các ô (bỏ qua ô đã có), 3 luồng song song. Trả về số ô tải thêm được / lỗi. */
export async function prefetchTiles(
  tiles: Tile[],
  srcs: TileSrc[],
  onProgress: (done: number, total: number) => void,
  stop: { cancelled: boolean },
): Promise<{ saved: number; had: number; failed: number }> {
  // Mỗi ô x mỗi nguồn là một lượt tải (vệ tinh = ảnh + tên địa danh)
  const jobs = tiles.flatMap((t) => srcs.map((src) => ({ t, src })));
  let i = 0;
  let done = 0;
  const r = { saved: 0, had: 0, failed: 0 };
  const worker = async () => {
    while (i < jobs.length && !stop.cancelled) {
      const { t, src } = jobs[i++];
      const key = src.prefix + tileKey(t);
      try {
        if (await hasTile(key)) r.had++;
        else {
          saveFromImg(key, await loadImg(tileUrl(t, src)));
          r.saved++;
        }
      } catch {
        r.failed++;
      }
      onProgress(++done, jobs.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  void evict(TILES, MAX_TILES, 200);
  return r;
}

/* ───────────── Đường đi ───────────── */

export async function getRouteCache<T>(key: string): Promise<T | null> {
  const r = (await run(ROUTES, "readonly", (s) => s.get(key))) as { r?: T } | undefined;
  return r?.r ?? null;
}

export async function putRouteCache(key: string, r: unknown) {
  await run(ROUTES, "readwrite", (s) => s.put({ r, t: Date.now() }, key));
  void evict(ROUTES, MAX_ROUTES, 10);
}
