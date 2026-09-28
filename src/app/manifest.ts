import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IRON LOG",
    short_name: "IRON LOG",
    description: "A mobile-first workout log for routines, sets, and progress.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e11",
    theme_color: "#0e0e11",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
