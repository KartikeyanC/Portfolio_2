import { dependencies } from "@/lib/data";
import { ScrollReveal } from "./ScrollReveal";
import { StackChip } from "./Chip";

const groups: { key: keyof typeof dependencies; label: string }[] = [
  { key: "languages", label: "// languages" },
  { key: "frameworks", label: "// frameworks & libraries" },
  { key: "tools", label: "// tools & platforms" },
];

export function Dependencies() {
  return (
    <section
      id="dependencies"
      className="mx-auto max-w-4xl px-6 py-16 sm:py-20"
    >
      <ScrollReveal>
        <p className="font-mono text-xs tracking-widest text-paper-dim uppercase">
          {"// package.json"}
        </p>
        <h2 className="mt-3 font-mono text-2xl font-semibold sm:text-3xl">
          Dependencies
        </h2>
      </ScrollReveal>
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {groups.map((g) => (
          <ScrollReveal key={g.key}>
            <p className="font-mono text-sm text-paper-dim">{g.label}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dependencies[g.key].map((item) => (
                <StackChip key={item}>{item}</StackChip>
              ))}
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
