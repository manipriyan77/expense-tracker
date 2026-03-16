"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
  Eye,
  EyeOff,
  Receipt,
  Repeat,
  Landmark,
  Banknote,
  Target,
  BarChart3,
  Flag,
  Scale,
  Lightbulb,
  Activity,
  CalendarDays,
} from "lucide-react";
import { Button } from "./button";
import { usePrivacyStore } from "@/store/privacy-store";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface SubItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubItem[];
}

const sidebarItems: SidebarItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
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
      { title: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  { title: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  readonly className?: string;
  readonly mobileOpen?: boolean;
  readonly onMobileClose?: () => void;
}

export function Sidebar({
  className,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { amountsHidden, toggleAmountsHidden, hydrateFromStorage } =
    usePrivacyStore();

  const isSubItemActive = (href: string): boolean => pathname === href;

  // Initialize expanded items based on current pathname
  const getExpandedForPath = (path: string): string[] => {
    return sidebarItems
      .filter((item) => item.subItems?.some((sub) => path === sub.href))
      .map((item) => item.title);
  };

  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    getExpandedForPath(pathname)
  );

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Auto-expand the section containing the active page
  useEffect(() => {
    const toExpand = getExpandedForPath(pathname);
    if (toExpand.length > 0) {
      setExpandedItems((prev) => {
        const merged = new Set([...prev, ...toExpand]);
        return Array.from(merged);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleLinkClick = () => {
    onMobileClose?.();
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 text-sidebar-foreground shrink-0",
        "fixed left-0 top-0 z-50 h-full -translate-x-full md:relative md:translate-x-0 md:z-auto md:h-full overflow-y-auto",
        mobileOpen && "translate-x-0",
        "w-64",
        isCollapsed && "md:w-16",
        className
      )}
    >
      {/* Close button on mobile */}
      {onMobileClose && (
        <div className="flex justify-end p-2 border-b border-sidebar-border md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileClose}
            aria-label="Close menu"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Logo Header */}
      <Link
        href="/dashboard"
        onClick={handleLinkClick}
        className="flex items-center justify-center p-4 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors group"
        title="Go to Dashboard"
      >
        <div
          className={cn(
            "flex items-center gap-3 transition-all duration-300",
            isCollapsed ? "justify-center" : "justify-start w-full"
          )}
        >
          <div className="relative shrink-0">
            <Image
              src="/logo-simple.svg"
              alt="Expense Tracker"
              width={isCollapsed ? 32 : 40}
              height={isCollapsed ? 32 : 40}
              className="transition-all duration-300 group-hover:scale-110"
              priority
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-sidebar-foreground">
                Expense Tracker
              </span>
              <span className="text-xs text-muted-foreground">
                Manage Your Finances
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Collapse + Privacy Toggle (desktop only) */}
      <div className="hidden md:flex items-center justify-end gap-1 px-4 py-2 border-b border-sidebar-border">
        {/* <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleAmountsHidden()}
          className="p-1 h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={amountsHidden ? "Show amounts" : "Hide amounts"}
        >
          {amountsHidden ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button> */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-0.5">
        <TooltipProvider delayDuration={0}>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedItems.includes(item.title);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isActive = item.href && pathname === item.href;
            const hasActiveChild =
              hasSubItems && item.subItems?.some((sub) => isSubItemActive(sub.href));

            if (hasSubItems) {
              // Collapsed: show Popover with sub-items on click
              if (isCollapsed) {
                return (
                  <Popover key={item.title}>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center justify-center px-2 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          hasActiveChild && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                        title={item.title}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      sideOffset={8}
                      align="start"
                      className="w-44 p-1.5 bg-sidebar border-sidebar-border text-sidebar-foreground"
                    >
                      <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 mb-0.5 uppercase tracking-widest">
                        {item.title}
                      </p>
                      {item.subItems!.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = isSubItemActive(subItem.href);
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={handleLinkClick}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              isSubActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:opacity-90"
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            {subItem.title}
                          </Link>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                );
              }

              // Expanded: accordion behaviour
              return (
                <div key={item.title} className="space-y-0.5">
                  <button
                    onClick={() => toggleExpand(item.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      (hasActiveChild || isExpanded) &&
                        "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 opacity-60" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    )}
                  </button>

                  {isExpanded && item.subItems && (
                    <div className="ml-3 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = isSubItemActive(subItem.href);
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={handleLinkClick}
                            className={cn(
                              "flex items-center space-x-2.5 px-3 py-1.5 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              isSubActive &&
                                "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:opacity-90"
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-sm">{subItem.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Leaf item — Tooltip in collapsed mode
            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href!}
                      onClick={handleLinkClick}
                      className={cn(
                        "flex items-center justify-center px-2 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
              <Link
                key={item.href}
                href={item.href!}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{item.title}</span>
              </Link>
            );
          })}
        </TooltipProvider>
      </nav>
    </div>
  );
}
