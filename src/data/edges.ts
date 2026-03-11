import { CrossRefEdge } from "@/lib/types";
import bookEdgesData from "./book-edges.json";

// Book-to-book edges computed from 42,000+ verse-level cross-references
// sourced from the Treasury of Scripture Knowledge via OpenBible.info.
// Weight 1-10 (log scale), count = number of verse cross-references.
export const edges: CrossRefEdge[] = bookEdgesData as CrossRefEdge[];
