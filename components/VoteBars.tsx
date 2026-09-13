const LETTERS = ["A", "B", "C", "D", "E", "F"];

interface Props {
  options: string[];
  counts: number[];
  revealed: boolean;
  /** Index of the correct option (quiz) — amber at reveal. Predictions highlight the crowd's pick. */
  correct: number | null;
  /** "board" for the live question, "compact" for the reveal column, "phone" for the ink result screen. */
  size?: "board" | "compact" | "phone";
}

export function VoteBars({ options, counts, revealed, correct, size = "board" }: Props) {
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...counts);
  const crowd = counts.indexOf(max);
  const highlight = revealed ? (correct ?? (total > 0 ? crowd : -1)) : -1;
  const board = size !== "phone";
  const big = size === "board";

  return (
    <ol className={big ? "grid gap-3" : board ? "grid gap-2.5" : "grid gap-2"}>
      {options.map((label, i) => {
        const count = counts[i] ?? 0;
        const scale = total === 0 ? 0 : Math.max(count / max, count > 0 ? 0.06 : 0);
        const pct = total === 0 ? 0 : Math.round((count / total) * 100);
        const isHit = i === highlight;
        return (
          <li
            key={i}
            className={
              big
                ? "grid grid-cols-[3rem_1fr_5.5rem] items-center gap-5"
                : board
                  ? "grid grid-cols-[2.5rem_1fr_5rem] items-center gap-4"
                  : "grid grid-cols-[1.75rem_1fr_3.25rem] items-center gap-3"
            }
          >
            <span
              className={`font-display font-semibold leading-none ${big ? "text-[2.25rem]" : board ? "text-[1.75rem]" : "text-lg"} ${
                isHit ? (board ? "text-brand-red" : "text-brand-cream") : board ? "text-brand-green" : "opacity-70"
              }`}
            >
              {LETTERS[i]}
            </span>
            <div className="min-w-0">
              <div className={`font-normal ${big ? "text-[1.45rem] leading-tight mb-1.5" : board ? "text-[1.25rem] leading-tight mb-1.5" : "text-base leading-snug mb-1"} truncate`}>
                {label}
              </div>
              <div
                className={`relative w-full overflow-hidden rounded-[3px] ${big ? "h-6 bg-paper-3" : board ? "h-5 bg-paper-3" : "h-3 bg-paper/15"}`}
                role="img"
                aria-label={`${label}: ${count} votes`}
              >
                <div
                  className={`bar-fill absolute inset-0 rounded-[3px] ${
                    isHit ? (board ? "bg-brand-red" : "bg-brand-cream") : board ? "bg-brand-green" : "bg-brand-cream/60"
                  }`}
                  style={{ transform: `scaleX(${scale})` }}
                />
              </div>
            </div>
            <div className={`font-display font-semibold tabular text-right leading-none ${big ? "text-[2.25rem]" : board ? "text-[1.75rem]" : "text-lg"}`}>
              {revealed ? `${pct}%` : count}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
