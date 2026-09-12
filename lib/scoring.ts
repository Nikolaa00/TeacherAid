import type { Answer, Award, LeaderboardRow, Player } from "./types";

export const POINTS = {
  reason: 20,
  speed: [30, 20, 10],
  correct: 100,
} as const;

/**
 * Points for one question. Deterministic: same answers in, same awards out.
 * Speed bonus goes to the first three to answer; a reason scores whether or not
 * the answer was right — the opener rewards committing to a guess.
 */
export function computeAwards(answers: Answer[], correct: number | null): Record<string, Award> {
  const ordered = [...answers].sort((a, b) => a.at - b.at);
  const awards: Record<string, Award> = {};
  ordered.forEach((a, i) => {
    const reason = a.reason.trim().length > 0 ? POINTS.reason : 0;
    const speed = POINTS.speed[i] ?? 0;
    const right = correct !== null && a.choice === correct ? POINTS.correct : 0;
    awards[a.nick] = { reason, speed, correct: right, total: reason + speed + right };
  });
  return awards;
}

export function countVotes(answers: Answer[], optionCount: number): number[] {
  const counts = new Array<number>(optionCount).fill(0);
  for (const a of answers) if (a.choice >= 0 && a.choice < optionCount) counts[a.choice] += 1;
  return counts;
}

/** Sorted by points, then by join order so the board is stable between polls. */
export function buildLeaderboard(players: Player[]): LeaderboardRow[] {
  const sorted = [...players].sort((a, b) => b.points - a.points || a.joinedAt - b.joinedAt);
  let rank = 0;
  let last = Number.NaN;
  return sorted.map((p, i) => {
    if (p.points !== last) {
      rank = i + 1;
      last = p.points;
    }
    return { nick: p.nick, points: p.points, rank };
  });
}
