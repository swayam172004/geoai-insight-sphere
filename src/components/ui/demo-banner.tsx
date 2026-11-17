import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";

/** Honest label for pages that still show sample data instead of real results. */
export function DemoBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <div>
        {children ?? (
          <>
            <strong className="font-semibold">Demo data.</strong> This page shows sample values, not real
            predictions. For real results, click a location on the{" "}
            <Link to="/map" className="underline underline-offset-2">
              Map
            </Link>{" "}
            page.
          </>
        )}
      </div>
    </div>
  );
}
