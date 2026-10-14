import { connection } from "next/server";
import { Suspense } from "react";

async function Connection() {
  await connection();
  return null;
}

/**
 * Renders nothing. Marks the routes it is rendered in as intentionally
 * request-time, so metadata that depends on runtime params (such as
 * /app/contacts/[id]) may resolve then. Wrapped in Suspense so the rest of
 * the route still prerenders as a static shell.
 */
export function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  );
}
