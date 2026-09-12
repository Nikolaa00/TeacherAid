"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Simulator } from "./sim";
import type { AdvanceAction, SessionState } from "./types";

interface Options {
  code: string;
  /** Phone identity; `undefined` for the host, `null` for a phone that has not joined. */
  nick?: string | null;
  /** Run the local simulator instead of the server. */
  sim?: boolean;
  /** Host key for advance/reset. */
  hostKey?: string;
  pollMs?: number;
}

interface Session {
  state: SessionState | null;
  error: string | null;
  act: (action: AdvanceAction) => Promise<void>;
  join: (nick: string) => Promise<string>;
  answer: (qIndex: number, choice: number, reason: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * One hook for both screens. Polling, not sockets: nothing to reconnect on
 * stage, and 1–2 s of latency is invisible for a vote.
 */
export function useSession({ code, nick, sim = false, hostKey = "bitola", pollMs = 1000 }: Options): Session {
  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const simRef = useRef<Simulator | null>(null);
  const busy = useRef(false);
  const nickRef = useRef(nick);
  useEffect(() => {
    nickRef.current = nick;
  }, [nick]);

  // Simulator: local state machine, re-render on every emit.
  useEffect(() => {
    if (!sim) {
      simRef.current?.destroy();
      simRef.current = null;
      return;
    }
    const s = new Simulator(code);
    simRef.current = s;
    const push = () => setState(s.getState(nickRef.current));
    push();
    const unsubscribe = s.subscribe(push);
    const tick = setInterval(push, 500); // keeps durationSec moving
    return () => {
      unsubscribe();
      clearInterval(tick);
      s.destroy();
      simRef.current = null;
    };
  }, [sim, code]);

  const refresh = useCallback(async () => {
    if (simRef.current) {
      setState(simRef.current.getState(nickRef.current));
      return;
    }
    if (busy.current) return;
    busy.current = true;
    try {
      const params = new URLSearchParams({ code });
      if (nickRef.current !== undefined && nickRef.current !== null) params.set("nick", nickRef.current);
      const res = await fetch(`/api/state?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`state ${res.status}`);
      setState((await res.json()) as SessionState);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "network");
    } finally {
      busy.current = false;
    }
  }, [code]);

  // Server: poll.
  useEffect(() => {
    if (sim) return;
    void refresh();
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [sim, refresh, pollMs, nick]);

  const act = useCallback(
    async (action: AdvanceAction) => {
      if (simRef.current) {
        simRef.current.advance(action);
        return;
      }
      try {
        const res = await fetch("/api/advance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, key: hostKey, action }),
        });
        if (!res.ok) throw new Error(`advance ${res.status}`);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "network");
      }
    },
    [code, hostKey, refresh],
  );

  const join = useCallback(
    async (wanted: string) => {
      if (simRef.current) return simRef.current.join(wanted);
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, nick: wanted }),
      });
      if (!res.ok) throw new Error(`join ${res.status}`);
      const data = (await res.json()) as { nick: string };
      return data.nick;
    },
    [code],
  );

  const answer = useCallback(
    async (qIndex: number, choice: number, reason: string) => {
      const who = nickRef.current;
      if (!who) return false;
      if (simRef.current) return simRef.current.answer(who, qIndex, choice, reason);
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, nick: who, qIndex, choice, reason }),
      });
      if (res.ok) void refresh();
      return res.ok;
    },
    [code, refresh],
  );

  return { state, error, act, join, answer, refresh };
}
