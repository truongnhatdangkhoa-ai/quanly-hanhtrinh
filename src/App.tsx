import { useEffect, useState } from "react";
import Backup from "./Backup";
import Expenses from "./Expenses";
import Icon from "./Icon";
import Itinerary from "./Itinerary";
import Logo from "./Logo";
import Summary from "./Summary";
import TripMap from "./TripMap";
import TripForm from "./TripForm";
import { useData } from "./storage";
import { useUpdater, type UpdateState } from "./updater";
import type { Trip } from "./types";
import {
  countdownText,
  daysBetween,
  dayMonth,
  fmtDate,
  fmtShort,
  money,
  todayStr,
  tripDayCount,
  tripStatus,
  type TripStatus,
} from "./utils";

// Phiên bản đang dùng, ví dụ "v1.0.3 · build 12" (build khớp số cuối của tên bản trên GitHub Releases)
const VERSION_LABEL = "v" + __APP_VERSION__ + (__APP_BUILD__ ? " · build " + __APP_BUILD__ : "");

const UPDATE_TEXT = (s: UpdateState) =>
  s.kind === "checking" ? " · đang kiểm tra bản mới…"
  : s.kind === "latest" ? " · đã là bản mới nhất"
  : s.kind === "downloading" ? ` · đang tải bản mới (build ${s.build})…`
  : s.kind === "ready" ? ` · bản mới build ${s.build} đã sẵn sàng`
  : s.kind === "error" ? " · chưa kiểm tra được, chạm để thử lại"
  : "";

type Tab = "plan" | "map" | "cost" | "sum";

const STATUS_LABEL: Record<TripStatus, string> = {
  upcoming: "Sắp đi",
  ongoing: "Đang đi",
  past: "Đã xong",
};

