import { HOME_MODULE_TONE_MAP, MODULE_TONES, PAGE_TONE_MAP } from "@/lib/config/moduleTones";
import type { HomeModuleKey, ModuleTone } from "@/lib/course/types";

describe("module tone mappings", () => {
  it("covers every home module with a valid tone", () => {
    const expectedKeys: HomeModuleKey[] = [
      "weekly-map",
      "this-week-tasks",
      "ed-link",
      "textbooks",
    ];

    expect(Object.keys(HOME_MODULE_TONE_MAP).sort()).toEqual(expectedKeys.sort());

    expectedKeys.forEach((key) => {
      expect(MODULE_TONES).toContain(HOME_MODULE_TONE_MAP[key]);
    });
  });

  it("uses only declared semantic tones across page mappings", () => {
    const collected = Object.values(PAGE_TONE_MAP).flatMap((group) => Object.values(group));

    collected.forEach((tone) => {
      expect(MODULE_TONES).toContain(tone as ModuleTone);
    });
  });
});
