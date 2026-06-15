"use client";

import { motion } from "framer-motion";

type MotionPanelProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function MotionPanel({ children, className, delay = 0 }: MotionPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

