/** Pure helpers for the companies list and company detail page. */
import type { WithId } from "./common";
import type { CompanyData } from "./company";
import type { ContactData } from "./contact";
import { DEAL_STAGES, type DealData, type DealStage } from "./deal";
import { STAGE_LABELS } from "./labels";

export type CompanyRow = WithId<CompanyData> & {
  contactCount: number;
  dealCount: number;
  /** Sum of every deal's value, whatever its stage. */
  totalDealValue: number;
};

export function toCompanyRows(
  companies: WithId<CompanyData>[],
  contacts: Pick<ContactData, "companyId">[],
  deals: Pick<DealData, "companyId" | "value">[],
): CompanyRow[] {
  return companies.map((company) => {
    const companyDeals = deals.filter((d) => d.companyId === company.id);
    return {
      ...company,
      contactCount: contacts.filter((c) => c.companyId === company.id).length,
      dealCount: companyDeals.length,
      totalDealValue: companyDeals.reduce((sum, d) => sum + d.value, 0),
    };
  });
}

/** Search by name, industry or website, plus an exact industry filter. */
export function filterCompanies(
  rows: CompanyRow[],
  { q, industry }: { q: string; industry: string },
): CompanyRow[] {
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows
    .filter((row) => !industry || row.industry === industry)
    .filter((row) => {
      const haystack =
        `${row.name} ${row.industry} ${row.website}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct industries, sorted, for the filter and the form suggestions. */
export function industriesOf(
  companies: Pick<CompanyData, "industry">[],
): string[] {
  return [...new Set(companies.map((c) => c.industry))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export type StageValue = {
  stage: DealStage;
  label: string;
  value: number;
  count: number;
};

/** Deal value and count per stage (every stage, in pipeline order). */
export function dealValueByStage(
  deals: Pick<DealData, "stage" | "value">[],
): StageValue[] {
  return DEAL_STAGES.map((stage) => {
    const inStage = deals.filter((d) => d.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      value: inStage.reduce((sum, d) => sum + d.value, 0),
      count: inStage.length,
    };
  });
}

/** "https://bluepine.example.com/" -> "bluepine.example.com" */
export function displayWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
