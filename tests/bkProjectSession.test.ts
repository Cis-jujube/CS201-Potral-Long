import {
  fetchBkProjectWeekPayload,
  fetchBkSurveyPayload,
  submitBkProjectVote,
  type ReflectionSession,
} from "@/lib/bk-projects/session";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });

describe("BK project teacher-site session", () => {
  it("builds week project payloads with own team detection", async () => {
    const request = vi
      .fn<ReflectionSession["request"]>()
      .mockResolvedValueOnce(jsonResponse({ id: 17, username: "student1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          courses: [{ name: "CS201", children: [{ name: "Week 5 project", bkproject_spk: "bk5" }] }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ spk: "bk5", name: "Week 5 BK", survey: "survey-5", voting_closed: false }))
      .mockResolvedValueOnce(
        jsonResponse({
          groups: [
            {
              spk: "group-own",
              group_name: "Team 3",
              course_bkproject_spk: "bk5",
              members: [{ id: 17, username: "student1" }, { id: 18, username: "student2" }],
            },
            {
              spk: "group-other",
              group_name: "Team 4",
              course_bkproject_spk: "bk5",
              members: [{ id: 19, username: "student3" }],
            },
          ],
        }),
      );

    const payload = await fetchBkProjectWeekPayload({ baseUrl: "http://bk.test", request }, "student1", 5);

    expect(payload.syncStatus).toBe("synced");
    expect(payload.project).toMatchObject({ spk: "bk5", surveySpk: "survey-5", votingClosed: false });
    expect(payload.ownGroup).toMatchObject({ spk: "group-own", name: "Team 3", isOwnGroup: true });
    expect(payload.groups).toHaveLength(2);
    expect(payload.canVote).toBe(true);
  });

  it("loads survey items and current user submissions for a target group", async () => {
    const request = vi
      .fn<ReflectionSession["request"]>()
      .mockResolvedValueOnce(jsonResponse({ id: 17, username: "student1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          courses: [{ name: "CS201", children: [{ name: "Week 7 project", bkproject_spk: "bk7" }] }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ spk: "bk7", name: "Week 7 BK", survey: "survey-7", voting_closed: false }))
      .mockResolvedValueOnce(
        jsonResponse({
          groups: [
            { spk: "own", group_name: "Team 3", members: [{ username: "student1" }] },
            { spk: "target", group_name: "Team 4", members: [{ username: "student3" }] },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { spk: "item-1", nid: "quality", label: "Quality", type: "rating" },
            { spk: "item-2", nid: "comment", label: "Comment", type: "text" },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ results: [{ spk: "sub-1", item: "item-1", rating: 4 }] }));

    const payload = await fetchBkSurveyPayload({ baseUrl: "http://bk.test", request }, "student1", 7, "target");

    expect(payload.canSubmit).toBe(true);
    expect(payload.items.map((item) => item.spk)).toEqual(["item-1", "item-2"]);
    expect(payload.submissions[0]).toMatchObject({ spk: "sub-1", itemSpk: "item-1", rating: 4 });
  });

  it("patches existing survey submissions and posts missing rating submissions", async () => {
    const request = vi
      .fn<ReflectionSession["request"]>()
      .mockResolvedValueOnce(jsonResponse({ id: 17, username: "student1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          courses: [{ name: "CS201", children: [{ name: "Week 5 project", bkproject_spk: "bk5" }] }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ spk: "bk5", name: "Week 5 BK", survey: "survey-5", voting_closed: false }))
      .mockResolvedValueOnce(
        jsonResponse({
          groups: [
            { spk: "own", group_name: "Team 3", members: [{ username: "student1" }] },
            { spk: "target", group_name: "Team 4", members: [{ username: "student3" }] },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            { spk: "item-1", nid: "quality", label: "Quality", type: "rating" },
            { spk: "item-2", nid: "clarity", label: "Clarity", type: "rating" },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ results: [{ spk: "sub-1", item: "item-1", rating: 3 }] }))
      .mockResolvedValueOnce(jsonResponse({ spk: "sub-1", item: "item-1", rating: 5 }))
      .mockResolvedValueOnce(jsonResponse({ spk: "sub-2", item: "item-2", rating: 4 }));

    const payload = await submitBkProjectVote(
      { baseUrl: "http://bk.test", request },
      "student1",
      5,
      "target",
      { "item-1": 5, "item-2": 4 },
    );

    expect(payload.submissions.map((submission) => [submission.itemSpk, submission.rating])).toEqual([
      ["item-1", 5],
      ["item-2", 4],
    ]);
    expect(request.mock.calls[6][0]).toBe("/api/coursebksurveysubmission/sub-1/");
    expect(request.mock.calls[6][1]?.method).toBe("PATCH");
    expect(request.mock.calls[7][0]).toBe("/api/coursebksurveysubmission/");
    expect(request.mock.calls[7][1]?.method).toBe("POST");
  });
});
