import type { SagOverview } from "@/lib/course/types";

export const MOCK_SAG_OVERVIEW: SagOverview = {
  title: "Staged Auto-Grading (SAG)",
  summary:
    "SAG splits grading into clear stages so students can diagnose issues early and iterate with confidence.",
  gradingWeights: [
    { label: "Core correctness", weight: "45%" },
    { label: "Test coverage", weight: "20%" },
    { label: "Code quality", weight: "20%" },
    { label: "Documentation & reflection", weight: "15%" },
  ],
  stages: [
    {
      id: "sag-1",
      name: "Stage 1 · Build & Lint Gate",
      order: 1,
      passRule: "All checks must pass before stage unlock.",
      retryPolicy: "Unlimited retries, 5-minute cooldown.",
      feedbackWindow: "Immediate automated feedback.",
      checks: [
        {
          id: "s1-c1",
          label: "TypeScript compile",
          description: "No type errors in submitted scope.",
        },
        {
          id: "s1-c2",
          label: "Lint pass",
          description: "No blocking lint violations in CI profile.",
        },
      ],
      commonFailures: [
        "Missing environment variable defaults",
        "Unreachable imports due to renamed files",
        "Type mismatch in route handlers",
      ],
    },
    {
      id: "sag-2",
      name: "Stage 2 · Unit Tests",
      order: 2,
      passRule: "At least 85% target tests passing.",
      retryPolicy: "Unlimited retries, best attempt recorded.",
      feedbackWindow: "Within 3 minutes after run completion.",
      checks: [
        {
          id: "s2-c1",
          label: "Selector logic",
          description: "Week filtering and progress math must be correct.",
        },
        {
          id: "s2-c2",
          label: "Normalizer safety",
          description: "Malformed payload handling should not crash.",
        },
      ],
      commonFailures: [
        "Off-by-one week filtering errors",
        "Non-deterministic date parsing in tests",
        "Unstable localStorage mocks",
      ],
    },
    {
      id: "sag-3",
      name: "Stage 3 · Integration & UX Checks",
      order: 3,
      passRule: "All essential user flows must pass.",
      retryPolicy: "Two retries per 24 hours.",
      feedbackWindow: "Within 15 minutes.",
      checks: [
        {
          id: "s3-c1",
          label: "Week switch continuity",
          description: "Week slider updates all home modules consistently.",
        },
        {
          id: "s3-c2",
          label: "Persistence checks",
          description: "Selected week/theme/style survive hard refresh.",
        },
      ],
      commonFailures: [
        "Client/server rendering mismatch for localStorage values",
        "Missing loading state for delayed API routes",
        "Broken links in quick-access panels",
      ],
    },
    {
      id: "sag-4",
      name: "Stage 4 · Rubric Review",
      order: 4,
      passRule: "Manual rubric score >= 80/100.",
      retryPolicy: "Single resubmission after feedback.",
      feedbackWindow: "Within 72 hours.",
      checks: [
        {
          id: "s4-c1",
          label: "Architecture clarity",
          description: "Component and data layer boundaries are clean.",
        },
        {
          id: "s4-c2",
          label: "UX readability",
          description: "Beginner users can navigate core tasks quickly.",
        },
      ],
      commonFailures: [
        "Inconsistent typography and spacing across pages",
        "Insufficient empty/error states",
        "Unclear weekly map relationships",
      ],
    },
  ],
  studentTips: [
    "Treat each stage as a feedback loop, not just a pass/fail gate.",
    "Run local tests before each submission to avoid avoidable failures.",
    "Fix root causes first, especially type/normalization issues.",
    "Use rubric language in commit messages and PR summaries.",
  ],
};
