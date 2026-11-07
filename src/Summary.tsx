import { CATEGORIES, type Expense, type Stop, type Trip } from "./types";
import { countdownText, fmtDate, money, tripDayCount } from "./utils";

export default function Summary({ trip, stops, expenses }: { trip: Trip; stops: Stop[]; expenses: Expense[] }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const days = tripDayCount(trip.startDate, trip.endDate);
  const visited = stops.filter((s) => s.done).length;

  const byCat = CATEGORIES.map((c) => ({
    ...c,
    sum: expenses.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0),
  }))
    .filter((c) => c.sum > 0)
    .sort((a, b) => b.sum - a.sum);

  return (
    <div>
      <div className="hero">
        <div className="muted-light">{fmtDate(trip.startDate)} đến {fmtDate(trip.endDate)}</div>
        <div className="hero-big">{countdownText(trip.startDate, trip.endDate)}</div>
      </div>

      <div className="stats">
        <div>
          <strong>{days}</strong>
          <span className="muted">ngày</span>
        </div>
        <div>
          <strong>{visited}/{stops.length}</strong>
          <span className="muted">điểm đã đến</span>
        </div>
        <div>
          <strong>{money(total / days)}</strong>
          <span className="muted">chi mỗi ngày</span>
        </div>
      </div>

      <h3 className="section-title">Tổng chi {money(total)}</h3>
      {byCat.length === 0 && <p className="empty">Ghi khoản chi để xem phân bổ theo danh mục.</p>}
      {byCat.map((c) => (
        <div key={c.key} className="cat-row">
          <div className="budget-top">
            <span>{c.icon} {c.label}</span>
            <strong>{money(c.sum)}</strong>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: (c.sum / total) * 100 + "%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
