import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Sparkles,
  Map,
  BarChart3,
  History,
  Info,
  Menu,
  Bell,
  Settings,
  Globe2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/predict", label: "Predict", icon: Sparkles },
  { to: "/map", label: "Interactive Map", icon: Map },
  { to: "/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/history", label: "History", icon: History },
  { to: "/about", label: "About", icon: Info },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative flex min-h-screen w-full text-foreground">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/70 backdrop-blur-2xl lg:flex">
        <SidebarInner pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 24 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/60 bg-sidebar/95 backdrop-blur-2xl lg:hidden"
            >
              <SidebarInner pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 bg-background/40 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="hidden text-xs uppercase tracking-[0.3em] text-muted-foreground sm:block">
                Earth Intelligence
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <div className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-xs font-semibold text-primary-foreground">
              GA
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarInner({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-5">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[0_0_25px_-5px_oklch(0.78_0.17_210/0.7)]">
          <Globe2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-base font-semibold leading-tight">GeoAI</div>
          <div className="truncate text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Earth Platform
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-inner"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="active-nav"
                  className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-[image:var(--gradient-primary)]"
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-4">
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold">System Online</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            All AI models operational
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] text-muted-foreground">Live</span>
          </div>
        </div>
      </div>
    </>
  );
}
