import { useEffect, useState } from "react";
import type { Data } from "./types";

const KEY = "hanh-trinh-data-v1";
const empty: Data = { trips: [], stops: [], expenses: [] };

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw);
    return {
      trips: p.trips ?? [],
      stops: p.stops ?? [],
      expenses: p.expenses ?? [],
    };
  } catch {
    return empty;
  }
}

export function useData() {
  const [data, setData] = useState<Data>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* bộ nhớ đầy hoặc bị chặn: bỏ qua */
    }
  }, [data]);
  return [data, setData] as const;
}
