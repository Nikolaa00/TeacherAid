import type { MetadataRoute } from "next";
import { content } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: content.app,
    short_name: content.app,
    description: "Every class starts with a question.",
    start_url: `/j/${content.code}`,
    display: "standalone",
    background_color: "#f7f2e1",
    theme_color: "#ba3e3e",
    icons: [{ src: "/logo.png", sizes: "any", type: "image/png", purpose: "any" }],
  };
}
