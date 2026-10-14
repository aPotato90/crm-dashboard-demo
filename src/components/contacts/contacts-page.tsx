"use client";

import { formatDistance } from "date-fns";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import { InitialsAvatar, StatusBadge } from "@/components/app/badges";
import { CascadeDeleteDialog } from "@/components/app/cascade-delete-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { ListenerError } from "@/components/app/listener-error";
import { PageHeader } from "@/components/app/page-header";
import { useSandbox } from "@/components/app/sandbox-provider";
import { useCrmData } from "@/components/app/use-crm-data";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNow } from "@/hooks/use-now";
import {
  CONTACT_SOURCES,
  CONTACT_STATUSES,
  type ContactData,
  type WithId,
} from "@/lib/crm";
import {
  DEFAULT_SORT_DIRECTION,
  filterContacts,
  initials,
  paginate,
  parseContactQuery,
  serializeContactQuery,
  sortContacts,
  toContactRows,
  type ContactQuery,
  type ContactRow,
  type ContactSortKey,
} from "@/lib/crm/contacts-table";
import { CONTACT_STATUS_LABELS, SOURCE_LABELS } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";

import { ContactDialog } from "./contact-dialog";

const SORT_LABELS: Record<ContactSortKey, string> = {
  name: "Name",
  company: "Company",
  lastContacted: "Last contacted",
  created: "Date added",
};

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; contact: WithId<ContactData> }
  | { kind: "delete"; contact: ContactRow }
  | null;

