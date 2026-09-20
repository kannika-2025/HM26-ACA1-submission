"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Complaint = {
  id: string;
  registered_name: string | null;
  issue: string | null;
  location: string | null;
  coordinates: string | null;
  severity: string | null;
  description: string | null;
  verification_status: string | null;
  verification_confidence: string | null;
  assigned_authority: string | null;
  department: string | null;
  current_status: string | null;
  created_at: string | null;
  last_updated: string | null;
};

const STATUS_STEPS = [
  "Submitted",
  "Acknowledged",
  "In Progress",
  "Fixed",
];

export default function TrackPage() {
  const [complaintId, setComplaintId] = useState("");
  const [complaint, setComplaint] =
    useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
      setComplaintId(id);
      void findComplaint(id);
    }
  }, []);

  async function findComplaint(idOverride?: string) {
    const id = (idOverride ?? complaintId).trim();

    if (!id) {
      setError("Please enter your Complaint ID.");
      return;
    }

    setLoading(true);
    setError("");
    setComplaint(null);

    try {
      const { data, error: supabaseError } =
        await supabase
          .from("complaints")
          .select(
            "id, registered_name, issue, location, coordinates, severity, description, verification_status, verification_confidence, assigned_authority, department, current_status, created_at, last_updated"
          )
          .eq("id", id)
          .maybeSingle();

      if (supabaseError) {
        setError(
          supabaseError.message ||
            "Unable to search for this complaint."
        );
        return;
      }

      if (!data) {
        setError(
          "Complaint not found. Please check the Complaint ID."
        );
        return;
      }

      setComplaint(data as Complaint);
    } catch (err) {
      console.error("Track complaint error:", err);
      setError(
        "Unable to connect to the complaint database."
      );
    } finally {
      setLoading(false);
    }
  }

  function getStatusIndex(status: string | null) {
    const normalized = (status || "Submitted")
      .toLowerCase();

    if (normalized === "fixed") return 3;
    if (normalized === "in progress") return 2;
    if (normalized === "acknowledged") return 1;

    return 0;
  }

  const currentStatus =
    complaint?.current_status || "Submitted";

  const currentStep = getStatusIndex(currentStatus);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">

        {/* HEADER */}
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Complaint Tracking
          </p>

          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Track Your Complaint
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Enter your Complaint ID to see the current status
            and progress of your civic complaint.
          </p>
        </div>

        {/* SEARCH */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Complaint ID
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={complaintId}
              onChange={(event) =>
                setComplaintId(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void findComplaint();
                }
              }}
              placeholder="Example: PW-MYS-2026-1234"
              className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />

            <button
              type="button"
              onClick={() => void findComplaint()}
              disabled={loading}
              className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Track Complaint"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* RESULT */}
        {complaint && (
          <div className="mt-8 space-y-6">

            {/* STATUS */}
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                    Current Status
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-white">
                    {currentStatus}
                  </h2>
                </div>

                <div className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
                  {complaint.id}
                </div>
              </div>

              {/* TIMELINE */}
              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                {STATUS_STEPS.map((step, index) => {
                  const completed =
                    index <= currentStep;

                  return (
                    <div
                      key={step}
                      className={`rounded-xl p-4 ${
                        completed
                          ? "border border-emerald-400/30 bg-emerald-400/10"
                          : "border border-white/10 bg-slate-900"
                      }`}
                    >
                      <div
                        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full font-bold ${
                          completed
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-white/10 text-slate-500"
                        }`}
                      >
                        {completed ? "✓" : index + 1}
                      </div>

                      <p
                        className={`text-sm font-semibold ${
                          completed
                            ? "text-emerald-300"
                            : "text-slate-500"
                        }`}
                      >
                        {step}
                      </p>
                    </div>
                  );
                })}
              </div>

              {complaint.last_updated && (
                <p className="mt-5 text-xs text-slate-500">
                  Last updated:{" "}
                  {new Date(
                    complaint.last_updated
                  ).toLocaleString()}
                </p>
              )}
            </div>

            {/* DETAILS */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-bold">
                Complaint Details
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Info
                  label="Issue"
                  value={complaint.issue || "Not specified"}
                />

                <Info
                  label="Severity"
                  value={complaint.severity || "Not specified"}
                />

                <Info
                  label="Reported By"
                  value={
                    complaint.registered_name ||
                    "Citizen"
                  }
                />

                <Info
                  label="Department"
                  value={
                    complaint.department ||
                    "Human Review"
                  }
                />

                <Info
                  label="Authority"
                  value={
                    complaint.assigned_authority ||
                    "Not assigned"
                  }
                />

                <Info
                  label="Location"
                  value={
                    complaint.location ||
                    complaint.coordinates ||
                    "Not available"
                  }
                />

                <Info
                  label="Verification"
                  value={
                    complaint.verification_status ||
                    "Needs Review"
                  }
                />

                <Info
                  label="Confidence"
                  value={
                    complaint.verification_confidence ||
                    "Manual Review"
                  }
                />
              </div>

              {complaint.description && (
                <div className="mt-5 rounded-xl bg-slate-900 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {complaint.description}
                  </p>
                </div>
              )}
            </div>

            {/* LINKS */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/report"
                className="rounded-xl bg-cyan-400 px-6 py-3 text-center font-bold text-slate-950 hover:bg-cyan-300"
              >
                Report Another Issue
              </Link>

              <Link
                href="/"
                className="rounded-xl border border-white/10 px-6 py-3 text-center font-semibold text-slate-200 hover:bg-white/5"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}