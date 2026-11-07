import { useState } from "react";
import Modal from "./Modal";
import { CATEGORIES, type Expense, type Trip } from "./types";
import { fmtDate, money, todayStr, uid } from "./utils";

type Props = {
  trip: Trip;
  expenses: Expense[];
  onChange: (next: Expense[]) => void;
};

const catOf = (key: string) => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

export default function Expenses({ trip, expenses, onChange }: Props) {
  const [editing, setEditing] = useState<Expense | null>(null);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const pct = trip.budget > 0 ? Math.min(100, (total / trip.budget) * 100) : 0;
  const over = trip.budget > 0 && total > trip.budget;

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const save = (e: Expense) => {
    const exists = expenses.some((x) => x.id === e.id);
    onChange(exists ? expenses.map((x) => (x.id === e.id ? e : x)) : [...expenses, e]);
    setEditing(null);
  };

  return (
    <div>
      <div className="budget">
        <div className="budget-top">
          <span className="muted">Đã chi</span>
          <strong className={over ? "bad" : ""}>{money(total)}</strong>
        </div>
        {trip.budget > 0 ? (
          <>
            <div className="bar">
              <div className={"fill" + (over ? " over" : "")} style={{ width: pct + "%" }} />
            </div>
            <div className="budget-top">
              <span className="muted">Ngân sách {money(trip.budget)}</span>
              <span className={over ? "bad" : "muted"}>
                {over ? "Vượt " + money(total - trip.budget) : "Còn " + money(trip.budget - total)}
              </span>
            </div>
          </>
        ) : (
          <p className="hint">Chưa đặt ngân sách. Bấm biểu tượng sửa ở đầu trang để thêm.</p>
        )}
      </div>

      <button
        className="primary wide"
        onClick={() =>
          setEditing({
            id: uid(),
            tripId: trip.id,
            date: todayStr() < trip.startDate ? trip.startDate : todayStr() > trip.endDate ? trip.endDate : todayStr(),
            category: "an",
            amount: 0,
            note: "",
          })
        }
      >
        + Ghi khoản chi
      </button>

      {sorted.length === 0 && <p className="empty">Chưa có khoản chi nào. Ghi khoản đầu tiên bằng nút phía trên.</p>}
      {sorted.map((e) => {
        const c = catOf(e.category);
        return (
          <div key={e.id} className="expense" onClick={() => setEditing(e)}>
            <span className="ico">{c.icon}</span>
            <div className="grow">
              <strong>{c.label}</strong>
              <div className="muted">
                {fmtDate(e.date)}
                {e.note ? " · " + e.note : ""}
              </div>
            </div>
            <strong>{money(e.amount)}</strong>
          </div>
        );
      })}

      {editing && (
        <ExpenseForm
          exp={editing}
          isNew={!expenses.some((x) => x.id === editing.id)}
          onSave={save}
          onDelete={() => {
            onChange(expenses.filter((x) => x.id !== editing.id));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ExpenseForm({
  exp,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  exp: Expense;
  isNew: boolean;
  onSave: (e: Expense) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(exp.amount ? String(exp.amount) : "");
  const [category, setCategory] = useState(exp.category);
  const [date, setDate] = useState(exp.date);
  const [note, setNote] = useState(exp.note);

  return (
    <Modal title={isNew ? "Khoản chi mới" : "Sửa khoản chi"} onClose={onClose}>
      <label>
        Số tiền (₫)
        <input inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="350000" />
      </label>
      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c.key} className={"chip" + (category === c.key ? " on" : "")} onClick={() => setCategory(c.key)}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div className="row">
        <label>
          Ngày chi
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Ghi chú
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Taxi sân bay" />
        </label>
      </div>
      <div className="actions">
        {!isNew && (
          <button className="danger" onClick={onDelete}>
            Xóa khoản chi
          </button>
        )}
        <button className="primary" disabled={!Number(amount)} onClick={() => onSave({ ...exp, amount: Number(amount), category, date, note: note.trim() })}>
          Lưu khoản chi
        </button>
      </div>
    </Modal>
  );
}
