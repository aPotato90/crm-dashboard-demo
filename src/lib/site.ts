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

export const DEVELOPER_NAME = "Emmanuel Kelvin";
