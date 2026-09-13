"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CountUp } from "./CountUp";
import { Mark } from "./Mark";
import { QR } from "./QR";
import { VoteBars } from "./VoteBars";
import { useOrigin, useQrSize } from "@/lib/browser";
import { useSession } from "@/lib/use-session";
import type { SessionState } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

interface Props {
  code: string;
  hostKey: string;
  initialSim: boolean;
  resetOnLoad: boolean;
  /** `?motion=0` — no entrance animations (screenshots, a projector that stutters). */
  motion: boolean;
  /** LAN origin (e.g. http://192.168.88.123:3000) so QR works for phones when the host page is opened via localhost. */
  lanOrigin: string;
}

export function HostScreen({ code, hostKey, initialSim, resetOnLoad, motion, lanOrigin }: Props) {
  const [sim, setSim] = useState(initialSim);
  const { state, error, act } = useSession({ code, sim, hostKey, pollMs: 1000 });
  const origin = useOrigin();
  const qrSize = useQrSize();
  const stage = useRef<HTMLDivElement>(null);
  const didReset = useRef(false);

  useEffect(() => {
    if (resetOnLoad && !didReset.current) {
      didReset.current = true;
      void act("reset");
    }
  }, [resetOnLoad, act]);

  const reset = useCallback(() => {
    if (window.confirm("Reset the session? Everyone will have to scan again.")) void act("reset");
  }, [act]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case " ":
        case "ArrowRight":
        case "Enter":
          e.preventDefault();
          void act("next");
          break;
        case "n":
        case "N":
          void act("nextQuestion");
          break;
        case "r":
        case "R":
          reset();
          break;
        case "s":
        case "S":
          setSim((v) => !v);
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, reset]);

  // One orchestrated entrance per phase; everything else is a 200 ms state change.
  const phase = state?.phase;
  useLayoutEffect(() => {
    if (!stage.current || !phase || !motion) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(stage.current!.querySelectorAll("[data-anim]"), {
        y: 18,
        opacity: 0,
        duration: 0.7,
        ease: "expo.out",
        stagger: 0.07,
        clearProps: "transform,opacity",
      });
    });
    return () => mm.revert();
  }, [phase, motion]);

  // Phones cannot reach "localhost" — swap in the machine's LAN address for the QR.
  const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(origin);
  const qrOrigin = isLoopback && lanOrigin ? lanOrigin : origin;
  const joinUrl = qrOrigin ? `${qrOrigin}/j/${code}` : "";
  const shortUrl = joinUrl.replace(/^https?:\/\//, "");

  return (
    <div ref={stage} className="min-h-dvh flex flex-col p-[clamp(1.5rem,4vw,4rem)] pb-[clamp(1rem,2.5vw,2.5rem)] select-none">
      <Header state={state} sim={sim} error={error} />

      {!state ? (
        <div className="flex-1 grid place-items-center font-normal text-brand-black text-2xl">Connecting…</div>
      ) : state.phase === "lobby" ? (
        <Lobby state={state} joinUrl={joinUrl} shortUrl={shortUrl} qrSize={qrSize} />
      ) : state.phase === "question" ? (
        <Question state={state} joinUrl={joinUrl} />
      ) : state.phase === "reveal" ? (
        <Reveal state={state} />
      ) : state.phase === "leaderboard" ? (
        <Leaderboard state={state} />
      ) : (
        <Summary state={state} />
      )}

      {state?.phase === "lobby" && (
        <p className="mt-6 font-normal text-brand-black text-base" data-anim>
          Space opens the question · then Space reveals · N next question · R reset · S simulation · F fullscreen
        </p>
      )}
    </div>
  );
}

function Header({ state, sim, error }: { state: SessionState | null; sim: boolean; error: string | null }) {
  const s = state?.session;
  return (
    <header className="flex items-start justify-between gap-8 mb-[clamp(1rem,3vh,3rem)]">
      <Mark name={s?.app ?? "TeacherAid"} className="text-[1.75rem]" />
      <div className="text-right leading-tight">
        {s && (
          <>
            <p className="font-display font-medium text-brand-red text-[1.375rem]">
              {s.subject} · {s.className} · {s.school}
            </p>
            <p className="font-display font-medium text-brand-red text-[1.125rem] mt-1">Today: {s.topic}</p>
          </>
        )}
        <p className="text-ink-3 text-sm mt-1 h-5">
          {sim ? "simulation" : error ? <span className="text-signal">reconnecting…</span> : ""}
        </p>
      </div>
    </header>
  );
}