export default function App() {
  const [data, setData] = useData();
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("plan");
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const upd = useUpdater();

  // Thông báo nổi khi bản mới đã tải xong; hiện ở cả hai màn hình
  const toast =
    upd.state.kind === "ready" ? (
      <div className="toast" role="status">
        <span>Đã tải bản mới (build {upd.state.build})</span>
        <button onClick={upd.apply}>Cập nhật ngay</button>
      </div>
    ) : null;

  // Nút Back của Android quay về danh sách chuyến đi thay vì thoát app
  useEffect(() => {
    // Bản đồ chọn địa điểm cũng thêm một mục lịch sử (có state.trip); lùi về mục đó thì chỉ đóng bản đồ, không thoát chuyến đi
    const onPop = () => {
      if (history.state && history.state.trip) return;
      setOpenId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const open = (id: string) => {
    history.pushState({ trip: id }, "");
    setTab("plan");
    setOpenId(id);
  };
  const back = () => history.back();

  const trip = data.trips.find((t) => t.id === openId) ?? null;

  const saveTrip = (t: Trip) => {
    setData((d) => ({
      ...d,
      trips: d.trips.some((x) => x.id === t.id) ? d.trips.map((x) => (x.id === t.id ? t : x)) : [...d.trips, t],
    }));
    setForm(null);
    if (!trip) open(t.id);
  };

  const deleteTrip = (id: string) => {
    setData((d) => ({
      trips: d.trips.filter((t) => t.id !== id),
      stops: d.stops.filter((s) => s.tripId !== id),
      expenses: d.expenses.filter((e) => e.tripId !== id),
    }));
    setForm(null);
    back();
  };

  /* ───────────── Màn hình danh sách chuyến đi ───────────── */
  if (!trip) {
    const sorted = [...data.trips].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const spentOf = (id: string) => data.expenses.filter((e) => e.tripId === id).reduce((s, e) => s + e.amount, 0);

    // Chuyến nổi bật: đang đi, nếu không có thì chuyến sắp đi gần nhất
    const today = todayStr();
    const ongoing = data.trips.find((t) => tripStatus(t.startDate, t.endDate) === "ongoing");
    const nextUp = [...data.trips]
      .filter((t) => tripStatus(t.startDate, t.endDate) === "upcoming")
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    const featured = ongoing ?? nextUp ?? null;
    const totalSpent = data.expenses.reduce((s, e) => s + e.amount, 0);

    return (
      <div className="app">
        {toast}
        <main className="home">
          <header className="home-top">
            <div className="home-row">
              <div className="brand">
                <Logo size={56} />
                <div>
                  <h1>Hành Trình</h1>
                  <p>Lịch trình · Chi phí · Đếm ngược</p>
                </div>
              </div>
              <button className="icon-btn on-dark" onClick={() => setBackupOpen(true)} aria-label="Sao lưu và khôi phục dữ liệu">
                <Icon name="archive" size={21} />
              </button>
            </div>
          </header>

          <div className="home-body">
            {data.trips.length === 0 ? (
              <div className="empty-state">
                <div className="empty-art">
                  <Icon name="plane" size={40} stroke={1.6} />
                </div>
                <h2>Chưa có chuyến đi nào</h2>
                <p>Tạo chuyến đầu tiên để lên lịch trình theo ngày, ghi chi phí và đếm ngược ngày khởi hành.</p>
                <button className="primary" onClick={() => setForm("new")}>
                  <Icon name="plus" size={20} /> Tạo chuyến đi
                </button>
              </div>
            ) : (
              <>
                {featured ? (
                  <button className="feature" onClick={() => open(featured.id)}>
                    <span className="feature-label">
                      <span className="live-dot" />
                      {ongoing ? "Đang diễn ra" : "Chuyến đi sắp tới"}
                    </span>
                    <span className="feature-name">{featured.name}</span>
                    {featured.destination && (
                      <span className="feature-dest">
                        <Icon name="pin" size={15} /> {featured.destination}
                      </span>
                    )}
                    <span className="feature-count">
                      {ongoing ? (
                        <>
                          <b>{daysBetween(featured.startDate, today) + 1}</b>
                          <span>/ {tripDayCount(featured.startDate, featured.endDate)} ngày</span>
                        </>
                      ) : (
                        <>
                          <b>{daysBetween(today, featured.startDate)}</b>
                          <span>ngày nữa khởi hành</span>
                        </>
                      )}
                    </span>
                    {ongoing && (
                      <span className="feature-bar">
                        <i
                          style={{
                            width:
                              Math.min(
                                100,
                                ((daysBetween(featured.startDate, today) + 1) /
                                  tripDayCount(featured.startDate, featured.endDate)) *
                                  100,
                              ) + "%",
                          }}
                        />
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="feature feature-static">
                    <span className="feature-label">Tổng quan</span>
                    <span className="feature-count">
                      <b>{data.trips.length}</b>
                      <span>chuyến đi đã hoàn thành</span>
                    </span>
                    <span className="feature-dest">Tổng đã chi {money(totalSpent)}</span>
                  </div>
                )}

                <h2 className="section-label">Tất cả chuyến đi</h2>
                <div className="trip-list">
                  {sorted.map((t) => {
                    const spent = spentOf(t.id);
                    const st = tripStatus(t.startDate, t.endDate);
                    const dm = dayMonth(t.startDate);
                    const pct = t.budget > 0 ? Math.min(100, (spent / t.budget) * 100) : 0;
                    const over = t.budget > 0 && spent > t.budget;
                    return (
                      <button key={t.id} className="trip-card" onClick={() => open(t.id)}>
                        <span className={"date-tile " + st}>
                          <b>{dm.day}</b>
                          <span>{dm.month}</span>
                        </span>
                        <span className="trip-main">
                          <span className="trip-title">
                            <strong>{t.name}</strong>
                            <span className={"status " + st}>{STATUS_LABEL[st]}</span>
                          </span>
                          <span className="trip-sub">
                            {t.destination ? t.destination + " · " : ""}
                            {fmtShort(t.startDate)} – {fmtDate(t.endDate)}
                          </span>
                          <span className="trip-meta">
                            <span className="ellipsis">{countdownText(t.startDate, t.endDate)}</span>
                            <span className={"nowrap" + (over ? " bad" : "")}>{money(spent)}</span>
                          </span>
                          {t.budget > 0 && (
                            <span className="mini-bar">
                              <i className={over ? "over" : ""} style={{ width: pct + "%" }} />
                            </span>
                          )}
                        </span>
                        <span className="chev">
                          <Icon name="chevron" size={20} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <footer>
            <button
              className={"version" + (upd.state.kind === "ready" ? " is-ready" : "")}
              onClick={upd.check}
              disabled={!upd.enabled}
              aria-label="Phiên bản ứng dụng, chạm để kiểm tra bản mới"
            >
              {VERSION_LABEL}
              {UPDATE_TEXT(upd.state)}
            </button>
          </footer>
        </main>

        {data.trips.length > 0 && (
          <button className="fab" onClick={() => setForm("new")}>
            <Icon name="plus" size={22} /> Chuyến đi mới
          </button>
        )}
        {form === "new" && <TripForm onSave={saveTrip} onClose={() => setForm(null)} />}
        {backupOpen && <Backup data={data} onRestore={setData} onClose={() => setBackupOpen(false)} />}
      </div>
    );
  }

  /* ───────────── Màn hình chi tiết chuyến đi ───────────── */
  const stops = data.stops.filter((s) => s.tripId === trip.id);
  const expenses = data.expenses.filter((e) => e.tripId === trip.id);
  const st = tripStatus(trip.startDate, trip.endDate);
  const days = tripDayCount(trip.startDate, trip.endDate);

  return (
    <div className="app">
      {toast}
      <header className="top">
        <div className="top-row">
          <button className="icon-btn on-dark" onClick={back} aria-label="Quay lại">
            <Icon name="back" size={22} />
          </button>
          <div className="grow">
            <h1>{trip.name}</h1>
            {trip.destination && (
              <div className="top-dest">
                <Icon name="pin" size={14} /> {trip.destination}
              </div>
            )}
          </div>
          <button className="icon-btn on-dark" onClick={() => setForm("edit")} aria-label="Sửa chuyến đi">
            <Icon name="edit" size={20} />
          </button>
        </div>
        <div className="top-chips">
          <span className="tchip">
            <Icon name="calendar" size={14} /> {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}
          </span>
          <span className="tchip">{days} ngày</span>
          <span className={"tchip status-" + st}>{STATUS_LABEL[st]}</span>
        </div>
      </header>

      <main className={"detail" + (tab === "map" ? " map-tab" : "")}>
        {tab === "plan" && (
          <Itinerary
            trip={trip}
            stops={stops}
            onChange={(next) => setData((d) => ({ ...d, stops: [...d.stops.filter((s) => s.tripId !== trip.id), ...next] }))}
          />
        )}
        {tab === "map" && (
          <TripMap
            trip={trip}
            stops={stops}
            onChange={(next) => setData((d) => ({ ...d, stops: [...d.stops.filter((s) => s.tripId !== trip.id), ...next] }))}
          />
        )}
        {tab === "cost" && (
          <Expenses
            trip={trip}
            expenses={expenses}
            onChange={(next) => setData((d) => ({ ...d, expenses: [...d.expenses.filter((e) => e.tripId !== trip.id), ...next] }))}
          />
        )}
        {tab === "sum" && <Summary trip={trip} stops={stops} expenses={expenses} />}
      </main>

      <nav className="tabs" aria-label="Điều hướng chuyến đi">
        {(
          [
            ["plan", "Lịch trình", "route"],
            ["map", "Bản đồ", "map"],
            ["cost", "Chi phí", "wallet"],
            ["sum", "Tổng kết", "chart"],
          ] as [Tab, string, string][]
        ).map(([key, label, icon]) => (
          <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined}>
            <span className="tab-ico">
              <Icon name={icon} size={22} />
            </span>
            {label}
          </button>
        ))}
      </nav>
      {form === "edit" && <TripForm trip={trip} onSave={saveTrip} onDelete={() => deleteTrip(trip.id)} onClose={() => setForm(null)} />}
    </div>
  );
}
