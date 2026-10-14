"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  describeCascade,
  planCascadeDelete,
  snapshotCascade,
  type CascadeTarget,
} from "@/lib/crm/cascade";
import { applyCascadeDelete, restoreCascade } from "@/lib/crm/mutations";
import { describeFirebaseError } from "@/lib/firebase/errors";

import { useSandbox } from "./sandbox-provider";
import { useCrmData } from "./use-crm-data";

const NOUNS: Record<CascadeTarget["kind"], string> = {
  company: "company",
  contact: "contact",
  deal: "deal",
  task: "task",
  activity: "activity",
};

/**
 * Confirms and performs a delete with its linked records (cascade), then
 * offers Undo in the toast, which restores everything that was removed.
 */
export function CascadeDeleteDialog({
  target,
  name,
  open,
  onOpenChange,
  onDeleted,
}: {
  target: CascadeTarget;
  /** What the user sees, e.g. the contact's full name. */
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful delete (e.g. to leave a detail page). */
  onDeleted?: () => void;
}) {
  const { uid } = useSandbox();
  const data = useCrmData();
  const [deleting, setDeleting] = useState(false);
  const noun = NOUNS[target.kind];
  const plan = planCascadeDelete(target, data);
  const summary = describeCascade(plan, target.kind);

  async function handleDelete(event: React.MouseEvent) {
    // Keep the dialog open until the write finishes.
    event.preventDefault();
    setDeleting(true);
    const snapshot = snapshotCascade(plan, data);
    try {
      await applyCascadeDelete(uid, plan);
      onOpenChange(false);
      onDeleted?.();
      toast.success(`Deleted ${noun} “${name}”`, {
        description: summary ?? undefined,
        action: {
          label: "Undo",
          onClick: () =>
            toast.promise(restoreCascade(uid, snapshot), {
              loading: `Restoring “${name}”…`,
              success: `Restored “${name}”`,
              error: (error: unknown) => ({
                message: "Couldn't undo the delete",
                description: describeFirebaseError(error),
              }),
            }),
        },
      });
    } catch (error) {
      toast.error(`Couldn't delete the ${noun}`, {
        description: describeFirebaseError(error),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !deleting && onOpenChange(next)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {noun}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                “{name}” will be removed from your sandbox.
                {summary ? ` ${summary}` : ""}
              </p>
              <p>You can undo this right after deleting.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || data.loading}
          >
            {deleting && <Loader2Icon aria-hidden className="animate-spin" />}
            Delete {noun}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
