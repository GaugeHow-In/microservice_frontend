import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "ui-field min-h-28 px-4 py-3 type-small text-slate-950",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
