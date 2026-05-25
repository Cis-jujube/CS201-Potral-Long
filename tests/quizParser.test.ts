import { parseAssignmentPage, parseQuizProblemLinks, parseQuizProblemPage, parseQuizSubmitPage } from "@/lib/quiz/parser";

const assignmentHtml = `
  <table>
    <tr>
      <td><a href="/cs201/quiz/101/">week1 quiz</a></td>
      <td>Closed</td>
      <td>24 / 24</td>
      <td>Due: March 26 2026 11:59pm</td>
    </tr>
    <tr>
      <td><a href="/cs201/quiz/601/">week6 quiz</a></td>
      <td>Open</td>
      <td>0 / 24</td>
      <td>Due: May 5 2026 11:59pm</td>
    </tr>
  </table>
`;

const closedProblemHtml = `
  <main>
    <h1>Week1/sec-1.1: Programming in Java</h1>
    <h2>Problem01</h2>
    <p>Select the words that complete the Java workflow.</p>
    <p style="color:grey">Answer:</p>
    <p style="color:orange; font-weight:bold">Create Compile javac terminal Execute terminal</p>
    <a href="/cs201/quiz/101/">Problem01</a>
    <a href="/cs201/quiz/102/">Problem02</a>
  </main>
`;

const openProblemHtml = `
  <main>
    <h1>Week6/sec-5.2: Turing machine model</h1>
    <h2>Problem01</h2>
    <p>Fill in the blanks for a Turing machine definition.</p>
    <form action="/cs201/index/601/checking/">
      <input type="hidden" name="csrfmiddlewaretoken" value="csrf-123" />
      <input class="answer" name="0" placeholder="(0)" required />
      <input class="answer" name="1" placeholder="(1)" required />
    </form>
  </main>
`;

describe("quiz parser", () => {
  it("parses assignment rows by week and progress", () => {
    const rows = parseAssignmentPage(assignmentHtml, "http://quiz.test");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ week: 1, status: "closed", passed: 24, total: 24 });
    expect(rows[1]).toMatchObject({ week: 6, status: "open", passed: 0, total: 24 });
  });

  it("strips closed-page answers from quiz prompts", () => {
    const problem = parseQuizProblemPage(closedProblemHtml, "http://quiz.test/cs201/quiz/101/", "http://quiz.test");
    const promptText = problem.prompt.map((block) => block.text).join(" ");

    expect(problem.status).toBe("closed");
    expect(problem.problemLinks.map((link) => link.problemId)).toEqual(["101", "102"]);
    expect(promptText).toContain("Select the words");
    expect(promptText).not.toContain("Answer:");
    expect(promptText).not.toContain("Create Compile");
  });

  it("parses open problem fields and csrf", () => {
    const problem = parseQuizProblemPage(openProblemHtml, "http://quiz.test/cs201/quiz/601/", "http://quiz.test");

    expect(problem.status).toBe("open");
    expect(problem.formAction).toBe("http://quiz.test/cs201/index/601/checking/");
    expect(problem.csrfToken).toBe("csrf-123");
    expect(problem.answerFields.map((field) => field.name)).toEqual(["0", "1"]);
  });

  it("parses teacher-site problem navigation status with spaced href attributes", () => {
    const links = parseQuizProblemLinks(
      `
        <a href= "/cs201/quiz/601/" id="601">Problem01</a>
        <a href= "/cs201/quiz/604/" style="color:green" id="604">Problem04\u221a</a>
      `,
      "http://quiz.test",
    );

    expect(links).toEqual([
      {
        problemId: "601",
        label: "Problem01",
        sourceHref: "http://quiz.test/cs201/quiz/601/",
        status: "open",
      },
      {
        problemId: "604",
        label: "Problem04",
        sourceHref: "http://quiz.test/cs201/quiz/604/",
        status: "passed",
      },
    ]);
  });

  it("marks a current problem as passed when upstream navigation shows a green check", () => {
    const problem = parseQuizProblemPage(
      `
        <a href= "/cs201/quiz/604/" style="color:green" id="604">Problem04\u221a</a>
        <h1>Week6/sec-5.3: Universal models</h1>
        <form action="/cs201/index/604/checking/">
          <input type="hidden" name="csrfmiddlewaretoken" value="csrf-604" />
          <input class="answer" name="0" placeholder="(0)" required />
        </form>
      `,
      "http://quiz.test/cs201/quiz/604/",
      "http://quiz.test",
    );

    expect(problem.status).toBe("passed");
  });

  it("parses submit status without leaking answers", () => {
    const result = parseQuizSubmitPage(`
      <p>Passed: 4 / 24 ; Failed: 1 / 24</p>
      <p>You have 99 times left</p>
      <p style="color:grey">Answer:</p><p style="color:orange">secret answer</p>
    `);

    expect(result.status).toBe("failed");
    expect(result.passed).toBe(4);
    expect(result.attemptsLeft).toBe(99);
    expect(result.message).toBe("Wrong answer. The teacher site received the submission; try another answer for the displayed choice order.");
    expect(result.message).not.toContain("secret answer");
  });

  it("sanitizes teacher-site script chrome from failed submit pages", () => {
    const result = parseQuizSubmitPage(`
      <script>hljs.highlightAll(); function checkblank(){ return false; }</script>
      <style>.footer { position:relative; }</style>
      <p>Test Wrong Answer!</p>
      <script>var x = document.getElementById('bar_success'); var result = '0'/'24'; x.style.width = '0%';</script>
      <p>You have 98 times left.</p>
    `);

    expect(result.status).toBe("failed");
    expect(result.passed).toBe(0);
    expect(result.total).toBe(24);
    expect(result.attemptsLeft).toBe(98);
    expect(result.message).not.toContain("hljs.highlightAll");
    expect(result.message).not.toContain(".footer");
  });
});
