"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-orange-500 transition-transform"
        style={{ transform: `translateX(-${100 - Number(value)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

