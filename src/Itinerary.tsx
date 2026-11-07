import { useState } from "react";
import Modal from "./Modal";
import type { Stop, Trip } from "./types";
import { addDays, fmtDate, mapsUrl, tripDayCount, uid } from "./utils";

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
  const toggle = (id: string) =>
    onChange(stops.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  const remove = (id: string) => {
    onChange(stops.filter((s) => s.id !== id));
    setEditing(null);
  };

  return (
    <div>
      {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
        const list = stops
          .filter((s) => s.day === day)
          .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
        return (
          <section key={day} className="day">
            <div className="day-head">
              <div>
                <h3>Ngày {day}</h3>
                <span className="muted">{fmtDate(addDays(trip.startDate, day - 1))}</span>
              </div>
              <button
                className="small"
                onClick={() =>
                  setEditing({ id: uid(), tripId: trip.id, day, time: "", place: "", note: "", done: false })
                }
              >
                + Thêm điểm
              </button>
            </div>
            {list.length === 0 && <p className="empty">Chưa có điểm dừng nào cho ngày này.</p>}
            {list.map((s) => (
              <div key={s.id} className={"stop" + (s.done ? " done" : "")}>
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={() => toggle(s.id)}
                  aria-label={"Đã đến " + s.place}
                />
                <div className="stop-body" onClick={() => setEditing(s)}>
                  <div className="stop-time">{s.time || "--:--"}</div>
                  <div>
                    <strong>{s.place}</strong>
                    {s.note && <div className="muted">{s.note}</div>}
                  </div>
                </div>
                <a className="map" href={mapsUrl(s.place + " " + trip.destination)} target="_blank" rel="noreferrer">
                  Bản đồ
                </a>
              </div>
            ))}
          </section>
        );
      })}

      {editing && (
        <StopForm
          stop={editing}
          isNew={!stops.some((x) => x.id === editing.id)}
          days={days}
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
  onSave,
  onDelete,
  onClose,
}: {
  stop: Stop;
  isNew: boolean;
  days: number;
  onSave: (s: Stop) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [place, setPlace] = useState(stop.place);
  const [time, setTime] = useState(stop.time);
  const [note, setNote] = useState(stop.note);
  const [day, setDay] = useState(stop.day);

  return (
    <Modal title={isNew ? "Điểm dừng mới" : "Sửa điểm dừng"} onClose={onClose}>
      <label>
        Địa điểm
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Hồ Xuân Hương" />
      </label>
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
        Ghi chú
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Đặt bàn trước, mang áo ấm..." />
      </label>
      <div className="actions">
        {!isNew && (
          <button className="danger" onClick={onDelete}>
            Xóa điểm dừng
          </button>
        )}
        <button className="primary" disabled={!place.trim()} onClick={() => onSave({ ...stop, place: place.trim(), time, note: note.trim(), day })}>
          Lưu điểm dừng
        </button>
      </div>
    </Modal>
  );
}
