import { projects } from "@/lib/data";
import { ScrollReveal } from "./ScrollReveal";
import { TypeTag, StackChip } from "./Chip";

export function Changelog() {
  return (
    <section id="changelog" className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <ScrollReveal>
        <p className="font-mono text-xs tracking-widest text-paper-dim uppercase">
          {"// changelog"}
        </p>
        <h2 className="mt-3 font-mono text-2xl font-semibold sm:text-3xl">
          Projects, in order shipped
        </h2>
      </ScrollReveal>
      <div className="mt-10 divide-y divide-line border-y border-line">
        {projects.map((p) => (
          <ScrollReveal key={p.version} className="block">
            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid gap-3 border-l-2 border-transparent px-4 py-6 transition-colors hover:border-amber hover:bg-ink-raised sm:grid-cols-[6rem_1fr] sm:gap-6 sm:px-5"
            >
              <div className="flex gap-3 sm:flex-col sm:gap-2">
                <span className="font-mono text-sm text-amber">
                  v{p.version}
                </span>
                <TypeTag type={p.type} />
              </div>
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-mono text-lg font-medium text-paper group-hover:text-amber">
                    {p.title}
                  </h3>
                  <span className="font-mono text-xs text-paper-dim">
                    {p.year}
                  </span>
                </div>
                <p className="mt-2 text-paper-dim">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.stack.map((s) => (
                    <StackChip key={s}>{s}</StackChip>
                  ))}
                </div>
              </div>
            </a>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
