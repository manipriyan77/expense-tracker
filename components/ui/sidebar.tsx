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
  Receipt,
  Repeat,
  Landmark,
  Banknote,
  Target,
  BarChart3,
  Flag,
  Scale,
  Activity,
  CalendarDays,
  BookOpen,
  Sparkles,
  CheckSquare,
  LayoutDashboard,
  Star,
  Calculator,
  Dumbbell,
  ClipboardList,
  History,
  Play,
  Library,
  LineChart,
  Ruler,
  GraduationCap,
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

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Hub items shown on /home ───────────────────────────────────────────────

const HUB_ITEMS = [
  {
    title: "Daily Tracker",
    href: "/daily-tracker",
    icon: BookOpen,
    description: "Log your day",
    color: "text-orange-500",
    bg: "bg-orange-500/10 hover:bg-orange-500/20",
    border: "border-orange-500/20",
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    description: "Manage your tasks",
    color: "text-violet-500",
    bg: "bg-violet-500/10 hover:bg-violet-500/20",
    border: "border-violet-500/20",
  },
  {
    title: "Finance",
    href: "/dashboard",
    icon: BarChart3,
    description: "Track your money",
    color: "text-primary",
    bg: "bg-primary/10 hover:bg-primary/20",
    border: "border-primary/20",
  },
  {
    title: "Workout",
    href: "/workout",
    icon: Dumbbell,
    description: "Track your training",
    color: "text-green-500",
    bg: "bg-green-500/10 hover:bg-green-500/20",
    border: "border-green-500/20",
  },
  {
    title: "Learning",
    href: "/learning",
    icon: GraduationCap,
    description: "Track your learning",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10 hover:bg-indigo-500/20",
    border: "border-indigo-500/20",
  },
];

// ─── Section nav items ──────────────────────────────────────────────────────

const DAILY_TRACKER_NAV: NavItem[] = [
  { title: "Overview", href: "/daily-tracker", icon: LayoutDashboard },
  { title: "Habits", href: "/daily-tracker/habits", icon: CheckSquare },
  { title: "Life Goals", href: "/daily-tracker/goals", icon: Star },
  { title: "Journal", href: "/daily-tracker/journal", icon: BookOpen },
  { title: "Analytics", href: "/daily-tracker/analytics", icon: BarChart3 },
];

const TASKS_NAV: NavItem[] = [
  { title: "My Tasks", href: "/tasks", icon: CheckSquare },
];

const LEARNING_NAV: NavItem[] = [
  { title: "Overview", href: "/learning", icon: LayoutDashboard },
  { title: "Topics", href: "/learning/topics", icon: GraduationCap },
];

const WORKOUT_NAV: NavItem[] = [
  { title: "Overview", href: "/workout", icon: LayoutDashboard },
  { title: "Log Workout", href: "/workout/log", icon: Play },
  { title: "Routines", href: "/workout/routines", icon: ClipboardList },
  { title: "History", href: "/workout/history", icon: History },
  { title: "Exercises", href: "/workout/exercises", icon: Library },
  { title: "Programs", href: "/workout/programs", icon: BookOpen },
  { title: "Analytics", href: "/workout/analytics", icon: LineChart },
  { title: "Body Measurements", href: "/workout/body", icon: Ruler },
];

