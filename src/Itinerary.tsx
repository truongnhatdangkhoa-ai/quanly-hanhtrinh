import { useState } from "react";
import Icon from "./Icon";
import MapPicker from "./MapPicker";
import Modal from "./Modal";
import { coordsText, directionsUrl, hasPin } from "./geo";
import NotifyHint from "./Reminder";
import { REMIND_OPTIONS } from "./notify";
import { applyOrder } from "./route";
import { useDragSort } from "./useDragSort";
import type { Stop, Trip } from "./types";
import { addDays, fmtDate, mapsUrl, tripDayCount, uid, weekdayName } from "./utils";

type Props = {
  trip: Trip;
  stops: Stop[];
  onChange: (next: Stop[]) => void; // danh sách điểm dừng của chuyến này
};

export default function Itinerary({ trip, stops, onChange }: Props) {
  const [editing, setEditing] = useState<Stop | null>(null);
  const days = tripDayCount(trip.startDate, trip.endDate);

  const save = (s: Stop) => {
    const exists = stops.some((x) => x.id === s.id);
    onChange(exists ? stops.map((x) => (x.id === s.id ? s : x)) : [...stops, s]);
    setEditing(null);
  };
  const sortedOf = (day: number) =>
    stops.filter((s) => s.day === day).sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  // Đổi thứ tự trong một ngày: các khung giờ cũ được gán lại theo thứ tự mới (giống "Sắp xếp tuyến")
  const reorder = (day: number, ids: string[]) => {
    const cur = sortedOf(day);
    const byId = new Map(cur.map((s) => [s.id, s]));
    const next = ids.map((id) => byId.get(id)).filter((s): s is Stop => !!s);
    if (next.length !== cur.length) return;
    onChange(applyOrder(stops, next, cur.map((s) => s.time)));
  };
  const { drag, register, start } = useDragSort(reorder);
  const move = (day: number, id: string, dir: -1 | 1) => {
    const ids = sortedOf(day).map((s) => s.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder(day, ids);
  };

  const toggle = (id: string) =>
    onChange(stops.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  const remove = (id: string) => {
    onChange(stops.filter((s) => s.id !== id));
    setEditing(null);
  };

  return (
    <div>
      {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
        const base = sortedOf(day);
        // Đang kéo trong ngày này thì hiện theo thứ tự tạm thời của lần kéo
        const list: Stop[] =
          drag && drag.day === day
            ? drag.order.map((id) => base.find((s) => s.id === id)).filter((s): s is Stop => !!s)
            : base;
        const doneCount = list.filter((s) => s.done).length;
        const date = addDays(trip.startDate, day - 1);
        return (
          <section key={day} className="day">
            <div className="day-head">
              <span className="day-badge" aria-hidden="true">
                <small>Ngày</small>
                {day}
              </span>
              <div className="grow">
                <h3>{weekdayName(date)}</h3>
                <span className="muted">
                  {fmtDate(date)}
                  {list.length > 0 && ` · ${doneCount}/${list.length} điểm đã đến`}
                </span>
              </div>
              <button
                className="pill-btn"
                onClick={() =>
                  setEditing({ id: uid(), tripId: trip.id, day, time: "", place: "", note: "", done: false })
                }
              >
                <Icon name="plus" size={16} stroke={2.4} /> Thêm
              </button>
            </div>

            {list.length === 0 ? (
              <button
                className="day-empty"
                onClick={() =>
                  setEditing({ id: uid(), tripId: trip.id, day, time: "", place: "", note: "", done: false })
                }
              >
                <Icon name="pin" size={18} /> Chưa có điểm dừng. Chạm để thêm điểm đầu tiên
              </button>
            ) : (
              <ol className="timeline">
                {list.map((s) => (
                  <li key={s.id} ref={register(s.id)} className={"stop" + (s.done ? " done" : "") + (drag?.id === s.id ? " dragging" : "")}>
                    <div className="stop-time">{s.time || "--:--"}</div>
                    <div className="rail" aria-hidden="true">
                      <span className="dot" />
                    </div>
                    <div className="stop-card">
                      <input
                        type="checkbox"
                        checked={s.done}
                        onChange={() => toggle(s.id)}
                        aria-label={"Đã đến " + s.place}
                      />
                      <div
                        className="stop-body"
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditing(s)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setEditing(s)}
                      >
                        <strong>
                          {hasPin(s) && (
                            <span className="pinned" title="Đã ghim trên bản đồ">
                              <Icon name="pin" size={14} />
                            </span>
                          )}
                          {s.place}
                        </strong>
                        {s.note && <span className="muted">{s.note}</span>}
                      </div>
                      <a
                        className="icon-btn map"
                        href={hasPin(s) ? directionsUrl(s) : mapsUrl(s.place + " " + trip.destination)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={"Chỉ đường tới " + s.place}
                      >
                        <Icon name="navigate" size={18} />
                      </a>
                      {list.length > 1 && (
                        <button
                          type="button"
                          className="grip"
                          aria-label={"Kéo để đổi thứ tự " + s.place + ". Dùng phím mũi tên lên xuống để di chuyển"}
                          title="Kéo để đổi thứ tự"
                          onPointerDown={(e) => start(e, s.id, day, base.map((x) => x.id))}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                              e.preventDefault();
                              move(day, s.id, e.key === "ArrowUp" ? -1 : 1);
                            }
                          }}
                        >
                          <Icon name="grip" size={20} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}

      {editing && (
        <StopForm
          stop={editing}
          isNew={!stops.some((x) => x.id === editing.id)}
          days={days}
          destination={trip.destination}
          nearby={stops.filter(hasPin)}
          onSave={save}
          onDelete={() => remove(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function StopForm({
  stop,
  isNew,
  days,
  destination,
  nearby,
  onSave,
  onDelete,
  onClose,
}: {
  stop: Stop;
  isNew: boolean;
  days: number;
  destination: string;
  nearby: { lat: number; lng: number }[];
  onSave: (s: Stop) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [place, setPlace] = useState(stop.place);
  const [time, setTime] = useState(stop.time);
  const [note, setNote] = useState(stop.note);
  const [day, setDay] = useState(stop.day);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(hasPin(stop) ? { lat: stop.lat, lng: stop.lng } : null);
  const [autoName, setAutoName] = useState(""); // tên do bản đồ điền, để biết có được thay khi chọn lại không
  const [picking, setPicking] = useState(false);
  const [remind, setRemind] = useState<string>(stop.remind === undefined ? "" : String(stop.remind));

  return (
    <Modal title={isNew ? "Điểm dừng mới" : "Sửa điểm dừng"} onClose={onClose}>
      <button type="button" className="map-pick" onClick={() => setPicking(true)}>
        <span className="map-pick-ico" aria-hidden="true">
          <Icon name="map" size={22} />
        </span>
        <span className="map-pick-text">
          <strong>{pin ? "Đổi vị trí trên bản đồ" : "Chọn trên bản đồ"}</strong>
          <span>{pin ? "Đã ghim · " + coordsText(pin) : "Tìm tên hoặc chạm vào bản đồ để ghim"}</span>
        </span>
        <Icon name="chevron" size={20} />
      </button>
      <label>
        Tên địa điểm
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Hồ Xuân Hương" />
      </label>
      <div className="chip-row quick">
        {["Check-in khách sạn", "Check-out khách sạn"].map((t) => (
          <button key={t} type="button" className="chip soft" onClick={() => setPlace(t)}>
            {t}
          </button>
        ))}
      </div>
      {pin && (
        <button type="button" className="unpin" onClick={() => setPin(null)}>
          <Icon name="close" size={14} stroke={2.4} /> Bỏ ghim trên bản đồ
        </button>
      )}
      <div className="row">
        <label>
          Giờ
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label>
          Ngày
          <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Ngày {d}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Nhắc nhở
        <select value={time ? remind : ""} disabled={!time} onChange={(e) => setRemind(e.target.value)}>
          <option value="">Không nhắc</option>
          {REMIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {!time && <p className="hint">Đặt giờ cho điểm dừng để bật nhắc nhở.</p>}
      <NotifyHint active={!!time && remind !== ""} />
      <label>
        Ghi chú
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Đặt bàn trước, mang áo ấm..." />
      </label>
      <div className="actions">
        {!isNew && (
          <button className="danger" onClick={onDelete} aria-label="Xóa điểm dừng">
            <Icon name="trash" size={19} /> Xóa
          </button>
        )}
        <button className="primary" disabled={!place.trim()} onClick={() =>
            onSave({ ...stop, place: place.trim(), time, note: note.trim(), day, lat: pin?.lat, lng: pin?.lng, remind: time && remind !== "" ? Number(remind) : undefined })
          }>
          Lưu điểm dừng
        </button>
      </div>
      {picking && (
        <MapPicker
          initial={pin ?? undefined}
          initialName={place.trim()}
          destination={destination}
          nearby={nearby}
          onClose={() => setPicking(false)}
          onPick={(p) => {
            setPin({ lat: p.lat, lng: p.lng });
            const name = p.name || "Điểm đã ghim";
            // Điền tên từ bản đồ nếu ô tên đang trống hoặc vẫn là tên tự điền lần trước; tên người dùng tự gõ thì giữ nguyên
            if (!place.trim() || place === autoName) {
              setPlace(name);
              setAutoName(name);
            }
            setPicking(false);
          }}
        />
      )}
    </Modal>
  );
}
