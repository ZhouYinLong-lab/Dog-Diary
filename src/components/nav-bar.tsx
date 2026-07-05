"use client";

import {
  faCalendarDays,
  faChartSimple,
  faFileLines,
  faHouse,
  faListUl,
  faMagnifyingGlass,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

const NAV_ITEMS = [
  { href: "/", label: "今日", faIcon: faHouse },
  { href: "/timeline", label: "时间线", faIcon: faListUl },
  { href: "/calendar", label: "月历", faIcon: faCalendarDays },
  { href: "/search", label: "搜索", faIcon: faMagnifyingGlass },
  { href: "/insights", label: "洞察", faIcon: faChartSimple },
  { href: "/review/week", label: "复盘", faIcon: faFileLines },
  { href: "/settings", label: "设置", faIcon: faSliders },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="global-nav" aria-label="主导航">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" aria-label="Dog-Diary 首页">
          <Icon faIcon={faHouse} size={20} decorative />
          <span>Dog-Diary</span>
        </Link>
        <div className="nav-links">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon faIcon={item.faIcon} size={16} decorative />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
