import { expect, type Page, test } from "@playwright/test";

const login = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(process.env.E2E_PORTAL_USERNAME ?? "cs201");
  await page.getByLabel("Password").fill(process.env.E2E_PORTAL_PASSWORD ?? "cs201");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/$/);
};

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title === "unauthenticated access redirects to login") {
    return;
  }

  await login(page);
});

test("unauthenticated access redirects to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?next=%2F$/);
});

test("week selection remains functional after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Week 3" }).click();
  await expect(page.getByRole("heading", { name: "Week 3 Learning Map" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Week 3" }).click();
  await expect(page.getByRole("heading", { name: "Week 3 Learning Map" })).toBeVisible();
});

test("collapsed week navigation persists after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Collapse week navigation" }).click();
  await expect(page.getByRole("heading", { name: "Week 1", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Week 1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand week navigation" })).toBeVisible();
});

test("display preferences keep layout fixed and toggle theme", async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 960 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Switch to Bento Box Grid" })).toHaveCount(0);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("mobile drawer navigation opens without planner link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Planner" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Course Site" })).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Homework" }).click();
  await expect(page).toHaveURL(/\/homework$/);
});

test("home no longer shows quick access/recommendation and includes task calendar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Week 1 Lecture and Lab Resources" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Week 1 Learning Map" })).toBeVisible();
  await expect(page.getByText("Lectures")).toBeVisible();
  await expect(page.getByText("Lab", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /CS\.1\.Basics\.pdf/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Week_1__Lab\.DataTypes\.pdf/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quick Access" })).toHaveCount(0);
  await expect(page.getByText("Recommendation")).toHaveCount(0);
  await expect(page.getByText("Upcoming Deadlines")).toHaveCount(0);
  await expect(page.getByText("Course Site Import")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Task Calendar" })).toBeVisible();
  await expect(page.getByText("Recommended", { exact: true })).toBeVisible();
  await expect(page.getByText("Required", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /due item\(s\) on day 17/ }).hover();
  await expect(page.getByText("recommended").first()).toBeVisible();
  await expect(page.getByText("hw1").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "No due items on day 20" })).toBeVisible();
  await page.getByRole("button", { name: /due item\(s\) on day 22/ }).hover();
  await expect(page.getByText("required").first()).toBeVisible();
  await expect(page.getByText("recommended").first()).toBeVisible();
});

