import { useState } from "react";
import Icon from "./Icon";
import Modal from "./Modal";
import MoneyInput from "./MoneyInput";
import type { Trip } from "./types";
import { addDays, todayStr, uid } from "./utils";

export default function TripForm({
  trip,
  onSave,
  onDelete,
  onClose,
}: {
  trip?: Trip;
  onSave: (t: Trip) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(trip?.name ?? "");
  const [destination, setDestination] = useState(trip?.destination ?? "");
  const [startDate, setStart] = useState(trip?.startDate ?? todayStr());
  const [endDate, setEnd] = useState(trip?.endDate ?? addDays(todayStr(), 2));
  const [budget, setBudget] = useState(trip ? String(trip.budget || "") : "");

  const valid = name.trim() && startDate && endDate && endDate >= startDate;

  return (
    <Modal title={trip ? "Sửa chuyến đi" : "Chuyến đi mới"} onClose={onClose}>
      <label>
        Tên chuyến đi
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hè 2027 cả nhà" />
      </label>
      <label>
        Điểm đến
        <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Đà Lạt" />
      </label>
      <div className="row">
        <label>
          Ngày đi
          <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          Ngày về
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <label>
        Ngân sách dự kiến (VNĐ)
        <MoneyInput value={budget} onChange={setBudget} placeholder="10.000.000" />
      </label>
      {!valid && <p className="hint">Nhập tên chuyến đi, ngày về không được trước ngày đi.</p>}
      <div className="actions">
        {onDelete && (
          <button className="danger" aria-label="Xóa chuyến đi" onClick={() => confirm("Xóa chuyến đi và toàn bộ dữ liệu của nó?") && onDelete()}>
            <Icon name="trash" size={19} /> Xóa
          </button>
        )}
        <button
          className="primary"
          disabled={!valid}
          onClick={() =>
            onSave({
              id: trip?.id ?? uid(),
              name: name.trim(),
              destination: destination.trim(),
              startDate,
              endDate,
              budget: Number(budget) || 0,
            })
          }
        >
          Lưu chuyến đi
        </button>
      </div>
    </Modal>
  );
}
