"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({
  className,
  indicatorClassName,
  value = 0,
  ...props
}: React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
}) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "ui-progress h-2.5 w-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("ui-progress-indicator h-full rounded-full transition-transform", indicatorClassName)}
        style={{ transform: `translateX(-${100 - Number(value)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
