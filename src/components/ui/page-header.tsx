import { type ReactNode } from "react";
import { motion } from "framer-motion";

export function PageHeader({
  eyebrow, title, description, actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 pb-6"
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </motion.div>
  );
}