import { useEffect, useState } from "react";
import Icon from "./Icon";
import { openAppSettings } from "./location";
import { canNotify, notifyNeedsApk, notifyPermission, type NotifyPerm } from "./notify";

// Khi người dùng bật một nhắc: xin quyền thông báo; nếu bị từ chối thì gợi ý mở cài đặt của app
export default function NotifyHint({ active }: { active: boolean }) {
  const [perm, setPerm] = useState<NotifyPerm>("granted");

  useEffect(() => {
    if (!active || !canNotify()) return;
    let alive = true;
    void notifyPermission(true).then((p) => alive && setPerm(p));
    const onVis = () => {
      if (document.visibilityState === "visible") void notifyPermission(false).then((p) => alive && setPerm(p));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);

  if (!active) return null;
  if (notifyNeedsApk()) return <p className="hint">Nhắc nhở cần APK mới: hãy tải và cài lại APK mới nhất (mục Releases) rồi bật lại.</p>;
  if (!canNotify()) return <p className="hint">Nhắc chỉ hoạt động trên app Android (APK).</p>;
  if (perm !== "denied") return null;
  return (
    <div className="notify-hint">
      <p>Ứng dụng chưa được phép gửi thông báo nên nhắc sẽ không hiện.</p>
      <button type="button" className="picker-fix" onClick={() => void openAppSettings()}>
        <Icon name="bell" size={18} /> Mở cài đặt để cho phép thông báo
      </button>
    </div>
  );
}
