"use client";

import { format, formatDistance } from "date-fns";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  KanbanSquareIcon,
  ListChecksIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  Trash2Icon,
  UserXIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useMemo, useState } from "react";

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
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskItem } from "@/components/tasks/task-item";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useNow } from "@/hooks/use-now";
import { isClosedStage, type TaskData, type WithId } from "@/lib/crm";
import { initials } from "@/lib/crm/contacts-table";
import { formatCurrency } from "@/lib/crm/format";
import { SOURCE_LABELS } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";

import { ActivityTimeline, AddActivityForm } from "./activity-timeline";
import { ContactDialog } from "./contact-dialog";

const TABS = ["overview", "activity", "deals", "tasks"] as const;
type Tab = (typeof TABS)[number];

const linkClass =
  "underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50";

function BackLink() {
  return (
    <Link
      href="/app/contacts"
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "-ml-2 text-muted-foreground",
      )}
    >
      <ArrowLeftIcon aria-hidden />
      All contacts
    </Link>
  );
}

type Dialog =
  | { kind: "edit" }
  | { kind: "delete" }
  | { kind: "task"; task?: WithId<TaskData> }
  | { kind: "delete-task"; task: WithId<TaskData> }
  | null;

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const now = useNow();
  const { busy } = useSandbox();
  const data = useCrmData();
  const [dialog, setDialog] = useState<Dialog>(null);

  const tabParam = searchParams.get("tab");
  const tab: Tab = TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "overview";

  const contact = data.contacts.find((c) => c.id === id);
  const company = contact
    ? data.companies.find((c) => c.id === contact.companyId)
    : undefined;
  const deals = useMemo(
    () =>
      data.deals
        .filter((d) => d.contactId === id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [data.deals, id],
  );
  const activities = useMemo(
    () =>
      data.activities
        .filter((a) => a.contactId === id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [data.activities, id],
  );
  const tasks = useMemo(
    () =>
      data.tasks
        .filter((t) => t.contactId === id)
        .sort(
          (a, b) =>
            Number(a.done) - Number(b.done) ||
            a.dueDate.getTime() - b.dueDate.getTime(),
        ),
    [data.tasks, id],
  );
  const dealTitles = useMemo(
    () => new Map(data.deals.map((d) => [d.id, d.title])),
    [data.deals],
  );
  const owners = useMemo(
    () => [...new Set(data.contacts.map((c) => c.ownerName))].sort(),
    [data.contacts],
  );

  const fullName = contact ? `${contact.firstName} ${contact.lastName}` : null;
  useDocumentTitle(data.loading ? null : (fullName ?? "Contact not found"));

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

  if (!contact || !fullName) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />
        <h1 className="sr-only">Contact not found</h1>
        <EmptyState
          icon={UserXIcon}
          title="Contact not found"
          className="mt-6"
          action={
            <Link href="/app/contacts" className={buttonVariants()}>
              Back to contacts
            </Link>
          }
        >
          This contact doesn&apos;t exist in your sandbox. It may have been
          deleted, or the link is wrong.
        </EmptyState>
      </div>
    );
  }

  const openDeals = deals.filter((d) => !isClosedStage(d.stage));
  const openTasks = tasks.filter((t) => !t.done);
  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <BackLink />

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <InitialsAvatar
            text={initials(contact.firstName, contact.lastName)}
            className="size-14 text-lg"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {fullName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {contact.jobTitle || "No job title"}
              {company && (
                <>
                  {" at "}
                  <Link
                    href={`/app/companies/${company.id}`}
                    className={cn(linkClass, "text-foreground")}
                  >
                    {company.name}
                  </Link>
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge status={contact.status} />
              <span>Source: {SOURCE_LABELS[contact.source]}</span>
              <span aria-hidden>·</span>
              <span>Owner: {contact.ownerName}</span>
            </div>
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

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a
          href={`mailto:${contact.email}`}
          className={cn(linkClass, "inline-flex items-center gap-1.5")}
        >
          <MailIcon aria-hidden className="size-4 text-muted-foreground" />
          {contact.email}
        </a>
        {contact.phone && (
          <a
            href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
            className={cn(linkClass, "inline-flex items-center gap-1.5")}
          >
            <PhoneIcon aria-hidden className="size-4 text-muted-foreground" />
            {contact.phone}
          </a>
        )}
      </div>
      {contact.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
          {contact.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">
            Activity ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({openTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-semibold">
                  <h2>Details</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Added</dt>
                  <dd>{format(contact.createdAt, "d MMM yyyy")}</dd>
                  <dt className="text-muted-foreground">Last contacted</dt>
                  <dd>
                    <time dateTime={contact.lastContactedAt.toISOString()}>
                      {formatDistance(contact.lastContactedAt, now, {
                        addSuffix: true,
                      })}
                    </time>
                  </dd>
                  <dt className="text-muted-foreground">Company</dt>
                  <dd>{company?.name ?? "Unknown company"}</dd>
                  {company && (
                    <>
                      <dt className="text-muted-foreground">Industry</dt>
                      <dd>
                        {company.industry} · {company.size} people
                      </dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-semibold">
                  <h2>At a glance</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Open deals</dt>
                  <dd>
                    {openDeals.length} ·{" "}
                    {formatCurrency(openDeals.reduce((s, d) => s + d.value, 0))}
                  </dd>
                  <dt className="text-muted-foreground">Won</dt>
                  <dd>
                    {formatCurrency(
                      deals
                        .filter((d) => d.stage === "won")
                        .reduce((s, d) => s + d.value, 0),
                    )}
                  </dd>
                  <dt className="text-muted-foreground">Open tasks</dt>
                  <dd>{openTasks.length}</dd>
                  <dt className="text-muted-foreground">Activities</dt>
                  <dd>{activities.length}</dd>
                </dl>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-semibold">
                    <h2>Latest activity</h2>
                  </CardTitle>
                  {activities.length > 3 && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setTab("activity")}
                    >
                      See all {activities.length}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ActivityTimeline
                  activities={activities.slice(0, 3)}
                  dealTitles={dealTitles}
                  now={now}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-6">
          <AddActivityForm contactId={contact.id} deals={deals} />
          <section aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="mb-4 font-semibold">
              Timeline
            </h2>
            <ActivityTimeline
              activities={activities}
              dealTitles={dealTitles}
              now={now}
            />
          </section>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <h2 className="sr-only">Deals</h2>
          {deals.length === 0 ? (
            <EmptyState
              icon={KanbanSquareIcon}
              title="No deals yet"
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
              Create a deal for {contact.firstName} from the pipeline.
            </EmptyState>
          ) : (
            <ul className="divide-y rounded-xl border">
              {deals.map((deal) => (
                <li
                  key={deal.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/app/pipeline?deal=${deal.id}`}
                      className={cn(
                        linkClass,
                        "inline-flex items-center gap-1 font-medium",
                      )}
                    >
                      {deal.title}
                      <ArrowUpRightIcon aria-hidden className="size-3.5" />
                      <span className="sr-only">(open in pipeline)</span>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {deal.closedAt
                        ? `Closed ${format(deal.closedAt, "d MMM yyyy")}`
                        : `Expected ${format(deal.expectedCloseDate, "d MMM yyyy")}`}
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
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Tasks</h2>
            <Button size="sm" onClick={() => setDialog({ kind: "task" })}>
              <PlusIcon aria-hidden />
              Add task
            </Button>
          </div>
          {tasks.length === 0 ? (
            <EmptyState icon={ListChecksIcon} title="No tasks" headingLevel={3}>
              Nothing to do for {contact.firstName} yet.
            </EmptyState>
          ) : (
            <ul className="divide-y rounded-xl border px-4">
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  now={now}
                  dealTitle={task.dealId ? dealTitles.get(task.dealId) : null}
                  onEdit={(t) => setDialog({ kind: "task", task: t })}
                  onDelete={(t) => setDialog({ kind: "delete-task", task: t })}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {dialog?.kind === "edit" && (
        <ContactDialog
          contact={contact}
          companies={data.companies}
          owners={owners}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete" && (
        <CascadeDeleteDialog
          target={{ kind: "contact", id: contact.id }}
          name={fullName}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          onDeleted={() => router.push("/app/contacts")}
        />
      )}
      {dialog?.kind === "task" && (
        <TaskDialog
          task={dialog.task}
          contacts={data.contacts}
          deals={data.deals}
          defaultContactId={contact.id}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete-task" && (
        <CascadeDeleteDialog
          target={{ kind: "task", id: dialog.task.id }}
          name={dialog.task.title}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </div>
  );
}
