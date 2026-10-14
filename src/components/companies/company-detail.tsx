"use client";

import { format } from "date-fns";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  Building2Icon,
  ExternalLinkIcon,
  KanbanSquareIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import {
  InitialsAvatar,
  StageBadge,
  StatusBadge,
} from "@/components/app/badges";
import { CascadeDeleteDialog } from "@/components/app/cascade-delete-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { ListenerError } from "@/components/app/listener-error";
import { useSandbox } from "@/components/app/sandbox-provider";
import { useCrmData } from "@/components/app/use-crm-data";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { isClosedStage } from "@/lib/crm";
import {
  dealValueByStage,
  displayWebsite,
  industriesOf,
  type StageValue,
} from "@/lib/crm/companies-list";
import { initials } from "@/lib/crm/contacts-table";
import { formatCurrency, formatCurrencyCompact } from "@/lib/crm/format";
import { cn } from "@/lib/utils";

import { CompanyDialog } from "./company-dialog";

const linkClass =
  "underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50";

function BackLink() {
  return (
    <Link
      href="/app/companies"
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "-ml-2 text-muted-foreground",
      )}
    >
      <ArrowLeftIcon aria-hidden />
      All companies
    </Link>
  );
}

// One series, so every bar uses the first validated chart colour.
const chartConfig = {
  value: { label: "Deal value", color: "var(--chart-1)" },
} satisfies ChartConfig;

