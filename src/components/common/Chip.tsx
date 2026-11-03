import { cn } from "@/lib/utils";

export function Chip({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border border-hairline bg-surface px-2.5 text-[12px] text-ink-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
