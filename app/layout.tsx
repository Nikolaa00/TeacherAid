import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { content } from "@/lib/content";
import "./globals.css";

const struick = localFont({
  src: "../fonts/struick/Struick.ttf",
  variable: "--font-struick",
  display: "swap",
});

export const metadata: Metadata = {
  title: content.app,
  description: "Every class starts with a question.",
  applicationName: content.app,
  appleWebApp: { capable: true, title: content.app, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ba3e3e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${struick.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
