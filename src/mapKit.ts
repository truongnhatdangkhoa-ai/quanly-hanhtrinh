import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

// Bản đồ nền OpenStreetMap (miễn phí). Cần có mạng để tải ô bản đồ; dữ liệu chuyến đi vẫn dùng offline như cũ.
export const VN_CENTER: L.LatLngTuple = [16.05, 106.3];

export function createMap(el: HTMLElement): L.Map {
  const map = L.map(el, { zoomControl: false, center: VN_CENTER, zoom: 5, worldCopyJump: true });
  L.control.zoom({ position: "bottomright", zoomInTitle: "Phóng to", zoomOutTitle: "Thu nhỏ" }).addTo(map);
  map.attributionControl.setPrefix(false);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  }).addTo(map);

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
