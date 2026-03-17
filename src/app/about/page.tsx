"use client";

import Link from "next/link";
import StarBackground from "@/components/StarBackground";

function SectionCard({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass-panel rounded-lg ${className}`}
      style={{ padding: "32px" }}
    >
      <h2
        className="font-mono"
        style={{
          fontSize: "12px",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--accent)",
          marginBottom: "16px",
        }}
      >
        {label}
      </h2>
      <div
        style={{
          height: "1px",
          background: "var(--glass-border)",
          marginBottom: "20px",
        }}
      />
      <div
        className="font-serif"
        style={{
          fontSize: "16px",
          lineHeight: 1.8,
          color: "var(--text-primary)",
          opacity: 0.85,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "var(--accent)",
        textDecoration: "underline",
        textUnderlineOffset: "3px",
        opacity: 0.85,
        transition: "var(--transition-base)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.85";
      }}
    >
      {children}
    </a>
  );
}

export default function AboutPage() {
  return (
    <main
      className="min-h-screen overflow-y-auto relative page-fade-in"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, var(--bg-elevated) 0%, var(--bg-base) 70%)",
      }}
    >
      <StarBackground />

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Back navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono mb-16"
          style={{
            color: "var(--text-primary)",
            fontSize: "12px",
            letterSpacing: "0.06em",
            opacity: 0.85,
            transition: "var(--transition-base)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
        >
          &larr; Back to Atlas
        </Link>

        {/* Hero */}
        <section
          className="glass-panel rounded-lg mb-16"
          style={{ padding: "48px 40px", textAlign: "center" }}
        >
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "32px",
              color: "var(--accent)",
              lineHeight: 1,
            }}
          >
            ☧
          </div>
          <h1
            className="font-serif mt-4"
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              color: "var(--text-primary)",
              fontWeight: 300,
              letterSpacing: "0.04em",
            }}
          >
            Bible Atlas
          </h1>
          <p
            className="font-serif mt-3"
            style={{
              fontSize: "18px",
              color: "var(--text-primary)",
              opacity: 0.7,
              fontStyle: "italic",
              maxWidth: "480px",
              margin: "12px auto 0",
            }}
          >
            An interactive cross-reference star map of Scripture
          </p>
        </section>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SectionCard label="What is Bible Atlas?">
            <p>
              Bible Atlas is an interactive visualization of the Bible&apos;s
              internal cross-reference network. Every book of Scripture is
              represented as a glowing node in a cosmic star map, and the
              connections between them are drawn from centuries of biblical
              scholarship.
            </p>
            <p style={{ marginTop: "16px" }}>
              The denser the scholarly connection between two books, the closer
              they pull together in the constellation. The result is a living map
              of Scripture — a visual representation of how the Bible&apos;s 66+
              books form a single, interconnected whole.
            </p>
          </SectionCard>

          <SectionCard label="How Cross-References Work">
            <p>
              Biblical cross-references are connections between passages that
              share themes, quotations, allusions, prophecies, or narrative
              continuity. Scholars have identified over 63,000 verse-level
              cross-references throughout the Bible.
            </p>
            <p style={{ marginTop: "16px" }}>
              In Bible Atlas, these are aggregated at the book level — each edge
              in the constellation represents the density of cross-reference
              connections between two books, weighted from 1 (occasional) to 10
              (extremely strong). For example, Hebrews draws so heavily from
              Psalms and Leviticus that these connections receive the maximum
              weight of 10.
            </p>
            <p style={{ marginTop: "16px" }}>
              The force-directed layout means books with stronger connections
              naturally cluster together: the Torah books form a chain, the
              Synoptic Gospels cluster tightly, and Psalms and Isaiah sit at the
              gravitational center of the Old Testament — exactly as their
              cross-reference density predicts.
            </p>
          </SectionCard>

          <SectionCard label="Canon System">
            <p>
              Bible Atlas supports four canonical traditions: Catholic (73 books,
              the default), Protestant (66 books), Eastern Orthodox (~76 books),
              and Ethiopian Orthodox (~81 books). The Catholic canon includes the
              seven Deuterocanonical books — Tobit, Judith, 1 &amp; 2 Maccabees,
              Wisdom, Sirach, and Baruch — which are fully integrated into the
              constellation with their own cross-reference connections.
            </p>
            <p style={{ marginTop: "16px" }}>
              Switching canons gracefully adds or removes books from the
              constellation, allowing you to explore how different traditions
              understand the scope of Scripture.
            </p>
          </SectionCard>

          <SectionCard label="Daily Readings">
            <p>
              Each day, the Catholic Church assigns a set of readings for the
              Mass: typically a First Reading (often from the Old Testament), a
              Responsorial Psalm, and a Gospel reading. On Sundays and
              solemnities, a Second Reading from the Epistles is also included.
            </p>
            <p style={{ marginTop: "16px" }}>
              Bible Atlas highlights the books corresponding to today&apos;s
              readings with a pulsing glow on the constellation, and shows the
              day&apos;s reading list in a floating card. The liturgical season —
              Advent, Christmas, Lent, Easter, or Ordinary Time — is reflected in
              a subtle color accent throughout the interface.
            </p>
          </SectionCard>
        </div>

        {/* Data Sources */}
        <SectionCard label="Data Sources" className="mb-6">
          <div
            className="font-mono"
            style={{
              fontSize: "13px",
              lineHeight: 2,
              color: "var(--text-primary)",
              opacity: 0.85,
            }}
          >
            <p>
              Cross-reference weights derived from the{" "}
              <ExternalLink href="https://thetreasuryofscriptureknowledge.com/">
                Treasury of Scripture Knowledge
              </ExternalLink>{" "}
              and{" "}
              <ExternalLink href="https://www.openbible.info/labs/cross-references/">
                OpenBible.info
              </ExternalLink>{" "}
              cross-reference datasets (~340,000 connections).
            </p>
            <p style={{ marginTop: "8px" }}>
              Verse text from{" "}
              <ExternalLink href="https://bible-api.com">
                bible-api.com
              </ExternalLink>{" "}
              (World English Bible, public domain).
            </p>
            <p style={{ marginTop: "8px" }}>
              Daily readings from the{" "}
              <ExternalLink href="https://bible.usccb.org/bible/readings">
                USCCB
              </ExternalLink>{" "}
              with fallback to{" "}
              <ExternalLink href="https://universalis.com">
                Universalis
              </ExternalLink>
              .
            </p>
          </div>
        </SectionCard>

        {/* Inspiration */}
        <SectionCard label="Inspiration" className="mb-6">
          <p>
            Bible Atlas was inspired by{" "}
            <ExternalLink href="https://www.chrisharrison.net/index.php/visualizations/BibleViz">
              Chris Harrison &amp; Christoph R&ouml;mhild&apos;s BibleViz
            </ExternalLink>
            — an arc diagram that renders all 63,779 biblical cross-references
            as colored arcs on a single canvas. Created in 2007, it remains one
            of the most recognized data visualizations of Scripture, revealing
            at a glance the extraordinary density of connections woven through
            the Bible.
          </p>
          <p style={{ marginTop: "16px" }}>
            Harrison&apos;s work demonstrated that the Bible could be understood
            as the first &ldquo;hyperlinked&rdquo; text — a web of quotations,
            allusions, and prophecies that binds its books into a single fabric.
            Bible Atlas takes that insight and turns the static image into a
            living, interactive experience you can explore.
          </p>
          <div
            className="mt-6 overflow-hidden rounded-lg"
            style={{ position: "relative", width: "100%", aspectRatio: "16/9" }}
          >
            <iframe
              src="https://www.youtube.com/embed/HPO1cUXZ8Dk?si=pAP6ZTTWD0bmyjVR"
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          </div>
        </SectionCard>

        {/* About the Creator */}
        <SectionCard label="Built By" className="mb-16">
          <p>
            Bible Atlas was designed and built by{" "}
            <ExternalLink href="https://cainmenard.com">
              Cain Menard
            </ExternalLink>{" "}
            — a software engineer and designer who builds tools at the
            intersection of data, faith, and visual storytelling.
          </p>
          <p style={{ marginTop: "16px" }}>
            The Bible contains over 340,000 cross-references and is considered
            by many to be the first &ldquo;hyperlinked&rdquo; text. Bible Atlas
            aims to make that hidden structure visible — letting anyone
            visualize, explore, and interact with the complexity of Scripture in
            an intuitive, beautiful way.
          </p>
        </SectionCard>

        {/* Footer */}
        <footer
          className="font-mono"
          style={{
            paddingTop: "24px",
            borderTop: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            fontSize: "11px",
            letterSpacing: "0.06em",
          }}
        >
          Bible Atlas &middot; Built with Next.js, D3.js, Three.js, and reverence
        </footer>
      </div>
    </main>
  );
}