test("sag platform toggle shows concise setup checks", async ({ page }) => {
  await page.goto("/sag");
  await expect(page.getByRole("heading", { name: "Instruction for Setup" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Setup Checks" })).toBeVisible();
  await expect(page.getByText("choco install make python temurin21 -y")).toBeVisible();
  await page.getByRole("button", { name: "Mac" }).click();
  await expect(page.getByText("Install Miniconda or Anaconda")).toBeVisible();
  await expect(page.getByText("Setup Instruction Video")).toHaveCount(0);
});

test("homework shows new homework-question-progress flow", async ({ page }) => {
  await page.route("**/api/reflections/week/1", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        reflection: {
          kind: "reflection-week",
          week: 1,
          sourceHref: "http://10.200.20.79:81/student.html",
          syncStatus: "synced",
          generatedAt: "2026-04-28T00:00:00.000Z",
          questionnaires: [
            {
              id: "reflection-week-1-questionnaire-1",
              week: 1,
              kind: "ai-reflection",
              questionnaireNo: 1,
              label: "Questionnaire 1: AI Reflection",
              title: "AI Reflection",
              template: {
                label: "Download AI reflection template",
                href: "/reflection-templates/ai-reflect-template-2026-v2.pdf",
                fileName: "ai-reflect-template-2026-v2.pdf",
              },
              sourceHref: "http://10.200.20.79:81/student.html",
              submitEndpoint: "/api/reflections/week/1/questionnaire/1/submit",
              available: true,
              canSubmit: true,
              syncStatus: "synced",
              responseText: "draft",
            },
          ],
        },
      }),
    });
  });
  await page.route("**/api/quiz/week/1", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        quiz: {
          kind: "quiz",
          id: "quiz-week-1",
          week: 1,
          title: "Week 1 Quiz",
          sourceHref: "http://10.200.20.79:8005/cs201/quiz/101/",
          status: "open",
          due: "May 5 2026 11:59pm",
          progressLabel: "0/24 passed",
          problems: [
            {
              id: "quiz-problem-101",
              problemId: "101",
              week: 1,
              label: "Problem01",
              title: "Programming in Java",
              sourceHref: "http://10.200.20.79:8005/cs201/quiz/101/",
              status: "open",
              prompt: [{ type: "text", text: "Fill in the command sequence." }],
              answerFields: [{ name: "0", label: "(0)", required: true }],
            },
          ],
        },
      }),
    });
  });
  await page.route("**/api/quiz/question/101/submit", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        result: {
          status: "failed",
          message: "Submission checked.",
          passed: 1,
          total: 24,
          attemptsLeft: 99,
        },
      }),
    });
  });
  await page.route("**/api/reflections/week/1/questionnaire/1/submit", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        questionnaire: {
          id: "reflection-week-1-questionnaire-1",
          week: 1,
          kind: "ai-reflection",
          questionnaireNo: 1,
          label: "Questionnaire 1: AI Reflection",
          title: "AI Reflection",
          template: {
            label: "Download AI reflection template",
            href: "/reflection-templates/ai-reflect-template-2026-v2.pdf",
            fileName: "ai-reflect-template-2026-v2.pdf",
          },
          sourceHref: "http://10.200.20.79:81/student.html",
          submitEndpoint: "/api/reflections/week/1/questionnaire/1/submit",
          available: true,
          canSubmit: true,
          syncStatus: "synced",
          responseText: "updated",
          submissionSpk: "reflection-1",
        },
      }),
    });
  });

  await page.goto("/homework");
  await expect(page.getByText("Homework Selector")).toBeVisible();
  await expect(page.getByText("Question Selector")).toBeVisible();
  await expect(page.getByText("Question Progress")).toBeVisible();
  await page.getByRole("button", { name: "HW1" }).click();
  await expect(page.getByRole("heading", { name: "Exercise 1.2.18 EuclideanDistance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Program description" })).toBeVisible();
  await expect(page.getByText("EuclideanDistance.java")).toBeVisible();

  await page.getByRole("button", { name: /Quiz/ }).click();
  await expect(page.getByRole("button", { name: "Problem01" })).toBeVisible();
  await expect(page.getByText("Fill in the command sequence.")).toBeVisible();
  await expect(page.getByText(/Answer:/i)).toHaveCount(0);
  await page.getByLabel("(0)").fill("Create");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("1/24 passed")).toBeVisible();
  await expect(page.getByText("99 attempts left")).toBeVisible();

  await page.getByRole("button", { name: /AI Reflection/ }).click();
  await expect(page.getByRole("link", { name: /Download AI reflection template/ })).toBeVisible();
  await page.getByLabel("Response text").fill("updated");
  await page.getByRole("button", { name: "Submit to teacher site" }).click();
  await expect(page.getByText(/Submission id: reflection-1/)).toBeVisible();
});

test("weekly planner route redirects to home", async ({ page }) => {
  await page.goto("/weekly-planner");
  await expect(page).toHaveURL(/\/$/);
});

