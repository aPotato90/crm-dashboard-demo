"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { useSandbox } from "@/components/app/sandbox-provider";
import { ListenerError } from "@/components/app/listener-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import {
  DEAL_STAGES,
  type DealData,
  type DealStage,
  type WithId,
} from "@/lib/crm";
import { formatCurrency } from "@/lib/crm/format";
import { useCompanies, useContacts, useDeals } from "@/lib/crm/hooks";
import { STAGE_LABELS } from "@/lib/crm/labels";
import {
  applyPatches,
  groupByStage,
  planDealMove,
  type Columns,
  type DealPatch,
  type DealUpdate,
} from "@/lib/crm/pipeline";
import { dealsRepo } from "@/lib/crm/repo";
import { describeFirebaseError } from "@/lib/firebase/errors";
import { cn } from "@/lib/utils";

import { BoardColumn } from "./board-column";
import { DealCardOverlay, type BoardCard } from "./deal-card";
import { DealDialog, type DealDialogState } from "./deal-dialog";

type ColumnIds = Columns<string>;

function idsOf(columns: Columns<BoardCard>): ColumnIds {
  return Object.fromEntries(
    DEAL_STAGES.map((stage) => [stage, columns[stage].map((d) => d.id)]),
  ) as ColumnIds;
}

function stageOfColumnId(id: UniqueIdentifier): DealStage | null {
  const value = String(id);
  if (!value.startsWith("column:")) return null;
  const stage = value.slice("column:".length);
  return (DEAL_STAGES as readonly string[]).includes(stage)
    ? (stage as DealStage)
    : null;
}

/** Stage that currently holds `id` (a deal id or a column id). */
function findStage(items: ColumnIds, id: UniqueIdentifier): DealStage | null {
  return (
    stageOfColumnId(id) ??
    DEAL_STAGES.find((stage) => items[stage].includes(String(id))) ??
    null
  );
}

type Pending = Map<string, { patch: DealPatch; version: number }>;

