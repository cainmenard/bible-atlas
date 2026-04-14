import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/site-config";

const ABOUT_TITLE = "About";
const ABOUT_DESCRIPTION =
  "Learn how Bible Atlas visualizes the 42,000+ cross-references of the Treasury of Scripture Knowledge, connects them to daily liturgical readings, and renders the result as an interactive constellation and arc diagram.";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    type: "article",
    url: `${SITE_URL}/about`,
    siteName: SITE_NAME,
    title: `${ABOUT_TITLE} — ${SITE_NAME}`,
    description: ABOUT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${ABOUT_TITLE} — ${SITE_NAME}`,
    description: ABOUT_DESCRIPTION,
  },
};

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
