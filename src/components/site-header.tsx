import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="no-print border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          {/* next/image's optimizer disallows SVG by default; a plain <img>
              avoids that restriction for this small first-party icon. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/app-icon.svg" alt="" width={28} height={28} className="rounded-[8px]" />
          <span className="font-display text-sm font-semibold tracking-wide">
            <span className="text-opportunity">COD3AI</span>{" "}
            <span className="text-foreground">
              S<span className="text-accent">1</span>T<span className="text-accent">3</span>SCOUT
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/audit" className="hover:text-foreground">
            Run a Scout Scan
          </Link>
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
