"use client";

import {
  Building2Icon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import { CascadeDeleteDialog } from "@/components/app/cascade-delete-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { ListenerError } from "@/components/app/listener-error";
import { PageHeader } from "@/components/app/page-header";
import { useSandbox } from "@/components/app/sandbox-provider";
import { useCrmData } from "@/components/app/use-crm-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { CompanyData, WithId } from "@/lib/crm";
import {
  displayWebsite,
  filterCompanies,
  industriesOf,
  toCompanyRows,
  type CompanyRow,
} from "@/lib/crm/companies-list";
import { formatCurrency, formatCurrencyCompact } from "@/lib/crm/format";

import { CompanyDialog } from "./company-dialog";

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; company: WithId<CompanyData> }
  | { kind: "delete"; company: CompanyRow }
  | null;

export function CompaniesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = (searchParams.get("q") ?? "").slice(0, 200);
  const industryParam = searchParams.get("industry") ?? "";
  const { busy } = useSandbox();
  const data = useCrmData();
  const [dialog, setDialog] = useState<DialogState>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const industries = useMemo(
    () => industriesOf(data.companies),
    [data.companies],
  );
  const industry = industries.includes(industryParam) ? industryParam : "";
  const rows = useMemo(
    () => toCompanyRows(data.companies, data.contacts, data.deals),
    [data.companies, data.contacts, data.deals],
  );
  const filtered = filterCompanies(rows, { q, industry });
  const filtering = q.trim() !== "" || industry !== "";

  const update = (patch: { q?: string; industry?: string }) => {
    const params = new URLSearchParams();
    const nextQ = (patch.q ?? q).trim();
    const nextIndustry = patch.industry ?? industry;
    if (nextQ) params.set("q", nextQ);
    if (nextIndustry) params.set("industry", nextIndustry);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const clearFilters = () => {
    if (searchRef.current) searchRef.current.value = "";
    update({ q: "", industry: "" });
  };

  let body: React.ReactNode;
  if (data.error) {
    body = <ListenerError error={data.error} onRetry={data.retry} />;
  } else if (data.loading || busy) {
    body = <ContentSkeleton bare />;
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        icon={Building2Icon}
        title="No companies yet"
        action={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <PlusIcon aria-hidden />
            New company
          </Button>
        }
      >
        Add your first company, or reset the demo data from the sidebar.
      </EmptyState>
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={SearchXIcon}
        title="No companies match"
        action={
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      >
        Try a different search or industry.
      </EmptyState>
    );
  } else {
    body = (
      <ul
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Companies"
      >
        {filtered.map((company) => (
          <li
            key={company.id}
            className="flex flex-col rounded-xl border bg-card p-4 text-card-foreground shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary"
                >
                  {company.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    <Link
                      href={`/app/companies/${company.id}`}
                      className="underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {company.name}
                    </Link>
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {company.industry} · {company.size} people
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${company.name}`}
                  >
                    <MoreHorizontalIcon aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/app/companies/${company.id}`}>Open</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setDialog({ kind: "edit", company })}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDialog({ kind: "delete", company })}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-fit max-w-full items-center gap-1 truncate text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {displayWebsite(company.website)}
                <ExternalLinkIcon aria-hidden className="size-3.5 shrink-0" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Contacts</dt>
                <dd className="font-semibold">{company.contactCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Deals</dt>
                <dd className="font-semibold">{company.dealCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Deal value</dt>
                <dd className="font-semibold">
                  <span aria-hidden>
                    {formatCurrencyCompact(company.totalDealValue)}
                  </span>
                  <span className="sr-only">
                    {formatCurrency(company.totalDealValue)}
                  </span>
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Companies"
        description="Accounts, their people and their deals."
        actions={
          <Button
            onClick={() => setDialog({ kind: "create" })}
            disabled={data.loading || busy}
          >
            <PlusIcon aria-hidden />
            New company
          </Button>
        }
      />

      <search className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:max-w-2xl">
        <div>
          <Label htmlFor="company-search" className="mb-1.5">
            Search companies
          </Label>
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchRef}
              id="company-search"
              type="search"
              defaultValue={q}
              placeholder="Name, industry or website"
              autoComplete="off"
              className="pl-8"
              onChange={(event) => {
                const value = event.target.value;
                window.clearTimeout(searchTimer.current);
                searchTimer.current = window.setTimeout(
                  () => update({ q: value }),
                  250,
                );
              }}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="company-industry" className="mb-1.5">
            Industry
          </Label>
          <NativeSelect
            id="company-industry"
            value={industry}
            onChange={(event) => update({ industry: event.target.value })}
            className="w-full"
          >
            <NativeSelectOption value="">All industries</NativeSelectOption>
            {industries.map((name) => (
              <NativeSelectOption key={name} value={name}>
                {name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </search>

      <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2">
        <p role="status" className="text-sm text-muted-foreground">
          {data.loading
            ? "Loading companies…"
            : filtering
              ? `${filtered.length} of ${rows.length} companies match`
              : `${rows.length} companies`}
        </p>
        {filtering && (
          <Button
            variant="link"
            size="sm"
            onClick={clearFilters}
            className="h-auto px-1"
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="mt-2">{body}</div>

      {dialog?.kind === "create" && (
        <CompanyDialog
          industries={industries}
          onClose={() => setDialog(null)}
          onCreated={(id) => router.push(`/app/companies/${id}`)}
        />
      )}
      {dialog?.kind === "edit" && (
        <CompanyDialog
          company={dialog.company}
          industries={industries}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete" && (
        <CascadeDeleteDialog
          target={{ kind: "company", id: dialog.company.id }}
          name={dialog.company.name}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </div>
  );
}
