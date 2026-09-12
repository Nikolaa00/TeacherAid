export type Phase = "lobby" | "question" | "reveal" | "leaderboard" | "summary";

export const PHASES: Phase[] = ["lobby", "question", "reveal", "leaderboard", "summary"];

export interface QuestionContent {
  id: string;
  type: "prediction" | "quiz";
  prompt: string;
  options: string[];
  correct: number | null;
  reasonPrompt: string;
  reveal: string;
}

export interface SessionContent {
  app: string;
  code: string;
  subject: string;
  className: string;
  school: string;
  topic: string;
  generatedLabel: string;
  questions: QuestionContent[];
}

export interface Player {
  nick: string;
  points: number;
  joinedAt: number;
}

export interface Answer {
  nick: string;
  choice: number;
  reason: string;
  at: number;
}

export interface Award {
  reason: number;
  speed: number;
  correct: number;
  total: number;
}

export interface LeaderboardRow {
  nick: string;
  points: number;
  rank: number;
}

/** What the phone knows about itself. `null` when the nick is not in the session. */
export interface Me {
  nick: string;
  choice: number | null;
  reason: string | null;
  points: number;
  award: Award | null;
  rank: number | null;
}

/** The public question: `correct` and `reveal` are withheld until the reveal phase. */
export interface PublicQuestion {
  id: string;
  type: "prediction" | "quiz";
  prompt: string;
  options: string[];
  reasonPrompt: string;
  correct: number | null;
  reveal: string | null;
}

export interface SessionState {
  code: string;
  phase: Phase;
  qIndex: number;
  question: PublicQuestion | null;
  hasNext: boolean;
  session: Omit<SessionContent, "questions" | "code">;
  players: Player[];
  counts: number[];
  answered: number;
  reasons: Answer[];
  awards: Record<string, Award>;
  leaderboard: LeaderboardRow[];
  totals: { joined: number; answered: number; reasons: number; durationSec: number };
  me?: Me | null;
}

export type AdvanceAction = "next" | "nextQuestion" | "reset";

export interface Meta {
  phase: Phase;
  qIndex: number;
  createdAt: number;
  openedAt: Record<string, number>;
  revealedAt: Record<string, number>;
  scored: number[];
}
