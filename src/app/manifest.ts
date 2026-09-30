import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IRON LOG",
    short_name: "IRON LOG",
    description: "A mobile-first workout log for routines, sets, and progress.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0e11",
    theme_color: "#0e0e11",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
