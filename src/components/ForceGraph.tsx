"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import { books, bookMap } from "@/data/books";
import { edges } from "@/data/edges";
import { GENRE_COLORS } from "@/lib/colors";
import { BibleBook, Canon, SimNode, SimLink } from "@/lib/types";

interface Props {
  canon: Canon;
  selectedBookId: string | null;
  todayBookIds: string[];
  onSelectBook: (id: string | null) => void;
  onHover: (book: BibleBook | null, x: number, y: number) => void;
}

const NODE_SCALE = 0.38;
const MIN_RADIUS = 4;
const MAX_RADIUS = 28;

function getRadius(verses: number): number {
  const r = Math.sqrt(verses) * NODE_SCALE;
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, r));
}

export default function ForceGraph({
  canon,
  selectedBookId,
  todayBookIds,
  onSelectBook,
  onHover,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const buildGraph = useCallback(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    // Filtered data for current canon
    const activeBooks = books.filter((b) => b.canons.includes(canon));
    const activeIds = new Set(activeBooks.map((b) => b.id));
    const activeEdges = edges.filter(
      (e) => activeIds.has(e.source) && activeIds.has(e.target)
    );

    const nodes: SimNode[] = activeBooks.map((b) => ({
      id: b.id,
      book: b,
      radius: getRadius(b.verses),
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimLink[] = activeEdges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    }));

    // ─── DEFS (filters for glow) ─────────────────────
    const defs = svg.append("defs");

    // Create a glow filter for each genre color
    Object.entries(GENRE_COLORS).forEach(([genre, color]) => {
      const filterId = `glow-${genre.replace(/\s+/g, "-")}`;
      const filter = defs
        .append("filter")
        .attr("id", filterId)
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
      filter
        .append("feGaussianBlur")
        .attr("stdDeviation", "4")
        .attr("result", "blur");
      filter
        .append("feFlood")
        .attr("flood-color", color)
        .attr("flood-opacity", "0.6")
        .attr("result", "color");
      filter
        .append("feComposite")
        .attr("in", "color")
        .attr("in2", "blur")
        .attr("operator", "in")
        .attr("result", "glow");
      const merge = filter.append("feMerge");
      merge.append("feMergeNode").attr("in", "glow");
      merge.append("feMergeNode").attr("in", "SourceGraphic");
    });

    // Pulse glow filter for today's readings
    const pulseFilter = defs
      .append("filter")
      .attr("id", "pulse-glow")
      .attr("x", "-100%")
      .attr("y", "-100%")
      .attr("width", "300%")
      .attr("height", "300%");
    pulseFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "8")
      .attr("result", "blur");
    const pulseMerge = pulseFilter.append("feMerge");
    pulseMerge.append("feMergeNode").attr("in", "blur");
    pulseMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // ─── CONTAINER WITH ZOOM ─────────────────────────
    const container = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 10])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    (svg as unknown as d3.Selection<SVGSVGElement, unknown, null, undefined>).call(zoom);

    // Center the view initially
    const initialTransform = d3.zoomIdentity
      .translate(0, 0)
      .scale(1);
    (svg as unknown as d3.Selection<SVGSVGElement, unknown, null, undefined>).call(zoom.transform, initialTransform);

    // ─── EDGES ───────────────────────────────────────
    const linkGroup = container.append("g").attr("class", "edges");
    const linkElements = linkGroup
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => {
        const sourceId =
          typeof d.source === "string" ? d.source : (d.source as SimNode).id;
        const book = bookMap.get(sourceId);
        return book ? GENRE_COLORS[book.genre] : "#ffffff";
      })
      .attr("stroke-opacity", (d) => 0.08 + (d.weight / 10) * 0.25)
      .attr("stroke-width", (d) => 0.3 + (d.weight / 10) * 2.5);

    // ─── NODES ───────────────────────────────────────
    const nodeGroup = container.append("g").attr("class", "nodes");
    const nodeElements = nodeGroup
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer");

    // Outer glow circle
    nodeElements
      .append("circle")
      .attr("class", (d) =>
        todayBookIds.includes(d.id) ? "reading-pulse" : ""
      )
      .attr("r", (d) => d.radius * 1.8)
      .attr("fill", (d) => GENRE_COLORS[d.book.genre])
      .attr("opacity", (d) => (todayBookIds.includes(d.id) ? 0.25 : 0.1))
      .attr("filter", (d) =>
        todayBookIds.includes(d.id) ? "url(#pulse-glow)" : "none"
      );

    // Main circle
    nodeElements
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => GENRE_COLORS[d.book.genre])
      .attr("opacity", 0.85)
      .attr(
        "filter",
        (d) => `url(#glow-${d.book.genre.replace(/\s+/g, "-")})`
      );

    // Deuterocanonical indicator ring
    nodeElements
      .filter((d) => d.book.testament === "DC")
      .append("circle")
      .attr("r", (d) => d.radius + 2)
      .attr("fill", "none")
      .attr("stroke", (d) => GENRE_COLORS[d.book.genre])
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,2")
      .attr("opacity", 0.5);

    // ─── LABELS ──────────────────────────────────────
    const labelGroup = container.append("g").attr("class", "labels");
    const labelElements = labelGroup
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -d.radius - 6)
      .attr("fill", (d) => GENRE_COLORS[d.book.genre])
      .attr("font-size", "9px")
      .attr("font-family", "var(--font-mono)")
      .attr("opacity", 0.7)
      .attr("pointer-events", "none");

    // ─── DRAG BEHAVIOR ───────────────────────────────
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeElements.call(drag as any);

    // ─── HOVER & CLICK ──────────────────────────────
    nodeElements
      .on("mouseover", function (event, d) {
        d3.select(this).select("circle:nth-child(2)").attr("opacity", 1);
        onHover(d.book, event.clientX, event.clientY);
      })
      .on("mousemove", (event, d) => {
        onHover(d.book, event.clientX, event.clientY);
      })
      .on("mouseout", function () {
        d3.select(this).select("circle:nth-child(2)").attr("opacity", 0.85);
        onHover(null, 0, 0);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectBook(d.id);
      });

    svg.on("click", () => {
      onSelectBook(null);
    });

    // ─── FORCE SIMULATION ────────────────────────────
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((d) => 180 - d.weight * 14)
          .strength((d) => 0.2 + (d.weight / 10) * 0.6)
      )
      .force("charge", d3.forceManyBody().strength(-120).distanceMax(500))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force(
        "collide",
        d3.forceCollide<SimNode>().radius((d) => d.radius + 8)
      )
      .force("x", d3.forceX(width / 2).strength(0.02))
      .force("y", d3.forceY(height / 2).strength(0.02))
      .alphaDecay(0.015)
      .velocityDecay(0.3)
      .on("tick", () => {
        linkElements
          .attr("x1", (d) => (d.source as SimNode).x!)
          .attr("y1", (d) => (d.source as SimNode).y!)
          .attr("x2", (d) => (d.target as SimNode).x!)
          .attr("y2", (d) => (d.target as SimNode).y!);

        nodeElements.attr("transform", (d) => `translate(${d.x},${d.y})`);
        labelElements.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
      });

    simRef.current = simulation;

    // Highlight selected
    if (selectedBookId) {
      const connectedIds = new Set<string>();
      activeEdges.forEach((e) => {
        if (e.source === selectedBookId) connectedIds.add(e.target);
        if (e.target === selectedBookId) connectedIds.add(e.source);
      });
      connectedIds.add(selectedBookId);

      nodeElements
        .select("circle:nth-child(2)")
        .attr("opacity", (d) => (connectedIds.has(d.id) ? 0.95 : 0.2));
      labelElements.attr("opacity", (d) =>
        connectedIds.has(d.id) ? 1 : 0.15
      );
      linkElements.attr("stroke-opacity", (d) => {
        const sid =
          typeof d.source === "string" ? d.source : (d.source as SimNode).id;
        const tid =
          typeof d.target === "string" ? d.target : (d.target as SimNode).id;
        if (sid === selectedBookId || tid === selectedBookId) {
          return 0.3 + (d.weight / 10) * 0.5;
        }
        return 0.03;
      });
    }
  }, [canon, selectedBookId, todayBookIds, onSelectBook, onHover]);

  useEffect(() => {
    buildGraph();

    const handleResize = () => buildGraph();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (simRef.current) simRef.current.stop();
    };
  }, [buildGraph]);

  return <svg ref={svgRef} style={{ position: "fixed", top: 0, left: 0 }} />;
}
