/** Live caption band at the foot of the room view (Room mode, toggled with J on the console). */
export function CaptionBand({ text }: { text: string }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface/95 px-16 py-6"
      data-testid="room-captions"
      aria-live="polite"
    >
      <p className="mx-auto max-w-[1400px] text-[30px] leading-[1.4] text-ink">{text || " "}</p>
    </div>
  );
}
