"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoExecuteRecurring } from "@/lib/hooks/useAutoExecuteRecurring";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, initialized, initializeAuth } = useAuthStore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useAutoExecuteRecurring();

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
    return null; // Will redirect to sign-in
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
        <header className="flex items-center gap-2 px-3 py-2 border-b bg-card shrink-0 md:hidden sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            href="/dashboard"
            className="font-semibold text-foreground truncate"
          >
            Expense Tracker
          </Link>
        </header>
        <main id="main-content" className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}

