export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line px-6 py-8">
      <p className="mx-auto max-w-4xl font-mono text-xs text-paper-dim">
        {`// built with Next.js · ${year}`}
      </p>
    </footer>
  );
}
