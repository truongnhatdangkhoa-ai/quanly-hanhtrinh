import Icon, { CatBadge, catColor } from "./Icon";
import { CATEGORIES, type Expense, type Stop, type Trip } from "./types";
import { daysBetween, fmtDate, groupDigits, money, todayStr, tripDayCount, tripStatus } from "./utils";

export default function Summary({ trip, stops, expenses }: { trip: Trip; stops: Stop[]; expenses: Expense[] }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const days = tripDayCount(trip.startDate, trip.endDate);
  const visited = stops.filter((s) => s.done).length;
  const st = tripStatus(trip.startDate, trip.endDate);
  const today = todayStr();

  const byCat = CATEGORIES.map((c) => ({
    ...c,
    sum: expenses.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0),
  }))
    .filter((c) => c.sum > 0)
    .sort((a, b) => b.sum - a.sum);

  // Biểu đồ vành khuyên: chu vi quy ước = 100 để độ dài cung chính là phần trăm
  let offset = 0;
  const arcs = byCat.map((c) => {
    const len = (c.sum / total) * 100;
    const arc = { key: c.key, len, offset };
    offset += len;
    return arc;
  });

  const big = st === "upcoming" ? daysBetween(today, trip.startDate) : st === "ongoing" ? daysBetween(trip.startDate, today) + 1 : days;
  const bigLabel = st === "upcoming" ? "ngày nữa khởi hành" : st === "ongoing" ? `/ ${days} ngày, đang đi` : "ngày, đã kết thúc";

  return (
    <div>
      <div className="hero">
        <div className="hero-date">
          <Icon name="calendar" size={15} /> {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}
        </div>
        <div className="hero-row">
          <span className="hero-num">{big}</span>
          <span className="hero-unit">{bigLabel}</span>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-ico">
            <Icon name="calendar" size={18} />
          </span>
          <strong>{days}</strong>
          <span className="muted">ngày</span>
        </div>
        <div className="stat">
          <span className="stat-ico">
            <Icon name="flag" size={18} />
          </span>
          <strong>
            {visited}/{stops.length}
          </strong>
          <span className="muted">điểm đã đến</span>
        </div>
        <div className="stat">
          <span className="stat-ico">
            <Icon name="wallet" size={18} />
          </span>
          <strong className="small-num">{groupDigits(total / days)}</strong>
          <span className="muted">VNĐ / ngày</span>
        </div>
      </div>

      <h3 className="section-label">Chi phí theo danh mục</h3>
      {byCat.length === 0 ? (
        <div className="empty-state compact">
          <div className="empty-art">
            <Icon name="chart" size={30} stroke={1.6} />
          </div>
          <p>Ghi khoản chi để xem phân bổ theo danh mục.</p>
        </div>
      ) : (
        <div className="panel">
          <div className="donut-wrap">
            <svg viewBox="0 0 42 42" className="donut" role="img" aria-label={"Tổng chi " + money(total)}>
              <circle cx="21" cy="21" r="15.9155" className="donut-track" />
              {arcs.map((a) => (
                <circle
                  key={a.key}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={catColor(a.key)}
                  strokeWidth="5"
                  strokeDasharray={`${Math.max(0, a.len - (arcs.length > 1 ? 0.6 : 0))} ${100 - Math.max(0, a.len - (arcs.length > 1 ? 0.6 : 0))}`}
                  strokeDashoffset={25 - a.offset}
                />
              ))}
            </svg>
            <div className="donut-center">
              <span className="muted">Tổng chi</span>
              <strong>{groupDigits(total)}</strong>
              <span className="muted">VNĐ</span>
            </div>
          </div>

          {byCat.map((c) => (
            <div key={c.key} className="cat-row">
              <CatBadge cat={c.key} size={38} />
              <div className="grow">
                <div className="cat-line">
                  <span>{c.label}</span>
                  <strong>{money(c.sum)}</strong>
                </div>
                <div className="bar">
                  <div className="fill" style={{ width: (c.sum / total) * 100 + "%", background: catColor(c.key) }} />
                </div>
              </div>
              <span className="pct">{Math.round((c.sum / total) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
