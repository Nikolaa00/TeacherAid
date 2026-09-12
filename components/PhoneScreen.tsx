"use client";

import { useEffect, useState } from "react";
import { Mark } from "./Mark";
import { VoteBars } from "./VoteBars";
import { useIsClient } from "@/lib/browser";
import { setStoredNick, useStoredNick } from "@/lib/nick-store";
import { randomNickname } from "@/lib/nicknames";
import { useSession } from "@/lib/use-session";
import type { SessionState } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function PhoneScreen({ code }: { code: string }) {
  const ready = useIsClient();
  const nick = useStoredNick(code);
  // Only ever rendered on the client, so the random default never reaches the server HTML.
  const [draft, setDraft] = useState(() => randomNickname());
  const { state, join, answer } = useSession({ code, nick, pollMs: 1500 });

  const joined = ready && nick !== null && state?.me != null;
  // A stored nick the server no longer knows means the session was reset.
  useEffect(() => {
    if (ready && nick !== null && state && state.me === null) setStoredNick(code, null);
  }, [ready, nick, state, code]);

  const onJoin = async () => {
    const chosen = await join(draft);
    setStoredNick(code, chosen);
  };

  const dark = joined && state && (state.phase === "reveal" || state.phase === "leaderboard" || state.phase === "summary");

  return (
    <div
      className={`min-h-dvh flex flex-col px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-colors duration-300 ${
        dark ? "bg-ink text-amber on-ink" : "bg-amber text-ink"
      }`}
    >
      <header className="flex items-center justify-between text-[1.05rem]">
        <Mark name={state?.session.app ?? "TeacherAid"} className="text-[1.25rem]" />
        {state && (
          <span className={dark ? "text-amber/80" : "text-ink/80"}>
            {state.session.subject} · {state.session.className}
          </span>
        )}
      </header>

      {!ready || !state ? (
        <div className="flex-1 grid place-items-center text-ink/70 text-lg">One moment…</div>
      ) : !joined ? (
        <Join draft={draft} setDraft={setDraft} onJoin={onJoin} />
      ) : state.phase === "lobby" ? (
        <Waiting nick={state.me!.nick} line="Watch the board." />
      ) : state.phase === "question" ? (
        <Question state={state} answer={answer} />
      ) : state.phase === "reveal" ? (
        <Result state={state} />
      ) : state.phase === "leaderboard" ? (
        <Rank state={state} />
      ) : (
        <Done state={state} />
      )}
    </div>
  );
}

function Join({ draft, setDraft, onJoin }: { draft: string; setDraft: (v: string) => void; onJoin: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="flex-1 flex flex-col pt-10">
      <p className="text-lg text-ink/80">Your name for today</p>
      <label className="block mt-3">
        <span className="sr-only">Nickname</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={24}
          autoComplete="off"
          enterKeyHint="go"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) {
              setBusy(true);
              void onJoin().finally(() => setBusy(false));
            }
          }}
          className="w-full bg-transparent border-b-2 border-ink font-display font-semibold text-[2.25rem] leading-tight py-2 placeholder:text-ink/40"
        />
      </label>
      <button type="button" onClick={() => setDraft(randomNickname())} className="self-start mt-4 text-lg underline underline-offset-4">
        Give me another
      </button>
      <button
        type="button"
        disabled={busy || draft.trim().length === 0}
        onClick={() => {
          setBusy(true);
          void onJoin().finally(() => setBusy(false));
        }}
        className="mt-auto w-full min-h-16 rounded-md bg-ink text-amber font-display font-semibold text-[1.5rem] disabled:opacity-60 transition-opacity"
      >
        {busy ? "Joining…" : "Join"}
      </button>
    </section>
  );
}

function Waiting({ nick, line }: { nick: string; line: string }) {
  return (
    <section className="flex-1 flex flex-col pt-14">
      <h1 className="font-display font-semibold text-[3rem] leading-none">You&rsquo;re in.</h1>
      <p className="mt-4 text-[1.375rem] leading-snug">
        {line}
        <br />
        <span className="text-ink/80">{nick}</span>
      </p>
      <p className="mt-auto flex items-center gap-3 text-ink/70 text-lg">
        <span className="pulse-dot inline-block h-3 w-3 rounded-full bg-ink" />
        Waiting for the teacher
      </p>
    </section>
  );
}

