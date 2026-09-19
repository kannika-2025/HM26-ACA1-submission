"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ComplaintRow = {
  current_status: string | null;
  department: string | null;
};

const statusLabels = [
  "Submitted",
  "Acknowledged",
  "In Progress",
  "Fixed",
];

export default function DashboardPage() {
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [unavailable, setUnavailable] = useState(!isSupabaseConfigured);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    async function loadStatistics() {
      try {
        const { data, error } = await supabase
          .from("complaints")
          .select("current_status, department");

        if (error) {
          console.error("Unable to load complaint statistics:", error);
          setUnavailable(true);
        } else {
          setComplaints(data || []);
        }
      } catch (error) {
        console.error("Unable to load complaint statistics:", error);
        setUnavailable(true);
      }

      setLoading(false);
    }

    loadStatistics();
  }, []);

  const countStatus = (status: string) =>
    complaints.filter(
      (complaint) => complaint.current_status === status
    ).length;

  const departmentCounts = complaints.reduce<Record<string, number>>(
    (counts, complaint) => {
      const department = complaint.department || "Unassigned";
      counts[department] = (counts[department] || 0) + 1;
      return counts;
    },
    {}
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold">
            PotholeWatch <span className="text-cyan-400">AI</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/track"
              className="text-sm font-semibold text-slate-300 hover:text-cyan-300"
            >
              Track Complaint
            </Link>
            <Link
              href="/report"
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Report Civic Issue
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Public overview
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Complaint Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-slate-400">
            A live summary of complaints recorded in PotholeWatch AI.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-400">
            Loading complaint statistics...
          </div>
        )}

        {!loading && unavailable && (
          <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-8">
            <h2 className="text-xl font-semibold text-orange-300">
              Statistics unavailable
            </h2>
            <p className="mt-2 text-sm text-orange-100/70">
              Supabase is not configured or could not be reached. Please try again later.
            </p>
          </div>
        )}

        {!loading && !unavailable && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Total complaints" value={complaints.length} />
              {statusLabels.map((status) => (
                <StatCard
                  key={status}
                  label={status}
                  value={countStatus(status)}
                />
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-bold">Complaints by department</h2>
              {Object.keys(departmentCounts).length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No complaints have been recorded yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {Object.entries(departmentCounts).map(
                    ([department, count]) => (
                      <div
                        key={department}
                        className="flex items-center justify-between border-b border-white/10 pb-3 text-sm last:border-0"
                      >
                        <span className="text-slate-300">{department}</span>
                        <span className="font-semibold text-cyan-300">
                          {count}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-bold text-cyan-300">{value}</p>
    </div>
  );
}
