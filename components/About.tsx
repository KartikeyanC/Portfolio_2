import { profile } from "@/lib/data";
import { ScrollReveal } from "./ScrollReveal";

export function About() {
  return (
    <section id="about" className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <ScrollReveal>
        <p className="font-mono text-xs tracking-widest text-paper-dim uppercase">
          {"// 0.1.0 — origins"}
        </p>
        <h2 className="mt-3 font-mono text-2xl font-semibold sm:text-3xl">
          About
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-paper-dim sm:text-lg">
          {profile.bio}
        </p>
      </ScrollReveal>
    </section>
  );
}
