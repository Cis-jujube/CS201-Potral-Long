import materialsManifest from "@/data/course-materials/manifest.json";
import type { CourseMaterialItem, CourseMaterialsManifest } from "@/lib/course-materials/types";

export const COURSE_MATERIALS_MANIFEST = materialsManifest as CourseMaterialsManifest;

export const COURSE_MATERIALS = COURSE_MATERIALS_MANIFEST.items;

export const getLectureMaterials = () =>
  COURSE_MATERIALS.filter((item) => item.kind === "lecture").sort(sortByWeekSessionFile);

export const getLabMaterials = () =>
  COURSE_MATERIALS.filter((item) => item.kind === "lab").sort(sortByWeekSessionFile);

export const flattenCourseMaterials = (items: CourseMaterialItem[] = COURSE_MATERIALS): CourseMaterialItem[] =>
  items.flatMap((item) => [item, ...flattenCourseMaterials(item.children ?? [])]);

export const getCourseMaterialById = (id: string) =>
  flattenCourseMaterials().find((item) => item.id === id);

export const groupCourseMaterialsByWeek = (items: CourseMaterialItem[]) => {
  const weekMap = new Map<number, CourseMaterialItem[]>();

  items.forEach((item) => {
    const existing = weekMap.get(item.week) ?? [];
    existing.push(item);
    weekMap.set(item.week, existing);
  });

  return [...weekMap.entries()]
    .sort(([weekA], [weekB]) => weekA - weekB)
    .map(([week, weekItems]) => ({
      week,
      items: weekItems.sort(sortByWeekSessionFile),
    }));
};

export const getMaterialPreviewHref = (item: CourseMaterialItem) => `/resources/materials/${item.id}`;

const sortByWeekSessionFile = (left: CourseMaterialItem, right: CourseMaterialItem) => {
  if (left.week !== right.week) {
    return left.week - right.week;
  }

  const leftSession = left.session ?? Number.MAX_SAFE_INTEGER;
  const rightSession = right.session ?? Number.MAX_SAFE_INTEGER;

  if (leftSession !== rightSession) {
    return leftSession - rightSession;
  }

  return left.fileName.localeCompare(right.fileName);
};
