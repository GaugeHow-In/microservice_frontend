import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "ui-field px-4 type-small text-slate-950",
        className,
      )}
      {...props}
    />
  );
}
