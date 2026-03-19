"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import type { DrillDownLevel } from "../lib/types";

type DrillLevel = DrillDownLevel;

interface AnimatedPanelContentProps {
  level: DrillLevel;
  direction: "forward" | "back";
  children: ReactNode;
  uniqueKey: string;
}

const panelVariants = {
  initial: (direction: "forward" | "back") => ({
    x: direction === "forward" ? "100%" : "-30%",
    opacity: 0,
  }),
  animate: {
    x: "0%",
    opacity: 1,
  },
  exit: (direction: "forward" | "back") => ({
    x: direction === "forward" ? "-30%" : "100%",
    opacity: 0,
  }),
};

export default function AnimatedPanelContent({
  direction,
  children,
  uniqueKey,
}: AnimatedPanelContentProps) {
  return (
    <MotionConfig
      transition={{ type: "spring", duration: 0.35, bounce: 0.08 }}
      reducedMotion="user"
    >
      <div className="overflow-hidden w-full">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={uniqueKey}
            custom={direction}
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
            style={{ willChange: "transform" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
