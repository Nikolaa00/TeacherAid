import type { MetadataRoute } from "next";
import { content } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: content.app,
    short_name: content.app,
    description: "Every class starts with a question.",
    start_url: `/j/${content.code}`,
    display: "standalone",
    background_color: "#f8f5ef",
    theme_color: "#f2b544",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
