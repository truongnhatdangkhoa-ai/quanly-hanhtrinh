import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CachedTileLayer, SRC_LABELS, SRC_OSM, SRC_SAT, type LayerId } from "./offlineMap";

// Bản đồ nền: ảnh vệ tinh (mặc định) hoặc bản đồ đường OpenStreetMap, đổi bằng nút góc trái trên. Cần mạng để tải ô lần đầu;
// ô đã xem hoặc đã bấm "Lưu bản đồ offline" dùng được khi mất sóng. Dữ liệu chuyến đi vẫn dùng offline như cũ.
const LAYER_KEY = "hanh-trinh-maplayer";
let currentLayer: LayerId = (() => {
  try {
    return localStorage.getItem(LAYER_KEY) === "osm" ? "osm" : "sat";
  } catch {
    return "sat";
  }
})();
/** Lớp bản đồ người dùng đang chọn (để "Lưu bản đồ offline" tải đúng lớp đang xem) */
export const activeLayer = (): LayerId => currentLayer;

export const VN_CENTER: L.LatLngTuple = [16.05, 106.3];

export function createMap(el: HTMLElement): L.Map {
  const map = L.map(el, { zoomControl: false, center: VN_CENTER, zoom: 5, worldCopyJump: true });
  L.control.zoom({ position: "bottomright", zoomInTitle: "Phóng to", zoomOutTitle: "Thu nhỏ" }).addTo(map);
  map.attributionControl.setPrefix(false);
  // Ô bản đồ xem một lần được lưu vào máy (IndexedDB) nên lần sau mất sóng vẫn hiện được
  const sat = L.layerGroup([new CachedTileLayer(SRC_SAT), new CachedTileLayer(SRC_LABELS, { zIndex: 5 })]);
  const osm = new CachedTileLayer(SRC_OSM);
  const el0 = map.getContainer();
  const apply = (l: LayerId) => {
    currentLayer = l;
    try {
      localStorage.setItem(LAYER_KEY, l);
    } catch {
      /* không lưu được lựa chọn: lần sau về mặc định */
    }
    map.removeLayer(l === "sat" ? osm : sat);
    map.addLayer(l === "sat" ? sat : osm);
    el0.classList.toggle("is-sat", l === "sat");
  };
  apply(currentLayer);

  // Nút đổi lớp: Vệ tinh <-> Bản đồ đường
  const Switch = L.Control.extend({
    onAdd() {
      const b = L.DomUtil.create("button", "map-layer-btn") as HTMLButtonElement;
      b.type = "button";
      const paint = () => {
        b.textContent = currentLayer === "sat" ? "Vệ tinh" : "Bản đồ đường";
        b.setAttribute("aria-label", currentLayer === "sat" ? "Đang xem vệ tinh, chạm để xem bản đồ đường" : "Đang xem bản đồ đường, chạm để xem vệ tinh");
      };
      paint();
      L.DomEvent.disableClickPropagation(b);
      L.DomEvent.on(b, "click", () => {
        apply(currentLayer === "sat" ? "osm" : "sat");
        paint();
      });
      return b;
    },
  });
  new Switch({ position: "topleft" }).addTo(map);

  // Không tải được ô nào: báo rõ thay vì để màn hình trắng
  const warn = document.createElement("div");
  warn.className = "map-tilewarn";
  warn.textContent = "Không tải được bản đồ. Kiểm tra kết nối mạng, hoặc thử đổi lớp ở nút góc trên trái.";
  warn.hidden = true;
  el0.appendChild(warn);
  let bad = 0;
  const onErr = () => {
    if (++bad >= 4) warn.hidden = false;
  };
  const onOk = () => {
    bad = 0;
    warn.hidden = true;
  };
  for (const l of [...sat.getLayers(), osm] as L.TileLayer[]) {
    l.on("tileerror", onErr);
    l.on("tileload", onOk);
  }

  // Khung chứa đổi kích thước (bàn phím, thẻ thông tin...) thì bản đồ tự tính lại mà không nhảy vị trí
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    ro.observe(el);
    map.on("unload", () => ro.disconnect());
  }
  window.setTimeout(() => map.invalidateSize({ pan: false }), 60);
  return map;
}

// Ghim hình giọt nước vẽ bằng CSS (không dùng ảnh nên chạy offline và theo màu giao diện). label chỉ là số thứ tự.
export function pinIcon(opts: { label?: string; cls?: string } = {}): L.DivIcon {
  return L.divIcon({
    className: "pin-wrap",
    html: `<span class="pin ${opts.cls ?? ""}"><span class="pin-head">${opts.label ?? ""}</span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 38],
    popupAnchor: [0, -34],
  });
}