export function PipelineBoard() {
  const { uid, busy } = useSandbox();
  const now = useNow();
  const deals = useDeals();
  const contacts = useContacts();
  const companies = useCompanies();

  const [pending, setPending] = useState<Pending>(() => new Map());
  const versionRef = useRef(0);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [dialog, setDialog] = useState<DealDialogState | null>(null);
  // `?deal=<id>` (from contact and company pages) opens that deal.
  const searchParams = useSearchParams();
  const router = useRouter();
  const linkedDealId = searchParams.get("deal");

  // --- Derived data --------------------------------------------------------

  const contactById = useMemo(
    () => new Map(contacts.data.map((c) => [c.id, c])),
    [contacts.data],
  );
  const companyById = useMemo(
    () => new Map(companies.data.map((c) => [c.id, c])),
    [companies.data],
  );
  const owners = useMemo(
    () => [...new Set(contacts.data.map((c) => c.ownerName))].sort(),
    [contacts.data],
  );

  const cards = useMemo<BoardCard[]>(() => {
    const patches = new Map(
      [...pending].map(([id, { patch }]) => [id, patch] as const),
    );
    return applyPatches<WithId<DealData>>(deals.data, patches).map((deal) => {
      const contact = contactById.get(deal.contactId);
      return {
        ...deal,
        contactName: contact
          ? `${contact.firstName} ${contact.lastName}`
          : "Unknown contact",
        companyName: companyById.get(deal.companyId)?.name ?? "Unknown company",
      };
    });
  }, [deals.data, pending, contactById, companyById]);

  const cardById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );
  const fullColumns = useMemo(() => groupByStage(cards), [cards]);

  const query = search.trim().toLowerCase();
  const filtering = query !== "" || owner !== "";
  const visibleColumns = useMemo(() => {
    if (!filtering) return fullColumns;
    const matches = (card: BoardCard) =>
      (owner === "" || contactById.get(card.contactId)?.ownerName === owner) &&
      (query === "" ||
        [card.title, card.companyName, card.contactName].some((text) =>
          text.toLowerCase().includes(query),
        ));
    return Object.fromEntries(
      DEAL_STAGES.map((stage) => [stage, fullColumns[stage].filter(matches)]),
    ) as Columns<BoardCard>;
  }, [filtering, fullColumns, owner, query, contactById]);

  const visibleCount = DEAL_STAGES.reduce(
    (n, stage) => n + visibleColumns[stage].length,
    0,
  );

  // --- Persistence (optimistic, with rollback) ----------------------------

  const persist = useCallback(
    async (updates: DealUpdate[], successMessage?: string) => {
      const version = ++versionRef.current;
      setPending((prev) => {
        const next = new Map(prev);
        for (const { id, patch } of updates) {
          next.set(id, {
            patch: { ...prev.get(id)?.patch, ...patch },
            version,
          });
        }
        return next;
      });
      const settle = () =>
        setPending((prev) => {
          const next = new Map(prev);
          for (const { id } of updates) {
            if (next.get(id)?.version === version) next.delete(id);
          }
          return next;
        });
      try {
        await dealsRepo.updateMany(uid, updates);
        settle();
        if (successMessage) toast.success(successMessage);
      } catch (error) {
        // Dropping the optimistic patch (and Firestore reverting its local
        // write) puts the card back where it was.
        settle();
        toast.error("Couldn't save the move, so it was undone", {
          description: describeFirebaseError(error),
        });
      }
    },
    [uid],
  );

  // --- Drag and drop -------------------------------------------------------

  const [dragItems, setDragItems] = useState<ColumnIds | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Latest values for the screen-reader announcement callbacks.
  const itemsRef = useRef<ColumnIds | null>(null);
  useLayoutEffect(() => {
    itemsRef.current = dragItems;
  }, [dragItems]);
  const originRef = useRef<{ stage: DealStage; index: number } | null>(null);

  const containers = dragItems ?? idsOf(visibleColumns);

  const sensors = useSensors(
    // A few pixels of movement before a mouse drag starts, so clicks open.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Press and hold on touch screens, so a swipe still scrolls the page.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    const items = idsOf(visibleColumns);
    const stage = findStage(items, active.id);
    setActiveId(String(active.id));
    setDragItems(items);
    originRef.current = stage
      ? { stage, index: items[stage].indexOf(String(active.id)) }
      : null;
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    setDragItems((items) => {
      if (!items) return items;
      const from = findStage(items, active.id);
      const to = findStage(items, over.id);
      if (!from || !to || from === to) return items;
      const id = String(active.id);
      const target = items[to].filter((item) => item !== id);
      const overIndex = target.indexOf(String(over.id));
      target.splice(overIndex === -1 ? target.length : overIndex, 0, id);
      return {
        ...items,
        [from]: items[from].filter((item) => item !== id),
        [to]: target,
      };
    });
  }

  function resetDrag() {
    setActiveId(null);
    setDragItems(null);
    originRef.current = null;
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const items = dragItems;
    resetDrag();
    if (!items || !over) return;
    const id = String(active.id);
    const to = findStage(items, over.id);
    if (!to) return;

    // Final order of the visible cards in the target column.
    let list = items[to];
    const from = list.indexOf(id);
    const overIndex = stageOfColumnId(over.id)
      ? list.length - 1
      : list.indexOf(String(over.id));
    if (from !== -1 && overIndex !== -1 && from !== overIndex) {
      list = arrayMove(list, from, overIndex);
    }
    const visibleIndex = list.indexOf(id);

    // Map the position among visible (filtered) cards to the full column:
    // drop right after the visible card above it, or before the one below.
    const fullTarget = fullColumns[to].map((d) => d.id).filter((d) => d !== id);
    const above = list[visibleIndex - 1];
    const below = list[visibleIndex + 1];
    const fullIndex = above
      ? fullTarget.indexOf(above) + 1
      : below
        ? fullTarget.indexOf(below)
        : fullTarget.length;

    const updates = planDealMove(fullColumns, id, to, fullIndex, new Date());
    if (updates.length === 0) return;
    const deal = cardById.get(id);
    const movedStage = updates.find((u) => u.id === id)?.patch.stage;
    void persist(
      updates,
      movedStage && deal
        ? `Moved “${deal.title}” to ${STAGE_LABELS[movedStage]}`
        : undefined,
    );
  }

  const describePosition = (id: UniqueIdentifier) => {
    const items = itemsRef.current;
    if (!items) return "";
    const stage = findStage(items, id);
    if (!stage) return "";
    const list = items[stage];
    const index = stageOfColumnId(id)
      ? list.length
      : list.indexOf(String(id)) + 1;
    return `${STAGE_LABELS[stage]}, position ${Math.max(index, 1)} of ${Math.max(list.length, 1)}`;
  };
  const titleOf = (id: UniqueIdentifier) =>
    cardById.get(String(id))?.title ?? "deal";

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${titleOf(active.id)}. It is in ${describePosition(active.id)}. Use the arrow keys to move it, Space or Enter to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${titleOf(active.id)} is over ${describePosition(over.id)}.`
        : `${titleOf(active.id)} is no longer over a stage.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${titleOf(active.id)} was dropped in ${describePosition(over.id)}.`
        : `${titleOf(active.id)} was dropped outside the board and did not move.`,
    onDragCancel: ({ active }) => {
      const origin = originRef.current;
      return `Moving ${titleOf(active.id)} was cancelled.${
        origin ? ` It stays in ${STAGE_LABELS[origin.stage]}.` : ""
      }`;
    },
  };

  const activeCard = activeId ? cardById.get(activeId) : undefined;
  const linkedCard = linkedDealId ? cardById.get(linkedDealId) : undefined;
  const openDialog: DealDialogState | null =
    dialog ?? (linkedCard ? { mode: "edit", deal: linkedCard } : null);
  const overStage = activeId ? findStage(containers, activeId) : null;

  // --- Render --------------------------------------------------------------

  const loading = deals.loading || contacts.loading || companies.loading;
  const error = deals.error ?? contacts.error ?? companies.error;
  const openPipeline = DEAL_STAGES.filter((s) => s !== "won" && s !== "lost")
    .flatMap((stage) => fullColumns[stage])
    .reduce((sum, deal) => sum + deal.value, 0);

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Pipeline"
        description={
          loading
            ? "Loading deals…"
            : `${formatCurrency(openPipeline)} in open deals`
        }
        actions={
          <Button
            onClick={() => setDialog({ mode: "create" })}
            disabled={loading || busy}
          >
            <PlusIcon aria-hidden />
            New deal
          </Button>
        }
      />

      <search className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-xs">
          <Label htmlFor="deal-search" className="mb-1.5">
            Search deals
          </Label>
          <div className="relative">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="deal-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, company or contact"
              className="pl-8"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="w-full sm:w-52">
          <Label htmlFor="deal-owner" className="mb-1.5">
            Owner
          </Label>
          <NativeSelect
            id="deal-owner"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">All owners</NativeSelectOption>
            {owners.map((name) => (
              <NativeSelectOption key={name} value={name}>
                {name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <p
          role="status"
          className={cn(
            "text-sm text-muted-foreground sm:pb-2",
            !filtering && "sr-only",
          )}
        >
          {loading
            ? ""
            : filtering
              ? `Showing ${visibleCount} of ${cards.length} deals`
              : `${cards.length} deals`}
        </p>
      </search>

      {error ? (
        <div className="mt-6">
          <ListenerError
            error={error}
            title="Could not load the pipeline"
            onRetry={() =>
              [deals, contacts, companies].forEach((c) => c.error && c.retry())
            }
          />
        </div>
      ) : loading || busy ? (
        <BoardSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={resetDrag}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                "To move a deal, press Space or Enter on its move button. Use the arrow keys to move it within a stage or to another stage, then press Space or Enter to drop it, or Escape to cancel.",
            },
          }}
        >
          <div
            className={cn(
              "relative -mx-4 mt-6 overflow-x-auto overscroll-x-contain px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
              // Snap columns into place on touch screens, but not mid-drag.
              !activeId && "snap-x snap-mandatory scroll-px-4 lg:snap-none",
            )}
          >
            <div className="flex w-max items-start gap-3">
              {DEAL_STAGES.map((stage) => (
                <BoardColumn
                  key={stage}
                  stage={stage}
                  now={now}
                  isDropTarget={overStage === stage}
                  deals={containers[stage]
                    .map((id) => cardById.get(id))
                    .filter((card): card is BoardCard => card !== undefined)}
                  onOpen={(deal) => setDialog({ mode: "edit", deal })}
                />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeCard ? (
              <DealCardOverlay deal={activeCard} now={now} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {openDialog && (
        <DealDialog
          key={openDialog.mode === "edit" ? openDialog.deal.id : "new"}
          state={openDialog}
          uid={uid}
          contacts={contacts.data}
          companies={companies.data}
          columns={fullColumns}
          onClose={() => {
            setDialog(null);
            if (linkedDealId)
              router.replace("/app/pipeline", { scroll: false });
          }}
        />
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div
      aria-busy="true"
      className="-mx-4 mt-6 overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <p role="status" className="sr-only">
        Loading the pipeline…
      </p>
      <div className="flex gap-3">
        {DEAL_STAGES.map((stage) => (
          <div
            key={stage}
            className="w-[17.5rem] shrink-0 space-y-2 rounded-xl bg-muted/50 p-3 sm:w-72"
          >
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
