"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/**
 * Share links for social apps. Plain intent URLs only — no third-party
 * scripts, trackers or embeds are loaded. `url` should be the page's
 * absolute canonical URL.
 */
export function ShareButtons({ url, title, className }: { url: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  // Native share sheet (mostly mobile); false during server render.
  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const targets = [
    { name: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { name: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { name: "X", href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context); the share links still work.
    }
  }

  const button = "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium text-slate-500">Share:</span>
      {canNativeShare && (
        <button type="button" className={button} onClick={() => navigator.share({ title, url }).catch(() => undefined)}>
          <Share2 className="h-3.5 w-3.5" aria-hidden /> Share
        </button>
      )}
      {targets.map((s) => (
        <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className={button} aria-label={`Share on ${s.name}`}>
          {s.name}
        </a>
      ))}
      <button type="button" className={button} onClick={copy} aria-live="polite">
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
