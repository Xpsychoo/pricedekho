import { SearchX, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = SearchX,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-slate-400" aria-hidden strokeWidth={1.5} />
      <h2 className="mt-3 text-base font-semibold text-slate-900">{title}</h2>
      {description && <div className="mt-1 max-w-md text-sm text-slate-600">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action }: { title?: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <TriangleAlert className="h-10 w-10 text-red-500" aria-hidden strokeWidth={1.5} />
      <h2 className="mt-3 text-base font-semibold text-red-900">{title}</h2>
      {description && <div className="mt-1 max-w-md text-sm text-red-800">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}

/** Placeholder layouts shown by loading.tsx boundaries. */
export function LoadingSkeleton({ variant = "grid", count = 8 }: { variant?: "grid" | "detail"; count?: number }) {
  if (variant === "detail") {
    return (
      <div aria-busy="true" aria-label="Loading" className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-6 h-40 w-full" />
        </div>
      </div>
    );
  }
  return (
    <ul aria-busy="true" aria-label="Loading" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="rounded-xl border border-slate-200 bg-white p-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-3 h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </li>
      ))}
    </ul>
  );
}
