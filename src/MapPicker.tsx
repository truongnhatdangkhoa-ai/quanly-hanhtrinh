import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import * as L from "leaflet";
import Icon from "./Icon";
import { coordsText, reversePlace, searchPlaces, type LatLng, type Place } from "./geo";
import { createMap, pinIcon } from "./mapKit";

export type Picked = { name: string; lat: number; lng: number };

type Props = {
  initial?: LatLng; // vị trí đã ghim trước đó (nếu có)
  initialName?: string;
  destination?: string; // điểm đến của chuyến, dùng để mở bản đồ đúng vùng
  nearby?: LatLng[]; // các điểm dừng khác đã ghim, dùng để mở bản đồ đúng vùng
  confirmLabel?: string;
  onPick: (p: Picked) => void;
  onClose: () => void;
};

// Nút Back của Android đóng bản đồ thay vì thoát chuyến đi (App.tsx bỏ qua popstate có state.trip)
function useBackClose(onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pushed = useRef(false);
  const alive = useRef(false);
  const done = useRef(false);

  useEffect(() => {
    alive.current = true;
    if (!pushed.current) {
      pushed.current = true;
      history.pushState({ ...(history.state ?? {}), picker: true }, "");
    }
    const onPop = () => {
      if (done.current) return;
      done.current = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      alive.current = false;
      window.removeEventListener("popstate", onPop);
      // Hoãn một nhịp để không lùi nhầm khi React StrictMode chạy thử mount/unmount
      window.setTimeout(() => {
        if (!alive.current && !done.current) {
          done.current = true;
          history.back();
        }
      }, 0);
    };
  }, []);
}

