import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — GeoAI" },
      { name: "description", content: "Browse all past predictions with search, filters, and downloads." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({ queryKey: ["history"], queryFn: () => api.history() });
  },
  component: HistoryPage,
});

const PAGE_SIZE = 8;

function HistoryPage() {
  const { data } = useSuspenseQuery({ queryKey: ["history"], queryFn: () => api.history() });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => data.filter((h) => (filter === "all" || h.landCover === filter) && h.filename.toLowerCase().includes(q.toLowerCase())),
    [data, q, filter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const covers = Array.from(new Set(data.map((d) => d.landCover)));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="Archive"
        title="Prediction History"
        description="Every scene processed by GeoAI, searchable and filterable."
      />

      <GlassCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by filename…"
              className="h-10 rounded-full bg-background/40 pl-10"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-full rounded-full sm:w-52">
              <SelectValue placeholder="Land cover" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {covers.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="py-3 pr-4">Image</th>
                <th className="py-3 pr-4">Filename</th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Confidence</th>
                <th className="py-3 pr-4">Land Cover</th>
                <th className="py-3 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((h) => (
                <tr key={h.id} className="border-b border-border/40 transition-colors hover:bg-background/30">
                  <td className="py-3 pr-4">
                    <img src={h.thumbnail} alt="" className="h-10 w-14 rounded-md object-cover" />
                  </td>
                  <td className="py-3 pr-4 font-medium">{h.filename}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {new Date(h.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">{(h.confidence * 100).toFixed(1)}%</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      {h.landCover}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Button size="icon" variant="ghost" aria-label="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Page {page} of {totalPages} — {filtered.length} results
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}