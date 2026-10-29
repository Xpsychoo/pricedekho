import { Scale } from "lucide-react";
import Link from "next/link";
import { CategoryNavigation } from "./CategoryNavigation";
import { MobileMenu } from "./MobileMenu";
import { SearchBar } from "./SearchBar";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-slate-900" aria-label="PriceDekho home">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Scale className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="text-lg tracking-tight">
            Price<span className="text-brand-600">Dekho</span>
          </span>
        </Link>
        <div className="hidden flex-1 md:block md:max-w-xl md:px-4">
          <SearchBar />
        </div>
        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 md:flex">
          <Link href="/categories" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            Categories
          </Link>
          <Link href="/how-it-works" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            How it works
          </Link>
        </nav>
        <div className="ml-auto md:hidden">
          <MobileMenu />
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchBar />
      </div>
      <div className="mx-auto hidden max-w-7xl px-4 pb-2 sm:px-6 md:block">
        <CategoryNavigation />
      </div>
    </header>
  );
}
