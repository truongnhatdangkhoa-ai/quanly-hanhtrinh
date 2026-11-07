import { useEffect, useState } from "react";
import Expenses from "./Expenses";
import Itinerary from "./Itinerary";
import Summary from "./Summary";
import TripForm from "./TripForm";
import { useData } from "./storage";
import type { Trip } from "./types";
import { countdownText, fmtDate, money } from "./utils";

type Tab = "plan" | "cost" | "sum";

export default function App() {
  const [data, setData] = useData();
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("plan");
  const [form, setForm] = useState<"new" | "edit" | null>(null);

  // Nút Back của Android quay về danh sách chuyến đi thay vì thoát app
  useEffect(() => {
    const onPop = () => setOpenId(null);
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

  if (!trip) {
    const sorted = [...data.trips].sort((a, b) => b.startDate.localeCompare(a.startDate));
    return (
      <div className="app">
        <header className="top">
          <h1>Hành Trình</h1>
        </header>
        <main>
          {sorted.length === 0 && (
            <div className="welcome">
              <h2>Chưa có chuyến đi nào</h2>
              <p>Tạo chuyến đầu tiên để lên lịch trình theo ngày và ghi chi phí.</p>
            </div>
          )}
          {sorted.map((t) => {
            const spent = data.expenses.filter((e) => e.tripId === t.id).reduce((s, e) => s + e.amount, 0);
            return (
              <button key={t.id} className="trip-card" onClick={() => open(t.id)}>
                <strong>{t.name}</strong>
                <span className="muted">
                  {t.destination ? t.destination + " · " : ""}
                  {fmtDate(t.startDate)} đến {fmtDate(t.endDate)}
                </span>
                <span className="trip-meta">
                  <span>{countdownText(t.startDate, t.endDate)}</span>
                  <span>Đã chi {money(spent)}</span>
                </span>
              </button>
            );
          })}
        </main>
        <button className="fab" onClick={() => setForm("new")}>
          + Chuyến đi mới
        </button>
        {form === "new" && <TripForm onSave={saveTrip} onClose={() => setForm(null)} />}
      </div>
    );
  }

  const stops = data.stops.filter((s) => s.tripId === trip.id);
  const expenses = data.expenses.filter((e) => e.tripId === trip.id);

  return (
    <div className="app">
      <header className="top">
        <button className="ghost light" onClick={back} aria-label="Quay lại">
          ←
        </button>
        <div className="grow">
          <h1>{trip.name}</h1>
          {trip.destination && <div className="muted-light">{trip.destination}</div>}
        </div>
        <button className="ghost light" onClick={() => setForm("edit")} aria-label="Sửa chuyến đi">
          Sửa
        </button>
      </header>
      <main>
        {tab === "plan" && (
          <Itinerary
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
      <nav className="tabs">
        <button className={tab === "plan" ? "on" : ""} onClick={() => setTab("plan")}>
          Lịch trình
        </button>
        <button className={tab === "cost" ? "on" : ""} onClick={() => setTab("cost")}>
          Chi phí
        </button>
        <button className={tab === "sum" ? "on" : ""} onClick={() => setTab("sum")}>
          Tổng kết
        </button>
      </nav>
      {form === "edit" && <TripForm trip={trip} onSave={saveTrip} onDelete={() => deleteTrip(trip.id)} onClose={() => setForm(null)} />}
    </div>
  );
}
