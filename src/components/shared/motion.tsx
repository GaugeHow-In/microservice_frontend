"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

type MotionPanelProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  viewport?: HTMLMotionProps<"div">["viewport"];
};

export function MotionPanel({
  children,
  className,
  delay = 0,
  viewport = { once: true, margin: "-80px" },
}: MotionPanelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{
        duration: 0.52,
        delay,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
