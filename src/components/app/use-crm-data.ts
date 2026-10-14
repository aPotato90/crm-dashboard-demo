"use client";

import {
  useActivities,
  useCompanies,
  useContacts,
  useDeals,
  useTasks,
} from "@/lib/crm/hooks";

/**
 * Every sandbox collection, live. Firestore shares identical listeners, so
 * pages and dialogs can call this freely.
 */
export function useCrmData() {
  const companies = useCompanies();
  const contacts = useContacts();
  const deals = useDeals();
  const activities = useActivities();
  const tasks = useTasks();
  const all = [companies, contacts, deals, activities, tasks];
  return {
    companies: companies.data,
    contacts: contacts.data,
    deals: deals.data,
    activities: activities.data,
    tasks: tasks.data,
    loading: all.some((c) => c.loading),
    error: all.find((c) => c.error)?.error ?? null,
    retry: () => all.forEach((c) => c.error && c.retry()),
  };
}

export type CrmData = ReturnType<typeof useCrmData>;
