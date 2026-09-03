"use client";

import { useState } from "react";
import { profile, socials } from "@/lib/data";

export function Contact() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="contact" className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <p className="font-mono text-xs tracking-widest text-paper-dim uppercase">
        {"// let's talk"}
      </p>
      <h2 className="mt-3 font-mono text-2xl font-semibold sm:text-3xl">
        $ contact --{profile.availableForWork ? "open" : "closed"}
      </h2>
      <p className="mt-4 max-w-lg text-paper-dim">
        Reach out directly, or pick a flag below.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={copyEmail}
          className="rounded-sm border border-amber bg-amber px-4 py-2 font-mono text-sm font-medium text-ink transition-opacity hover:opacity-90"
        >
          {copied ? "copied ✓" : `--email ${profile.email}`}
        </button>
        {socials.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm border border-line px-4 py-2 font-mono text-sm text-paper transition-colors hover:border-amber hover:text-amber"
          >
            --{s.label}
          </a>
        ))}
      </div>
    </section>
  );
}
