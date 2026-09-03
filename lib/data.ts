// Placeholder content — replace every value below with your own before shipping.

export type ChangeType = "Added" | "Improved" | "Fixed";

export interface Project {
  version: string;
  type: ChangeType;
  title: string;
  description: string;
  stack: string[];
  href: string;
  year: string;
}

export const profile = {
  name: "Kartikeyan",
  role: "Full-Stack Engineer",
  tagline: "I build products end to end — from schema to shipped UI.",
  bio: "TODO: two or three sentences on who you are, what you work on, and what kind of problems you like solving. Keep it specific — skip the resume voice.",
  email: "you@example.com", // TODO
  availableForWork: true,
};

export const socials = [
  { label: "github", href: "https://github.com/TODO" },
  { label: "linkedin", href: "https://linkedin.com/in/TODO" },
  { label: "resume", href: "/resume.pdf" },
];

export const projects: Project[] = [
  {
    version: "1.3.0",
    type: "Added",
    title: "TODO: Project name",
    description: "TODO: one line on what it does and who it's for.",
    stack: ["Next.js", "TypeScript", "Postgres"],
    href: "https://github.com/TODO",
    year: "2026",
  },
  {
    version: "1.2.0",
    type: "Improved",
    title: "TODO: Project name",
    description: "TODO: one line on what it does and who it's for.",
    stack: ["React", "Node.js", "Redis"],
    href: "https://github.com/TODO",
    year: "2025",
  },
  {
    version: "1.1.0",
    type: "Fixed",
    title: "TODO: Project name",
    description: "TODO: one line on what it does and who it's for.",
    stack: ["Go", "gRPC"],
    href: "https://github.com/TODO",
    year: "2025",
  },
  {
    version: "1.0.0",
    type: "Added",
    title: "TODO: Project name",
    description: "TODO: one line on what it does and who it's for.",
    stack: ["Python", "FastAPI"],
    href: "https://github.com/TODO",
    year: "2024",
  },
];

export const dependencies = {
  languages: ["TypeScript", "Python", "Go", "SQL"],
  frameworks: ["Next.js", "React", "Node.js", "FastAPI"],
  tools: ["Docker", "PostgreSQL", "Redis", "AWS", "Git"],
};
