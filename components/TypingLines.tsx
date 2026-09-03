"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface Line {
  prompt: string;
  text: string;
}

export function TypingLines({ lines }: { lines: Line[] }) {
  const reduced = usePrefersReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const done = reduced || lineIndex >= lines.length;

  useEffect(() => {
    if (done) return;
    const current = lines[lineIndex];
    if (charIndex < current.text.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 28);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLineIndex((i) => i + 1);
      setCharIndex(0);
    }, 320);
    return () => clearTimeout(t);
  }, [charIndex, lineIndex, lines, done]);

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const isPast = i < lineIndex || reduced;
        const isCurrent = i === lineIndex && !reduced;
        if (!isPast && !isCurrent) return null;
        const shown = isPast ? line.text : line.text.slice(0, charIndex);
        return (
          <p key={i} className="flex flex-wrap gap-2 font-mono text-sm sm:text-base">
            <span className="text-paper-dim">{line.prompt}</span>
            <span>
              {shown}
              {isCurrent && <span className="caret text-amber">▍</span>}
            </span>
          </p>
        );
      })}
    </div>
  );
}
