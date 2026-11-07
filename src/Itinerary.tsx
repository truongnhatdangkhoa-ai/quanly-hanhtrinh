import { useState } from "react";
import Icon from "./Icon";
import Modal from "./Modal";
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
                  <li key={s.id} className={"stop" + (s.done ? " done" : "")}>
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
                        <strong>{s.place}</strong>
                        {s.note && <span className="muted">{s.note}</span>}
                      </div>
                      <a
                        className="icon-btn map"
                        href={mapsUrl(s.place + " " + trip.destination)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={"Chỉ đường tới " + s.place}
                      >
                        <Icon name="navigate" size={18} />
                      </a>
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
          <button className="danger" onClick={onDelete} aria-label="Xóa điểm dừng">
            <Icon name="trash" size={19} /> Xóa
          </button>
        )}
        <button className="primary" disabled={!place.trim()} onClick={() => onSave({ ...stop, place: place.trim(), time, note: note.trim(), day })}>
          Lưu điểm dừng
        </button>
      </div>
    </Modal>
  );
}
