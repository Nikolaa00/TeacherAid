"use client";

import { useSyncExternalStore } from "react";

/**
 * The phone's identity for one session code, kept in localStorage and
 * mirrored through a tiny store so React re-renders on change (storage
 * events only fire in *other* tabs).
 */
const listeners = new Set<() => void>();
const cache = new Map<string, string | null>();

function keyFor(code: string) {
  return `ta:nick:${code}`;
}

function read(code: string): string | null {
  if (cache.has(code)) return cache.get(code)!;
  let v: string | null = null;
  try {
    v = localStorage.getItem(keyFor(code));
  } catch {}
  cache.set(code, v);
  return v;
}

export function setStoredNick(code: string, nick: string | null) {
  cache.set(code, nick);
  try {
    if (nick === null) localStorage.removeItem(keyFor(code));
    else localStorage.setItem(keyFor(code), nick);
  } catch {}
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useStoredNick(code: string): string | null {
  return useSyncExternalStore(subscribe, () => read(code), () => null);
}
