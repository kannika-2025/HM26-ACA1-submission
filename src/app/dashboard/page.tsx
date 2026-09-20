"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ComplaintRow = {
  id: string | null;
  registered_name: string | null;
  registered_phone: string | null;
  registered_email: string | null;
  registered_on: string | null;
  issue: string | null;
  location: string | null;
  coordinates: string | null;
  severity: string | null;
  description: string | null;
  evidence: string | null;
  verification_status: string | null;
  verification_confidence: string | null;
  duplicate_check: string | null;
  location_check: string | null;
  current_status: string | null;
  department: string | null;
  assigned_authority: string | null;
  created_at: string | null;
  last_updated: string | null;
};

const statusLabels = [
  "Submitted",
  "Acknowledged",
  "In Progress",
  "Fixed",
  "Needs Review",
];

type DashboardState =
  | "loading"
  | "missing_config"
  | "connection_error"
  | "database_error"
  | "empty"
  | "ready";

export default function DashboardPage() {
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [dashboardState, setDashboardState] = useState<DashboardState>(
    isSupabaseConfigured ? "loading" : "missing_config"
  );
  const [queryError, setQueryError] = useState("");

  useEffect(() => {
    console.info("Dashboard Supabase configuration:", {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    });

    if (!isSupabaseConfigured) {
      console.error(
        "Dashboard Supabase configuration error: required public environment variable is missing."
      );
      return;
    }

    async function loadStatistics() {
      try {
        const { data, error } = await supabase
          .from("complaints")
          .select(
            "id, registered_name, registered_phone, registered_email, registered_on, issue, location, coordinates, severity, description, evidence, verification_status, verification_confidence, duplicate_check, location_check, assigned_authority, department, current_status, last_updated, created_at"
          );

        if (error) {
          console.error("Dashboard Supabase query failure:", {
            success: false,
            code: error.code,
            message: error.message,
          });
          setQueryError(error.message || "Unable to query complaints.");
          const errorText = `${error.code || ""} ${error.message || ""}`.toLowerCase();
          const isConnectionError =
            errorText.includes("401") ||
            errorText.includes("403") ||
            errorText.includes("jwt") ||
            errorText.includes("api key") ||
            errorText.includes("fetch");
          setDashboardState(
            isConnectionError ? "connection_error" : "database_error"
          );
        } else {
          const rows = (data || []) as ComplaintRow[];
          console.info("Dashboard Supabase query success:", {
            success: true,
            rowCount: rows.length,
          });
          setComplaints(rows);
          setDashboardState(rows.length === 0 ? "empty" : "ready");
        }
      } catch (error) {
        console.error("Dashboard Supabase connection failure:", {
          success: false,
          code: "CONNECTION_ERROR",
          message:
            error instanceof Error ? error.message : "Unable to reach Supabase.",
        });
        setQueryError(
          error instanceof Error ? error.message : "Unable to reach Supabase."
        );
        setDashboardState("connection_error");
      }
    }

    loadStatistics();
  }, []);

  const countStatus = (status: string) =>
    complaints.filter(
      (complaint) =>
        complaint.current_status?.trim().toLowerCase() ===
        status.toLowerCase()
    ).length;

  const departmentCounts = complaints.reduce<Record<string, number>>(
    (counts, complaint) => {
      const department = complaint.department || "Unassigned";
      counts[department] = (counts[department] || 0) + 1;
      return counts;
    },
    {}
  );

  const authorityCounts = complaints.reduce<Record<string, number>>(
    (counts, complaint) => {
      const authority = complaint.assigned_authority || "Unassigned";
      counts[authority] = (counts[authority] || 0) + 1;
      return counts;
    },
    {}
  );
const neglectedComplaints = complaints.filter((complaint) => {
  if (
    complaint.current_status?.trim().toLowerCase() === "fixed" ||
    !complaint.last_updated
  ) {
    return false;
  }

  return (
    Date.now() - new Date(complaint.last_updated).getTime() >=
    2 * 24 * 60 * 60 * 1000
  );
});

const neglectCount = neglectedComplaints.length;

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
              href="/detect"
              className="text-sm font-semibold text-slate-300 hover:text-cyan-300"
            >
              🤖 AI Civic Scan
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

        {dashboardState === "loading" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-400">
            Loading complaint statistics...
          </div>
        )}

        {dashboardState === "missing_config" && (
          <div className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-8">
            <h2 className="text-xl font-semibold text-orange-300">
              Supabase configuration missing
            </h2>
            <p className="mt-2 text-sm text-orange-100/70">
              Complaint statistics cannot load because the public Supabase environment variables are missing.
            </p>
          </div>
        )}

        {(dashboardState === "connection_error" ||
          dashboardState === "database_error") && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-8">
            <h2 className="text-xl font-semibold text-red-300">
              {dashboardState === "connection_error"
                ? "Supabase connection unavailable"
                : "Complaint query failed"}
            </h2>
            <p className="mt-2 text-sm text-red-100/70">
              {dashboardState === "connection_error"
                ? "The dashboard could not connect to Supabase. Please try again later."
                : "Supabase returned a database or schema error while reading complaints."}
            </p>
            {queryError && (
              <p className="mt-3 break-words text-xs text-red-100/50">
                {queryError}
              </p>
            )}
          </div>
        )}

        {dashboardState === "empty" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-400">
            No complaints recorded yet
          </div>
        )}

        {dashboardState === "ready" && (
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

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <StatCard label="Neglect / inactive" value={neglectCount} />
              <StatCard label="Active complaints" value={complaints.filter((complaint) => complaint.current_status !== "Fixed").length} />
            </div>
            {neglectedComplaints.length > 0 && (
  <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-6">
    <h2 className="text-xl font-bold text-red-300">
      🚨 Neglect / Inactivity Warning
    </h2>

    <p className="mt-2 text-sm text-red-100/70">
      The following complaints have had no update for more than 2 days.
    </p>

    <div className="mt-5 space-y-4">
      {neglectedComplaints.map((complaint) => (
        <div
          key={complaint.id}
          className="rounded-xl border border-red-400/20 bg-slate-950/50 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">
                Complaint ID: {complaint.id || "Unknown"}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Issue: {complaint.issue || "Unknown"}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Authority: {complaint.assigned_authority || "Not assigned"}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Status: {complaint.current_status || "Unknown"}
              </p>
            </div>

            <span className="rounded-full bg-red-400/20 px-3 py-1 text-xs font-semibold text-red-300">
              ⚠️ INACTIVE
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <CountList title="Complaints by department" counts={departmentCounts} />
              <CountList title="Complaints by authority" counts={authorityCounts} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function CountList({
  title,
  counts,
}: {
  title: string;
  counts: Record<string, number>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-bold">{title}</h2>
              {Object.keys(counts).length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  No complaints have been recorded yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {Object.entries(counts).map(
                    ([label, count]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between border-b border-white/10 pb-3 text-sm last:border-0"
                      >
                        <span className="text-slate-300">{label}</span>
                        <span className="font-semibold text-cyan-300">
                          {count}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
    </div>
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
