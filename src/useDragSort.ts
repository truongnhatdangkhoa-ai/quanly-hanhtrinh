import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Kéo thả đổi thứ tự bằng con trỏ (cảm ứng và chuột), không cần thư viện.
// Phần tử đang kéo được dịch bằng transform bám theo ngón tay; khi vượt qua nửa chiều cao của phần tử khác thì hoán đổi vị trí.
type Drag = { id: string; day: number; order: string[] };

export function useDragSort(onCommit: (day: number, order: string[]) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const initial = useRef<string>("");
  const els = useRef(new Map<string, HTMLElement>());
  const st = useRef({ y: 0, grab: 0, scroller: null as HTMLElement | null, raf: 0 });
  const hs = useRef<{ m: (e: PointerEvent) => void; u: () => void; c: () => void } | null>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  };

  // Đặt phần tử đang kéo dưới ngón tay (tính lại từ vị trí tự nhiên của nó)
  const place = () => {
    const d = dragRef.current;
    const el = d && els.current.get(d.id);
    if (!d || !el) return;
    el.style.transform = "";
    const top = el.getBoundingClientRect().top;
    el.style.transform = `translateY(${st.current.y - st.current.grab - top}px)`;
  };

  // Tính lại vị trí mới theo toạ độ ngón tay
  const update = () => {
    const d = dragRef.current;
    if (!d) return;
    const others = d.order.filter((x) => x !== d.id);
    let idx = 0;
    for (const oid of others) {
      const r = els.current.get(oid)?.getBoundingClientRect();
      if (r && st.current.y > r.top + r.height / 2) idx++;
    }
    const next = [...others.slice(0, idx), d.id, ...others.slice(idx)];
    if (next.join() !== d.order.join()) setDrag({ ...d, order: next });
    else place();
  };

  useLayoutEffect(place, [drag?.order.join()]);

  const detach = () => {
    const h = hs.current;
    if (!h) return;
    window.removeEventListener("pointermove", h.m);
    window.removeEventListener("pointerup", h.u);
    window.removeEventListener("pointercancel", h.c);
    hs.current = null;
  };

  const finish = (cancel: boolean) => {
    const d = dragRef.current;
    cancelAnimationFrame(st.current.raf);
    detach();
    if (!d) return;
    const el = els.current.get(d.id);
    if (el) el.style.transform = "";
    setDrag(null);
    if (!cancel && d.order.join() !== initial.current) commitRef.current(d.day, d.order);
  };
  function onMove(e: PointerEvent) {
    st.current.y = e.clientY;
    e.preventDefault();
    update();
  }
  function onUp() {
    finish(false);
  }
  function onCancel() {
    finish(true);
  }

  const start = (e: React.PointerEvent, id: string, day: number, order: string[]) => {
    const el = els.current.get(id);
    if (!el || dragRef.current) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    st.current.y = e.clientY;
    st.current.grab = e.clientY - r.top;
    st.current.scroller = el.closest("main");
    initial.current = order.join();
    hs.current = { m: onMove, u: onUp, c: onCancel };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* không hỗ trợ rung */
    }
    // Tự cuộn khi kéo sát mép trên/dưới của khung danh sách
    const tick = () => {
      const sc = st.current.scroller;
      if (sc) {
        const b = sc.getBoundingClientRect();
        const y = st.current.y;
        const dy = y < b.top + 80 ? -10 : y > b.bottom - 150 ? 10 : 0;
        if (dy) {
          sc.scrollTop += dy;
          update();
        }
      }
      st.current.raf = requestAnimationFrame(tick);
    };
    st.current.raf = requestAnimationFrame(tick);
    setDrag({ id, day, order });
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(st.current.raf);
      detach();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { drag, register, start };
}
