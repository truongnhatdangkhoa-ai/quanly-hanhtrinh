import { useRef, useState } from "react";
import { copyBackup, exportBackup, mergeData, parseBackup, type ParsedBackup } from "./backup";
import Icon from "./Icon";
import Modal from "./Modal";
import type { Data } from "./types";

const counts = (d: Data) => `${d.trips.length} chuyến đi · ${d.stops.length} điểm dừng · ${d.expenses.length} khoản chi`;

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

type Msg = { kind: "ok" | "error"; text: string } | null;

export default function Backup({
  data,
  onRestore,
  onClose,
}: {
  data: Data;
  onRestore: (next: Data) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [fallback, setFallback] = useState(false); // xuất file lỗi: hiện nút sao chép
  const [pending, setPending] = useState<ParsedBackup | null>(null);

  const empty = data.trips.length === 0;

  const doExport = async () => {
    setBusy(true);
    setMsg(null);
    setFallback(false);
    try {
      const r = await exportBackup(data);
      if (r === "shared") setMsg({ kind: "ok", text: "Đã mở bảng chia sẻ. Hãy chọn nơi lưu file (Tệp, Drive, Zalo...)." });
      else if (r === "downloaded") setMsg({ kind: "ok", text: "Đã tải file sao lưu xuống máy." });
    } catch {
      setFallback(true);
      setMsg({ kind: "error", text: "Chưa xuất được file trên bản app này. Bạn có thể sao chép nội dung rồi dán vào ghi chú, hoặc cài lại bản APK mới nhất." });
    } finally {
      setBusy(false);
    }
  };

  const doCopy = async () => {
    const ok = await copyBackup(data);
    setMsg(ok ? { kind: "ok", text: "Đã sao chép nội dung sao lưu. Hãy dán vào ghi chú hoặc tin nhắn để giữ." } : { kind: "error", text: "Không sao chép được." });
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng một file
    if (!file) return;
    setMsg(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setPending(null);
      setMsg({ kind: "error", text: (err as Error).message });
    }
  };

  const apply = (mode: "merge" | "replace") => {
    if (!pending) return;
    if (mode === "replace" && !empty && !confirm("Thay thế toàn bộ dữ liệu hiện tại bằng nội dung trong file? Dữ liệu đang có sẽ bị xóa.")) return;
    onRestore(mode === "merge" ? mergeData(data, pending.data) : pending.data);
    onClose();
  };

  return (
    <Modal title="Sao lưu và khôi phục" onClose={onClose}>
      {pending ? (
        <>
          <div className="backup-card">
            <span className="backup-card-title">Nội dung trong file</span>
            <b>{counts(pending.data)}</b>
            {fmtWhen(pending.exportedAt) && <span className="backup-meta">Sao lưu lúc {fmtWhen(pending.exportedAt)}</span>}
            {pending.skipped > 0 && <span className="backup-meta">Bỏ qua {pending.skipped} mục không hợp lệ</span>}
          </div>
          <div className="backup-card">
            <span className="backup-card-title">Dữ liệu hiện có trên máy</span>
            <b>{counts(data)}</b>
          </div>
          <p className="hint">Gộp: giữ dữ liệu hiện có, thêm các mục từ file (mục trùng thì lấy bản trong file). Thay thế: xóa dữ liệu hiện có, chỉ giữ nội dung file.</p>
          <div className="backup-stack">
            <button className="primary" onClick={() => apply("merge")}>
              Gộp vào dữ liệu hiện có
            </button>
            <button className="danger" onClick={() => apply("replace")}>
              Thay thế toàn bộ
            </button>
            <button className="ghost" onClick={() => setPending(null)}>
              Chọn file khác
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="backup-card">
            <span className="backup-card-title">Dữ liệu trên máy</span>
            <b>{counts(data)}</b>
          </div>
          <p className="hint">Dữ liệu chỉ nằm trong máy này. Gỡ app hoặc xóa dữ liệu app là mất hết, nên hãy xuất file sao lưu định kỳ và cất ở nơi an toàn.</p>
          <div className="backup-stack">
            <button className="primary" onClick={doExport} disabled={busy || empty}>
              <Icon name="download" size={20} /> Xuất file sao lưu
            </button>
            {fallback && (
              <button className="ghost" onClick={doCopy}>
                <Icon name="copy" size={19} /> Sao chép nội dung
              </button>
            )}
            <button className="ghost" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={20} /> Nhập từ file sao lưu
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".json,application/json,text/plain" hidden onChange={onPick} />
          {empty && <p className="hint">Chưa có dữ liệu để xuất.</p>}
        </>
      )}
      {msg && (
        <p className={"backup-msg " + msg.kind} role={msg.kind === "error" ? "alert" : "status"}>
          {msg.text}
        </p>
      )}
    </Modal>
  );
}
