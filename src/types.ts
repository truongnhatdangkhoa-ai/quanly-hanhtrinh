export type Trip = {
  id: string;
  name: string;
  destination: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;
  budget: number;
  remindDeparture?: boolean; // nhắc tối hôm trước (20:00) và sáng ngày đi (07:00)
};

export type Stop = {
  id: string;
  tripId: string;
  day: number; // 1..n
  time: string; // HH:mm hoặc ""
  place: string;
  note: string;
  done: boolean;
  lat?: number; // vị trí ghim trên bản đồ (cả hai cùng có hoặc cùng không có)
  lng?: number;
  remind?: number; // nhắc trước giờ của điểm này bao nhiêu phút (0 = đúng giờ); không có = không nhắc
};

export type Expense = {
  id: string;
  tripId: string;
  date: string;
  category: string;
  amount: number;
  note: string;
};

export type Data = {
  trips: Trip[];
  stops: Stop[];
  expenses: Expense[];
};

export const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "xe", label: "Tiền xe", icon: "🚌" },
  { key: "phong", label: "Tiền phòng", icon: "🛏️" },
  { key: "an", label: "Ăn uống", icon: "🍜" },
  { key: "ve", label: "Vé tham quan", icon: "🎟️" },
  { key: "xang", label: "Xăng, cầu đường", icon: "⛽" },
  { key: "muasam", label: "Mua sắm", icon: "🛍️" },
  { key: "khac", label: "Khác", icon: "📦" },
];
