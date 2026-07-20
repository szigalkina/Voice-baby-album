import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voice Memory Album",
    short_name: "MemoryAlbum",
    description: "The moments you love, told in your own voice.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2efe9",
    theme_color: "#f2efe9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
