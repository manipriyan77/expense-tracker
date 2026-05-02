"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  X,
  PieChart,
  Settings,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Receipt,
  Repeat,
  Landmark,
  Banknote,
  Target,
  BarChart3,
  Flag,
  Scale,
  Activity,
  Lightbulb,
  CalendarDays,
  BookOpen,
  Sparkles,
  CheckSquare,
} from "lucide-react";
import { Button } from "./button";
import { usePrivacyStore } from "@/store/privacy-store";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

// ─── Nav Structure ─────────────────────────────────────────────────────────────

interface SubItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubItem[];
}

interface NavSection {
  label: string;
  accent: string; // tailwind text color class
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Life",
    accent: "text-orange-500",
    items: [
      { title: "Home", href: "/home", icon: Home },
      { title: "Daily Tracker", href: "/daily-tracker", icon: BookOpen },
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
    ],
  },
  {
    label: "Finance",
    accent: "text-primary",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
      { title: "Calendar", href: "/calendar", icon: CalendarDays },
      { title: "Transactions", href: "/transactions", icon: Receipt },
      {
        title: "Finance",
        icon: Banknote,
        subItems: [
          { title: "Expenses", href: "/expenses", icon: TrendingDown },
          { title: "Income", href: "/incomes", icon: TrendingUp },
          { title: "Recurring", href: "/recurring", icon: Repeat },
          { title: "Debt Tracker", href: "/debt-tracker", icon: Landmark },
        ],
      },
      {
        title: "Planning",
        icon: Target,
        subItems: [
          { title: "Budgets", href: "/budgets", icon: BarChart3 },
          { title: "Goals", href: "/goals", icon: Flag },
          { title: "Cashflow", href: "/cashflow-planning", icon: ArrowLeftRight },
        ],
      },
      { title: "Investments", href: "/investments", icon: TrendingUp },
      { title: "Net Worth", href: "/net-worth", icon: Scale },
      {
        title: "Analytics",
        icon: PieChart,
        subItems: [
          { title: "Reports", href: "/analytics", icon: BarChart3 },
          { title: "Insights", href: "/insights", icon: Lightbulb },
          { title: "Health Score", href: "/health-score", icon: Activity },
        ],
      },
    ],
  },
];

// flat list of all items (for auto-expand logic)
const allNavItems = navSections.flatMap((s) => s.items);

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  readonly className?: string;
  readonly mobileOpen?: boolean;
  readonly onMobileClose?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Sidebar({ className, mobileOpen = false, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hydrateFromStorage } = usePrivacyStore();

  const currentHref = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

  const isSubItemActive = (href: string) =>
    href.includes("?") ? currentHref === href : pathname === href;

  const getExpandedForPath = () =>
    allNavItems
      .filter((item) => item.subItems?.some((sub) => isSubItemActive(sub.href)))
      .map((item) => item.title);

  const [expandedItems, setExpandedItems] = useState<string[]>(() => getExpandedForPath());

  useEffect(() => { hydrateFromStorage(); }, [hydrateFromStorage]);

  useEffect(() => {
    const toExpand = getExpandedForPath();
    if (toExpand.length > 0) {
      setExpandedItems((prev) => Array.from(new Set([...prev, ...toExpand])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpand = (title: string) =>
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );

  const handleLinkClick = () => onMobileClose?.();

  // ─── Item renderers ───────────────────────────────────────────────────────────

  function renderGroupItem(item: NavItem) {
    const Icon = item.icon;
    const isExpanded = expandedItems.includes(item.title);
    const hasSubItems = !!item.subItems?.length;
    const isActive = item.href ? pathname === item.href : false;
    const hasActiveChild = hasSubItems && item.subItems!.some((s) => isSubItemActive(s.href));

    if (hasSubItems) {
      if (isCollapsed) {
        return (
          <Popover key={item.title}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-center px-2 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  hasActiveChild && "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
                title={item.title}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" sideOffset={8} align="start" className="w-44 p-1.5 bg-sidebar border-sidebar-border text-sidebar-foreground">
              <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 mb-0.5 uppercase tracking-widest">{item.title}</p>
              {item.subItems!.map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <Link key={sub.href} href={sub.href} onClick={handleLinkClick}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isSubItemActive(sub.href) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground hover:opacity-90",
                    )}
                  >
                    <SubIcon className="h-3.5 w-3.5 shrink-0" />
                    {sub.title}
                  </Link>
                );
              })}
            </PopoverContent>
          </Popover>
        );
      }

      return (
        <div key={item.title} className="space-y-0.5">
          <button
            onClick={() => toggleExpand(item.title)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              (hasActiveChild || isExpanded) && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <div className="flex items-center space-x-3">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{item.title}</span>
            </div>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 opacity-60" /> : <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
          </button>
          {isExpanded && (
            <div className="ml-3 space-y-0.5 border-l-2 border-sidebar-border pl-3">
              {item.subItems!.map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <Link key={sub.href} href={sub.href} onClick={handleLinkClick}
                    className={cn(
                      "flex items-center space-x-2.5 px-3 py-1.5 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isSubItemActive(sub.href) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:opacity-90 hover:text-sidebar-primary-foreground",
                    )}
                  >
                    <SubIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-sm">{sub.title}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Leaf item
    if (isCollapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link href={item.href!} onClick={handleLinkClick}
              className={cn(
                "flex items-center justify-center px-2 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link key={item.href} href={item.href!} onClick={handleLinkClick}
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{item.title}</span>
      </Link>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 text-sidebar-foreground shrink-0",
        "fixed left-0 top-0 z-50 h-full -translate-x-full md:relative md:translate-x-0 md:z-auto md:h-full overflow-y-auto",
        mobileOpen && "translate-x-0",
        "w-64",
        isCollapsed && "md:w-16",
        className,
      )}
    >
      {/* Mobile close */}
      {onMobileClose && (
        <div className="flex justify-end p-2 border-b border-sidebar-border md:hidden">
          <Button variant="ghost" size="sm" onClick={onMobileClose} aria-label="Close menu"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Brand Header */}
      <Link href="/home" onClick={handleLinkClick}
        className="flex items-center justify-center p-4 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors group"
        title="Go to Home"
      >
        <div className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "justify-center" : "justify-start w-full")}>
          {/* Trackwise logo mark — a stylised spark */}
          <div className="relative shrink-0 h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold text-sidebar-foreground tracking-tight">Trackwise</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Build the life you dream of</span>
            </div>
          )}
        </div>
      </Link>

      {/* Collapse toggle (desktop) */}
      <div className="hidden md:flex items-center justify-end px-3 py-2 border-b border-sidebar-border">
        <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Two-section Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {navSections.map((section, si) => (
            <div key={section.label} className={si > 0 ? "mt-4" : ""}>
              {/* Section label */}
              {!isCollapsed ? (
                <p className={cn("text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5", section.accent)}>
                  {section.label}
                </p>
              ) : (
                <div className={cn("h-px mx-2 mb-2 mt-1 rounded-full", si > 0 ? "bg-sidebar-border" : "hidden")} />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => renderGroupItem(item))}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* Settings + Profile */}
      <div className="shrink-0 border-t border-sidebar-border p-2 space-y-1">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/settings" onClick={handleLinkClick}
                className={cn(
                  "flex items-center justify-center px-2 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  pathname === "/settings" && "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <Settings className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Link href="/settings" onClick={handleLinkClick}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              pathname === "/settings" && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Settings</span>
          </Link>
        )}
        <ProfileDropdown isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
