import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: "Statistics — GeoAI" },
      { name: "description", content: "Model accuracy, class distribution, and monthly prediction analytics." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({ queryKey: ["stats"], queryFn: () => api.statistics() });
  },
  component: StatsPage,
});

function StatsPage() {
  const { data } = useSuspenseQuery({ queryKey: ["stats"], queryFn: () => api.statistics() });

  const totals = [
    { label: "Images Processed", value: data.totals.images.toLocaleString() },
    { label: "Predictions Run", value: data.totals.predictions.toLocaleString() },
    { label: "Avg Accuracy", value: `${data.totals.accuracy}%` },
    { label: "Hectares Mapped", value: data.totals.hectares.toLocaleString() },
  ];

  const tooltipStyle = { background: "oklch(0.16 0.03 265)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="Analytics"
        title="Prediction Statistics"
        description="Model performance and geospatial coverage across all processed scenes."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {totals.map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{t.label}</div>
              <div className="mt-2 text-2xl font-semibold sm:text-3xl">{t.value}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-3 text-sm font-semibold">Monthly Predictions</div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="predictions" stroke="oklch(0.78 0.17 210)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-3 text-sm font-semibold">Land Cover Distribution</div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.distribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                  {data.distribution.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <div className="mb-3 text-sm font-semibold">Model Accuracy Comparison</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data.accuracy}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="model" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <YAxis domain={[80, 100]} stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" fill="oklch(0.7 0.2 295)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}