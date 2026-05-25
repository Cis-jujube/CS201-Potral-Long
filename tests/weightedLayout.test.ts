import type { HomeModuleWeightConfig } from "@/lib/course/types";
import {
  DEFAULT_HOME_MODULE_WEIGHTS,
  getHomeTileClassMap,
  getHomeTileLayout,
} from "@/lib/home/weightedLayout";

describe("weighted home layout", () => {
  it("maps all modules to default bento grid tiles", () => {
    const gridMap = getHomeTileClassMap("bento-grid", DEFAULT_HOME_MODULE_WEIGHTS);

    expect(Object.keys(gridMap).length).toBe(4);
  });

  it("preserves area monotonicity for ranked modules", () => {
    const layout = getHomeTileLayout("bento-grid", "desktop", DEFAULT_HOME_MODULE_WEIGHTS);

    for (let index = 0; index < layout.length - 1; index += 1) {
      expect(layout[index].area).toBeGreaterThanOrEqual(layout[index + 1].area);
    }
  });

  it("promotes higher-weight module to higher rank", () => {
    const custom: HomeModuleWeightConfig = {
      ...DEFAULT_HOME_MODULE_WEIGHTS,
      "ed-link": 5,
      textbooks: 1,
    };
    const layout = getHomeTileLayout("bento-grid", "desktop", custom);
    const rankedKeys = layout.map((item) => item.key);

    expect(rankedKeys.indexOf("ed-link")).toBeLessThan(rankedKeys.indexOf("textbooks"));
  });
});