export default function MapPicker({
  initial,
  initialName,
  destination,
  nearby = [],
  confirmLabel = "Chọn địa điểm này",
  onPick,
  onClose,
}: Props) {
  useBackClose(onClose);

  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const seq = useRef(0);
  const revTimer = useRef<number | undefined>(undefined);
  const touched = useRef(false);
  const setPointRef = useRef<(ll: LatLng, known?: { name: string; address: string }) => void>();

  const [pos, setPos] = useState<LatLng | null>(initial ?? null);
  const [info, setInfo] = useState<{ name: string; address: string } | null>(
    initial ? { name: initialName ?? "", address: "" } : null,
  );
  const [looking, setLooking] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState("");
  const [online, setOnline] = useState(navigator.onLine);

  // Chỉ dùng setter và ref bên trong nên bản mới nhất luôn đúng, kể cả khi được gọi từ sự kiện của bản đồ
  setPointRef.current = (ll, known) => {
    const map = mapRef.current;
    if (!map) return;
    touched.current = true;
    setPos(ll);
    setMsg("");
    setResults(null);
    if (!markerRef.current) {
      const m = L.marker([ll.lat, ll.lng], { draggable: true, icon: pinIcon({ cls: "pick" }), keyboard: false }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        setPointRef.current?.({ lat: p.lat, lng: p.lng });
      });
      markerRef.current = m;
    } else {
      markerRef.current.setLatLng([ll.lat, ll.lng]);
    }

    window.clearTimeout(revTimer.current);
    const my = ++seq.current;
    if (known) {
      setInfo(known);
      setLooking(false);
      return;
    }
    // Chờ một chút để chạm liên tiếp không bắn nhiều yêu cầu tìm tên
    setInfo(null);
    setLooking(true);
    revTimer.current = window.setTimeout(() => {
      reversePlace(ll)
        .then((p) => {
          if (my === seq.current) setInfo(p ? { name: p.name, address: p.address } : { name: "", address: "" });
        })
        .catch(() => {
          if (my === seq.current) setInfo({ name: "", address: "" });
        })
        .finally(() => {
          if (my === seq.current) setLooking(false);
        });
    }, 350);
  };

  useEffect(() => {
    if (!host.current) return;
    const map = createMap(host.current);
    mapRef.current = map;
    map.on("click", (e: L.LeafletMouseEvent) => setPointRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.on("dragstart", () => {
      touched.current = true;
    });

    if (initial) {
      map.setView([initial.lat, initial.lng], 16);
      setPointRef.current?.(initial, { name: initialName ?? "", address: "" });
    } else if (nearby.length > 0) {
      map.fitBounds(L.latLngBounds(nearby.map((p) => [p.lat, p.lng] as L.LatLngTuple)), { padding: [40, 40], maxZoom: 14 });
    } else if (destination?.trim()) {
      // Mở bản đồ ở vùng điểm đến của chuyến (nếu người dùng chưa kịp chạm vào bản đồ)
      searchPlaces(destination.trim())
        .then((r) => {
          if (!touched.current && r[0] && mapRef.current === map) map.setView([r[0].lat, r[0].lng], 12);
        })
        .catch(() => undefined);
    }

    return () => {
      window.clearTimeout(revTimer.current);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const doSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    (document.activeElement as HTMLElement | null)?.blur();
    setSearching(true);
    setMsg("");
    setResults(null);
    try {
      const b = mapRef.current?.getBounds();
      const r = await searchPlaces(
        q,
        b ? { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() } : undefined,
      );
      setResults(r);
    } catch {
      setMsg("Không tìm được địa điểm. Kiểm tra kết nối mạng rồi thử lại.");
    } finally {
      setSearching(false);
    }
  };

  const choose = (p: Place) => {
    mapRef.current?.setView([p.lat, p.lng], 17);
    setPointRef.current?.({ lat: p.lat, lng: p.lng }, { name: p.name, address: p.address });
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setMsg("Máy này không hỗ trợ định vị.");
      return;
    }
    setMsg("Đang lấy vị trí của bạn…");
    navigator.geolocation.getCurrentPosition(
      (g) => {
        setMsg("");
        const ll = { lat: g.coords.latitude, lng: g.coords.longitude };
        mapRef.current?.setView([ll.lat, ll.lng], 17);
        setPointRef.current?.(ll);
      },
      () => setMsg("Chưa lấy được vị trí. Hãy bật GPS và cho phép ứng dụng dùng vị trí."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const title = looking ? "Đang tìm tên địa điểm…" : info?.name?.trim() || "Điểm đã ghim";
  const sub = looking ? "" : info?.address || (pos ? coordsText(pos) : "");

  // Render ra body để không bị bottom sheet (có transform) làm lệch vị trí toàn màn hình
  return createPortal(
    <div className="picker" role="dialog" aria-modal="true" aria-label="Chọn địa điểm trên bản đồ">
      <form className="picker-bar" onSubmit={doSearch}>
        <button type="button" className="icon-btn on-dark" onClick={onClose} aria-label="Đóng bản đồ">
          <Icon name="back" size={22} />
        </button>
        <input
          className="picker-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm địa điểm, ví dụ: Hồ Xuân Hương"
          enterKeyHint="search"
          aria-label="Tìm địa điểm"
        />
        <button type="submit" className="icon-btn on-dark" disabled={searching || !query.trim()} aria-label="Tìm">
          <Icon name="search" size={20} />
        </button>
      </form>

      <div className="picker-map">
        <div ref={host} className="map-canvas" />
        {!online && <div className="map-note">Đang offline: cần có mạng để tải bản đồ và tìm địa điểm.</div>}
        {searching && <div className="map-note info">Đang tìm…</div>}
        {results && (
          <ul className="picker-results">
            {results.length === 0 ? (
              <li className="picker-empty">Không tìm thấy. Thử tên khác hoặc chạm thẳng vào bản đồ.</li>
            ) : (
              results.map((p, i) => (
                <li key={i}>
                  <button type="button" onClick={() => choose(p)}>
                    <strong>{p.name || "Địa điểm"}</strong>
                    {p.address && <span>{p.address}</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        <button type="button" className="map-fab" onClick={locate} aria-label="Vị trí của tôi">
          <Icon name="locate" size={22} />
        </button>
      </div>

      <div className="picker-card">
        {msg && <p className="picker-msg">{msg}</p>}
        {pos ? (
          <div className="picker-place">
            <span className="ico" aria-hidden="true">
              <Icon name="pin" size={20} />
            </span>
            <div className="grow">
              <strong className="ellipsis">{title}</strong>
              {sub && <span className="muted picker-sub">{sub}</span>}
              <span className="picker-tip">Kéo ghim hoặc chạm chỗ khác để chỉnh lại</span>
            </div>
          </div>
        ) : (
          <p className="picker-hint">Chạm vào bản đồ để ghim địa điểm, hoặc gõ tên ở phía trên rồi bấm tìm.</p>
        )}
        <button
          type="button"
          className="primary"
          disabled={!pos || looking}
          onClick={() => pos && onPick({ name: info?.name?.trim() ?? "", lat: pos.lat, lng: pos.lng })}
        >
          <Icon name="check" size={20} stroke={2.4} /> {confirmLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