test("resources exposes lecture and lab material previews", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Week 3" }).click();
  await page.goto("/resources");
  await expect(page.getByRole("button", { name: "Lecture" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lab" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Class Notes" })).toBeVisible();
  await expect(page.getByText("Search Resources")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Week 3 Lecture, Lab, and Class Notes" })).toBeVisible();
  await expect(page.getByText("Course Site Import")).toBeVisible();
  await expect(page.getByText("Official Course Site")).toBeVisible();
  await expect(page.getByRole("link", { name: /Download textbook/ })).toHaveAttribute(
    "href",
    "/course-materials/textbook/cs201-textbook.pdf",
  );
  await expect(page.getByRole("link", { name: /CS\.6\.Recursion\.pdf/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /CS\.1\.Basics\.pdf/ })).toHaveCount(0);

  const lecturePopup = page.waitForEvent("popup");
  await page.getByRole("link", { name: /CS\.6\.Recursion\.pdf/ }).click();
  const lecturePreview = await lecturePopup;
  await expect(lecturePreview.getByRole("heading", { name: "CS.6.Recursion.pdf" })).toBeVisible();
  await expect(lecturePreview.getByRole("link", { name: "Download" })).toBeVisible();
  await lecturePreview.close();

  await page.getByRole("button", { name: "Lab" }).click();
  await expect(page.getByRole("link", { name: /CS201\.DKU\.week3\.lab\.pdf/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Week_1__Lab\.DataTypes\.pdf/ })).toHaveCount(0);

  const labPopup = page.waitForEvent("popup");
  await page.getByRole("link", { name: /CS201\.DKU\.week3\.lab\.pdf/ }).click();
  const labPreview = await labPopup;
  await expect(labPreview.getByRole("heading", { name: "CS201.DKU.week3.lab.pdf" })).toBeVisible();
  await expect(labPreview.getByRole("link", { name: "Download" })).toBeVisible();
  await labPreview.close();

  const answerPopup = page.waitForEvent("popup");
  await page.getByRole("link", { name: /LAB-3\.Solutions\.Zhiyuan_Shen\.pdf/ }).click();
  const answerPreview = await answerPopup;
  await expect(answerPreview.getByRole("heading", { name: "LAB-3.Solutions.Zhiyuan_Shen.pdf" })).toBeVisible();
  await expect(answerPreview.getByRole("link", { name: "Download" })).toBeVisible();
  await answerPreview.close();

  await page.getByRole("button", { name: "Class Notes" }).click();
  await expect(page.getByText("No Class Notes uploaded for Week 3.")).toBeVisible();
});

test("exams shows the optimized session grading policy", async ({ page }) => {
  await page.goto("/exams");
  await expect(page.getByText("Session Exam Grading Policy").first()).toBeVisible();
  await expect(page.getByText("Category I: graded assignments")).toBeVisible();
  await expect(page.getByText("Category II: AI questionnaires")).toBeVisible();
  await expect(page.getByText("Category III: adaptive exam contribution")).toBeVisible();
  await expect(page.getByText("max(final, 40% * mid + 60% * final)")).toBeVisible();
});

