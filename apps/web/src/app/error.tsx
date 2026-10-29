"use client";

import { ErrorState } from "@/components/States";

/** Route-level error boundary. Never renders error details to visitors. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      description="An unexpected error occurred while loading this page."
      action={
        <button type="button" onClick={reset} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-900 ring-1 ring-red-200 hover:bg-red-100">
          Try again
        </button>
      }
    />
  );
}