function Lobby({ state, joinUrl, shortUrl, qrSize }: { state: SessionState; joinUrl: string; shortUrl: string; qrSize: number }) {
  return (
    <section className="flex-1 grid grid-cols-[1.1fr_auto] gap-[clamp(2rem,5vw,6rem)] items-center">
      <div>
        <h1 className="font-display font-semibold text-brand-red text-[clamp(2.75rem,5.6vw,5.25rem)] leading-[0.98] tracking-tight max-w-[14ch]" data-anim>
          Scan to join today&rsquo;s class.
        </h1>
        <p className="mt-5 font-normal text-[clamp(1.5rem,2.3vw,2.125rem)] text-brand-black break-all" data-anim>
          {shortUrl || " "}
        </p>
        <div className="mt-[clamp(2rem,6vh,4rem)] flex items-end gap-5" data-anim>
          <CountUp value={state.totals.joined} className="font-display font-semibold text-brand-green text-[clamp(6rem,13vw,11rem)] leading-[0.85]" />
          <span className="font-normal text-[clamp(1.5rem,2.4vw,2.25rem)] text-brand-black pb-2">joined</span>
        </div>
        <ul className="mt-6 flex flex-wrap gap-2.5 max-h-[22vh] overflow-hidden" aria-label="Joined">
          {state.players.map((p) => (
            <li key={p.nick} className="bg-paper-2 font-normal text-brand-black px-3.5 py-1.5 rounded-full text-[1.25rem]">
              {p.nick}
            </li>
          ))}
        </ul>
      </div>
      <div className="justify-self-end" data-anim>
        {joinUrl ? <QR value={joinUrl} size={qrSize} /> : <div style={{ width: qrSize, height: qrSize }} />}
      </div>
    </section>
  );
}

function QuestionLabel({ state }: { state: SessionState }) {
  const q = state.question!;
  return (
    <p className="font-display font-medium text-brand-green text-[1.25rem]" data-anim>
      <span>{q.type === "prediction" ? "Opener" : "Pop-up"}</span> · {state.qIndex + 1} of{" "}
      {state.hasNext ? state.qIndex + 2 : state.qIndex + 1}
      <span> · {state.session.generatedLabel}: {state.session.topic}</span>
    </p>
  );
}

function Question({ state, joinUrl }: { state: SessionState; joinUrl: string }) {
  const q = state.question!;
  return (
    <section className="flex-1 flex flex-col">
      <div className="flex items-start justify-between gap-8">
        <div className="flex-1">
          <QuestionLabel state={state} />
          <h2 className="mt-3 font-display font-semibold text-brand-red text-[clamp(2rem,4vw,4rem)] leading-[1.04] tracking-tight max-w-[24ch]" data-anim>
            {q.prompt}
          </h2>
        </div>
        {joinUrl && (
          <div className="shrink-0 text-center" data-anim>
            <QR value={joinUrl} size={132} />
            <p className="font-normal text-brand-black text-sm mt-1">late? scan</p>
          </div>
        )}
      </div>
      <div className="mt-[clamp(1.25rem,3vh,2.5rem)] max-w-[70rem]" data-anim>
        <VoteBars options={q.options} counts={state.counts} revealed={false} correct={null} />
      </div>
      <div className="mt-auto pt-5 flex items-end gap-4" data-anim>
        <CountUp value={state.answered} className="font-display font-semibold text-brand-red text-[clamp(2.5rem,5vw,4.5rem)] leading-none" />
        <span className="font-normal text-brand-black text-[clamp(1.25rem,2vw,1.75rem)] pb-1">of {state.totals.joined} answered</span>
      </div>
    </section>
  );
}