const FINANCE_NAV: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Smart Add", href: "/smart-add", icon: Sparkles },
  { title: "Transactions", href: "/transactions", icon: Receipt },
  {
    title: "Cash Flow",
    icon: Banknote,
    subItems: [
      { title: "Money Flow", href: "/expenses", icon: ArrowLeftRight },
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
  { title: "Invest Advisor", href: "/investment-advisor", icon: Sparkles },
  { title: "SIP / SWP Calculator", href: "/sip-calculator", icon: Calculator },
  { title: "Net Worth", href: "/net-worth", icon: Scale },
  {
    title: "Analytics",
    icon: PieChart,
    subItems: [
      { title: "Reports", href: "/analytics", icon: BarChart3 },
      { title: "Health Score", href: "/health-score", icon: Activity },
    ],
  },
];

// ─── Section detection ──────────────────────────────────────────────────────

type Section = "home" | "daily-tracker" | "tasks" | "finance" | "workout" | "learning";

function getSection(pathname: string): Section {
  if (pathname === "/home") return "home";
  if (pathname.startsWith("/daily-tracker")) return "daily-tracker";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/workout")) return "workout";
  if (pathname.startsWith("/learning")) return "learning";
  return "finance";
}

const SECTION_META: Record<
  Exclude<Section, "home">,
  { label: string; nav: NavItem[]; accent: string }
> = {
  "daily-tracker": { label: "Daily Tracker", nav: DAILY_TRACKER_NAV, accent: "text-orange-500" },
  tasks: { label: "Tasks", nav: TASKS_NAV, accent: "text-violet-500" },
  finance: { label: "Finance", nav: FINANCE_NAV, accent: "text-primary" },
  workout: { label: "Workout", nav: WORKOUT_NAV, accent: "text-green-500" },
  learning: { label: "Learning", nav: LEARNING_NAV, accent: "text-indigo-500" },
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  readonly className?: string;
  readonly mobileOpen?: boolean;
  readonly onMobileClose?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function Sidebar({ className, mobileOpen = false, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hydrateFromStorage } = usePrivacyStore();

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(next));
    }
  };

  const currentHref = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const section = getSection(pathname);
  const sectionMeta = section !== "home" ? SECTION_META[section] : null;
  const navItems = sectionMeta?.nav ?? [];

  const isSubItemActive = (href: string) =>
    href.includes("?") ? currentHref === href : pathname === href;

  const getExpandedForPath = () =>
    navItems
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

  // ─── Nav item renderers ─────────────────────────────────────────────────────

  function renderNavItem(item: NavItem) {
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={0}>
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

      {/* Brand header */}
      <Link href="/home" onClick={handleLinkClick}
        className="flex items-center justify-center p-4 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors group"
        title="Go to Home"
      >
        <div className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "justify-center" : "justify-start w-full")}>
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

      {/* Collapse toggle (desktop only) */}
      <div className="hidden md:flex items-center justify-end px-3 py-2 border-b border-sidebar-border">
        <Button variant="ghost" size="sm" onClick={toggleCollapse}
          className="p-1 h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <>
          {/* ── Home hub: 3 section cards ── */}
          {section === "home" && (
            <div className="space-y-2">
              {!isCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3 text-muted-foreground">
                  Sections
                </p>
              )}
              {HUB_ITEMS.map((hub) => {
                const Icon = hub.icon;
                if (isCollapsed) {
                  return (
                    <Tooltip key={hub.href}>
                      <TooltipTrigger asChild>
                        <Link href={hub.href} onClick={handleLinkClick}
                          className={cn("flex items-center justify-center px-2 py-2 rounded-lg transition-colors border", hub.bg, hub.border, hub.color)}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{hub.title}</TooltipContent>
                    </Tooltip>
                  );
                }
                return (
                  <Link key={hub.href} href={hub.href} onClick={handleLinkClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors",
                      hub.bg, hub.border,
                    )}
                  >
                    <div className={cn("shrink-0", hub.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-sm font-semibold", hub.color)}>{hub.title}</p>
                      <p className="text-[11px] text-muted-foreground">{hub.description}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── Section nav ── */}
          {section !== "home" && sectionMeta && (
            <div>
              {!isCollapsed && (
                <p className={cn("text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5", sectionMeta.accent)}>
                  {sectionMeta.label}
                </p>
              )}
              <div className="space-y-0.5">
                {navItems.map((item) => renderNavItem(item))}
              </div>

              {/* Settings at bottom of section nav */}
              {!isCollapsed && (
                <div className="mt-4 pt-4 border-t border-sidebar-border space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5 text-muted-foreground">
                    General
                  </p>
                  <Link href="/home" onClick={handleLinkClick}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Home className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Home</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
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
    </TooltipProvider>
  );
}
