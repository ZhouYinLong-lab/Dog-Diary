import { Suspense } from "react";
import { TodayWorkspace } from "@/components/today-workspace";

export default function Home() {
  return (
    <Suspense fallback={<div className="app-shell"><p className="status-message">加载中…</p></div>}>
      <TodayWorkspace />
    </Suspense>
  );
}
