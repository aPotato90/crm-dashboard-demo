import { AppGate } from "@/components/app/app-gate";

/**
 * Everything under /app needs a signed-in (anonymous) Firebase user and reads
 * data with the Firebase client SDK, so the content can only render in the
 * browser. The server prerenders the gate's skeleton, and navigations into
 * /app are not expected to be instant: opt out of instant-navigation
 * validation, which would otherwise report the page segment as "dropped".
 */
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppGate>{children}</AppGate>;
}
