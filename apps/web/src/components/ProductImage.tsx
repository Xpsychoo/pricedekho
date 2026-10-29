import Image from "next/image";
import { CategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

const allowedHosts = new Set(
  (process.env.IMAGE_REMOTE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
);

function isPermitted(url: string | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && allowedHosts.has(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Shows a product image only when it comes from a host we are permitted to
 * display (IMAGE_REMOTE_HOSTS); otherwise a neutral category placeholder.
 */
export function ProductImage({
  src,
  alt,
  categorySlug,
  className,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  priority = false,
}: {
  src: string | null;
  alt: string;
  categorySlug: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-lg bg-slate-100", className)}>
      {isPermitted(src) ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-contain p-4" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400" role="img" aria-label={`${alt} — image not available`}>
          <CategoryIcon slug={categorySlug} className="h-10 w-10" strokeWidth={1.5} />
          <span className="text-[11px] font-medium tracking-wide uppercase">Image not available</span>
        </div>
      )}
    </div>
  );
}
