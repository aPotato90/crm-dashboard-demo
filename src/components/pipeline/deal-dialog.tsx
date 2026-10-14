"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  DEAL_STAGES,
  dealFieldsSchema,
  dealStageSchema,
  isClosedStage,
  LIMITS,
  type CompanyData,
  type ContactData,
  type DealData,
  type WithId,
} from "@/lib/crm";
import { STAGE_DEFAULT_PROBABILITY, STAGE_LABELS } from "@/lib/crm/labels";
import {
  ORDER_STEP,
  stageChangePatch,
  type Columns,
  type BoardDeal,
} from "@/lib/crm/pipeline";
import { dealsRepo } from "@/lib/crm/repo";
import { describeFirebaseError } from "@/lib/firebase/errors";

import type { BoardCard } from "./deal-card";

export type DealDialogState =
  { mode: "create" } | { mode: "edit"; deal: BoardCard };

/**
 * Form schema. Text and enum rules come from the stored deal schema
 * (`dealFieldsSchema`); number and date inputs arrive as strings and are
 * converted here with friendlier messages. The final document is validated
 * again by the repo with `dealSchema` before it is written.
 */
const dealFormSchema = z.object({
  title: dealFieldsSchema.shape.title.refine(
    (value) => value.trim().length > 0,
    "Enter a title",
  ),
  contactId: z.string().min(1, "Choose a contact"),
  companyId: z.string().min(1, "Choose a company"),
  value: z
    .string()
    .trim()
    .min(1, "Enter a value")
    .transform(Number)
    .pipe(
      z
        .number({ error: "Enter a number" })
        .min(LIMITS.dealValueMin, "The value can't be negative")
        .max(LIMITS.dealValueMax, "The value can be at most $100,000,000"),
    ),
  stage: dealStageSchema,
  probability: z
    .string()
    .trim()
    .min(1, "Enter a probability")
    .transform(Number)
    .pipe(
      z
        .number({ error: "Enter a number" })
        .int("Use a whole number")
        .min(LIMITS.probabilityMin, "Use 0 to 100")
        .max(LIMITS.probabilityMax, "Use 0 to 100"),
    ),
  expectedCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
    .refine((value) => !Number.isNaN(parseDateInput(value).getTime()), {
      message: "Choose a valid date",
    }),
});

type DealFormInput = z.input<typeof dealFormSchema>;
type DealFormOutput = z.output<typeof dealFormSchema>;

/** "2026-10-14" -> local noon that day (avoids time-zone date shifts). */
function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Sort key that puts a card at the top of a column. */
function topOrder(columns: Columns<BoardDeal>, stage: DealStage): number {
  const first = columns[stage][0];
  return first ? first.order - ORDER_STEP : 0;
}

type DealStage = DealData["stage"];

