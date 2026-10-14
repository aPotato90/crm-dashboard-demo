import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { DEVELOPER_NAME, portfolioUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

const footerLink =
  "font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** Header for the public pages (landing, about). */
export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Brand />
        <div className="flex items-center gap-1">
          <nav aria-label="Site" className="flex items-center">
            <Link
              href="/about"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              About
            </Link>
            {portfolioUrl && (
              <a
                href={portfolioUrl}
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                Portfolio
                <ArrowUpRightIcon aria-hidden />
              </a>
            )}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Footer for the public pages: credit, about link and the demo note. */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Built by{" "}
          {portfolioUrl ? (
            <a href={portfolioUrl} className={footerLink}>
              {DEVELOPER_NAME}
            </a>
          ) : (
            <span className="font-medium text-foreground">
              {DEVELOPER_NAME}
            </span>
          )}
          {" · "}
          <Link href="/about" className={footerLink}>
            About this demo
          </Link>
        </p>
        <p>PipelineHQ is a demo. All names and data are fictional.</p>
      </div>
    </footer>
  );
}
