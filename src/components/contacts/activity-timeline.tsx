"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistance } from "date-fns";
import {
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  StickyNoteIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { controlProps, FormField } from "@/components/app/form-field";
import { useSandbox } from "@/components/app/sandbox-provider";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_TYPES,
  activityTypeSchema,
  LIMITS,
  type ActivityData,
  type ActivityType,
  type DealData,
  type WithId,
} from "@/lib/crm";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";
import { logActivity } from "@/lib/crm/mutations";
import { describeFirebaseError } from "@/lib/firebase/errors";

export const ACTIVITY_ICONS: Record<ActivityType, typeof PhoneIcon> = {
  call: PhoneIcon,
  email: MailIcon,
  meeting: UsersRoundIcon,
  note: StickyNoteIcon,
};

const activityFormSchema = z.object({
  type: activityTypeSchema,
  summary: z
    .string()
    .trim()
    .min(1, "Write a short summary")
    .max(LIMITS.summaryMax, `Use at most ${LIMITS.summaryMax} characters`),
  dealId: z.string(),
});
type ActivityForm = z.infer<typeof activityFormSchema>;

/** Logs a call, email, meeting or note; also updates "last contacted". */
export function AddActivityForm({
  contactId,
  deals,
}: {
  contactId: string;
  deals: WithId<DealData>[];
}) {
  const { uid } = useSandbox();
  const formId = useId();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityForm>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: { type: "call", summary: "", dealId: "" },
  });

  async function onSubmit(values: ActivityForm) {
    try {
      await logActivity(uid, {
        type: values.type,
        summary: values.summary,
        contactId,
        dealId: values.dealId || null,
        createdAt: new Date(),
      });
      toast.success(`Logged ${ACTIVITY_LABELS[values.type].toLowerCase()}`);
      reset({ type: values.type, summary: "", dealId: "" });
    } catch (error) {
      toast.error("Couldn't log the activity", {
        description: describeFirebaseError(error),
      });
    }
  }

  const f = (key: keyof ActivityForm) =>
    controlProps(`${formId}-${key}`, errors[key]?.message);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-labelledby={`${formId}-heading`}
      className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2"
    >
      <h3 id={`${formId}-heading`} className="font-semibold sm:col-span-2">
        Add activity
      </h3>
      <FormField
        id={`${formId}-type`}
        label="Type"
        error={errors.type?.message}
      >
        <NativeSelect {...register("type")} {...f("type")} className="w-full">
          {ACTIVITY_TYPES.map((type) => (
            <NativeSelectOption key={type} value={type}>
              {ACTIVITY_LABELS[type]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id={`${formId}-dealId`} label="Deal (optional)">
        <NativeSelect
          {...register("dealId")}
          {...f("dealId")}
          className="w-full"
        >
          <NativeSelectOption value="">No deal</NativeSelectOption>
          {deals.map((deal) => (
            <NativeSelectOption key={deal.id} value={deal.id}>
              {deal.title}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <FormField
        id={`${formId}-summary`}
        label="Summary"
        error={errors.summary?.message}
        className="sm:col-span-2"
      >
        <Textarea
          {...register("summary")}
          {...f("summary")}
          rows={3}
          maxLength={LIMITS.summaryMax}
          placeholder="What happened? Next steps?"
        />
      </FormField>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon aria-hidden className="animate-spin" />}
          Log activity
        </Button>
      </div>
    </form>
  );
}

/** Newest-first list of activities with an icon per type. */
export function ActivityTimeline({
  activities,
  dealTitles,
  now,
}: {
  activities: WithId<ActivityData>[];
  dealTitles: ReadonlyMap<string, string>;
  now: Date;
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.type];
        const dealTitle = activity.dealId
          ? dealTitles.get(activity.dealId)
          : undefined;
        return (
          <li key={activity.id} className="relative flex gap-3">
            <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
              <Icon aria-hidden className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm">
                <span className="font-medium">
                  {ACTIVITY_LABELS[activity.type]}
                </span>
                {dealTitle && (
                  <>
                    <span className="text-muted-foreground"> · </span>
                    <Link
                      href={`/app/pipeline?deal=${activity.dealId}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {dealTitle}
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                {activity.summary}
              </p>
              <time
                dateTime={activity.createdAt.toISOString()}
                title={format(activity.createdAt, "PPpp")}
                className="text-xs text-muted-foreground"
              >
                {formatDistance(activity.createdAt, now, { addSuffix: true })}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
