"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { Loader2Icon } from "lucide-react";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { controlProps, FormField } from "@/components/app/form-field";
import { useSandbox } from "@/components/app/sandbox-provider";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  LIMITS,
  type ContactData,
  type DealData,
  type TaskData,
  type WithId,
} from "@/lib/crm";
import { tasksRepo } from "@/lib/crm/repo";
import { describeFirebaseError } from "@/lib/firebase/errors";

const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title")
    .max(LIMITS.titleMax, `Use at most ${LIMITS.titleMax} characters`),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a due date"),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time"),
  contactId: z.string(),
  dealId: z.string(),
});

type TaskForm = z.infer<typeof taskFormSchema>;

/** "2026-10-14" + "09:30" -> local date and time. */
function toDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function TaskDialog({
  task,
  contacts,
  deals,
  defaultContactId,
  onClose,
}: {
  task?: WithId<TaskData>;
  contacts: WithId<ContactData>[];
  deals: WithId<DealData>[];
  /** Pre-selects a contact when creating (e.g. from a contact page). */
  defaultContactId?: string;
  onClose: () => void;
}) {
  const { uid } = useSandbox();
  const formId = useId();
  const [open, setOpen] = useState(true);
  const [defaultDue] = useState(() =>
    format(addDays(new Date(), 1), "yyyy-MM-dd"),
  );
  const editing = Boolean(task);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: task
      ? {
          title: task.title,
          dueDate: format(task.dueDate, "yyyy-MM-dd"),
          dueTime: format(task.dueDate, "HH:mm"),
          contactId: task.contactId ?? "",
          dealId: task.dealId ?? "",
        }
      : {
          title: "",
          dueDate: defaultDue,
          dueTime: "09:00",
          contactId: defaultContactId ?? "",
          dealId: "",
        },
  });

  const contactId = useWatch({ control, name: "contactId" });
  const dealOptions = (
    contactId ? deals.filter((d) => d.contactId === contactId) : deals
  ).sort((a, b) => a.title.localeCompare(b.title));
  const sortedContacts = [...contacts].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(
      `${b.firstName} ${b.lastName}`,
    ),
  );

  function close() {
    setOpen(false);
    onClose();
  }

  async function onSubmit(values: TaskForm) {
    const fields = {
      title: values.title,
      dueDate: toDate(values.dueDate, values.dueTime),
      contactId: values.contactId || null,
      dealId: values.dealId || null,
    };
    try {
      if (task) {
        await tasksRepo.update(uid, task.id, fields);
        toast.success(`Saved task “${fields.title}”`);
      } else {
        await tasksRepo.create(uid, {
          ...fields,
          done: false,
          createdAt: new Date(),
        });
        toast.success(`Added task “${fields.title}”`);
      }
      close();
    } catch (error) {
      toast.error(
        editing ? "Couldn't save the task" : "Couldn't add the task",
        {
          description: describeFirebaseError(error),
        },
      );
    }
  }

  const f = (key: keyof TaskForm) =>
    controlProps(`${formId}-${key}`, errors[key]?.message);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the task. Changes save to your sandbox."
              : "Add a follow-up or to-do, optionally linked to a contact and deal."}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            id={`${formId}-title`}
            label="Title"
            error={errors.title?.message}
            className="sm:col-span-2"
          >
            <Input
              {...register("title")}
              {...f("title")}
              maxLength={LIMITS.titleMax}
              autoComplete="off"
            />
          </FormField>
          <FormField
            id={`${formId}-dueDate`}
            label="Due date"
            error={errors.dueDate?.message}
          >
            <Input {...register("dueDate")} {...f("dueDate")} type="date" />
          </FormField>
          <FormField
            id={`${formId}-dueTime`}
            label="Due time"
            error={errors.dueTime?.message}
          >
            <Input {...register("dueTime")} {...f("dueTime")} type="time" />
          </FormField>
          <FormField
            id={`${formId}-contactId`}
            label="Contact (optional)"
            error={errors.contactId?.message}
          >
            <NativeSelect
              {...register("contactId", {
                // A deal of another contact no longer fits: clear it.
                onChange: () => setValue("dealId", ""),
              })}
              {...f("contactId")}
              className="w-full"
            >
              <NativeSelectOption value="">No contact</NativeSelectOption>
              {sortedContacts.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id={`${formId}-dealId`}
            label="Deal (optional)"
            error={errors.dealId?.message}
          >
            <NativeSelect
              {...register("dealId", {
                // Picking a deal fills in its contact.
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                  const deal = deals.find((d) => d.id === event.target.value);
                  if (deal && !contactId) setValue("contactId", deal.contactId);
                },
              })}
              {...f("dealId")}
              className="w-full"
            >
              <NativeSelectOption value="">No deal</NativeSelectOption>
              {dealOptions.map((d) => (
                <NativeSelectOption key={d.id} value={d.id}>
                  {d.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2Icon aria-hidden className="animate-spin" />
            )}
            {editing ? "Save changes" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
