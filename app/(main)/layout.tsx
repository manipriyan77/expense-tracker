"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/auth-store";
import {
  Loader2,
  Menu,
  ChevronLeft,
  Eye,
  EyeOff,
  Receipt,
  BarChart3,
  Home,
  TrendingUp,
  LayoutGrid,
  Plus,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoExecuteRecurring } from "@/lib/hooks/useAutoExecuteRecurring";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { usePrivacyStore } from "@/store/privacy-store";
import CommandPalette from "@/components/CommandPalette";
import { QuickAddButton } from "@/components/QuickAddButton";
import { useGoalsStore } from "@/store/goals-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";

const PAGE_TITLES: Record<string, string> = {
  "/home": "Trackwise",
  "/dashboard": "Finance Dashboard",
  "/transactions": "Transactions",
  "/smart-add": "Smart Add",
  "/expenses": "Money Flow",
  "/expenses?tab=income": "Money Flow",
  "/expenses?tab=summary": "Money Flow",
  "/incomes": "Income",
  "/budgets": "Budgets",
  "/budget-templates": "Budget Templates",
  "/goals": "Goals",
  "/investments": "Investments",
  "/investment-advisor": "Invest Advisor",
  "/stocks": "Stocks",
  "/mutual-funds": "Mutual Funds",
  "/gold": "Gold",
  "/forex": "Forex",
  "/net-worth": "Net Worth",
  "/assets": "Assets",
  "/debt-tracker": "Debt Tracker",
  "/cashflow-planning": "Cashflow & Planning",
  "/analytics": "Analytics",
  "/calendar": "Calendar",
  "/recurring": "Recurring",
  "/bills": "Bills",
  "/health-score": "Health Score",
  "/insights": "Insights",
  "/analytics?tab=insights": "Insights",
  "/learning": "Learning",
  "/learning/topics": "Topics",
  "/settings": "Settings",
  "/sip-calculator": "SIP / SWP Calculator",
  "/goals-analysis": "Goals Intelligence",
  "/goals?tab=intelligence": "Goals Intelligence",
};

// Top-level pages reachable directly — no back button needed
const SIDEBAR_ROOTS = new Set([
  "/home",
  "/dashboard",
  "/learning",
  "/learning/topics",
  "/transactions",
  "/smart-add",
  "/expenses",
  "/budgets",
  "/goals",
  "/net-worth",
  "/investments",
  "/investment-advisor",
  "/cashflow-planning",
  "/analytics",
  "/settings",
]);

// Bottom nav tabs
const BOTTOM_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/dashboard", label: "Finance", icon: BarChart3 },
  { href: "/transactions", label: "Spend", icon: Receipt },
  { href: "/investments", label: "Invest", icon: TrendingUp },
];

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading, initialized, initializeAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { amountsHidden, toggleAmountsHidden } = usePrivacyStore();
  const { fetchGoals } = useGoalsStore();

  const pageTitle = PAGE_TITLES[pathname] ?? "Trackwise";
  const showBackButton = !SIDEBAR_ROOTS.has(pathname);

  // Breadcrumb segments: always start with Trackwise home
  type BreadcrumbItem = { label: string; href?: string };
  const breadcrumbs: BreadcrumbItem[] = (() => {
    if (pathname === "/home") return [{ label: "Trackwise" }];
    const crumbs: BreadcrumbItem[] = [{ label: "Trackwise", href: "/home" }];
    if (pathname.startsWith("/learning")) {
      if (pathname === "/learning") {
        crumbs.push({ label: "Learning" });
      } else {
        crumbs.push({ label: "Learning", href: "/learning" });
        crumbs.push({ label: pageTitle });
      }
    } else {
      crumbs.push({ label: "Finance", href: "/dashboard" });
      if (pathname !== "/dashboard") crumbs.push({ label: pageTitle });
    }
    return crumbs;
  })();

  useAutoExecuteRecurring();
  const { open: openPalette } = useCommandPaletteStore();
  useKeyboardShortcuts([
    { key: "k", metaKey: true, action: openPalette, description: "Open command palette" },
    { key: "k", ctrlKey: true, action: openPalette, description: "Open command palette" },
  ]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (initialized && !user) {
      router.push("/sign-in");
    }
  }, [initialized, user, router]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-full min-w-0 overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top header */}
        <header className="flex items-center gap-2 px-3 py-2 border-b bg-card shrink-0 md:hidden sticky top-0 z-30">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <span className="font-semibold text-foreground truncate flex-1">
            {pageTitle}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={toggleAmountsHidden}
            aria-label={amountsHidden ? "Show amounts" : "Hide amounts"}
          >
            {amountsHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </header>

        {/* Desktop topbar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 border-b bg-card shrink-0 sticky top-0 z-20">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <li key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "font-semibold text-foreground" : "text-muted-foreground"}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAmountsHidden}
              className="gap-1.5 text-muted-foreground h-8"
              aria-label={amountsHidden ? "Show amounts" : "Hide amounts"}
            >
              {amountsHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="text-xs">{amountsHidden ? "Show" : "Hide"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openPalette}
              className="gap-2 text-muted-foreground h-8 text-xs"
            >
              <span>Search</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-16 md:pb-0"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t border-border">
        <div className="flex items-center justify-around h-16 px-1">
          {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-0 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={`text-[10px] truncate ${isActive ? "font-medium" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Centre Quick-Add button */}
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Add transaction"
            className="flex flex-col items-center gap-0.5 px-3 py-2 -order-1"
          >
            <div className="bg-primary rounded-full h-11 w-11 flex items-center justify-center shadow-md -mt-5">
              <Plus className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">Add</span>
          </button>

          {/* More — opens sidebar */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-muted-foreground"
          >
            <LayoutGrid className="h-5 w-5 shrink-0" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>

      {/* Quick Add dialog for mobile bottom nav */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Add Transaction</DialogTitle>
            <DialogDescription>Add a new income or expense transaction</DialogDescription>
          </DialogHeader>
          {quickAddOpen && (
            <AddTransactionForm
              onSuccess={() => { fetchGoals(); setQuickAddOpen(false); }}
              onCancel={() => setQuickAddOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Desktop FAB */}
      <div className="hidden md:block">
        <QuickAddButton />
      </div>

      <CommandPalette />
    </div>
  );
}
