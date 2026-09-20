"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/report", label: "Report Issue" },
  { href: "/detect", label: "AI Civic Scan" },
  { href: "/track", label: "Track Complaint" },
  { href: "/dashboard", label: "Public Dashboard" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" onClick={() => setOpen(false)} className="text-lg font-bold tracking-tight text-white sm:text-xl">
          PotholeWatch <span className="text-cyan-400">AI</span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary navigation">
          {links.slice(0, -1).map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-300 transition hover:text-cyan-300">
              {link.label}
            </Link>
          ))}
          <Link href="/dashboard" className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5">
            Dashboard
          </Link>
          <Link href="/login" className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
            Login / Register
          </Link>
        </nav>
        <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)} className="rounded-lg border border-white/10 p-2 text-slate-200 lg:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 px-4 py-3 lg:hidden" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">
              {link.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="mt-2 block rounded-lg bg-cyan-400 px-3 py-3 text-center text-sm font-semibold text-slate-950">
            Login / Register
          </Link>
        </nav>
      )}
    </header>
  );
}
