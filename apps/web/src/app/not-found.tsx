import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/States";

export default function NotFound() {
  return (
    <EmptyState
      icon={PackageSearch}
      title="Page not found"
      description="The product or page you were looking for doesn't exist or is no longer listed."
      action={
        <Link href="/search" className="text-sm font-medium text-brand-700 underline underline-offset-2">
          Search products
        </Link>
      }
    />
  );
}