export function DealDialog({
  state,
  uid,
  contacts,
  companies,
  columns,
  onClose,
}: {
  state: DealDialogState;
  uid: string;
  contacts: WithId<ContactData>[];
  companies: WithId<CompanyData>[];
  columns: Columns<BoardDeal>;
  onClose: () => void;
}) {
  const formId = useId();
  const editing = state.mode === "edit" ? state.deal : null;
  const [open, setOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);
  // New deals default to closing in 30 days.
  const [defaultCloseDate] = useState(() =>
    format(addDays(new Date(), 30), "yyyy-MM-dd"),
  );

  const sortedContacts = [...contacts].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(
      `${b.firstName} ${b.lastName}`,
    ),
  );
  const sortedCompanies = [...companies].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const companyName = (id: string) =>
    companies.find((c) => c.id === id)?.name ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<DealFormInput, unknown, DealFormOutput>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: editing
      ? {
          title: editing.title,
          contactId: editing.contactId,
          companyId: editing.companyId,
          value: String(editing.value),
          stage: editing.stage,
          probability: String(editing.probability),
          expectedCloseDate: format(editing.expectedCloseDate, "yyyy-MM-dd"),
        }
      : {
          title: "",
          contactId: "",
          companyId: "",
          value: "",
          stage: "new",
          probability: String(STAGE_DEFAULT_PROBABILITY.new),
          expectedCloseDate: defaultCloseDate,
        },
  });

  function close() {
    setOpen(false);
    onClose();
  }

  async function onSubmit(values: DealFormOutput) {
    const now = new Date();
    const fields = {
      title: values.title.trim(),
      contactId: values.contactId,
      companyId: values.companyId,
      value: values.value,
      probability: values.probability,
      expectedCloseDate: parseDateInput(values.expectedCloseDate),
    };
    try {
      if (editing) {
        const stageChanged = values.stage !== editing.stage;
        await dealsRepo.update(uid, editing.id, {
          ...fields,
          ...(stageChanged
            ? {
                ...stageChangePatch(editing, values.stage, now),
                // Keep the probability typed in the form.
                probability: values.probability,
                order: topOrder(columns, values.stage),
              }
            : {}),
        });
        toast.success(`Saved “${fields.title}”`);
      } else {
        await dealsRepo.create(uid, {
          ...fields,
          stage: values.stage,
          closedAt: isClosedStage(values.stage) ? now : null,
          order: topOrder(columns, values.stage),
          createdAt: now,
        });
        toast.success(
          `Created “${fields.title}” in ${STAGE_LABELS[values.stage]}`,
        );
      }
      close();
    } catch (error) {
      toast.error(
        editing ? "Couldn't save the deal" : "Couldn't create the deal",
        {
          description: describeFirebaseError(error),
        },
      );
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setDeleting(true);
    try {
      await dealsRepo.remove(uid, editing.id);
      toast.success(`Deleted “${editing.title}”`);
      close();
    } catch (error) {
      setDeleting(false);
      toast.error("Couldn't delete the deal", {
        description: describeFirebaseError(error),
      });
    }
  }

  const field = (name: keyof DealFormInput) => ({
    id: `${formId}-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${formId}-${name}-error` : undefined,
  });
  const fieldError = (name: keyof DealFormInput) =>
    errors[name] ? (
      <p
        id={`${formId}-${name}-error`}
        className="text-xs font-medium text-destructive"
      >
        {errors[name]?.message}
      </p>
    ) : null;

  const busy = isSubmitting || deleting;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit deal" : "New deal"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the deal details. Changes are saved to your sandbox."
              : "Add a deal to your pipeline. It appears at the top of its stage."}
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor={`${formId}-title`}>Title</Label>
            <Input
              {...register("title")}
              {...field("title")}
              maxLength={LIMITS.nameMax}
              autoComplete="off"
            />
            {fieldError("title")}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-contactId`}>Contact</Label>
            <NativeSelect
              {...register("contactId", {
                // Picking a contact fills in their company.
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                  const contact = contacts.find(
                    (c) => c.id === event.target.value,
                  );
                  if (contact) {
                    setValue("companyId", contact.companyId, {
                      shouldValidate: true,
                    });
                  }
                },
              })}
              {...field("contactId")}
              className="w-full"
            >
              <NativeSelectOption value="">Choose a contact</NativeSelectOption>
              {sortedContacts.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({companyName(c.companyId)})
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldError("contactId")}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-companyId`}>Company</Label>
            <NativeSelect
              {...register("companyId")}
              {...field("companyId")}
              className="w-full"
            >
              <NativeSelectOption value="">Choose a company</NativeSelectOption>
              {sortedCompanies.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldError("companyId")}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-value`}>Value (USD)</Label>
            <Input
              {...register("value")}
              {...field("value")}
              type="number"
              inputMode="decimal"
              min={0}
              max={LIMITS.dealValueMax}
              step="any"
            />
            {fieldError("value")}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-stage`}>Stage</Label>
            <NativeSelect
              {...register("stage", {
                // A new stage suggests its default probability.
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                  const stage = event.target.value as DealStage;
                  const previous = getValues("probability");
                  if (stage in STAGE_DEFAULT_PROBABILITY && previous !== "") {
                    setValue(
                      "probability",
                      String(STAGE_DEFAULT_PROBABILITY[stage]),
                    );
                  }
                },
              })}
              {...field("stage")}
              className="w-full"
            >
              {DEAL_STAGES.map((stage) => (
                <NativeSelectOption key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldError("stage")}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-probability`}>Probability (%)</Label>
            <Input
              {...register("probability")}
              {...field("probability")}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
            />
            {fieldError("probability")}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-expectedCloseDate`}>
              Expected close date
            </Label>
            <Input
              {...register("expectedCloseDate")}
              {...field("expectedCloseDate")}
              type="date"
            />
            {fieldError("expectedCloseDate")}
          </div>
        </form>

        <DialogFooter className="gap-2 sm:justify-between">
          {editing ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={busy}>
                  <Trash2Icon aria-hidden />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
                  <AlertDialogDescription>
                    “{editing.title}” will be removed from your pipeline. This
                    can&apos;t be undone (except by resetting the demo data).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep deal</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Delete deal
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={busy}>
              {isSubmitting && (
                <Loader2Icon aria-hidden className="animate-spin" />
              )}
              {editing ? "Save changes" : "Create deal"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
