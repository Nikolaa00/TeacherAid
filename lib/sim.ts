import { content, getQuestion, sessionInfo, toPublicQuestion } from "./content";
import { buildLeaderboard, computeAwards, countVotes } from "./scoring";
import type { AdvanceAction, Answer, Award, Me, Meta, Player, SessionState } from "./types";

/**
 * A local stand-in for the server: same phases, same scoring, fake students.
 * Used when the venue network fails (`/host?sim=1` or the S key) and for
 * rehearsing without phones. Runs entirely in the browser tab.
 */

const FAKE_STUDENTS = ["Ana K.", "Marko", "Elena", "Filip", "Sara", "Nikola", "Teodora", "Bojan"];

const FAKE_REASONS: Record<string, string[]> = {
  snow: [
    "Pelister already has some",
    "It was warm last year",
    "My grandma says so",
    "Climate change",
    "December is the new November",
    "Never before the 1st in years",
  ],
  pelister: ["We hiked it", "Saw it on a sign", "Guessing", "Geography class last year"],
};

const WEIGHTS = [0.45, 0.3, 0.15, 0.1];

function weightedChoice(n: number): number {
  const w = WEIGHTS.slice(0, n);
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < n; i++) {
    r -= w[i];
    if (r <= 0) return i;
  }
  return n - 1;
}

export class Simulator {
  private meta: Meta;
  private players: Record<string, Player> = {};
  private answers: Record<number, Record<string, Answer>> = {};
  private awards: Record<number, Record<string, Award>> = {};
  private timers: ReturnType<typeof setTimeout>[] = [];
  private listeners = new Set<() => void>();

  constructor(private code: string) {
    this.meta = { phase: "lobby", qIndex: 0, createdAt: Date.now(), openedAt: {}, revealedAt: {}, scored: [] };
    this.scheduleJoins();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  destroy() {
    this.clearTimers();
    this.listeners.clear();
  }

  private scheduleJoins() {
    let t = 700;
    for (const name of FAKE_STUDENTS.slice(0, 7)) {
      this.later(t, () => this.join(name));
      t += 500 + Math.random() * 700;
    }
  }

  private scheduleAnswers(q: number) {
    const question = getQuestion(q);
    if (!question) return;
    const reasons = FAKE_REASONS[question.id] ?? [];
    Object.keys(this.players).forEach((nick, i) => {
      if (!FAKE_STUDENTS.includes(nick)) return;
      const delay = 900 + i * 650 + Math.random() * 1500;
      this.later(delay, () => {
        const choice = question.correct !== null && Math.random() < 0.55 ? question.correct : weightedChoice(question.options.length);
        const reason = Math.random() < 0.75 ? reasons[Math.floor(Math.random() * reasons.length)] ?? "" : "";
        this.answer(nick, q, choice, reason);
      });
    });
  }

  join(wanted: string): string {
    const base = wanted.trim() || "Student";
    let nick = base;
    for (let n = 2; this.players[nick] && n < 50; n++) nick = `${base} ${n}`;
    this.players[nick] = { nick, points: 0, joinedAt: Date.now() };
    this.emit();
    return nick;
  }

  answer(nick: string, q: number, choice: number, reason: string): boolean {
    if (this.meta.phase !== "question" || this.meta.qIndex !== q || !this.players[nick]) return false;
    const bucket = (this.answers[q] ??= {});
    bucket[nick] = { nick, choice, reason: reason.trim().slice(0, 80), at: bucket[nick]?.at ?? Date.now() };
    this.emit();
    return true;
  }

  private score(q: number) {
    const question = getQuestion(q);
    if (!question || this.meta.scored.includes(q)) return;
    const awards = computeAwards(Object.values(this.answers[q] ?? {}), question.correct);
    for (const [nick, a] of Object.entries(awards)) {
      if (this.players[nick]) this.players[nick].points += a.total;
    }
    this.awards[q] = awards;
    this.meta.scored = [...this.meta.scored, q];
  }

  advance(action: AdvanceAction) {
    const now = Date.now();
    const open = (q: number) => {
      this.meta = { ...this.meta, phase: "question", qIndex: q, openedAt: { ...this.meta.openedAt, [q]: now } };
      this.scheduleAnswers(q);
    };
    if (action === "reset") {
      this.clearTimers();
      this.players = {};
      this.answers = {};
      this.awards = {};
      this.meta = { phase: "lobby", qIndex: 0, createdAt: now, openedAt: {}, revealedAt: {}, scored: [] };
      this.scheduleJoins();
    } else if (action === "nextQuestion") {
      if (this.meta.phase === "reveal" && getQuestion(this.meta.qIndex + 1)) open(this.meta.qIndex + 1);
      else if (this.meta.phase === "reveal") this.meta = { ...this.meta, phase: "leaderboard" };
    } else {
      switch (this.meta.phase) {
        case "lobby":
          open(0);
          break;
        case "question":
          this.meta = { ...this.meta, phase: "reveal", revealedAt: { ...this.meta.revealedAt, [this.meta.qIndex]: now } };
          this.score(this.meta.qIndex);
          break;
        case "reveal":
          this.meta = { ...this.meta, phase: "leaderboard" };
          break;
        case "leaderboard":
          this.meta = { ...this.meta, phase: "summary" };
          break;
      }
    }
    this.emit();
  }

  getState(nick?: string | null): SessionState {
    const meta = this.meta;
    const q = getQuestion(meta.qIndex);
    const revealed = meta.phase !== "lobby" && meta.phase !== "question";
    const players = Object.values(this.players).sort((a, b) => a.joinedAt - b.joinedAt);
    const answers = meta.phase === "lobby" ? [] : Object.values(this.answers[meta.qIndex] ?? {});
    const awards = revealed ? this.awards[meta.qIndex] ?? {} : {};
    const leaderboard = buildLeaderboard(players);
    const openedAt = meta.openedAt[0];
    const endAt = meta.revealedAt[meta.qIndex] ?? Date.now();

    let me: Me | null | undefined;
    if (nick !== undefined && nick !== null) {
      const p = this.players[nick];
      if (!p) me = null;
      else {
        const mine = answers.find((a) => a.nick === nick);
        me = {
          nick,
          choice: mine?.choice ?? null,
          reason: mine?.reason ?? null,
          points: p.points,
          award: awards[nick] ?? null,
          rank: leaderboard.find((r) => r.nick === nick)?.rank ?? null,
        };
      }
    }

    return {
      code: this.code,
      phase: meta.phase,
      qIndex: meta.qIndex,
      question: q ? toPublicQuestion(q, revealed) : null,
      hasNext: !!getQuestion(meta.qIndex + 1),
      session: sessionInfo,
      players,
      counts: q ? countVotes(answers, q.options.length) : [],
      answered: answers.length,
      reasons: revealed ? answers.filter((a) => a.reason.trim()).sort((a, b) => a.at - b.at) : [],
      awards,
      leaderboard,
      totals: {
        joined: players.length,
        answered: answers.length,
        reasons: answers.filter((a) => a.reason.trim()).length,
        durationSec: openedAt ? Math.max(0, Math.round((endAt - openedAt) / 1000)) : 0,
      },
      me,
    };
  }
}

export const SIM_QUESTION_COUNT = content.questions.length;
