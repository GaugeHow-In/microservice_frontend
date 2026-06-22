import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "ui-field min-h-28 px-4 py-3 type-small text-slate-950",
        className,
      )}
      {...props}
    />
  );
}
