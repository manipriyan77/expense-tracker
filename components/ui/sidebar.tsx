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
  Wallet,
  X,
  PieChart,
  Settings,
  ArrowLeftRight,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "./button";
import { usePrivacyStore } from "@/store/privacy-store";

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
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Net Worth",
    href: "/net-worth",
    icon: Wallet,
  },
  {
    title: "Investments",
    href: "/investments",
    icon: TrendingUp,
  },
  {
    title: "Cashflow & Planning",
    href: "/cashflow-planning",
    icon: ArrowLeftRight,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: PieChart,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  className,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Investments",
  ]);
  const pathname = usePathname();
  const { amountsHidden, toggleAmountsHidden, hydrateFromStorage } =
    usePrivacyStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

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
        "relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 text-sidebar-foreground shrink-0",
        "fixed left-0 top-0 z-50 h-full -translate-x-full md:relative md:translate-x-0 md:z-auto",
        mobileOpen && "translate-x-0",
        "w-64",
        isCollapsed && "md:w-16",
        "min-h-full",
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
      {/* Logo Header - Acts as Home Button */}
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
          {/* Logo */}
          <div className="relative flex-shrink-0">
            <Image
              src="/logo-simple.svg"
              alt="Expense Tracker"
              width={isCollapsed ? 32 : 40}
              height={isCollapsed ? 32 : 40}
              className="transition-all duration-300 group-hover:scale-110"
              priority
            />
          </div>

          {/* App Name */}
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
        <Button
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
        </Button>
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
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isExpanded = expandedItems.includes(item.title);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isActive = item.href && pathname === item.href;
          const hasActiveChild =
            hasSubItems && item.subItems?.some((sub) => pathname === sub.href);

          if (hasSubItems) {
            return (
              <div key={item.title} className="space-y-1">
                <button
                  onClick={() => !isCollapsed && toggleExpand(item.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    (hasActiveChild || isExpanded) &&
                      "bg-sidebar-accent text-sidebar-accent-foreground",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.title}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </>
                  )}
                </button>

                {/* Sub Items */}
                {isExpanded && !isCollapsed && item.subItems && (
                  <div className="ml-4 space-y-1 border-l-2 border-sidebar-border pl-4">
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = pathname === subItem.href;

                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={handleLinkClick}
                          className={cn(
                            "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isSubActive &&
                              "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:opacity-90"
                          )}
                        >
                          <SubIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">
                            {subItem.title}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive &&
                  "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                isCollapsed && "justify-center px-2"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.title}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
