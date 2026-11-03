import { cn } from "@/lib/utils";

/** The one custom mark: a small four-point spark, used only on AI content. */
export function Spark({ className, size = 14, title }: { className?: string; size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cn("shrink-0 text-signal", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M8 0.8c.35 3.6 1.6 5.95 7.2 7.2-5.6 1.25-6.85 3.6-7.2 7.2-.35-3.6-1.6-5.95-7.2-7.2C6.4 6.75 7.65 4.4 8 .8Z"
        fill="currentColor"
      />
    </svg>
  );
}
