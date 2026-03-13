"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div
      className="min-h-screen overflow-auto"
      style={{ background: "radial-gradient(ellipse at 50% 50%, var(--bg-elevated) 0%, var(--bg-base) 70%)" }}
    >
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-block text-xs font-mono three-state-interactive mb-12"
          style={{ color: "var(--text-dim)" }}
        >
          &larr; Back to Atlas
        </Link>

        <h1
          className="text-3xl font-light tracking-wide mb-2 font-serif"
          style={{ color: "var(--text-primary)" }}
        >
          Bible Atlas
        </h1>
        <p className="text-sm mb-12 font-mono" style={{ color: "var(--text-dim)" }}>
          An interactive cross-reference star map of Scripture
        </p>

        <section className="mb-12">
          <h2
            className="text-sm uppercase tracking-wider mb-4 font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            What is Bible Atlas?
          </h2>
          <div className="font-serif text-sm leading-relaxed space-y-4" style={{ color: "var(--text-secondary)" }}>
            <p>
              Bible Atlas is an interactive visualization of the Bible&apos;s internal
              cross-reference network. Every book of Scripture is represented as a
              glowing node in a cosmic star map, and the connections between them are
              drawn from centuries of biblical scholarship.
            </p>
            <p>
              The denser the scholarly connection between two books, the closer they
              pull together in the constellation. The result is a living map of
              Scripture — a visual representation of how the Bible&apos;s 66+ books form
              a single, interconnected whole.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2
            className="text-sm uppercase tracking-wider mb-4 font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            How Cross-References Work
          </h2>
          <div className="font-serif text-sm leading-relaxed space-y-4" style={{ color: "var(--text-secondary)" }}>
            <p>
              Biblical cross-references are connections between passages that share
              themes, quotations, allusions, prophecies, or narrative continuity.
              Scholars have identified over 63,000 verse-level cross-references
              throughout the Bible.
            </p>
            <p>
              In Bible Atlas, these are aggregated at the book level — each edge in
              the constellation represents the density of cross-reference connections between
              two books, weighted from 1 (occasional) to 10 (extremely strong). For
              example, Hebrews draws so heavily from Psalms and Leviticus that these
              connections receive the maximum weight of 10.
            </p>
            <p>
              The force-directed layout means books with stronger connections
              naturally cluster together: the Torah books form a chain, the Synoptic
              Gospels cluster tightly, and Psalms and Isaiah sit at the gravitational
              center of the Old Testament — exactly as their cross-reference density
              predicts.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2
            className="text-sm uppercase tracking-wider mb-4 font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            Canon System
          </h2>
          <div className="font-serif text-sm leading-relaxed space-y-4" style={{ color: "var(--text-secondary)" }}>
            <p>
              Bible Atlas supports four canonical traditions: Catholic (73 books, the
              default), Protestant (66 books), Eastern Orthodox (~76 books), and
              Ethiopian Orthodox (~81 books). The Catholic canon includes the seven
              Deuterocanonical books — Tobit, Judith, 1 &amp; 2 Maccabees, Wisdom,
              Sirach, and Baruch — which are fully integrated into the constellation with
              their own cross-reference connections.
            </p>
            <p>
              Switching canons gracefully adds or removes books from the constellation,
              allowing you to explore how different traditions understand the scope
              of Scripture.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2
            className="text-sm uppercase tracking-wider mb-4 font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            Daily Readings
          </h2>
          <div className="font-serif text-sm leading-relaxed space-y-4" style={{ color: "var(--text-secondary)" }}>
            <p>
              Each day, the Catholic Church assigns a set of readings for the Mass:
              typically a First Reading (often from the Old Testament), a
              Responsorial Psalm, and a Gospel reading. On Sundays and solemnities,
              a Second Reading from the Epistles is also included.
            </p>
            <p>
              Bible Atlas highlights the books corresponding to today&apos;s readings
              with a pulsing glow on the constellation, and shows the day&apos;s reading list
              in a floating card. The liturgical season — Advent, Christmas, Lent,
              Easter, or Ordinary Time — is reflected in a subtle color accent
              throughout the interface.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2
            className="text-sm uppercase tracking-wider mb-4 font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            Data Sources
          </h2>
          <div className="text-xs space-y-2 font-mono" style={{ color: "var(--text-dim)" }}>
            <p>
              Cross-reference weights derived from the{" "}
              <a
                href="https://thetreasuryofscriptureknowledge.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ transition: "var(--transition-base)", color: "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
              >
                Treasury of Scripture Knowledge
              </a>{" "}
              and{" "}
              <a
                href="https://www.openbible.info/labs/cross-references/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ transition: "var(--transition-base)", color: "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
              >
                OpenBible.info
              </a>{" "}
              cross-reference datasets (~340,000 connections).
            </p>
            <p>
              Verse text from{" "}
              <a
                href="https://bible-api.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ transition: "var(--transition-base)", color: "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
              >
                bible-api.com
              </a>{" "}
              (World English Bible, public domain).
            </p>
            <p>
              Daily readings from the{" "}
              <a
                href="https://bible.usccb.org/bible/readings"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ transition: "var(--transition-base)", color: "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
              >
                USCCB
              </a>{" "}
              with fallback to{" "}
              <a
                href="https://universalis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ transition: "var(--transition-base)", color: "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
              >
                Universalis
              </a>
              .
            </p>
            <p>
              Visualization inspired by Chris Harrison &amp; Christoph
              R&ouml;mhild&apos;s{" "}
              <a
                href="https://www.chrisharrison.net/index.php/visualizations/BibleViz"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ transition: "var(--transition-base)", color: "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
              >
                Bible cross-reference visualization
              </a>
              .
            </p>
          </div>
        </section>

        <footer
          className="pt-8 text-[10px] font-mono"
          style={{ borderTop: "1px solid var(--glass-border)", color: "var(--text-dim)" }}
        >
          Bible Atlas &middot; Built with Next.js, D3.js, and reverence
        </footer>
      </div>
    </div>
  );
}
