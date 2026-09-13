"use client";

import { QRCodeSVG } from "qrcode.react";

/** Green modules on cream — scan reliability over branding. */
export function QR({ value, size = 480, className = "" }: { value: string; size?: number; className?: string }) {
  return (
    <div className={`bg-brand-cream rounded-sm ${className}`} style={{ width: size, height: size }}>
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={2}
        bgColor="#f7f2e1"
        fgColor="#697234"
        title="Scan to join today's class"
      />
    </div>
  );
}
