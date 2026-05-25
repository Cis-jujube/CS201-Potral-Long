import type {
  GitBashCommand,
  HomeworkMock,
  SetupInstruction,
  SetupVideoLink,
  WeekNumber,
} from "@/lib/course/types";
import { CS201_TEXTBOOK_LINK } from "@/lib/course-materials/staticResources";

export interface LinkItem {
  label: string;
  description: string;
  href: string;
}

export const HOME_ED_LINK: LinkItem = {
  label: "Quick Link to ED",
  description: "Discuss in the forum with your professors and classmates.",
  href: "https://edstem.org/",
};

export const HOME_TEXTBOOK_LINKS: LinkItem[] = [
  CS201_TEXTBOOK_LINK,
];

export const SAG_SETUP_INSTRUCTIONS: SetupInstruction[] = [
  {
    platform: "windows",
    steps: [
      {
        title: "Back up first",
        detail: "Save important files before changing developer tools. A cloud backup or portable drive is enough.",
      },
      {
        title: "Install VS Code",
        detail: "Install VS Code, then turn on Auto Save from the File menu.",
        links: [{ label: "VS Code download", href: "https://code.visualstudio.com/download" }],
      },
      {
        title: "Install Git Bash",
        detail: "Install Git for Windows. During class, use Git Bash instead of PowerShell for course commands.",
        links: [{ label: "Git for Windows", href: "https://gitforwindows.org/" }],
      },
      {
        title: "Select Git Bash in VS Code",
        detail: "Open the VS Code terminal menu and set Git Bash as the default profile.",
      },
      {
        title: "Install Python, Java, and make",
        detail: "Use the official installers, or use Chocolatey if you already have it configured.",
        commands: ["choco install make python temurin21 -y"],
        note: "Restart VS Code after this step so the terminal picks up new PATH entries.",
      },
      {
        title: "Verify tools",
        detail: "Open a fresh Git Bash terminal and check the versions.",
        commands: ["python --version", "java -version", "make --version", "git --version"],
      },
    ],
  },
  {
    platform: "mac",
    steps: [
      {
        title: "Back up first",
        detail: "Save important files before installing command-line tools.",
      },
      {
        title: "Install Homebrew if needed",
        detail: "Homebrew is optional, but it makes later installs easier.",
        links: [{ label: "Homebrew", href: "https://brew.sh" }],
      },
      {
        title: "Install Miniconda or Anaconda",
        detail: "Miniconda is smaller and faster; Anaconda is fine if you already use it.",
        links: [
          { label: "Miniconda", href: "https://docs.anaconda.com/miniconda/install/" },
          { label: "Anaconda", href: "https://www.anaconda.com/download" },
        ],
        commands: ["which python3"],
      },
      {
        title: "Install a JDK",
        detail: "Use a current LTS Java distribution, then verify it from Terminal.",
        commands: ["java -version"],
      },
      {
        title: "Install VS Code",
        detail: "Install VS Code and enable Auto Save from the File menu.",
        links: [{ label: "VS Code for Mac", href: "https://code.visualstudio.com/docs/setup/mac" }],
      },
      {
        title: "Install helpful Python packages",
        detail: "These packages support CS201 scripts and visualization helpers.",
        commands: ["pip install --user ptree tabulate natsort numpy pydot macht"],
      },
      {
        title: "Learn basic shell movement",
        detail: "Practice pwd, ls, cd, mkdir, cp, and rm before using SAG under time pressure.",
      },
    ],
  },
];

export const SAG_SETUP_CHECKS: SetupVideoLink[] = [
  { platform: "windows", label: "Git Bash opens inside VS Code", href: "#setup-check-terminal" },
  { platform: "windows", label: "python/java/make/git version checks pass", href: "#setup-check-tools" },
  { platform: "mac", label: "Terminal can find python3 and java", href: "#setup-check-tools" },
  { platform: "mac", label: "VS Code Auto Save is enabled", href: "#setup-check-autosave" },
];

export const GIT_BASH_COMMANDS: GitBashCommand[] = [
  { command: "pwd", description: "Show current folder path." },
  { command: "ls -la", description: "List files including hidden entries." },
  { command: "cd <folder>", description: "Move into a target folder." },
  { command: "git status", description: "Check working tree changes." },
  { command: "git pull", description: "Sync latest changes from remote." },
  { command: "git add .", description: "Stage current modifications." },
  { command: "git commit -m \"message\"", description: "Commit staged changes with a clear message." },
  { command: "git push", description: "Push local commits to remote." },
];

export const HOMEWORK_MOCKS: HomeworkMock[] = [
  {
    id: "w1-hw1",
    week: 1,
    title: "Homework 1",
    questions: [
      { id: "w1-hw1-q1", label: "Q1", prompt: "Set up your environment and verify local run pipeline." },
      { id: "w1-hw1-q2", label: "Q2", prompt: "Write a simple input/output function and test it." },
      { id: "w1-hw1-q3", label: "Q3", prompt: "Explain your debugging steps for one runtime issue." },
    ],
  },
  {
    id: "w1-hw2",
    week: 1,
    title: "Homework 2",
    questions: [
      { id: "w1-hw2-q1", label: "Q1", prompt: "Implement a conditional grading helper." },
      { id: "w1-hw2-q2", label: "Q2", prompt: "Refactor duplicate logic into reusable helpers." },
      { id: "w1-hw2-q3", label: "Q3", prompt: "Add tests for invalid input edge cases." },
      { id: "w1-hw2-q4", label: "Q4", prompt: "Document assumptions and constraints in comments." },
    ],
  },
  {
    id: "w2-hw1",
    week: 2,
    title: "Homework 1",
    questions: [
      { id: "w2-hw1-q1", label: "Q1", prompt: "Build a loop-based validator for weekly tasks." },
      { id: "w2-hw1-q2", label: "Q2", prompt: "Track completed IDs with immutable updates." },
      { id: "w2-hw1-q3", label: "Q3", prompt: "Handle missing data with safe fallbacks." },
    ],
  },
  {
    id: "w2-hw2",
    week: 2,
    title: "Homework 2",
    questions: [
      { id: "w2-hw2-q1", label: "Q1", prompt: "Normalize raw payload into typed structures." },
      { id: "w2-hw2-q2", label: "Q2", prompt: "Render a filtered list based on query text." },
      { id: "w2-hw2-q3", label: "Q3", prompt: "Persist UI state after hard refresh." },
      { id: "w2-hw2-q4", label: "Q4", prompt: "Write one test for empty state rendering." },
    ],
  },
];

export const getHomeworkMocksForWeek = (week: WeekNumber): HomeworkMock[] => {
  const matched = HOMEWORK_MOCKS.filter((item) => item.week === week);
  if (matched.length > 0) {
    return matched;
  }

  return HOMEWORK_MOCKS.filter((item) => item.week === 1);
};

export const RESOURCE_TEXTBOOK_LINKS: LinkItem[] = [
  CS201_TEXTBOOK_LINK,
];

export const RESOURCE_NEXT_NOTE_DOWNLOAD: LinkItem = {
  label: "Download Next Note (Placeholder)",
  description: "Download the latest lecture-adjacent note package.",
  href: "#resource-next-note-download",
};

export const RESOURCE_EXPLORE_MORE: LinkItem = {
  label: "Explore more relevant informations",
  description: "Jump to extended references from related professor websites.",
  href: "https://example.com/professor-resources",
};
