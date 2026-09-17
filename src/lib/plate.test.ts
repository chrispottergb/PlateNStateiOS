import { describe, it, expect } from "vitest";
import { normalizePlate, resolveClaimStatus } from "./plate";

describe("normalizePlate", () => {
  it("canonicalizes case, dashes and spaces to one identity (CASE E)", () => {
    expect(normalizePlate("abc123")).toBe("ABC123");
    expect(normalizePlate("ABC-123")).toBe("ABC123");
    expect(normalizePlate("ABC 123")).toBe("ABC123");
    expect(normalizePlate("  abc 123 ")).toBe("ABC123");
    expect(normalizePlate("ABC123")).toBe("ABC123");
  });
  it("handles empty input", () => {
    expect(normalizePlate("")).toBe("");
    expect(normalizePlate(null)).toBe("");
    expect(normalizePlate(undefined)).toBe("");
  });
});

describe("resolveClaimStatus", () => {
  it("is unclaimed with no row or an unpaid (legacy) row", () => {
    expect(resolveClaimStatus(null, "u1")).toBe("unclaimed");
    expect(resolveClaimStatus({ user_id: "u2", paid: false }, "u1")).toBe("unclaimed");
  });
  it("is mine when the paid row belongs to the current user (CASE B)", () => {
    expect(resolveClaimStatus({ user_id: "u1", paid: true }, "u1")).toBe("mine");
  });
  it("is other when the paid row belongs to someone else, including anonymous viewers (CASE C)", () => {
    expect(resolveClaimStatus({ user_id: "u2", paid: true }, "u1")).toBe("other");
    expect(resolveClaimStatus({ user_id: "u2", paid: true }, null)).toBe("other");
  });
});
