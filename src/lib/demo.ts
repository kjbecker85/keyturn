export const DEMO_ACCOUNTS = [
  {
    role: "director",
    email: "director@keyturn.example",
    title: "Director of Transitions",
    blurb: "All nine properties",
  },
  {
    role: "regional_manager",
    email: "rm@keyturn.example",
    title: "Regional Manager",
    blurb: "Property-level detail and owner reporting",
  },
  {
    role: "assignee",
    email: "assignee@keyturn.example",
    title: "Assignee",
    blurb: "Own tasks and flags",
  },
] as const;

export type DemoRole = (typeof DEMO_ACCOUNTS)[number]["role"];
