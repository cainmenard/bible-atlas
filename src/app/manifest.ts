import type { MetadataRoute } from "next";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_THEME_COLOR,
  SITE_ACCENT_COLOR,
} from "@/lib/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: SITE_THEME_COLOR,
    theme_color: SITE_ACCENT_COLOR,
    orientation: "any",
    categories: ["education", "reference", "books"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
