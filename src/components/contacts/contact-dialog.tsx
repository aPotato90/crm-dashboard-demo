"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { controlProps, FormField } from "@/components/app/form-field";
import { useSandbox } from "@/components/app/sandbox-provider";
import { TagsInput } from "@/components/app/tags-input";
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
  CONTACT_SOURCES,
  CONTACT_STATUSES,
  contactSourceSchema,
  contactStatusSchema,
  LIMITS,
  type CompanyData,
  type ContactData,
  type WithId,
} from "@/lib/crm";
import { CONTACT_STATUS_LABELS, SOURCE_LABELS } from "@/lib/crm/labels";
import { contactsRepo } from "@/lib/crm/repo";
import { describeFirebaseError } from "@/lib/firebase/errors";

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter a ${label}`)
    .max(LIMITS.nameMax, `Use at most ${LIMITS.nameMax} characters`);

/**
 * Form schema built from the stored contact schema's enums and LIMITS; the
 * repo validates the final document again with `contactSchema`.
 */
const contactFormSchema = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  email: z
    .string()
    .trim()
    .max(LIMITS.emailMax, "That email is too long")
    .pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(LIMITS.phoneMax, `Use at most ${LIMITS.phoneMax} characters`),
  companyId: z.string().min(1, "Choose a company"),
  jobTitle: z
    .string()
    .trim()
    .max(LIMITS.nameMax, `Use at most ${LIMITS.nameMax} characters`),
  status: contactStatusSchema,
  source: contactSourceSchema,
  ownerName: name("owner"),
  tags: z
    .array(z.string().trim().min(1).max(LIMITS.tagMax))
    .max(LIMITS.tagsMaxCount, `Use at most ${LIMITS.tagsMaxCount} tags`),
});

type ContactForm = z.infer<typeof contactFormSchema>;

export function ContactDialog({
  contact,
  companies,
  owners,
  defaultCompanyId,
  onClose,
  onCreated,
}: {
  /** Edit this contact; omit to create one. */
  contact?: WithId<ContactData>;
  companies: WithId<CompanyData>[];
  /** Existing owner names, offered as suggestions. */
  owners: string[];
  defaultCompanyId?: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { uid } = useSandbox();
  const formId = useId();
  const [open, setOpen] = useState(true);
  const editing = Boolean(contact);
  const sortedCompanies = [...companies].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contact
      ? {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          companyId: contact.companyId,
          jobTitle: contact.jobTitle,
          status: contact.status,
          source: contact.source,
          ownerName: contact.ownerName,
          tags: contact.tags,
        }
      : {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          companyId: defaultCompanyId ?? "",
          jobTitle: "",
          status: "lead",
          source: "website",
          ownerName: owners[0] ?? "",
          tags: [],
        },
  });

  function close() {
    setOpen(false);
    onClose();
  }

  async function onSubmit(values: ContactForm) {
    const fullName = `${values.firstName} ${values.lastName}`;
    try {
      if (contact) {
        await contactsRepo.update(uid, contact.id, values);
        toast.success(`Saved “${fullName}”`);
      } else {
        const now = new Date();
        const id = await contactsRepo.create(uid, {
          ...values,
          createdAt: now,
          lastContactedAt: now,
        });
        toast.success(`Added “${fullName}”`);
        onCreated?.(id);
      }
      close();
    } catch (error) {
      toast.error(
        editing ? "Couldn't save the contact" : "Couldn't add the contact",
        { description: describeFirebaseError(error) },
      );
    }
  }

  const f = (key: keyof ContactForm, hint = false) =>
    controlProps(`${formId}-${key}`, errors[key]?.message, hint);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this person's details. Changes save to your sandbox."
              : "Add a person to your CRM. Use fictional details only."}
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            id={`${formId}-firstName`}
            label="First name"
            error={errors.firstName?.message}
          >
            <Input
              {...register("firstName")}
              {...f("firstName")}
              autoComplete="off"
            />
          </FormField>
          <FormField
            id={`${formId}-lastName`}
            label="Last name"
            error={errors.lastName?.message}
          >
            <Input
              {...register("lastName")}
              {...f("lastName")}
              autoComplete="off"
            />
          </FormField>
          <FormField
            id={`${formId}-email`}
            label="Email"
            error={errors.email?.message}
          >
            <Input
              {...register("email")}
              {...f("email")}
              type="email"
              inputMode="email"
              autoComplete="off"
            />
          </FormField>
          <FormField
            id={`${formId}-phone`}
            label="Phone (optional)"
            error={errors.phone?.message}
          >
            <Input
              {...register("phone")}
              {...f("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
            />
          </FormField>
          <FormField
            id={`${formId}-companyId`}
            label="Company"
            error={errors.companyId?.message}
          >
            <NativeSelect
              {...register("companyId")}
              {...f("companyId")}
              className="w-full"
            >
              <NativeSelectOption value="">Choose a company</NativeSelectOption>
              {sortedCompanies.map((company) => (
                <NativeSelectOption key={company.id} value={company.id}>
                  {company.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id={`${formId}-jobTitle`}
            label="Job title (optional)"
            error={errors.jobTitle?.message}
          >
            <Input
              {...register("jobTitle")}
              {...f("jobTitle")}
              autoComplete="off"
            />
          </FormField>
          <FormField
            id={`${formId}-status`}
            label="Status"
            error={errors.status?.message}
          >
            <NativeSelect
              {...register("status")}
              {...f("status")}
              className="w-full"
            >
              {CONTACT_STATUSES.map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {CONTACT_STATUS_LABELS[status]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id={`${formId}-source`}
            label="Source"
            error={errors.source?.message}
          >
            <NativeSelect
              {...register("source")}
              {...f("source")}
              className="w-full"
            >
              {CONTACT_SOURCES.map((source) => (
                <NativeSelectOption key={source} value={source}>
                  {SOURCE_LABELS[source]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id={`${formId}-ownerName`}
            label="Owner"
            error={errors.ownerName?.message}
            className="sm:col-span-2"
          >
            <Input
              {...register("ownerName")}
              {...f("ownerName")}
              list={`${formId}-owners`}
              autoComplete="off"
            />
            <datalist id={`${formId}-owners`}>
              {owners.map((owner) => (
                <option key={owner} value={owner} />
              ))}
            </datalist>
          </FormField>
          <FormField
            id={`${formId}-tags`}
            label="Tags (optional)"
            hint="Press Enter or type a comma to add a tag."
            error={errors.tags?.message ?? errors.tags?.[0]?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagsInput
                  id={`${formId}-tags`}
                  value={field.value}
                  onChange={field.onChange}
                  maxTags={LIMITS.tagsMaxCount}
                  maxLength={LIMITS.tagMax}
                  invalid={Boolean(errors.tags)}
                  describedBy={f("tags", true)["aria-describedby"]}
                />
              )}
            />
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
            {editing ? "Save changes" : "Add contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
