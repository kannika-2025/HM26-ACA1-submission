import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-semibold text-slate-300">PotholeWatch AI</p>
          <p className="mt-1">Mysuru Civic Issue Management</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer navigation">
          <Link href="/report" className="hover:text-cyan-300">Report Issue</Link>
          <Link href="/detect" className="hover:text-cyan-300">AI Civic Scan</Link>
          <Link href="/track" className="hover:text-cyan-300">Track Complaint</Link>
          <Link href="/dashboard" className="hover:text-cyan-300">Dashboard</Link>
        </nav>
        <p className="text-slate-400">Detect. Verify. Prioritize. Resolve.</p>
      </div>
    </footer>
  );
}
