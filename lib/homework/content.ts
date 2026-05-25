import homeworkManifest from "@/data/homework/manifest.json";
import type { WeekNumber } from "@/lib/course/types";
import type { HomeworkEntry, HomeworkManifest } from "@/lib/homework/types";

export const HOMEWORK_MANIFEST = homeworkManifest as HomeworkManifest;

const NON_EXISTENT_HOMEWORK_IDS = new Set(["hw18", "hw19"]);

export const HOMEWORKS = HOMEWORK_MANIFEST.homeworks.filter(
  (homework) => !NON_EXISTENT_HOMEWORK_IDS.has(homework.id),
);

export const getHomeworksForWeek = (week: WeekNumber): HomeworkEntry[] => {
  const matched = HOMEWORKS.filter((homework) => homework.week === week);
  return matched.length > 0 ? matched : HOMEWORKS.filter((homework) => homework.week === 1);
};

export const getHomeworkById = (id: string) => HOMEWORKS.find((homework) => homework.id === id);

export const getHomeworkQuestionById = (questionId: string) =>
  HOMEWORKS.flatMap((homework) => homework.questions).find((question) => question.id === questionId);
