import { DAILY_QUOTES, getDailyQuote } from "@/lib/mock/dailyQuotes";

describe("getDailyQuote", () => {
  it("returns deterministic quote for the same date", () => {
    const target = new Date("2026-04-22T10:00:00.000Z");
    const first = getDailyQuote(target);
    const second = getDailyQuote(target);
    expect(first).toEqual(second);
  });

  it("always returns a quote from configured pool", () => {
    const quote = getDailyQuote(new Date("2026-04-23T10:00:00.000Z"));
    expect(DAILY_QUOTES).toContainEqual(quote);
  });

  it("uses pure traditional quotes without study-note suffixes", () => {
    expect(DAILY_QUOTES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(DAILY_QUOTES.map((quote) => quote.text)).size).toBe(DAILY_QUOTES.length);
    expect(DAILY_QUOTES.map((quote) => quote.text).join(" ")).not.toMatch(/学习注记|边界条件|先读题/);
  });

  it("rotates between morning and afternoon local slots", () => {
    const morning = getDailyQuote(new Date(2026, 3, 23, 10, 0, 0));
    const afternoon = getDailyQuote(new Date(2026, 3, 23, 13, 0, 0));
    expect(morning).not.toEqual(afternoon);
  });
});
