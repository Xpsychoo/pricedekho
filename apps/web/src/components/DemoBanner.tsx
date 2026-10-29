import { FlaskConical } from "lucide-react";
import Link from "next/link";

/** Site-wide notice shown whenever the catalog is the bundled demo data. */
export function DemoBanner() {
  return (
    <div role="note" className="border-b border-violet-200 bg-violet-50">
      <p className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2 text-xs text-violet-950 sm:items-center sm:px-6 sm:text-sm">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
        <span>
          <strong>Demo mode:</strong> stores, prices and offers on this site are fictional sample data, not real retailer prices.{" "}
          <Link href="/how-it-works#data-sources" className="font-medium underline underline-offset-2">
            Learn more
          </Link>
        </span>
      </p>
    </div>
  );
}
