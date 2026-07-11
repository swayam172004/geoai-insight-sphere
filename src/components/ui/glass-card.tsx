import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function GlassCard({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("glass rounded-2xl p-5 transition-all hover:border-primary/30", className)}
        {...props}
      />
    );
  },
);