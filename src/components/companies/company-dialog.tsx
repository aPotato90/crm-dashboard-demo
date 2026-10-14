"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
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
  COMPANY_SIZES,
  companySizeSchema,
  LIMITS,
  type CompanyData,
  type WithId,
} from "@/lib/crm";
import { companiesRepo } from "@/lib/crm/repo";
import { describeFirebaseError } from "@/lib/firebase/errors";

/** Form schema from the stored company schema's enum and LIMITS. */
const companyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a company name")
    .max(LIMITS.nameMax, `Use at most ${LIMITS.nameMax} characters`),
  industry: z
    .string()
    .trim()
    .min(1, "Enter an industry")
    .max(LIMITS.industryMax, `Use at most ${LIMITS.industryMax} characters`),
  size: companySizeSchema,
  website: z
    .string()
    .trim()
    .max(LIMITS.urlMax, `Use at most ${LIMITS.urlMax} characters`)
    .refine(
      (value) =>
        value === "" ||
        (/^https?:\/\/\S+$/i.test(value) && URL.canParse(value)),
      "Enter a full address starting with https://",
    ),
});

type CompanyForm = z.infer<typeof companyFormSchema>;

export function CompanyDialog({
  company,
  industries,
  onClose,
  onCreated,
}: {
  company?: WithId<CompanyData>;
  /** Existing industries, offered as suggestions. */
  industries: string[];
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { uid } = useSandbox();
  const formId = useId();
  const [open, setOpen] = useState(true);
  const editing = Boolean(company);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: company
      ? {
          name: company.name,
          industry: company.industry,
          size: company.size,
          website: company.website,
        }
      : { name: "", industry: "", size: "11-50", website: "" },
  });

  function close() {
    setOpen(false);
    onClose();
  }

  async function onSubmit(values: CompanyForm) {
    try {
      if (company) {
        await companiesRepo.update(uid, company.id, values);
        toast.success(`Saved “${values.name}”`);
      } else {
        const id = await companiesRepo.create(uid, {
          ...values,
          createdAt: new Date(),
        });
        toast.success(`Added “${values.name}”`);
        onCreated?.(id);
      }
      close();
    } catch (error) {
      toast.error(
        editing ? "Couldn't save the company" : "Couldn't add the company",
        {
          description: describeFirebaseError(error),
        },
      );
    }
  }

  const f = (key: keyof CompanyForm, hint = false) =>
    controlProps(`${formId}-${key}`, errors[key]?.message, hint);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit company" : "New company"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the company details. Changes save to your sandbox."
              : "Add an account to your CRM. Use a fictional company."}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            id={`${formId}-name`}
            label="Name"
            error={errors.name?.message}
            className="sm:col-span-2"
          >
            <Input {...register("name")} {...f("name")} autoComplete="off" />
          </FormField>
          <FormField
            id={`${formId}-industry`}
            label="Industry"
            error={errors.industry?.message}
          >
            <Input
              {...register("industry")}
              {...f("industry")}
              list={`${formId}-industries`}
              autoComplete="off"
            />
            <datalist id={`${formId}-industries`}>
              {industries.map((industry) => (
                <option key={industry} value={industry} />
              ))}
            </datalist>
          </FormField>
          <FormField
            id={`${formId}-size`}
            label="Size"
            error={errors.size?.message}
          >
            <NativeSelect
              {...register("size")}
              {...f("size")}
              className="w-full"
            >
              {COMPANY_SIZES.map((size) => (
                <NativeSelectOption key={size} value={size}>
                  {size} people
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id={`${formId}-website`}
            label="Website (optional)"
            hint="Use an example.com address for demo data."
            error={errors.website?.message}
            className="sm:col-span-2"
          >
            <Input
              {...register("website")}
              {...f("website", true)}
              type="url"
              inputMode="url"
              placeholder="https://company.example.com"
              autoComplete="off"
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
            {editing ? "Save changes" : "Add company"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
