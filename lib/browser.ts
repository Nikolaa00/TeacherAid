"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during SSR and hydration, true once the client has taken over. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** The page origin, "" on the server. */
export function useOrigin(): string {
  return useSyncExternalStore(noop, () => window.location.origin, () => "");
}

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

/** Largest square QR that fits the host layout; 0 on the server. */
export function useQrSize(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => Math.floor(Math.min(window.innerHeight * 0.62, window.innerWidth * 0.4)),
    () => 0,
  );
}
