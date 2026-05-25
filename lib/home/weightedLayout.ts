import type {
  HomeBreakpoint,
  HomeModuleKey,
  HomeModuleWeightConfig,
  StyleMode,
  WeightedTileLayout,
} from "@/lib/course/types";

const MODULE_ORDER: HomeModuleKey[] = [
  "weekly-map",
  "this-week-tasks",
  "ed-link",
  "textbooks",
];

export const DEFAULT_HOME_MODULE_WEIGHTS: HomeModuleWeightConfig = {
  "weekly-map": 5,
  "this-week-tasks": 5,
  "ed-link": 3,
  textbooks: 3,
};

type Span = { col: number; row: number };

const SLOT_SPANS: Record<StyleMode, Record<HomeBreakpoint, Span[]>> = {
  "bento-grid": {
    desktop: [
      { col: 7, row: 2 },
      { col: 5, row: 2 },
      { col: 6, row: 1 },
      { col: 6, row: 1 },
    ],
    tablet: [
      { col: 6, row: 2 },
      { col: 6, row: 2 },
      { col: 3, row: 1 },
      { col: 3, row: 1 },
    ],
    mobile: [
      { col: 1, row: 2 },
      { col: 1, row: 2 },
      { col: 1, row: 1 },
      { col: 1, row: 1 },
    ],
  },
};

const SLOT_CLASSES: Record<StyleMode, string[]> = {
  "bento-grid": [
    "col-span-1 row-span-2 md:col-span-6 md:row-span-2 lg:col-span-7 lg:row-span-2",
    "col-span-1 row-span-2 md:col-span-6 md:row-span-2 lg:col-span-5 lg:row-span-2",
    "col-span-1 row-span-1 md:col-span-3 md:row-span-1 lg:col-span-6 lg:row-span-1",
    "col-span-1 row-span-1 md:col-span-3 md:row-span-1 lg:col-span-6 lg:row-span-1",
  ],
};

const toWeight = (value: number) => {
  if (value >= 5) {
    return 5;
  }

  if (value <= 1) {
    return 1;
  }

  return Math.round(value) as 1 | 2 | 3 | 4 | 5;
};

const getRankedKeys = (weights: HomeModuleWeightConfig) => {
  return [...MODULE_ORDER].sort((a, b) => {
    const diff = weights[b] - weights[a];
    if (diff !== 0) {
      return diff;
    }

    return MODULE_ORDER.indexOf(a) - MODULE_ORDER.indexOf(b);
  });
};

export const getHomeTileLayout = (
  styleMode: StyleMode,
  breakpoint: HomeBreakpoint,
  weights: HomeModuleWeightConfig = DEFAULT_HOME_MODULE_WEIGHTS,
): WeightedTileLayout[] => {
  const normalizedWeights = MODULE_ORDER.reduce<HomeModuleWeightConfig>((accumulator, key) => {
    accumulator[key] = toWeight(weights[key]) as HomeModuleWeightConfig[typeof key];
    return accumulator;
  }, { ...DEFAULT_HOME_MODULE_WEIGHTS });

  const rankedKeys = getRankedKeys(normalizedWeights);
  const spans = SLOT_SPANS[styleMode][breakpoint];

  return rankedKeys.map((key, index) => {
    const span = spans[index] ?? spans[spans.length - 1];
    return {
      key,
      importance: normalizedWeights[key],
      breakpoint,
      span,
      area: span.col * span.row,
    };
  });
};

export const getHomeTileClassMap = (
  styleMode: StyleMode,
  weights: HomeModuleWeightConfig = DEFAULT_HOME_MODULE_WEIGHTS,
) => {
  const rankedKeys = getHomeTileLayout(styleMode, "desktop", weights).map((layout) => layout.key);
  const classes = SLOT_CLASSES[styleMode];

  return rankedKeys.reduce<Record<HomeModuleKey, string>>((accumulator, key, index) => {
    accumulator[key] = classes[index] ?? classes[classes.length - 1];
    return accumulator;
  }, {} as Record<HomeModuleKey, string>);
};
