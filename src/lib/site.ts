/** Site-level settings read from public env vars. */

function parseHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/** The developer's portfolio (NEXT_PUBLIC_PORTFOLIO_URL), if set and valid. */
export const portfolioUrl = parseHttpUrl(process.env.NEXT_PUBLIC_PORTFOLIO_URL);

/**
 * Public URL of the deployed demo (NEXT_PUBLIC_SITE_URL), used as the base for
 * Open Graph and other absolute URLs. Null when unset.
 */
export const siteUrl = parseHttpUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const DEVELOPER_NAME = "Emmanuel Kelvin";

export const SITE_NAME = "PipelineHQ (Demo)";
export const SITE_DESCRIPTION =
  "A portfolio demo of a CRM dashboard built with Next.js, TypeScript and Firebase. Fake data only.";
