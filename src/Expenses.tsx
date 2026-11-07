import { useState } from "react";
import Icon, { CatBadge, catColor } from "./Icon";
import Modal from "./Modal";
import MoneyInput from "./MoneyInput";
import { CATEGORIES, type Expense, type Trip } from "./types";
import { fmtDate, groupDigits, money, todayStr, uid, weekdayName } from "./utils";

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
  // Gom theo ngày để dễ đọc: mỗi ngày một nhóm kèm tổng
  const groups: { date: string; items: Expense[]; sum: number }[] = [];
  for (const e of sorted) {
    const g = groups[groups.length - 1];
    if (g && g.date === e.date) {
      g.items.push(e);
      g.sum += e.amount;
    } else groups.push({ date: e.date, items: [e], sum: e.amount });
  }

  const save = (e: Expense) => {
    const exists = expenses.some((x) => x.id === e.id);
    onChange(exists ? expenses.map((x) => (x.id === e.id ? e : x)) : [...expenses, e]);
    setEditing(null);
  };

  const startNew = () =>
    setEditing({
      id: uid(),
      tripId: trip.id,
      date: todayStr() < trip.startDate ? trip.startDate : todayStr() > trip.endDate ? trip.endDate : todayStr(),
      category: "an",
      amount: 0,
      note: "",
    });

  return (
    <div>
      <div className={"budget-card" + (over ? " is-over" : "")}>
        <span className="budget-label">Đã chi</span>
        <div className="budget-amount">
          {groupDigits(total)}
          <small>VNĐ</small>
        </div>
        {trip.budget > 0 ? (
          <>
            <div className="bar on-dark">
              <div className={"fill" + (over ? " over" : "")} style={{ width: pct + "%" }} />
            </div>
            <div className="budget-foot">
              <span>Ngân sách {money(trip.budget)}</span>
              <b>{over ? "Vượt " + money(total - trip.budget) : "Còn " + money(trip.budget - total)}</b>
            </div>
          </>
        ) : (
          <p className="budget-hint">Chưa đặt ngân sách. Bấm biểu tượng sửa ở đầu trang để thêm.</p>
        )}
      </div>

      {groups.length === 0 && (
        <div className="empty-state compact">
          <div className="empty-art">
            <Icon name="wallet" size={30} stroke={1.6} />
          </div>
          <h2>Chưa có khoản chi nào</h2>
          <p>Ghi lại mỗi khoản chi để theo dõi ngân sách của chuyến đi.</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.date} className="exp-group">
          <div className="group-head">
            <span>
              {weekdayName(g.date)}, {fmtDate(g.date)}
            </span>
            <span>{money(g.sum)}</span>
          </div>
          <div className="list-card">
            {g.items.map((e) => {
              const c = catOf(e.category);
              return (
                <div
                  key={e.id}
                  className="expense"
                  role="button"
                  tabIndex={0}
                  onClick={() => setEditing(e)}
                  onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && setEditing(e)}
                >
                  <CatBadge cat={c.key} />
                  <div className="grow">
                    <strong>{c.label}</strong>
                    {e.note && <div className="muted ellipsis">{e.note}</div>}
                  </div>
                  <strong className="amount">{money(e.amount)}</strong>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <button className="fab above-tabs" onClick={startNew}>
        <Icon name="plus" size={22} /> Ghi khoản chi
      </button>

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
        Số tiền (VNĐ)
        <MoneyInput autoFocus value={amount} onChange={setAmount} placeholder="350.000" />
      </label>
      <div className="field-title">Danh mục</div>
      <div className="cat-grid" role="radiogroup" aria-label="Danh mục">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            role="radio"
            aria-checked={category === c.key}
            className={"cat-opt" + (category === c.key ? " on" : "")}
            style={{ ["--c" as string]: catColor(c.key) }}
            onClick={() => setCategory(c.key)}
          >
            <Icon name={c.key} size={22} />
            <span>{c.label}</span>
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
          <button className="danger" onClick={onDelete} aria-label="Xóa khoản chi">
            <Icon name="trash" size={19} /> Xóa
          </button>
        )}
        <button className="primary" disabled={!Number(amount)} onClick={() => onSave({ ...exp, amount: Number(amount), category, date, note: note.trim() })}>
          Lưu khoản chi
        </button>
      </div>
    </Modal>
  );
}
