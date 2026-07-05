"use client";

import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function update() {
      setOffline(!navigator.onLine);
    }
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="alert">
      <Icon faIcon={faTriangleExclamation} size={16} decorative />
      <span>离线模式 — 本地数据可用，API 同步不可用</span>
    </div>
  );
}
