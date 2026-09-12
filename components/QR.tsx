"use client";

import { QRCodeSVG } from "qrcode.react";

/** Ink on paper, no logo in the middle — scan reliability over branding. */
export function QR({ value, size = 480, className = "" }: { value: string; size?: number; className?: string }) {
  return (
    <div className={`bg-paper rounded-sm ${className}`} style={{ width: size, height: size }}>
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={2}
        bgColor="transparent"
        fgColor="#3b3128"
        title="Scan to join today's class"
      />
    </div>
  );
}
