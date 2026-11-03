import { Kbd } from "@/components/common/Kbd";
import { cn } from "@/lib/utils";

export type Shortcut = { keys: string[]; label: string };

/** Raycast-style footer: small, muted, current-context actions. */
export function ShortcutBar({ shortcuts, className, right }: { shortcuts: Shortcut[]; className?: string; right?: React.ReactNode }) {
  return (
    <footer
      className={cn(
        "flex h-9 shrink-0 items-center gap-5 border-t border-hairline px-4 text-[12px] text-ink-muted",
        className,
      )}
    >
      {shortcuts.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5">
          {s.keys.map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
          <span>{s.label}</span>
        </span>
      ))}
      <span className="ml-auto inline-flex items-center gap-3">{right}</span>
    </footer>
  );
}
