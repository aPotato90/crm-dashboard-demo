import { AppGate } from "@/components/app/app-gate";
import { DynamicMarker } from "@/components/dynamic-marker";

/**
 * Everything under /app needs a signed-in (anonymous) Firebase user and reads
 * data with the Firebase client SDK, so the content can only render in the
 * browser. The server prerenders the gate's skeleton, and navigations into
 * /app are not expected to be instant: opt out of instant-navigation
 * validation, which would otherwise report the page segment as "dropped".
 */
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      {/* Detail routes (/app/contacts/[id], ...) resolve metadata from
          runtime params. The gate never renders pages on the server, so this
          marker, rendered beside it, tells Next.js that request-time
          rendering is intentional. The skeleton shell still prerenders. */}
      <DynamicMarker />
      <AppGate>{children}</AppGate>
    </>
  );
}
