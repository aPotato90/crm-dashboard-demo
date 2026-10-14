import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import { fromFirestoreData, toFirestoreData } from "./convert";

describe("Date <-> Timestamp conversion", () => {
  it("stores Dates as Timestamps and reads them back as Dates", () => {
    const createdAt = new Date("2026-06-15T12:34:00Z");
    const stored = toFirestoreData({ name: "Acme", createdAt, closedAt: null });
    expect(stored.createdAt).toBeInstanceOf(Timestamp);
    expect(stored.closedAt).toBeNull();
    expect(stored.name).toBe("Acme");

    const read = fromFirestoreData(stored);
    expect(read.createdAt).toBeInstanceOf(Date);
    expect((read.createdAt as Date).getTime()).toBe(createdAt.getTime());
    expect(read.closedAt).toBeNull();
  });
});