test("projects shows own team and explicit BK vote submit", async ({ page }) => {
  await page.route(/\/api\/bk-projects\/week\/\d+$/, async (route) => {
    const week = Number(new URL(route.request().url()).pathname.split("/").at(-1));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        project: {
          kind: "bk-project-week",
          week,
          sourceHref: "http://10.200.20.79:81/student.html",
          syncStatus: week === 5 ? "synced" : "fallback",
          syncMessage: week === 5 ? undefined : "No mocked project for this week.",
          generatedAt: "2026-04-29T00:00:00.000Z",
          project:
            week === 5
              ? {
                  spk: "bk5",
                  name: "Week 5 BK",
                  surveySpk: "survey-5",
                  votingClosed: false,
                }
              : undefined,
          ownGroup:
            week === 5
              ? {
                  spk: "own",
                  name: "Team 3",
                  members: [{ username: "student1" }, { username: "student2" }],
                  isOwnGroup: true,
                }
              : undefined,
          groups:
            week === 5
              ? [
                  {
                    spk: "own",
                    name: "Team 3",
                    members: [{ username: "student1" }, { username: "student2" }],
                    isOwnGroup: true,
                  },
                  {
                    spk: "target",
                    name: "Team 4",
                    members: [{ username: "student3" }],
                    isOwnGroup: false,
                  },
                ]
              : [],
          canVote: week === 5,
        },
      }),
    });
  });
  await page.route("**/api/bk-projects/week/5/groups/target/survey", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        survey: {
          kind: "bk-survey",
          week: 5,
          sourceHref: "http://10.200.20.79:81/student.html",
          project: { spk: "bk5", name: "Week 5 BK", surveySpk: "survey-5", votingClosed: false },
          group: { spk: "target", name: "Team 4", members: [{ username: "student3" }], isOwnGroup: false },
          items: [{ spk: "item-1", nid: "quality", label: "Quality", type: "rating" }],
          submissions: [],
          votingClosed: false,
          isOwnGroup: false,
          canSubmit: true,
        },
      }),
    });
  });
  await page.route("**/api/bk-projects/week/5/groups/target/vote", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        survey: {
          kind: "bk-survey",
          week: 5,
          sourceHref: "http://10.200.20.79:81/student.html",
          project: { spk: "bk5", name: "Week 5 BK", surveySpk: "survey-5", votingClosed: false },
          group: { spk: "target", name: "Team 4", members: [{ username: "student3" }], isOwnGroup: false },
          items: [{ spk: "item-1", nid: "quality", label: "Quality", type: "rating" }],
          submissions: [{ spk: "sub-1", itemSpk: "item-1", rating: 4 }],
          votingClosed: false,
          isOwnGroup: false,
          canSubmit: true,
        },
      }),
    });
  });

  await page.goto("/projects");
  await expect(page.getByText("Local Project Overview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Locked until teacher-site sync is configured" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit vote locked" })).toBeDisabled();
  await page.getByRole("button", { name: "Week 5", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Week 5 team and voting" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team 3" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Vote for Team 4" }).click();
  await expect(page.getByLabel("Rate Quality")).toBeVisible();
  await page.getByLabel("Rate Quality").selectOption("4");
  await page.getByRole("button", { name: "Submit vote" }).click();
  await expect(page.getByText("Existing teacher-site vote data loaded for this team.")).toBeVisible();
});

test("admin page edits local portal overrides without teacher-site writes", async ({ page }) => {
  const emptyOverrides = {
    version: 1,
    tasks: {},
    deadlines: {},
    resources: {},
    reflections: {},
  };
  await page.route("**/api/admin/overrides", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          overrides: {
            ...emptyOverrides,
            updatedAt: "2026-04-29T00:00:00.000Z",
            updatedBy: "test",
            tasks: { hw1: { title: "Edited HW1" } },
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        username: "test",
        overrides: emptyOverrides,
        base: {
          weeks: [1, 2, 3, 4, 5, 6, 7],
          tasks: [
            {
              id: "hw1",
              type: "homework",
              title: "HW1",
              description: "Practice setup.",
              weeks: [1],
              dueDate: "2026-03-17T23:59:00",
              linkedLectureIds: ["lec-1"],
              priority: "high",
              dueKind: "recommended",
            },
            {
              id: "air-1",
              type: "ai-reflection",
              title: "AI Reflection 1",
              description: "Reflect on AI use.",
              weeks: [1],
              dueDate: "2026-03-22T23:59:00",
              linkedLectureIds: ["lec-1"],
              priority: "medium",
              dueKind: "recommended",
            },
          ],
          deadlines: [
            {
              id: "ddl-hw1",
              title: "HW1",
              type: "homework",
              dueDate: "2026-03-17T23:59:00",
              week: 1,
              dueKind: "recommended",
              detail: "HW1 recommended date.",
            },
          ],
          resources: [
            {
              id: "res-1",
              type: "resource",
              title: "Starter Guide",
              description: "Guide.",
              weeks: [1],
              category: "reading",
              relatedTaskIds: ["hw1"],
              href: "/resources",
            },
          ],
        },
      }),
    });
  });
  await page.route("**/api/admin/class-notes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, username: "test", notes: [] }),
    });
  });
  await page.route("**/api/admin/class-notes/upload", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        note: {
          id: "class-note-e2e",
          week: 1,
          title: "E2E class note",
          originalFileName: "note.pdf",
          storedFileName: "class-note-e2e.pdf",
          mimeType: "application/pdf",
          size: 10,
          fileType: "pdf",
          publicHref: "/course-materials/class-notes/class-note-e2e.pdf",
          previewHref: "/resources/class-notes/class-note-e2e",
          hidden: false,
          createdAt: "2026-04-30T00:00:00.000Z",
          createdBy: "test",
        },
      }),
    });
  });
  await page.route("**/api/admin/overrides/reset", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, overrides: emptyOverrides }),
    });
  });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin", exact: true })).toBeVisible();
  await expect(page.getByText("Local content publishing workbench")).toBeVisible();
  await expect(page.getByText("Student-visible").first()).toBeVisible();
  await expect(page.getByText("Saved locally").first()).toBeVisible();
  await expect(page.getByText("AI Reflection uses recommended Sunday due styling, not required due styling.")).toBeVisible();
  await expect(page.getByText("Files / Class Notes")).toBeVisible();
  await page.getByLabel("Title").first().fill("Edited HW1");
  await expect(page.getByText("Unsaved changes").first()).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved local portal overrides.")).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("Reset local portal overrides.")).toBeVisible();
});

test("course site page is removed", async ({ page }) => {
  await page.goto("/course-site");
  await expect(page.getByText(/404|This page could not be found/i).first()).toBeVisible();
});
