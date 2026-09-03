import { profile } from "@/lib/data";

const links = [
  { href: "#about", label: "about" },
  { href: "#changelog", label: "changelog" },
  { href: "#dependencies", label: "dependencies" },
  { href: "#contact", label: "contact" },
];

export function Nav() {
  const handle = profile.name.toLowerCase().replace(/\s+/g, "-");

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <a href="#top" className="font-mono text-sm text-paper">
          ~/{handle}
        </a>
        <nav className="hidden gap-6 font-mono text-xs tracking-wide text-paper-dim uppercase sm:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-amber"
            >
              {l.label}
            </a>
          ))}
        </nav>
        {profile.availableForWork && (
          <span className="flex items-center gap-2 font-mono text-xs text-paper-dim">
            <span className="h-1.5 w-1.5 rounded-full bg-diff-add" />
            open to work
          </span>
        )}
      </div>
    </header>
  );
}
