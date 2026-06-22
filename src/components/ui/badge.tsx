import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "ui-badge-base",
  {
    variants: {
      variant: {
        default: "ui-badge-neutral",
        orange: "ui-badge-orange",
        green: "ui-badge-warm",
        blue: "ui-badge-warm",
        dark: "ui-badge-rich",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
