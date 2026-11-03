import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Wordmark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-semibold tracking-[-0.01em] text-ink">
      <span aria-hidden className="grid size-5 place-items-center rounded-[5px] bg-ink text-[11px] font-bold text-paper">C</span>
      Consultant in a Computer
    </Link>
  );
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 px-5">
      <Wordmark />
      <nav className="ml-4 flex items-center gap-1 text-[13px] text-ink-muted">
        <Link href="/library" className="rounded-md px-2 py-1 hover:bg-muted hover:text-ink">Library</Link>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
