"use client";

import Link from "next/link";
import StarBackground from "@/components/StarBackground";
import { useRef, useState, useEffect } from "react";

/* ─── Scroll-reveal hook ─── */

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

/* ─── RevealSection wrapper ─── */

function RevealSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 600ms ease-out ${delay}ms, transform 600ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── SectionCard ─── */

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
      style={{ padding: "36px" }}
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

/* ─── StatCard ─── */

function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div
      className="glass-panel rounded-lg"
      style={{
        padding: "32px 24px",
        textAlign: "center",
        borderTop: "2px solid rgba(212, 160, 74, 0.3)",
      }}
    >
      <div
        className="font-serif"
        style={{
          fontSize: "clamp(32px, 4vw, 52px)",
          color: "var(--accent)",
          fontWeight: 600,
          lineHeight: 1.1,
          marginBottom: "12px",
        }}
      >
        {value}
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--text-secondary)",
          lineHeight: 1.4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ─── SourceCard ─── */

function SourceCard({
  name,
  description,
  links,
}: {
  name: string;
  description: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div
      className="glass-panel rounded-lg"
      style={{ padding: "32px" }}
    >
      <h3
        className="font-mono"
        style={{
          fontSize: "14px",
          color: "var(--accent)",
          marginBottom: "12px",
          letterSpacing: "0.04em",
        }}
      >
        {name}
      </h3>
      <p
        className="font-serif"
        style={{
          fontSize: "15px",
          lineHeight: 1.7,
          color: "var(--text-primary)",
          opacity: 0.8,
          marginBottom: "16px",
        }}
      >
        {description}
      </p>
      <div className="flex flex-wrap gap-4">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono three-state-interactive"
            style={{
              fontSize: "12px",
              color: "var(--accent)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              letterSpacing: "0.04em",
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── ExternalLink ─── */

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
      className="three-state-interactive"
      style={{
        color: "var(--accent)",
        textDecoration: "underline",
        textUnderlineOffset: "3px",
      }}
    >
      {children}
    </a>
  );
}

/* ─── Page ─── */

export default function AboutPage() {
  return (
    <main
      className="h-screen overflow-y-auto relative page-fade-in"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, var(--bg-elevated) 0%, var(--bg-base) 70%)",
      }}
    >
      <StarBackground />

      <div className="relative z-10">
        {/* Back navigation */}
        <div className="max-w-7xl mx-auto px-8 md:px-16 pt-8 md:pt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono three-state-interactive"
            style={{
              color: "var(--text-primary)",
              fontSize: "12px",
              letterSpacing: "0.06em",
            }}
          >
            &larr; Back to Atlas
          </Link>
        </div>

        {/* Hero — no glass panel, floats on stars */}
        <RevealSection className="py-20 md:py-32">
          <div className="max-w-3xl mx-auto px-8 md:px-16 text-center">
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "48px",
                color: "var(--accent)",
                lineHeight: 1,
                textShadow: "0 0 30px rgba(212, 160, 74, 0.3)",
              }}
            >
              ☧
            </div>
            <h1
              className="font-serif mt-6"
              style={{
                fontSize: "clamp(40px, 6vw, 72px)",
                color: "var(--text-primary)",
                fontWeight: 300,
                letterSpacing: "0.06em",
              }}
            >
              Bible Atlas
            </h1>
            <p
              className="font-serif mt-4"
              style={{
                fontSize: "20px",
                color: "var(--text-primary)",
                opacity: 0.7,
                fontStyle: "italic",
                maxWidth: "560px",
                margin: "16px auto 0",
              }}
            >
              An interactive cross-reference star map of Scripture
            </p>
            {/* Decorative line */}
            <div
              style={{
                width: "64px",
                height: "1px",
                background: "var(--glass-border)",
                margin: "32px auto 0",
              }}
            />
          </div>
        </RevealSection>

        {/* Stats bar */}
        <div className="max-w-6xl mx-auto px-8 md:px-16 mb-20 md:mb-28">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
            {[
              { value: "63,000+", label: "Verse-Level Cross-References" },
              { value: "340,000", label: "Total Connections" },
              { value: "73+", label: "Books of Scripture" },
              { value: "4", label: "Canonical Traditions" },
            ].map((stat, i) => (
              <RevealSection key={stat.label} delay={i * 100}>
                <StatCard value={stat.value} label={stat.label} />
              </RevealSection>
            ))}
          </div>
        </div>

        {/* Content grid — 2-column layout */}
        <div className="max-w-7xl mx-auto px-8 md:px-16 mb-20 md:mb-28">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            <RevealSection>
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
            </RevealSection>

            <RevealSection delay={120}>
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
            </RevealSection>

            <RevealSection>
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
            </RevealSection>

            <RevealSection delay={120}>
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
            </RevealSection>
          </div>
        </div>

        {/* Inspiration — side-by-side video + text */}
        <div className="max-w-7xl mx-auto px-8 md:px-16 mb-20 md:mb-28">
          <RevealSection>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Video (larger) */}
              <div className="lg:col-span-3">
                <div
                  className="glass-panel rounded-lg overflow-hidden"
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
              </div>

              {/* Text */}
              <div className="lg:col-span-2">
                <SectionCard label="Inspiration">
                  <p>
                    Bible Atlas was inspired by{" "}
                    <ExternalLink href="https://www.chrisharrison.net/index.php/visualizations/BibleViz">
                      Chris Harrison &amp; Christoph R&ouml;mhild&apos;s BibleViz
                    </ExternalLink>
                    — an arc diagram that renders all 63,779 biblical cross-references
                    as colored arcs on a single canvas. Created in 2007, it remains one
                    of the most recognized data visualizations of Scripture.
                  </p>
                  <p style={{ marginTop: "16px" }}>
                    Harrison&apos;s work demonstrated that the Bible could be understood
                    as the first &ldquo;hyperlinked&rdquo; text — a web of quotations,
                    allusions, and prophecies that binds its books into a single fabric.
                    Bible Atlas takes that insight and turns the static image into a
                    living, interactive experience you can explore.
                  </p>
                </SectionCard>
              </div>
            </div>
          </RevealSection>
        </div>

        {/* Data Sources — horizontal cards */}
        <div className="max-w-7xl mx-auto px-8 md:px-16 mb-20 md:mb-28">
          <RevealSection>
            <h2
              className="font-mono"
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "var(--accent)",
                marginBottom: "24px",
              }}
            >
              Data Sources
            </h2>
          </RevealSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RevealSection delay={0}>
              <SourceCard
                name="Treasury of Scripture Knowledge"
                description="Primary cross-reference dataset with 63,000+ verse-level connections drawn from centuries of biblical scholarship."
                links={[
                  {
                    href: "https://thetreasuryofscriptureknowledge.com/",
                    label: "thetreasuryofscriptureknowledge.com",
                  },
                ]}
              />
            </RevealSection>
            <RevealSection delay={100}>
              <SourceCard
                name="OpenBible.info"
                description="Aggregated cross-reference data totaling approximately 340,000 connections across all books of the Bible."
                links={[
                  {
                    href: "https://www.openbible.info/labs/cross-references/",
                    label: "openbible.info",
                  },
                ]}
              />
            </RevealSection>
            <RevealSection delay={200}>
              <SourceCard
                name="Bible API & USCCB"
                description="Verse text from the World English Bible (public domain) and daily Catholic Mass readings from the USCCB."
                links={[
                  { href: "https://bible-api.com", label: "bible-api.com" },
                  {
                    href: "https://bible.usccb.org/bible/readings",
                    label: "USCCB",
                  },
                  { href: "https://universalis.com", label: "Universalis" },
                ]}
              />
            </RevealSection>
          </div>
        </div>

        {/* Built By — centered, minimal */}
        <div className="max-w-3xl mx-auto px-8 md:px-16 mb-20 md:mb-28 text-center">
          <RevealSection>
            {/* Decorative line */}
            <div
              style={{
                width: "64px",
                height: "1px",
                background: "var(--glass-border)",
                margin: "0 auto 32px",
              }}
            />
            <h2
              className="font-mono"
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "var(--accent)",
                marginBottom: "24px",
              }}
            >
              Built By
            </h2>
            <a
              href="https://cainmenard.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif three-state-interactive"
              style={{
                fontSize: "28px",
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 400,
                letterSpacing: "0.02em",
              }}
            >
              Cain Menard
            </a>
            <p
              className="font-serif"
              style={{
                fontSize: "16px",
                lineHeight: 1.8,
                color: "var(--text-primary)",
                opacity: 0.75,
                marginTop: "20px",
                maxWidth: "540px",
                margin: "20px auto 0",
              }}
            >
              A software engineer and designer who builds tools at the
              intersection of data, faith, and visual storytelling. Bible Atlas
              aims to make the Bible&apos;s hidden structure visible — letting
              anyone visualize, explore, and interact with the complexity of
              Scripture in an intuitive, beautiful way.
            </p>
          </RevealSection>
        </div>

        {/* Footer */}
        <div className="max-w-7xl mx-auto px-8 md:px-16 pb-16">
          <footer
            className="font-mono text-center"
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
      </div>
    </main>
  );
}