function Question({ state, answer }: { state: SessionState; answer: (q: number, c: number, r: string) => Promise<boolean> }) {
  const q = state.question!;
  const me = state.me!;
  const [choice, setChoice] = useState<number | null>(me.choice);
  const [reason, setReason] = useState(me.reason ?? "");
  const [sent, setSent] = useState(me.choice !== null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (choice === null) return;
    setBusy(true);
    const ok = await answer(state.qIndex, choice, reason);
    setBusy(false);
    if (ok) setSent(true);
  };

  if (sent) {
    return (
      <section className="flex-1 flex flex-col pt-14">
        <h1 className="font-display font-semibold text-[3rem] leading-none">Sent.</h1>
        <p className="mt-4 text-[1.375rem]">
          You said <span className="font-display font-semibold">{LETTERS[choice!]}</span>. Watch the board.
        </p>
        <button type="button" onClick={() => setSent(false)} className="self-start mt-6 text-lg underline underline-offset-4">
          Change my answer
        </button>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col pt-6">
      <p className="text-sm uppercase tracking-[0.12em] text-ink/70">{q.type === "prediction" ? "Opener" : "Pop-up"}</p>
      <h2 className="font-display font-semibold text-[1.75rem] leading-[1.15] mt-2">{q.prompt}</h2>
      <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Your answer">
        {q.options.map((label, i) => {
          const on = choice === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChoice(i)}
              className={`min-h-16 w-full rounded-md border-2 border-ink px-4 py-3 text-left text-[1.125rem] leading-snug grid grid-cols-[1.75rem_1fr] items-center gap-3 transition-colors duration-150 ${
                on ? "bg-ink text-amber" : "bg-transparent text-ink"
              }`}
            >
              <span className="font-display font-bold text-xl">{LETTERS[i]}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <div className={`mt-5 transition-opacity duration-200 ${choice === null ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <label className="block">
          <span className="sr-only">Reason</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={80}
            placeholder={q.reasonPrompt}
            enterKeyHint="send"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) void send();
            }}
            className="w-full bg-transparent border-b-2 border-ink text-[1.25rem] py-2 placeholder:text-ink/50"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={choice === null || busy}
        onClick={() => void send()}
        className="mt-auto w-full min-h-16 rounded-md bg-ink text-amber font-display font-semibold text-[1.5rem] disabled:opacity-40 transition-opacity"
      >
        {busy ? "Sending…" : "Send"}
      </button>
    </section>
  );
}

function Result({ state }: { state: SessionState }) {
  const q = state.question!;
  const me = state.me!;
  const answered = me.choice !== null;
  const right = q.correct !== null && me.choice === q.correct;
  const award = me.award;
  return (
    <section className="flex-1 flex flex-col pt-8">
      {answered ? (
        <>
          <p className="text-amber/80 text-lg">You said</p>
          <p className="font-display font-semibold text-[1.75rem] leading-tight mt-1">
            {LETTERS[me.choice!]} · {q.options[me.choice!]}
          </p>
          {q.correct !== null && (
            <p className="mt-2 text-lg">{right ? "Right." : `Not this time — it was ${LETTERS[q.correct]}.`}</p>
          )}
        </>
      ) : (
        <p className="font-display font-semibold text-[1.75rem] leading-tight">You didn&rsquo;t answer this one.</p>
      )}
      <div className="mt-6">
        <VoteBars options={q.options} counts={state.counts} revealed correct={q.correct} size="phone" />
      </div>
      <p className="mt-5 text-[1.05rem] leading-snug text-amber/85">{q.reveal}</p>
      <div className="mt-auto pt-6">
        {award && award.total > 0 ? (
          <>
            <p className="text-amber/80 text-lg">
              {[award.reason > 0 && `+${award.reason} for your reason`, award.speed > 0 && `+${award.speed} for speed`, award.correct > 0 && `+${award.correct} correct`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="font-display font-semibold text-[3.5rem] leading-none mt-2">
              {me.points} <span className="text-[1.5rem] font-normal text-amber/80">points</span>
            </p>
          </>
        ) : (
          <p className="text-amber/80 text-lg">No points this round. A reason next time scores 20.</p>
        )}
      </div>
    </section>
  );
}

function Rank({ state }: { state: SessionState }) {
  const me = state.me!;
  return (
    <section className="flex-1 flex flex-col pt-12">
      <p className="text-amber/80 text-lg">Today&rsquo;s class</p>
      <p className="font-display font-semibold text-[7rem] leading-none mt-2">#{me.rank ?? "–"}</p>
      <p className="text-[1.375rem] mt-2">
        of {state.totals.joined} · {me.points} points
      </p>
      <p className="mt-auto text-amber/70 text-lg">School and national boards update tonight.</p>
    </section>
  );
}

function Done({ state }: { state: SessionState }) {
  const me = state.me!;
  return (
    <section className="flex-1 flex flex-col pt-14">
      <h1 className="font-display font-semibold text-[3rem] leading-none">Class over.</h1>
      <p className="mt-4 text-[1.375rem]">
        Thanks, {me.nick}. {me.points} points today.
      </p>
    </section>
  );
}
