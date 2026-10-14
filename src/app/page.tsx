import {
  ArrowUpRightIcon,
  BarChart3Icon,
  KanbanSquareIcon,
  ListChecksIcon,
  LockKeyholeIcon,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { FirebaseNotConfigured } from "@/components/firebase-not-configured";
import { ExploreDemoButton } from "@/components/landing/explore-demo-button";
import { ProductPreview } from "@/components/landing/product-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { DEVELOPER_NAME, portfolioUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: KanbanSquareIcon,
    title: "Drag-and-drop pipeline",
    description:
      "Move deals from New to Won with mouse, touch or keyboard. Each stage shows its deal count and total value, and changes save instantly.",
  },
  {
    icon: BarChart3Icon,
    title: "Live revenue dashboard",
    description:
      "Open pipeline, won revenue, win rate and charts for monthly revenue, stages and lead sources, updated in real time as deals move.",
  },
  {
    icon: ListChecksIcon,
    title: "Activity and follow-ups",
    description:
      "See the latest calls, emails and meetings with each contact, and tick off the tasks due this week right from the dashboard.",
  },
] as const;

const STEPS = [
  "Click “Explore the demo”. You get an anonymous session, no sign-up.",
  "A private sandbox is filled with fictional companies, contacts and deals.",
  "Create, edit and move deals, tick off tasks, and reset the data at any time.",
] as const;

export default function LandingPage() {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-1">
            {portfolioUrl && (
              <nav aria-label="Site">
                <a
                  href={portfolioUrl}
                  className={cn(buttonVariants({ variant: "ghost" }))}
                >
                  Portfolio
                  <ArrowUpRightIcon aria-hidden />
                </a>
              </nav>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <section
          aria-labelledby="hero-title"
          className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:py-24"
        >
          <div>
            <p className="inline-flex items-center rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              Portfolio demo · Next.js, TypeScript, Firebase
            </p>
            <h1
              id="hero-title"
              className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
            >
              PipelineHQ <span className="text-muted-foreground">(Demo)</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-pretty text-muted-foreground">
              The calm, fast CRM that keeps every lead, deal and follow-up in
              one pipeline your whole sales team can trust.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4">
              {isFirebaseConfigured ? (
                <ExploreDemoButton />
              ) : (
                <div className="w-full max-w-xl">
                  <FirebaseNotConfigured />
                </div>
              )}
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <LockKeyholeIcon aria-hidden className="size-4 shrink-0" />
                Fake data only. Your sandbox is private to you.
              </p>
            </div>
          </div>

          <ProductPreview />
        </section>

        <section
          aria-labelledby="features-title"
          className="border-y bg-muted/40"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2
              id="features-title"
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Everything a small sales team needs
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Built like a real SaaS product: real-time data, a typed data
              model, per-user security rules and an accessible, responsive
              interface.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="rounded-xl border bg-card p-6 text-card-foreground shadow-xs"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="how-title"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
        >
          <h2
            id="how-title"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            How the demo works
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-medium"
                >
                  {i + 1}
                </span>
                <p className="pt-1 text-sm text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Built by{" "}
            {portfolioUrl ? (
              <a
                href={portfolioUrl}
                className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {DEVELOPER_NAME}
              </a>
            ) : (
              <span className="font-medium text-foreground">
                {DEVELOPER_NAME}
              </span>
            )}
          </p>
          <p>PipelineHQ is a demo. All names and data are fictional.</p>
        </div>
      </footer>
    </>
  );
}