function Reveal({ state }: { state: SessionState }) {
  const q = state.question!;
  const fastest = Object.entries(state.awards)
    .filter(([, a]) => a.speed > 0)
    .sort((a, b) => b[1].speed - a[1].speed)
    .map(([nick]) => nick);
  return (
    <section className="flex-1 min-h-0 grid grid-cols-[1.15fr_0.85fr] gap-[clamp(2rem,5vw,5rem)]">
      <div className="min-w-0">
        <QuestionLabel state={state} />
        <h2 className="mt-3 font-display font-semibold text-brand-red text-[clamp(1.75rem,3vw,3rem)] leading-[1.06] tracking-tight max-w-[26ch]" data-anim>
          {q.prompt}
        </h2>
        <div className="mt-6" data-anim>
          <VoteBars options={q.options} counts={state.counts} revealed correct={q.correct} size="compact" />
        </div>
        <p className="mt-6 font-normal text-brand-black text-[clamp(1.125rem,1.8vw,1.5rem)] leading-snug max-w-[44ch]" data-anim>
          {q.reveal}
        </p>
        <p className="mt-2 font-normal text-brand-black text-[clamp(1rem,1.4vw,1.25rem)]" data-anim>
          +20 for a reason × {state.totals.reasons}
          {fastest.length > 0 && <> · speed bonus: {fastest.slice(0, 3).join(", ")}</>}
        </p>
      </div>
      <div className="min-w-0 min-h-0">
        <p className="font-display font-medium text-brand-green text-[1.25rem] mb-1" data-anim>
          Why, in their words
        </p>
        <ul className="overflow-hidden max-h-[66vh]">
          {state.reasons.slice(0, 8).map((r) => (
            <li key={r.nick} className="border-t border-paper-3 py-2.5" data-anim>
              <p className="font-normal text-[clamp(1.125rem,1.7vw,1.5rem)] leading-snug">&ldquo;{r.reason}&rdquo;</p>
              <p className="font-normal text-brand-black mt-0.5 text-[1rem]">
                {r.nick} · {LETTERS[r.choice]}
              </p>
            </li>
          ))}
          {state.reasons.length === 0 && (
            <li className="border-t border-paper-3 py-3 font-normal text-brand-black text-[1.25rem]" data-anim>
              Nobody typed a reason this time.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function Leaderboard({ state }: { state: SessionState }) {
  const rows = state.leaderboard.slice(0, 6);
  return (
    <section className="flex-1 flex flex-col">
      <p className="font-display font-medium text-brand-green text-[1.25rem]" data-anim>
        Leaderboard · today&rsquo;s class
      </p>
      <ol className="mt-4 max-w-[60rem]">
        {rows.map((r) => {
          const top = r.rank === 1;
          return (
            <li
              key={r.nick}
              className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-6 py-[clamp(0.5rem,1.2vh,0.875rem)] border-t border-paper-3"
              data-anim
            >
              <span className={`font-display font-semibold text-[clamp(1.75rem,3.2vw,3rem)] leading-none ${top ? "text-brand-red" : "text-brand-green"}`}>
                {r.rank}
              </span>
              <span className="font-display font-semibold text-brand-red text-[clamp(1.75rem,3.2vw,3rem)] leading-none truncate">{r.nick}</span>
              <span className={`font-display font-semibold tabular text-[clamp(1.75rem,3.2vw,3rem)] leading-none ${top ? "text-brand-red" : "text-brand-black"}`}>
                {r.points}
              </span>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="py-4 border-t border-paper-3 font-normal text-brand-black text-[1.5rem]" data-anim>
            Nobody joined this round.
          </li>
        )}
      </ol>
      <p className="mt-auto pt-6 font-normal text-brand-black text-[1.25rem]" data-anim>
        Points roll into the school board and the national one.
      </p>
    </section>
  );
}

function Summary({ state }: { state: SessionState }) {
  const t = state.totals;
  const stats: [number, string][] = [
    [t.joined, "joined"],
    [t.joined, "present"],
    [t.reasons, "reasons"],
    [t.durationSec, "seconds"],
  ];
  return (
    <section className="flex-1 flex flex-col">
      <p className="font-display font-medium text-brand-green text-[1.25rem]" data-anim>
        What the teacher sees
      </p>
      <dl className="mt-[clamp(1rem,4vh,3rem)] grid grid-cols-4 gap-8 max-w-[70rem]">
        {stats.map(([n, label]) => (
          <div key={label} data-anim>
            <dd className="font-display font-semibold text-brand-red tabular text-[clamp(4rem,9vw,8rem)] leading-[0.9]">{n}</dd>
            <dt className="font-normal text-brand-black text-[1.5rem] mt-3">{label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-auto pt-8 font-normal text-brand-black text-[1.5rem] leading-snug max-w-[48ch]" data-anim>
        Attendance was taken by the scan. In class, this screen also shows who left the app and the anonymous questions.
      </p>
    </section>
  );
}
