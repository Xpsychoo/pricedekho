"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Suggestion {
  slug: string;
  name: string;
  category: { name: string };
}

/**
 * Product search with suggestions. Without JavaScript it is a plain GET form
 * to /search; with JavaScript it adds an accessible combobox of matching
 * catalog products.
 */
export function SearchBar({ defaultValue = "", size = "md", autoFocus = false }: { defaultValue?: string; size?: "md" | "lg"; autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?${new URLSearchParams({ q, pageSize: "5" })}`, { signal: controller.signal });
        if (!res.ok) return;
        const body = (await res.json()) as { ok: boolean; data?: { items: Suggestion[] } };
        setSuggestions(body.data?.items ?? []);
        setActive(-1);
      } catch {
        // Suggestions are optional; ignore network errors and aborts.
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const visible = open && value.trim().length >= 2 && suggestions.length > 0;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOpen(false);
    if (visible && active >= 0 && suggestions[active]) {
      router.push(`/product/${suggestions[active].slug}`);
      return;
    }
    const q = value.trim();
    router.push(q ? `/search?${new URLSearchParams({ q })}` : "/search");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form role="search" action="/search" method="get" onSubmit={submit} className="relative">
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search products
        </label>
        <Search aria-hidden className={cn("pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400", size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
        <input
          id={`${listId}-input`}
          name="q"
          type="search"
          value={value}
          maxLength={100}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="Search for a product, e.g. iPhone 13 128GB"
          role="combobox"
          aria-expanded={visible}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={visible && active >= 0 ? `${listId}-opt-${active}` : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-white pr-24 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200",
            size === "lg" ? "h-14 pl-11 text-base" : "h-10 pl-9 text-sm",
          )}
        />
        <button
          type="submit"
          className={cn(
            "absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg bg-brand-600 font-medium text-white hover:bg-brand-700",
            size === "lg" ? "h-11 px-5 text-sm" : "h-7 px-3 text-xs",
          )}
        >
          Search
        </button>
      </form>
      {visible && (
        <ul id={`${listId}-list`} role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={s.slug}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                router.push(`/product/${s.slug}`);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer px-4 py-2 text-sm", i === active ? "bg-brand-50" : "")}
            >
              <span className="block truncate font-medium text-slate-900">{s.name}</span>
              <span className="text-xs text-slate-500">{s.category.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
