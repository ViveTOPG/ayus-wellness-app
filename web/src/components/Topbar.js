"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/checkin", label: "Check-in" },
  { href: "/calculators", label: "Calculators" },
  { href: "/quiz", label: "Know yourself" },
  { href: "/profile", label: "Profile" },
  { href: "/tracking", label: "Tracking" },
  { href: "/library", label: "Herbs" },
];

export default function Topbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <a href="#home" className="skip-link">Skip to content</a>
      <header className="topbar" role="banner">
        <Link href="/" className="brand" aria-label="Āyus — home">
          <span className="om">ॐ</span>
          <span>
            <span className="bname">Āyus</span>
            <span className="btag">Ayurveda wellness</span>
          </span>
        </Link>

        <nav className="nav" id="mainNav" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="nav-link"
              aria-current={pathname === n.href ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
          <ThemeToggle />
          <Link
            href="/myspace"
            className="nav-icon"
            aria-label="My space"
            title="My space"
            aria-current={pathname === "/myspace" ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M6 4h12v17l-6-4-6 4z" />
            </svg>
          </Link>
        </nav>

        <button
          type="button"
          className={`hamburger ${mobileOpen ? "open" : ""}`}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <span></span><span></span><span></span>
        </button>
      </header>

      <div className={`mobile-nav ${mobileOpen ? "open" : ""}`} aria-hidden={!mobileOpen}>
        <button
          type="button"
          className="mobile-nav-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        />
        <div className="mobile-nav-panel">
          <div className="mobile-nav-brand">
            <span className="om">ॐ</span>
            <span className="bname">Āyus</span>
          </div>
          {[...NAV, { href: "/myspace", label: "My space" }, { href: "/heritage", label: "Heritage" }].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)}>
              {n.label}
            </Link>
          ))}
          <div className="mobile-nav-divider" />
          <ThemeToggle className="" showLabel />
        </div>
      </div>
    </>
  );
}
