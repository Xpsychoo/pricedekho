"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORY_DEFINITIONS } from "@pricedekho/shared";
import { CategoryIcon } from "./CategoryIcon";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close after navigation (adjusting state during render, per React guidance).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
      </button>
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-40 border-b border-slate-200 bg-white shadow-lg">
          <nav aria-label="Mobile" className="mx-auto max-w-7xl px-4 py-3">
            <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Categories</p>
            <ul className="grid grid-cols-2 gap-1">
              {CATEGORY_DEFINITIONS.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-100">
                    <CategoryIcon slug={c.slug} className="h-4 w-4 text-brand-600" />
                    {c.shortName}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Link href="/how-it-works" className="block rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-100">
                How it works
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
