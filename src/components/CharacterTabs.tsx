"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pages under /character/[assetKey]. Each calculator owns its own route folder.
const TABS = [
  { path: "", label: "스탯" },
  { path: "/hyper", label: "하이퍼 스탯" },
  { path: "/starforce", label: "스타포스" },
  { path: "/potential", label: "잠재능력" },
];

export default function CharacterTabs({ assetKey }: { assetKey: string }) {
  const pathname = usePathname();
  const root = `/character/${assetKey}`;
  return (
    <nav className="mb-6 flex gap-1 border-b border-black/10 dark:border-white/15">
      {TABS.map((t) => {
        const href = root + t.path;
        const selected = pathname === href;
        return (
          <Link
            key={t.path}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              selected ? "border-orange-500 text-current" : "border-transparent text-zinc-500 hover:text-current"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
