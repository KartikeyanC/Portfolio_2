import { profile } from "@/lib/data";
import { TypingLines } from "./TypingLines";

export function Hero() {
  const handle = profile.name.toLowerCase().replace(/\s+/g, "-");

  return (
    <section id="top" className="mx-auto max-w-4xl px-6 pt-16 pb-20 sm:pt-24">
      <div className="rounded-md border border-line bg-ink-raised">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-paper-dim/50" />
          <span className="font-mono text-xs text-paper-dim">
            ~/{handle} — zsh
          </span>
        </div>
        <div className="px-5 py-8 sm:px-8 sm:py-12">
          <TypingLines
            lines={[
              { prompt: "$", text: "whoami" },
              { prompt: ">", text: `${profile.name} — ${profile.role}` },
            ]}
          />
          <h1 className="mt-8 font-mono text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
            release{" "}
            <span className="text-amber underline decoration-2 underline-offset-8">
              v1.0.0
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper-dim">
            {profile.tagline}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#changelog"
              className="rounded-sm border border-amber bg-amber px-4 py-2 font-mono text-sm font-medium text-ink transition-opacity hover:opacity-90"
            >
              view changelog →
            </a>
            <a
              href="#contact"
              className="rounded-sm border border-line px-4 py-2 font-mono text-sm text-paper transition-colors hover:border-amber hover:text-amber"
            >
              get in touch
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
