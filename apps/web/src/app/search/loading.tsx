import { LoadingSkeleton } from "@/components/States";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
      <LoadingSkeleton />
    </div>
  );
}
