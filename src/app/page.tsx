import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300">
              Smart civic reporting for Mysuru
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              Detect. Verify.<br />
              Prioritize. <span className="text-cyan-400">Resolve.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">
              Citizens can report potholes and civic issues with evidence and location. PotholeWatch AI verifies submissions, detects duplicates, routes them to the right authority and keeps progress visible.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/report"
                className="rounded-xl bg-blue-600 px-7 py-4 font-bold transition hover:bg-blue-500"
              >
                Report an Issue
              </Link>

              <Link
                href="/track"
                className="rounded-xl border border-white/10 px-7 py-4 font-bold text-slate-200 transition hover:bg-white/5"
              >
                Track Complaint
              </Link>
              <Link href="/detect" className="rounded-xl border border-white/10 px-7 py-4 font-bold text-slate-200 transition hover:bg-white/5">
                AI Civic Scan
              </Link>
              <Link href="/dashboard" className="rounded-xl border border-white/10 px-7 py-4 font-bold text-slate-200 transition hover:bg-white/5">
                View Public Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-white/10 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              How it works
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              One civic workflow, from report to resolution
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="📷"
              title="AI Evidence Verification"
              description="Assess image quality and issue consistency without judging the citizen."
            />

            <FeatureCard
              icon="📍"
              title="Duplicate Detection"
              description="Compare issue type, image fingerprints and nearby coordinates before creating another case."
            />

            <FeatureCard
              icon="🤖"
              title="Smart Authority Routing"
              description="Route reports to the relevant authority and civic department."
            />

            <FeatureCard
              icon="🔎"
              title="Complaint Tracking"
              description="Give citizens a clear status timeline and current ownership."
            />
            <FeatureCard icon="📊" title="Neglect / Priority Monitoring" description="Use transparent prototype heuristics for severity, age and public impact." />
            <FeatureCard icon="🌐" title="Public Transparency" description="Show aggregate civic progress without exposing private contact details." />
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
                Citizen workflow
              </p>

              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                A complaint should not disappear after submission.
              </h2>

              <p className="mt-5 leading-7 text-slate-400">
                PotholeWatch AI is designed to connect
                reporting, verification and follow-through
                in one workflow.
              </p>
            </div>

            <div className="space-y-4">
              <WorkflowStep
                number="01"
                title="Report"
                description="Capture photo, location and issue details."
              />

              <WorkflowStep
                number="02"
                title="Verify"
                description="Evaluate the evidence and identify cases requiring review."
              />

              <WorkflowStep
                number="03"
                title="Prioritize"
                description="Use severity and complaint information to determine priority."
              />

              <WorkflowStep number="04" title="Track" description="Give citizens visibility into complaint progress." />
              <WorkflowStep number="05" title="Resolve" description="Keep the outcome visible to the community." />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 bg-blue-600">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            See a pothole? Report it.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-blue-100">
            Help create a better-connected civic complaint
            process for Mysuru.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/report"
              className="rounded-xl bg-white px-7 py-4 font-bold text-blue-700 transition hover:bg-slate-100"
            >
              Report an Issue
            </Link>

            <Link
              href="/track"
              className="rounded-xl border border-white/30 px-7 py-4 font-bold text-white transition hover:bg-white/10"
            >
              Track Complaint
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-6 transition hover:border-blue-500/30">
      <div className="text-3xl">{icon}</div>

      <h3 className="mt-5 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
        {number}
      </div>

      <div>
        <h3 className="font-bold">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}