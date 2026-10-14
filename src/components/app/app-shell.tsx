"use client";

import { MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { NavLinks } from "./nav-links";
import { SandboxActions } from "./sandbox-actions";

/**
 * Signed-in layout: a sticky sidebar on large screens, a top bar with a menu
 * sheet on small ones, and one <main> landmark for page content.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  // Move focus to the new page after client-side navigation, so keyboard and
  // screen-reader users start at the content instead of the old link. (Next.js
  // also announces the new document title.)
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex flex-1">
      <aside
        aria-label="Sidebar"
        className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:sticky lg:top-8 lg:flex lg:h-[calc(100svh-2rem)]"
      >
        <div className="flex h-16 items-center px-5">
          <Brand href="/app" />
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks />
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">
              Appearance
            </span>
            <ThemeToggle />
          </div>
          <SandboxActions />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
          <Brand href="/app" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <MenuIcon aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col p-0">
                <SheetHeader className="border-b">
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigate the PipelineHQ demo and manage your sandbox.
                  </SheetDescription>
                </SheetHeader>
                <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
                  <NavLinks onNavigate={() => setMenuOpen(false)} />
                </nav>
                <div className="border-t p-3">
                  <SandboxActions />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="w-full min-w-0 flex-1 outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
