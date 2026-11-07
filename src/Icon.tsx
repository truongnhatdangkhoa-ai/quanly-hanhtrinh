import type { ReactNode } from "react";

// Bộ icon nét đơn (24x24, stroke) vẽ sẵn bằng SVG: không phụ thuộc emoji/font của máy, chạy offline.
const PATHS: Record<string, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 18l-6-6 6-6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  check: <path d="M20 6L9 17l-5-5" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H16a3.5 3.5 0 000-7H8a3.5 3.5 0 010-7h7.5" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 12V8H6a2 2 0 010-4h12v4" />
      <path d="M4 6v12a2 2 0 002 2h14v-4" />
      <path d="M18 12a2 2 0 000 4h4v-4z" />
    </>
  ),
  chart: (
    <>
      <path d="M21.2 15.9A10 10 0 118 2.8" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </>
  ),
  map: (
    <>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  navigate: <path d="M3 11l18-8-8 18-2-8z" />,
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </>
  ),
  chevron: <path d="M9 18l6-6-6-6" />,
  archive: (
    <>
      <rect x="3" y="3" width="18" height="5" rx="1.5" />
      <path d="M5 8v11a2 2 0 002 2h10a2 2 0 002-2V8M10 12h4" />
    </>
  ),
  download: <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  upload: <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
    </>
  ),
  plane: (
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
  flag: (
    <>
      <path d="M4 22V4" />
      <path d="M4 4h13l-2 4.5 2 4.5H4" />
    </>
  ),
  // danh mục chi phí
  xe: (
    <>
      <path d="M5 16l1.5-6.5A2 2 0 018.4 8h7.2a2 2 0 011.9 1.5L19 16" />
      <path d="M3 16h18v3H3z" />
      <circle cx="7.5" cy="19" r="0.6" />
      <circle cx="16.5" cy="19" r="0.6" />
    </>
  ),
  phong: (
    <>
      <path d="M3 20V6M3 15h18v5M21 15v-3a3 3 0 00-3-3h-7v6" />
      <circle cx="7" cy="11.5" r="1.6" />
    </>
  ),
  an: (
    <>
      <path d="M6 3v7a2 2 0 002 2v9M10 3v7M8 3v7" />
      <path d="M18 21V3c-2.2 1-4 4-4 8h4" />
    </>
  ),
  ve: (
    <>
      <path d="M3 8V6h18v2a2 2 0 000 4v0a2 2 0 000 4v2H3v-2a2 2 0 000-4v0a2 2 0 000-4z" />
      <path d="M14 6v2M14 11v2M14 16v2" />
    </>
  ),
  xang: (
    <>
      <path d="M4 21V5a2 2 0 012-2h6a2 2 0 012 2v16M3 21h12" />
      <path d="M14 9h2a2 2 0 012 2v5a1.5 1.5 0 003 0V9l-3-3" />
      <path d="M7 8h4" />
    </>
  ),
  muasam: (
    <>
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 01-8 0" />
    </>
  ),
  khac: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
};

export default function Icon({ name, size = 22, stroke = 2 }: { name: string; size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] ?? PATHS.khac}
    </svg>
  );
}

// Màu nhận diện cho từng danh mục chi (dùng cho nền icon, biểu đồ, thanh phân bổ)
export const CAT_COLOR: Record<string, string> = {
  xe: "#2a8fa6",
  phong: "#7a6fd0",
  an: "#ef8a3d",
  ve: "#d9527f",
  xang: "#c9a227",
  muasam: "#3fa876",
  khac: "#7d8f97",
};
export const catColor = (key: string) => CAT_COLOR[key] ?? CAT_COLOR.khac;

// Vòng tròn icon có nền nhạt theo màu danh mục
export function CatBadge({ cat, size = 44 }: { cat: string; size?: number }) {
  const c = catColor(cat);
  return (
    <span className="cat-badge" style={{ width: size, height: size, background: c + "26", color: c }}>
      <Icon name={cat} size={Math.round(size * 0.5)} />
    </span>
  );
}
