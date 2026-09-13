"use client";

import { Mark } from "./Mark";
import { QR } from "./QR";
import { useOrigin } from "@/lib/browser";
import { content } from "@/lib/content";

export function PrintSheet({ code }: { code: string }) {
  const origin = useOrigin();
  const url = origin ? `${origin}/j/${code}` : "";
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-10 p-12 text-center print:gap-8">
      <Mark name={content.app} className="text-[2rem]" />
      <h1 className="font-display font-semibold text-brand-red text-[3rem] leading-[1] tracking-tight max-w-[14ch]">
        Scan to join today&rsquo;s class.
      </h1>
      {url ? <QR value={url} size={520} /> : <div style={{ width: 520, height: 520 }} />}
      <p className="font-normal text-[1.75rem] text-brand-black break-all">{url.replace(/^https?:\/\//, "")}</p>
      <p className="font-display font-medium text-brand-green text-xl">
        {content.subject} · {content.className} · {content.school}
      </p>
      <button
        type="button"
        onClick={() => window.print()}
        className="print:hidden mt-4 rounded-md bg-brand-red text-brand-cream px-6 py-3 text-lg font-display font-semibold"
      >
        Print A4
      </button>
    </main>
  );
}
