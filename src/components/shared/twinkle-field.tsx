"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Dot = {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  accent: boolean;
};

function generateDots(count: number): Dot[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 2 + Math.random() * 2.5,
    delay: Math.random() * 6,
    duration: 3 + Math.random() * 4,
    accent: Math.random() < 0.16,
  }));
}

export function TwinkleField({ count = 60, className }: { count?: number; className?: string }) {
  // Dots are generated client-side after mount (not during the render that
  // gets server-rendered) so the random positions never disagree between
  // the server-rendered HTML and the first client render.
  const [dots, setDots] = useState<Dot[]>([]);

  useEffect(() => {
    setDots(generateDots(count));
  }, [count]);

  return (
    <div className={cn("twinkle-field", className)} aria-hidden="true">
      {dots.map((dot, index) => (
        <span
          key={index}
          className={cn("twinkle-dot", dot.accent && "accent")}
          style={{
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            animationDelay: `${dot.delay}s`,
            animationDuration: `${dot.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
