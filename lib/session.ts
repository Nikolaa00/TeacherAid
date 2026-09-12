import { content, getQuestion, sessionInfo, toPublicQuestion } from "./content";
import { cleanNickname } from "./nicknames";
import { buildLeaderboard, computeAwards, countVotes } from "./scoring";
import { store } from "./store";
import type { AdvanceAction, Answer, Award, Me, Meta, Player, SessionState } from "./types";

const keys = (code: string) => ({
  meta: `s:${code}:meta`,
  players: `s:${code}:players`,
  answers: (q: number) => `s:${code}:answers:${q}`,
  awards: (q: number) => `s:${code}:awards:${q}`,
});

const normalizeCode = (code: string) => code.trim().toUpperCase().slice(0, 12);

function freshMeta(): Meta {
  return { phase: "lobby", qIndex: 0, createdAt: Date.now(), openedAt: {}, revealedAt: {}, scored: [] };
}

async function getMeta(code: string): Promise<Meta> {
  return (await store.getJSON<Meta>(keys(code).meta)) ?? freshMeta();
}

async function getPlayers(code: string): Promise<Record<string, Player>> {
  return store.hgetall<Player>(keys(code).players);
}

async function getAnswers(code: string, q: number): Promise<Answer[]> {
  return Object.values(await store.hgetall<Answer>(keys(code).answers(q)));
}

export async function join(codeIn: string, wanted: string): Promise<{ nick: string }> {
  const code = normalizeCode(codeIn);
  const base = cleanNickname(wanted) || "Student";
  const players = await getPlayers(code);
  let nick = base;
  for (let n = 2; players[nick] && n < 50; n++) nick = `${base} ${n}`;
  if (!players[nick]) {
    await store.hset(keys(code).players, nick, { nick, points: 0, joinedAt: Date.now() } satisfies Player);
  }
  return { nick };
}

export async function answer(
  codeIn: string,
  nick: string,
  qIndex: number,
  choice: number,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = normalizeCode(codeIn);
  const meta = await getMeta(code);
  if (meta.phase !== "question" || meta.qIndex !== qIndex) return { ok: false, error: "closed" };
  const q = getQuestion(qIndex);
  if (!q || choice < 0 || choice >= q.options.length) return { ok: false, error: "bad-choice" };
  const players = await getPlayers(code);
  if (!players[nick]) return { ok: false, error: "not-joined" };

  const existing = (await store.hgetall<Answer>(keys(code).answers(qIndex)))[nick];
  const entry: Answer = {
    nick,
    choice,
    reason: reason.trim().slice(0, 80),
    // First tap decides the speed bonus; a changed mind keeps the original time.
    at: existing?.at ?? Date.now(),
  };
  await store.hset(keys(code).answers(qIndex), nick, entry);
  return { ok: true };
}

async function score(code: string, meta: Meta): Promise<Meta> {
  const q = getQuestion(meta.qIndex);
  if (!q || meta.scored.includes(meta.qIndex)) return meta;
  const answers = await getAnswers(code, meta.qIndex);
  const awards = computeAwards(answers, q.correct);
  const players = await getPlayers(code);
  for (const [nick, award] of Object.entries(awards)) {
    const p = players[nick];
    if (!p) continue;
    await store.hset(keys(code).players, nick, { ...p, points: p.points + award.total } satisfies Player);
  }
  await store.setJSON(keys(code).awards(meta.qIndex), awards);
  return { ...meta, scored: [...meta.scored, meta.qIndex] };
}

export async function advance(codeIn: string, action: AdvanceAction): Promise<Meta> {
  const code = normalizeCode(codeIn);
  const k = keys(code);
  if (action === "reset") {
    const drop = [k.meta, k.players];
    content.questions.forEach((_, i) => drop.push(k.answers(i), k.awards(i)));
    await store.del(...drop);
    const meta = freshMeta();
    await store.setJSON(k.meta, meta);
    return meta;
  }

  let meta = await getMeta(code);
  const now = Date.now();
  const open = (q: number): Meta => ({
    ...meta,
    phase: "question",
    qIndex: q,
    openedAt: { ...meta.openedAt, [q]: now },
  });

  if (action === "nextQuestion") {
    if (meta.phase === "reveal" && getQuestion(meta.qIndex + 1)) meta = open(meta.qIndex + 1);
    else if (meta.phase === "reveal") meta = { ...meta, phase: "leaderboard" };
  } else {
    switch (meta.phase) {
      case "lobby":
        meta = open(0);
        break;
      case "question":
        meta = await score(code, { ...meta, phase: "reveal", revealedAt: { ...meta.revealedAt, [meta.qIndex]: now } });
        break;
      case "reveal":
        meta = { ...meta, phase: "leaderboard" };
        break;
      case "leaderboard":
        meta = { ...meta, phase: "summary" };
        break;
      case "summary":
        break;
    }
  }
  await store.setJSON(k.meta, meta);
  return meta;
}

export async function getState(codeIn: string, nick?: string | null): Promise<SessionState> {
  const code = normalizeCode(codeIn);
  const meta = await getMeta(code);
  const q = getQuestion(meta.qIndex);
  const revealed = meta.phase !== "lobby" && meta.phase !== "question";
  const players = Object.values(await getPlayers(code)).sort((a, b) => a.joinedAt - b.joinedAt);
  const answers = meta.phase === "lobby" ? [] : await getAnswers(code, meta.qIndex);
  const awards = revealed ? ((await store.getJSON<Record<string, Award>>(keys(code).awards(meta.qIndex))) ?? {}) : {};
  const leaderboard = buildLeaderboard(players);

  const reasonCount = answers.filter((a) => a.reason.trim().length > 0).length;
  const openedAt = meta.openedAt["0"];
  const endAt = meta.revealedAt[String(meta.qIndex)] ?? Date.now();
  const durationSec = openedAt ? Math.max(0, Math.round((endAt - openedAt) / 1000)) : 0;

  let me: Me | null | undefined;
  if (nick) {
    const p = players.find((x) => x.nick === nick);
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
    code,
    phase: meta.phase,
    qIndex: meta.qIndex,
    question: q ? toPublicQuestion(q, revealed) : null,
    hasNext: !!getQuestion(meta.qIndex + 1),
    session: sessionInfo,
    players,
    counts: q ? countVotes(answers, q.options.length) : [],
    answered: answers.length,
    // Reasons stay private until the reveal so the board cannot be read early.
    reasons: revealed ? answers.filter((a) => a.reason.trim().length > 0).sort((a, b) => a.at - b.at) : [],
    awards,
    leaderboard,
    totals: { joined: players.length, answered: answers.length, reasons: reasonCount, durationSec },
    me,
  };
}