function StageValueChart({ data }: { data: StageValue[] }) {
  const total = data.reduce((sum, s) => sum + s.value, 0);
  const labelled = data.map((s) => ({
    ...s,
    labelText: s.value > 0 ? formatCurrencyCompact(s.value) : "",
  }));
  return (
    <ChartCard
      title="Deal value by stage"
      description={`${formatCurrency(total)} across ${data.reduce((n, s) => n + s.count, 0)} deals`}
      summary={`Bar chart of this company's deal value by stage: ${data
        .map((s) => `${s.label} ${formatCurrency(s.value)}`)
        .join(", ")}.`}
      table={{
        caption: "Deal value by stage",
        columns: ["Stage", "Deals", "Value"],
        rows: data.map((s) => [s.label, s.count, formatCurrency(s.value)]),
      }}
    >
      <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
        <BarChart
          data={labelled}
          margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            fontSize={11}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
          />
          <ChartTooltip
            cursor={{ fillOpacity: 0.6 }}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(_, __, item) => {
                  const stage = item.payload as StageValue;
                  return (
                    <span className="font-medium text-foreground tabular-nums">
                      {formatCurrency(stage.value)} · {stage.count}{" "}
                      {stage.count === 1 ? "deal" : "deals"}
                    </span>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          >
            <LabelList
              dataKey="labelText"
              position="top"
              offset={6}
              className="fill-muted-foreground"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

type DialogState =
  { kind: "edit" } | { kind: "delete" } | { kind: "contact" } | null;

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { busy } = useSandbox();
  const data = useCrmData();
  const [dialog, setDialog] = useState<DialogState>(null);

  const company = data.companies.find((c) => c.id === id);
  const contacts = useMemo(
    () =>
      data.contacts
        .filter((c) => c.companyId === id)
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`,
          ),
        ),
    [data.contacts, id],
  );
  const deals = useMemo(
    () =>
      data.deals
        .filter((d) => d.companyId === id)
        .sort((a, b) => b.value - a.value),
    [data.deals, id],
  );
  const industries = useMemo(
    () => industriesOf(data.companies),
    [data.companies],
  );
  const owners = useMemo(
    () => [...new Set(data.contacts.map((c) => c.ownerName))].sort(),
    [data.contacts],
  );
  useDocumentTitle(
    data.loading ? null : (company?.name ?? "Company not found"),
  );

  if (data.error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />
        <div className="mt-4">
          <ListenerError error={data.error} onRetry={data.retry} />
        </div>
      </div>
    );
  }
  if (data.loading || busy) return <ContentSkeleton />;

  if (!company) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />
        <h1 className="sr-only">Company not found</h1>
        <EmptyState
          icon={Building2Icon}
          title="Company not found"
          className="mt-6"
          action={
            <Link href="/app/companies" className={buttonVariants()}>
              Back to companies
            </Link>
          }
        >
          This company doesn&apos;t exist in your sandbox. It may have been
          deleted, or the link is wrong.
        </EmptyState>
      </div>
    );
  }

  const openValue = deals
    .filter((d) => !isClosedStage(d.stage))
    .reduce((sum, d) => sum + d.value, 0);
  const wonValue = deals
    .filter((d) => d.stage === "won")
    .reduce((sum, d) => sum + d.value, 0);
  const contactName = (contactId: string) => {
    const contact = data.contacts.find((c) => c.id === contactId);
    return contact
      ? `${contact.firstName} ${contact.lastName}`
      : "Unknown contact";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <BackLink />
      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-semibold text-primary"
          >
            {company.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {company.name}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {company.industry} · {company.size} people · Added{" "}
              {format(company.createdAt, "d MMM yyyy")}
            </p>
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  linkClass,
                  "mt-1 inline-flex items-center gap-1 text-sm",
                )}
              >
                {displayWebsite(company.website)}
                <ExternalLinkIcon aria-hidden className="size-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => setDialog({ kind: "edit" })}>
            <PencilIcon aria-hidden />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setDialog({ kind: "delete" })}
          >
            <Trash2Icon aria-hidden />
            Delete
          </Button>
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Contacts", String(contacts.length)],
          ["Deals", String(deals.length)],
          ["Open pipeline", formatCurrency(openValue)],
          ["Won", formatCurrency(wonValue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <StageValueChart data={dealValueByStage(deals)} />

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-semibold">
                <h2>Contacts</h2>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialog({ kind: "contact" })}
              >
                <PlusIcon aria-hidden />
                Add contact
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <EmptyState icon={UsersIcon} title="No contacts" headingLevel={3}>
                Add the people you work with at {company.name}.
              </EmptyState>
            ) : (
              <ul className="divide-y">
                {contacts.map((contact) => (
                  <li
                    key={contact.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <InitialsAvatar
                      text={initials(contact.firstName, contact.lastName)}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/app/contacts/${contact.id}`}
                        className={cn(
                          linkClass,
                          "block truncate text-sm font-medium",
                        )}
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {contact.jobTitle || "No job title"}
                      </p>
                    </div>
                    <StatusBadge status={contact.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-semibold">
              <h2>Deals</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <EmptyState
                icon={KanbanSquareIcon}
                title="No deals"
                headingLevel={3}
                action={
                  <Link
                    href="/app/pipeline"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Open the pipeline
                  </Link>
                }
              >
                Create a deal for {company.name} from the pipeline.
              </EmptyState>
            ) : (
              <ul className="divide-y">
                {deals.map((deal) => (
                  <li
                    key={deal.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/app/pipeline?deal=${deal.id}`}
                        className={cn(
                          linkClass,
                          "inline-flex items-center gap-1 text-sm font-medium",
                        )}
                      >
                        {deal.title}
                        <ArrowUpRightIcon aria-hidden className="size-3.5" />
                        <span className="sr-only">(open in pipeline)</span>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {contactName(deal.contactId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StageBadge stage={deal.stage} />
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(deal.value)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {dialog?.kind === "edit" && (
        <CompanyDialog
          company={company}
          industries={industries}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete" && (
        <CascadeDeleteDialog
          target={{ kind: "company", id: company.id }}
          name={company.name}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          onDeleted={() => router.push("/app/companies")}
        />
      )}
      {dialog?.kind === "contact" && (
        <ContactDialog
          companies={data.companies}
          owners={owners}
          defaultCompanyId={company.id}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
