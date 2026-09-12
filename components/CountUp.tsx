"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

/** Animates a number toward its new value; transform-free, text only. */
export function CountUp({ value, className = "", duration = 0.6 }: { value: number; className?: string; duration?: number }) {
  const el = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || Math.abs(value - shown.current) < 1) {
      node.textContent = String(value);
      shown.current = value;
      return;
    }
    const proxy = { n: shown.current };
    const tween = gsap.to(proxy, {
      n: value,
      duration,
      ease: "expo.out",
      onUpdate: () => {
        node.textContent = String(Math.round(proxy.n));
      },
      onComplete: () => {
        shown.current = value;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, duration]);

  return (
    <span ref={el} className={`tabular ${className}`}>
      {value}
    </span>
  );
}
