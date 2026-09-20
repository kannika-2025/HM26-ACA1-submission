"use client";

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

  async function updateComplaintStatus(
    complaintId: string | null,
    newStatus: string
  ) {
    if (!complaintId) return;

    const updatedAt = new Date().toISOString();

    const { error } = await supabase
      .from("complaints")
      .update({
        current_status: newStatus,
        last_updated: updatedAt,
      })
      .eq("id", complaintId);

    if (error) {
      alert(`Unable to update status: ${error.message}`);
      return;
    }

    setComplaints((current) =>
      current.map((complaint) =>
        complaint.id === complaintId
          ? {
              ...complaint,
              current_status: newStatus,
              last_updated: updatedAt,
            }
          : complaint
      )
    );
  }

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

          const errorText =
            `${error.code || ""} ${error.message || ""}`.toLowerCase();

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
        console.error("Dashboard Supabase connection failure:", error);

        const message =
          error instanceof Error
            ? error.message
            : "Unable to reach Supabase.";

        setQueryError(message);
        setDashboardState("connection_error");
      }
    }

    loadStatistics();
  }, []);

  const countStatus = (status: string) =>
    complaints.filter(
      (complaint) =>
        status === "Needs Review"
          ? complaint.verification_status?.trim().toLowerCase() ===
            "needs review"
          : complaint.current_status?.trim().toLowerCase() ===
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

  const neglectCount = complaints.filter((complaint) => {
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
  }).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
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
              Complaint statistics cannot load because the public Supabase
              environment variables are missing.
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
              {queryError ||
                (dashboardState === "connection_error"
                  ? "The dashboard could not connect to Supabase."
                  : "Supabase returned a database or schema error.")}
            </p>
          </div>
        )}

        {dashboardState === "empty" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-400">
            No complaints recorded yet.
          </div>
        )}

        {dashboardState === "ready" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                label="Total complaints"
                value={complaints.length}
              />

              {statusLabels.map((status) => (
                <StatCard
                  key={status}
                  label={status}
                  value={countStatus(status)}
                />
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Neglect / inactive"
                value={neglectCount}
              />

              <StatCard
                label="Active complaints"
                value={
                  complaints.filter(
                    (complaint) =>
                      complaint.current_status !== "Fixed"
                  ).length
                }
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <CountList
                title="Complaints by department"
                counts={departmentCounts}
              />

              <CountList
                title="Complaints by authority"
                counts={authorityCounts}
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <ComplaintList
                title="Recent complaints"
                complaints={[...complaints].reverse().slice(0, 5)}
                onStatusUpdate={updateComplaintStatus}
              />

              <ComplaintList
                title="Needs Review queue"
                complaints={complaints
                  .filter(
                    (complaint) =>
                      complaint.verification_status?.toLowerCase() ===
                      "needs review"
                  )
                  .slice(0, 5)}
                onStatusUpdate={updateComplaintStatus}
              />
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
          {Object.entries(counts).map(([label, count]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-white/10 pb-3 text-sm last:border-0"
            >
              <span className="text-slate-300">{label}</span>

              <span className="font-semibold text-cyan-300">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-slate-400">{label}</p>

      <p className="mt-3 text-3xl font-bold text-cyan-300">
        {value}
      </p>
    </div>
  );
}

function ComplaintList({
  title,
  complaints,
  onStatusUpdate,
}: {
  title: string;
  complaints: ComplaintRow[];
  onStatusUpdate: (
    complaintId: string | null,
    newStatus: string
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-bold">{title}</h2>

      {complaints.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          No complaints in this view.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {complaints.map((complaint) => {
            const status =
              complaint.current_status || "Submitted";

            return (
              <div
                key={complaint.id}
                className="rounded-xl bg-slate-950/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">
                      {complaint.issue || "Civic issue"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {complaint.id}
                    </p>
                  </div>

                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {status}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  {complaint.department || "Human Review"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {complaint.assigned_authority ||
                    "Authority not assigned"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {status === "Submitted" && (
                    <button
                      onClick={() =>
                        onStatusUpdate(
                          complaint.id,
                          "Acknowledged"
                        )
                      }
                      className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      Acknowledge
                    </button>
                  )}

                  {status === "Acknowledged" && (
                    <button
                      onClick={() =>
                        onStatusUpdate(
                          complaint.id,
                          "In Progress"
                        )
                      }
                      className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                    >
                      Start Work
                    </button>
                  )}

                  {status === "In Progress" && (
                    <button
                      onClick={() =>
                        onStatusUpdate(
                          complaint.id,
                          "Fixed"
                        )
                      }
                      className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
                    >
                      Mark Fixed
                    </button>
                  )}

                  {status === "Fixed" && (
                    <span className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                      ✓ Complaint Resolved
                    </span>
                  )}

                  {status === "Needs Review" && (
                    <button
                      onClick={() =>
                        onStatusUpdate(
                          complaint.id,
                          "Acknowledged"
                        )
                      }
                      className="rounded-lg bg-orange-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-orange-300"
                    >
                      Review & Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}