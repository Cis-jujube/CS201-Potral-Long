import { readNumber, readString, readStringArray, readStringRecord, writeValue } from "@/lib/storage/clientStore";

describe("clientStore", () => {
  it("reads and writes number values", () => {
    writeValue("week", 4);
    expect(readNumber("week", 1)).toBe(4);
  });

  it("reads and writes string arrays", () => {
    writeValue("completed", ["a", "b"]);
    expect(readStringArray("completed", [])).toEqual(["a", "b"]);
  });

  it("falls back for missing values", () => {
    expect(readString("missing-key", "default")).toBe("default");
  });

  it("reads and writes string records", () => {
    writeValue("progress-map", { q1: "correct", q2: "incorrect" });
    expect(readStringRecord("progress-map", {})).toEqual({ q1: "correct", q2: "incorrect" });
  });
});
