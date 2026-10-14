import { AppGate } from "@/components/app/app-gate";

/** Everything under /app requires a signed-in (anonymous) visitor. */
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppGate>{children}</AppGate>;
}
