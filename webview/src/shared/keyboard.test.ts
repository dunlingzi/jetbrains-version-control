import { describe, expect, it } from "vitest";
import { isPlainArrowKey } from "./keyboard";

function key(overrides: Partial<Parameters<typeof isPlainArrowKey>[0]>) {
  return {
    key: "ArrowDown",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  };
}

describe("isPlainArrowKey", () => {
  it("accepts a bare arrow key", () => {
    expect(isPlainArrowKey(key({ key: "ArrowDown" }))).toBe(true);
    expect(isPlainArrowKey(key({ key: "ArrowUp" }))).toBe(true);
  });

  it("rejects modified arrow keys so shortcuts are not swallowed", () => {
    // Cmd+ArrowDown is the Jump to Source shortcut; the browser reports it with
    // key === "ArrowDown", so a modifier check is the only thing separating the
    // two behaviours.
    expect(isPlainArrowKey(key({ key: "ArrowDown", metaKey: true }))).toBe(
      false,
    );
    expect(isPlainArrowKey(key({ key: "ArrowDown", ctrlKey: true }))).toBe(
      false,
    );
    expect(isPlainArrowKey(key({ key: "ArrowDown", altKey: true }))).toBe(
      false,
    );
    expect(isPlainArrowKey(key({ key: "ArrowUp", metaKey: true }))).toBe(false);
    expect(isPlainArrowKey(key({ key: "ArrowUp", ctrlKey: true }))).toBe(false);
  });

  it("rejects other keys entirely", () => {
    expect(isPlainArrowKey(key({ key: "Enter" }))).toBe(false);
    expect(isPlainArrowKey(key({ key: "a" }))).toBe(false);
    expect(isPlainArrowKey(key({ key: "F4", metaKey: true }))).toBe(false);
  });
});
