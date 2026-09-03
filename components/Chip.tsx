import type { ChangeType } from "@/lib/data";

const tagColor: Record<ChangeType, string> = {
  Added: "text-diff-add border-diff-add/40",
  Improved: "text-amber border-amber/40",
  Fixed: "text-diff-fix border-diff-fix/40",
};

export function TypeTag({ type }: { type: ChangeType }) {
  return (
    <span
      className={`w-fit rounded-sm border px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-wide ${tagColor[type]}`}
    >
      {type}
    </span>
  );
}

export function StackChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm border border-line bg-ink-raised px-2 py-0.5 font-mono text-xs text-paper-dim">
      {children}
    </span>
  );
}
