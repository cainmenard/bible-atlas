import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bible Atlas — Interactive Cross-Reference Star Map",
  description:
    "An interactive force-directed graph visualization of the Bible's cross-reference network, combined with daily Catholic Mass readings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
