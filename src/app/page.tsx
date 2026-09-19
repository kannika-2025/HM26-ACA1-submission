import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-2xl">
              🕳️
            </div>

            <div>
              <h1 className="text-xl font-bold">PotholeWatch AI</h1>
              <p className="text-xs text-slate-400">
                Smart Civic Infrastructure
              </p>
            </div>
          </div>

          <button className="rounded-lg border border-slate-700 px-5 py-2 text-sm transition hover:bg-slate-800">
            Admin Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <div className="mb-7 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
            🤖 AI-Powered Civic Reporting
          </div>

          <h2 className="mx-auto max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
            Detect potholes.
            <br />
            <span className="text-blue-400">Make roads safer.</span>
          </h2>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-400">
            Report road problems using photos or videos. PotholeWatch AI
            analyzes the evidence, detects suspicious complaints, identifies
            duplicates, prioritizes issues, and helps authorities resolve
            them.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/report"
              className="rounded-xl bg-blue-600 px-8 py-4 font-semibold transition hover:bg-blue-500"
            >
              📷 Report a Pothole
            </Link>

            <button className="rounded-xl border border-slate-700 px-8 py-4 font-semibold transition hover:bg-slate-800">
              🔎 Track Complaint
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Stat number="AI" label="Powered Detection" />
          <Stat number="24/7" label="Complaint Tracking" />
          <Stat number="GPS" label="Location Mapping" />
          <Stat number="100%" label="Transparent Status" />
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-slate-800 bg-slate-900/40 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Core Features
            </p>

            <h3 className="mt-3 text-3xl font-bold md:text-4xl">
              Intelligent civic issue management
            </h3>

            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              From the first citizen report to final resolution, every step is
              tracked and verified.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon="🤖"
              title="AI Pothole Detection"
              description="Analyze uploaded images and identify whether a pothole is present."
            />

            <Feature
              icon="🛡️"
              title="Fake Complaint Detection"
              description="Analyze evidence and flag complaints that need additional verification."
            />

            <Feature
              icon="♻️"
              title="Duplicate Detection"
              description="Identify multiple reports referring to the same road issue."
            />

            <Feature
              icon="📍"
              title="GPS Location"
              description="Connect each complaint with its reported road location."
            />

            <Feature
              icon="🚨"
              title="Smart Prioritization"
              description="Calculate priority using severity, safety risk and supporting evidence."
            />

            <Feature
              icon="🏢"
              title="Department Routing"
              description="Route verified complaints to the appropriate civic department."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Workflow
          </p>

          <h3 className="mt-3 text-3xl font-bold">
            From report to resolution
          </h3>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-5">
          <WorkflowStep number="01" title="Report" icon="📷" />
          <WorkflowStep number="02" title="AI Verify" icon="🤖" />
          <WorkflowStep number="03" title="Prioritize" icon="🚨" />
          <WorkflowStep number="04" title="Assign" icon="🏢" />
          <WorkflowStep number="05" title="Resolve" icon="✅" />
        </div>
      </section>

      {/* Verification Section */}
      <section className="border-y border-slate-800 bg-slate-900/40 px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Trust & Verification
            </p>

            <h3 className="mt-4 text-3xl font-bold">
              Every complaint gets an evidence check.
            </h3>

            <p className="mt-5 leading-8 text-slate-400">
              PotholeWatch AI does not automatically accuse citizens of
              submitting fake complaints. Instead, it evaluates the available
              evidence and sends suspicious cases for review.
            </p>

            <button className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500">
              Learn How Verification Works
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
              <span className="font-semibold">AI Verification</span>
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
                Verified
              </span>
            </div>

            <div className="space-y-5 pt-6">
              <CheckRow label="Pothole detected" value="Yes" />
              <CheckRow label="Image relevant" value="Yes" />
              <CheckRow label="Duplicate complaint" value="No" />
              <CheckRow label="Evidence confidence" value="92%" />
              <CheckRow label="Severity" value="High" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl rounded-3xl border border-blue-500/20 bg-blue-600/10 px-8 py-16 text-center">
          <h3 className="text-3xl font-bold md:text-4xl">
            Help make Mysuru's roads safer.
          </h3>

          <p className="mx-auto mt-5 max-w-xl text-slate-400">
            Report a road issue and let AI help verify, prioritize and route
            it to the right department.
          </p>

          <Link
            href="/report"
            className="mt-8 inline-block rounded-xl bg-blue-600 px-8 py-4 font-semibold hover:bg-blue-500"
          >
            📷 Report a Pothole
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-sm text-slate-500">
        PotholeWatch AI • HackMysuru 2026
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-7 transition hover:-translate-y-1 hover:border-blue-500/50">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-2xl">
        {icon}
      </div>

      <h4 className="mt-6 text-xl font-semibold">{title}</h4>

      <p className="mt-3 leading-7 text-slate-400">{description}</p>
    </div>
  );
}

function Stat({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
      <div className="text-2xl font-bold text-blue-400">{number}</div>
      <div className="mt-2 text-sm text-slate-400">{label}</div>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  icon,
}: {
  number: string;
  title: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center">
      <div className="text-sm text-blue-400">{number}</div>
      <div className="mt-4 text-3xl">{icon}</div>
      <div className="mt-3 font-semibold">{title}</div>
    </div>
  );
}

function CheckRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}