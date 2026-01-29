"use client";

import { useState } from "react";
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
  Target,
  BarChart3,
  Wallet,
  Menu,
  PieChart,
  CreditCard,
  Bell,
  FileText,
  Settings,
  ArrowLeftRight,
  TrendingUp,
  Gem,
  PiggyBank,
  Landmark,
  PieChart as PieChartIcon,
} from "lucide-react";
import { Button } from "./button";

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
    title: "Overview",
    icon: Home,
    subItems: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: Home,
      },
      {
        title: "Calendar",
        href: "/calendar",
        icon: Bell,
      },
      {
        title: "Analytics",
        href: "/analytics",
        icon: PieChart,
      },
    ],
  },
  {
    title: "Cashflow",
    icon: ArrowLeftRight,
    subItems: [
      {
        title: "Transactions",
        href: "/transactions",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    title: "Planning",
    icon: Target,
    subItems: [
      {
        title: "Budgets",
        href: "/budgets",
        icon: CreditCard,
      },
      {
        title: "Budget Templates",
        href: "/budget-templates",
        icon: FileText,
      },
      {
        title: "Goals",
        href: "/goals",
        icon: Target,
      },
      {
        title: "Savings Challenges",
        href: "/savings-challenges",
        icon: TrendingUp,
      },
      {
        title: "Debt Tracker",
        href: "/debt-tracker",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Wealth",
    icon: Wallet,
    subItems: [
      {
        title: "Net Worth",
        href: "/net-worth",
        icon: Wallet,
      },
      {
        title: "Asset Allocation",
        href: "/assets",
        icon: PieChartIcon,
      },
      {
        title: "Mutual Funds",
        href: "/mutual-funds",
        icon: Wallet,
      },
      {
        title: "Stocks",
        href: "/stocks",
        icon: BarChart3,
      },
      {
        title: "Gold",
        href: "/gold",
        icon: Gem,
      },
      {
        title: "Fixed Deposits",
        href: "/fixed-deposits",
        icon: Landmark,
      },
      {
        title: "Provident Fund",
        href: "/provident-fund",
        icon: PiggyBank,
      },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "Overview",
    "Wealth",
  ]);
  const pathname = usePathname();

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  return (
    <div
      className={cn(
        "relative flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Logo Header - Acts as Home Button */}
      <Link
        href="/dashboard"
        className="flex items-center justify-center p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors group"
        title="Go to Dashboard"
      >
        <div
          className={cn(
            "flex items-center gap-3 transition-all duration-300",
            isCollapsed ? "justify-center" : "justify-start w-full",
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
              <span className="text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Expense Tracker
              </span>
              <span className="text-xs text-gray-500">
                Manage Your Finances
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Collapse Toggle Button */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 h-8 w-8 hover:bg-gray-100"
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
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-gray-100",
                    (hasActiveChild || isExpanded) && "bg-gray-100",
                    isCollapsed && "justify-center px-2",
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
                  <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = pathname === subItem.href;

                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={cn(
                            "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100",
                            isSubActive &&
                              "bg-blue-50 text-blue-700 hover:bg-blue-100",
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
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100",
                isActive && "bg-gray-100 text-gray-900",
                isCollapsed && "justify-center px-2",
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

      {/* Mobile Menu Toggle (shown on small screens) */}
      <div className="md:hidden absolute -right-12 top-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
