"use client";

/**
 * Real-time read hooks for the signed-in visitor's sandbox. Each hook opens
 * one Firestore `onSnapshot` listener through the repo and closes it on
 * unmount (or when the route is hidden by React Activity). Firestore shares
 * identical listeners internally, so several components can use the same
 * hook without extra reads.
 */
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/firebase/auth-provider";

import type { ActivityData } from "./activity";
import type { WithId } from "./common";
import type { CompanyData } from "./company";
import type { ContactData } from "./contact";
import type { DealData } from "./deal";
import {
  activitiesRepo,
  companiesRepo,
  contactsRepo,
  dealsRepo,
  tasksRepo,
  type EntityRepo,
} from "./repo";
import type { TaskData } from "./task";

export type LiveCollection<T> = {
  /** Documents, newest first. Empty while loading or after an error. */
  data: T[];
  /** True until the first snapshot for the current visitor arrives. */
  loading: boolean;
  error: Error | null;
};

type Snapshot<T> = { key: string; data: T[]; error: Error | null };

function useLiveCollection<T extends Record<string, unknown>>(
  repo: EntityRepo<T>,
  limit?: number,
): LiveCollection<WithId<T>> {
  const uid = useAuth().user?.uid ?? null;
  const key = uid ? `${uid}:${limit ?? "all"}` : null;
  const [snapshot, setSnapshot] = useState<Snapshot<WithId<T>> | null>(null);

  useEffect(() => {
    if (!uid || !key) return;
    // Keep showing the last snapshot while re-subscribing (for example when a
    // hidden route becomes visible again); only a new key means "loading".
    return repo.subscribe(
      uid,
      (data) => setSnapshot({ key, data, error: null }),
      (error) => setSnapshot({ key, data: [], error }),
      { limit },
    );
  }, [repo, uid, key, limit]);

  if (!key) return { data: [], loading: false, error: null };
  if (snapshot?.key !== key) return { data: [], loading: true, error: null };
  return { data: snapshot.data, loading: false, error: snapshot.error };
}

export function useCompanies(): LiveCollection<WithId<CompanyData>> {
  return useLiveCollection(companiesRepo);
}

export function useContacts(): LiveCollection<WithId<ContactData>> {
  return useLiveCollection(contactsRepo);
}

export function useDeals(): LiveCollection<WithId<DealData>> {
  return useLiveCollection(dealsRepo);
}

/** Activities, newest first; pass `limit` for a recent-activity feed. */
export function useActivities(options?: {
  limit?: number;
}): LiveCollection<WithId<ActivityData>> {
  return useLiveCollection(activitiesRepo, options?.limit);
}

export function useTasks(): LiveCollection<WithId<TaskData>> {
  return useLiveCollection(tasksRepo);
}