export function ContactsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = parseContactQuery(searchParams);
  const now = useNow();
  const { busy } = useSandbox();
  const data = useCrmData();
  const [dialog, setDialog] = useState<DialogState>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<number | undefined>(undefined);

  const hrefFor = (next: ContactQuery) => {
    const qs = serializeContactQuery(next).toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  // Filter changes go back to page 1; the URL is the source of truth.
  const update = (patch: Partial<ContactQuery>) =>
    router.replace(hrefFor({ ...query, page: 1, ...patch }), { scroll: false });

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const companyNames = useMemo(
    () => new Map(data.companies.map((c) => [c.id, c.name])),
    [data.companies],
  );
  const owners = useMemo(
    () => [...new Set(data.contacts.map((c) => c.ownerName))].sort(),
    [data.contacts],
  );
  const rows = useMemo(
    () => toContactRows(data.contacts, companyNames),
    [data.contacts, companyNames],
  );
  const filtered = sortContacts(
    filterContacts(rows, query),
    query.sort,
    query.dir,
  );
  const page = paginate(filtered, query.page);
  const filtering =
    query.q.trim() !== "" ||
    query.status !== "" ||
    query.source !== "" ||
    query.owner !== "";

  function clearFilters() {
    if (searchRef.current) searchRef.current.value = "";
    update({ q: "", status: "", source: "", owner: "" });
  }

  function toggleSort(key: ContactSortKey) {
    update({
      sort: key,
      dir:
        query.sort === key
          ? query.dir === "asc"
            ? "desc"
            : "asc"
          : DEFAULT_SORT_DIRECTION[key],
      page: query.page,
    });
  }

  const header = (
    <PageHeader
      title="Contacts"
      description="People at the companies you sell to."
      actions={
        <Button
          onClick={() => setDialog({ kind: "create" })}
          disabled={data.loading || busy}
        >
          <PlusIcon aria-hidden />
          New contact
        </Button>
      }
    />
  );

  let body: React.ReactNode;
  if (data.error) {
    body = <ListenerError error={data.error} onRetry={data.retry} />;
  } else if (data.loading || busy) {
    body = <ContentSkeleton bare />;
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        icon={UsersIcon}
        title="No contacts yet"
        action={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <PlusIcon aria-hidden />
            New contact
          </Button>
        }
      >
        Add your first contact, or reset the demo data from the sidebar.
      </EmptyState>
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={SearchXIcon}
        title="No contacts match"
        action={
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      >
        Try a different search or remove some filters.
      </EmptyState>
    );
  } else {
    body = (
      <>
        <ContactsTable
          rows={page.items}
          now={now}
          query={query}
          onSort={toggleSort}
          onEdit={(contact) => setDialog({ kind: "edit", contact })}
          onDelete={(contact) => setDialog({ kind: "delete", contact })}
        />
        <ContactCards
          rows={page.items}
          now={now}
          onEdit={(contact) => setDialog({ kind: "edit", contact })}
          onDelete={(contact) => setDialog({ kind: "delete", contact })}
        />
        <nav
          aria-label="Pagination"
          className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
        >
          <p className="text-sm text-muted-foreground">
            Showing {page.start}–{page.end} of {page.total}
          </p>
          <div className="flex items-center gap-2">
            <PageLink
              href={hrefFor({ ...query, page: page.page - 1 })}
              disabled={page.page <= 1}
              label="Previous page"
            >
              <ChevronLeftIcon aria-hidden />
              Previous
            </PageLink>
            <span className="text-sm tabular-nums">
              Page {page.page} of {page.pageCount}
            </span>
            <PageLink
              href={hrefFor({ ...query, page: page.page + 1 })}
              disabled={page.page >= page.pageCount}
              label="Next page"
            >
              Next
              <ChevronRightIcon aria-hidden />
            </PageLink>
          </div>
        </nav>
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {header}

      <search className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] lg:items-end">
        <div className="sm:col-span-2 lg:col-span-1">
          <Label htmlFor="contact-search" className="mb-1.5">
            Search contacts
          </Label>
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchRef}
              id="contact-search"
              type="search"
              defaultValue={query.q}
              placeholder="Name, email or company"
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
        <FilterSelect
          id="contact-status"
          label="Status"
          value={query.status}
          onChange={(status) =>
            update({ status: status as ContactQuery["status"] })
          }
          options={CONTACT_STATUSES.map((s) => [s, CONTACT_STATUS_LABELS[s]])}
          allLabel="All statuses"
        />
        <FilterSelect
          id="contact-source"
          label="Source"
          value={query.source}
          onChange={(source) =>
            update({ source: source as ContactQuery["source"] })
          }
          options={CONTACT_SOURCES.map((s) => [s, SOURCE_LABELS[s]])}
          allLabel="All sources"
        />
        <FilterSelect
          id="contact-owner"
          label="Owner"
          value={query.owner}
          onChange={(owner) => update({ owner })}
          options={owners.map((o) => [o, o])}
          allLabel="All owners"
        />
        <div>
          <Label htmlFor="contact-sort" className="mb-1.5">
            Sort by
          </Label>
          <div className="flex gap-1">
            <NativeSelect
              id="contact-sort"
              value={query.sort}
              onChange={(event) => {
                const key = event.target.value as ContactSortKey;
                update({ sort: key, dir: DEFAULT_SORT_DIRECTION[key] });
              }}
              className="w-full"
            >
              {(Object.keys(SORT_LABELS) as ContactSortKey[]).map((key) => (
                <NativeSelectOption key={key} value={key}>
                  {SORT_LABELS[key]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                update({ dir: query.dir === "asc" ? "desc" : "asc" })
              }
              aria-label={
                query.dir === "asc"
                  ? "Sorted ascending. Sort descending"
                  : "Sorted descending. Sort ascending"
              }
            >
              {query.dir === "asc" ? (
                <ArrowUpIcon aria-hidden />
              ) : (
                <ArrowDownIcon aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </search>

      <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2">
        <p role="status" className="text-sm text-muted-foreground">
          {data.loading
            ? "Loading contacts…"
            : filtering
              ? `${filtered.length} of ${rows.length} contacts match`
              : `${rows.length} contacts`}
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
        <ContactDialog
          companies={data.companies}
          owners={owners}
          onClose={() => setDialog(null)}
          onCreated={(id) => router.push(`/app/contacts/${id}`)}
        />
      )}
      {dialog?.kind === "edit" && (
        <ContactDialog
          contact={dialog.contact}
          companies={data.companies}
          owners={owners}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete" && (
        <CascadeDeleteDialog
          target={{ kind: "contact", id: dialog.contact.id }}
          name={dialog.contact.fullName}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  allLabel: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5">
        {label}
      </Label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full"
      >
        <NativeSelectOption value="">{allLabel}</NativeSelectOption>
        {options.map(([optionValue, optionLabel]) => (
          <NativeSelectOption key={optionValue} value={optionValue}>
            {optionLabel}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={cn(className, "pointer-events-none opacity-50")}
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className={className}>
      {children}
    </Link>
  );
}

function SortHeader({
  label,
  sortKey,
  query,
  onSort,
}: {
  label: string;
  sortKey: ContactSortKey;
  query: ContactQuery;
  onSort: (key: ContactSortKey) => void;
}) {
  const active = query.sort === sortKey;
  const Icon = !active
    ? ArrowUpDownIcon
    : query.dir === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;
  return (
    <TableHead
      aria-sort={
        active ? (query.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="-mx-2 inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {label}
        <Icon
          aria-hidden
          className={cn("size-3.5", !active && "text-muted-foreground")}
        />
      </button>
    </TableHead>
  );
}

function lastContacted(row: ContactRow, now: Date) {
  return (
    <time
      dateTime={row.lastContactedAt.toISOString()}
      title={row.lastContactedAt.toLocaleString()}
    >
      {formatDistance(row.lastContactedAt, now, { addSuffix: true })}
    </time>
  );
}

/** Tag chips; `compact` shows one and a "+N" count (all are in the label). */
function Tags({
  tags,
  compact = false,
}: {
  tags: string[];
  compact?: boolean;
}) {
  if (tags.length === 0)
    return <span className="text-muted-foreground">—</span>;
  const shown = compact ? tags.slice(0, 1) : tags;
  const hidden = tags.length - shown.length;
  return (
    <ul
      className={cn("flex gap-1", compact ? "flex-nowrap" : "flex-wrap")}
      aria-label={`Tags: ${tags.join(", ")}`}
    >
      {hidden > 0 && (
        <li
          aria-hidden
          className="order-last px-1 py-0.5 text-xs text-muted-foreground"
        >
          +{hidden}
        </li>
      )}
      {shown.map((tag) => (
        <li
          key={tag}
          className={cn(
            "rounded-md bg-secondary px-1.5 py-0.5 text-xs whitespace-nowrap text-secondary-foreground",
            compact && "max-w-24 truncate",
          )}
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

function RowActions({
  row,
  onEdit,
  onDelete,
}: {
  row: ContactRow;
  onEdit: (contact: ContactRow) => void;
  onDelete: (contact: ContactRow) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${row.fullName}`}
        >
          <MoreHorizontalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/app/contacts/${row.id}`}>Open</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(row)}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NameCell({ row }: { row: ContactRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <InitialsAvatar text={initials(row.firstName, row.lastName)} />
      <div className="min-w-0">
        <Link
          href={`/app/contacts/${row.id}`}
          className="block truncate font-medium underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {row.fullName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{row.email}</p>
      </div>
    </div>
  );
}

function ContactsTable({
  rows,
  now,
  query,
  onSort,
  onEdit,
  onDelete,
}: {
  rows: ContactRow[];
  now: Date;
  query: ContactQuery;
  onSort: (key: ContactSortKey) => void;
  onEdit: (contact: ContactRow) => void;
  onDelete: (contact: ContactRow) => void;
}) {
  return (
    <div className="relative hidden overflow-x-auto rounded-xl border xl:block">
      <Table>
        <caption className="sr-only">
          Contacts, sorted by {SORT_LABELS[query.sort].toLowerCase()} (
          {query.dir === "asc" ? "ascending" : "descending"})
        </caption>
        <TableHeader>
          <TableRow>
            <SortHeader
              label="Name"
              sortKey="name"
              query={query}
              onSort={onSort}
            />
            <SortHeader
              label="Company"
              sortKey="company"
              query={query}
              onSort={onSort}
            />
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Owner</TableHead>
            <SortHeader
              label="Last contacted"
              sortKey="lastContacted"
              query={query}
              onSort={onSort}
            />
            <TableHead>Tags</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="max-w-48">
                <NameCell row={row} />
              </TableCell>
              <TableCell className="max-w-40">
                <Link
                  href={`/app/companies/${row.companyId}`}
                  className="block truncate underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {row.companyName}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {row.jobTitle || "No job title"}
                </p>
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>{SOURCE_LABELS[row.source]}</TableCell>
              <TableCell className="whitespace-nowrap">
                {row.ownerName}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {lastContacted(row, now)}
              </TableCell>
              <TableCell>
                <Tags tags={row.tags} compact />
              </TableCell>
              <TableCell className="w-10 text-right">
                <RowActions row={row} onEdit={onEdit} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ContactCards({
  rows,
  now,
  onEdit,
  onDelete,
}: {
  rows: ContactRow[];
  now: Date;
  onEdit: (contact: ContactRow) => void;
  onDelete: (contact: ContactRow) => void;
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:hidden" aria-label="Contacts">
      {rows.map((row) => (
        <li
          key={row.id}
          className="rounded-xl border bg-card p-4 text-sm shadow-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <NameCell row={row} />
            <RowActions row={row} onEdit={onEdit} onDelete={onDelete} />
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-muted-foreground">Company</dt>
            <dd className="min-w-0 truncate">
              <Link
                href={`/app/companies/${row.companyId}`}
                className="underline-offset-4 hover:underline"
              >
                {row.companyName}
              </Link>
              {row.jobTitle && (
                <span className="text-muted-foreground"> · {row.jobTitle}</span>
              )}
            </dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={row.status} />
            </dd>
            <dt className="text-muted-foreground">Source</dt>
            <dd>
              {SOURCE_LABELS[row.source]} · {row.ownerName}
            </dd>
            <dt className="text-muted-foreground">Last contacted</dt>
            <dd>{lastContacted(row, now)}</dd>
            {row.tags.length > 0 && (
              <>
                <dt className="text-muted-foreground">Tags</dt>
                <dd>
                  <Tags tags={row.tags} />
                </dd>
              </>
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}
