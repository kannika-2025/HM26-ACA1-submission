"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Complaint = {
  id: string;
  registeredBy: {
    name: string;
    phone: string;
    email: string;
    registeredOn: string;
  };
  issue: string;
  location: string;
  coordinates: string;
  severity: string;
  description: string;
  evidence: string;
  verification: {
    status: string;
    confidence: string;
    duplicateCheck: string;
    locationCheck: string;
  };
  assignedAuthority: string;
  department: string;
  currentStatus: string;
  lastUpdated: string;
};

const demoComplaints: Complaint[] = [
  {
    id: "PW-MYS-1001",
    registeredBy: {
      name: "Kannika M S",
      phone: "98765 43210",
      email: "kannika@example.com",
      registeredOn: "19 September 2026, 10:30 AM",
    },
    issue: "Pothole",
    location: "Ramaswamy Circle, Mysuru",
    coordinates: "12.3051, 76.6551",
    severity: "Major",
    description:
      "Large pothole reported near the main road causing difficulty for vehicles.",
    evidence: "Photo captured using mobile camera",
    verification: {
      status: "Verified",
      confidence: "High",
      duplicateCheck: "No duplicate detected",
      locationCheck: "Location verified",
    },
    assignedAuthority: "Mysuru City Corporation",
    department: "Road & Infrastructure",
    currentStatus: "In Progress",
    lastUpdated: "19 September 2026, 2:15 PM",
  },
  {
    id: "PW-MYS-1002",
    registeredBy: {
      name: "Rahul Kumar",
      phone: "91234 56789",
      email: "rahul@example.com",
      registeredOn: "18 September 2026, 4:15 PM",
    },
    issue: "Pothole",
    location: "Vijayanagar, Mysuru",
    coordinates: "12.3270, 76.6060",
    severity: "Dangerous",
    description: "Deep pothole reported near a busy junction.",
    evidence: "Photo captured using mobile camera",
    verification: {
      status: "Verified",
      confidence: "High",
      duplicateCheck: "No duplicate detected",
      locationCheck: "Location verified",
    },
    assignedAuthority: "Mysuru City Corporation",
    department: "Road & Infrastructure",
    currentStatus: "Acknowledged",
    lastUpdated: "18 September 2026, 5:00 PM",
  },
  {
    id: "PW-MYS-1003",
    registeredBy: {
      name: "Ananya S",
      phone: "99887 66554",
      email: "ananya@example.com",
      registeredOn: "17 September 2026, 11:20 AM",
    },
    issue: "Road Damage",
    location: "Hebbal, Mysuru",
    coordinates: "12.3500, 76.6200",
    severity: "Minor",
    description:
      "Road surface damage reported and subsequently repaired.",
    evidence: "Photo uploaded",
    verification: {
      status: "Verified",
      confidence: "High",
      duplicateCheck: "No duplicate detected",
      locationCheck: "Location verified",
    },
    assignedAuthority: "Mysuru City Corporation",
    department: "Road & Infrastructure",
    currentStatus: "Fixed",
    lastUpdated: "18 September 2026, 3:30 PM",
  },
];

const statusSteps = [
  "Submitted",
  "Acknowledged",
  "In Progress",
  "Fixed",
];

export default function TrackPage() {
  const [complaintId, setComplaintId] = useState("");
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Automatically read complaint ID from the URL:
  // /track?id=PW-MYS-2026-0001
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("id");

    if (idFromUrl) {
      setComplaintId(idFromUrl);
      loadComplaint(idFromUrl);
    }
  }, []);

  async function loadComplaint(idValue: string) {
    const id = idValue.trim().toLowerCase();

    if (!id) {
      setComplaint(null);
      setNotFound(true);
      return;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("complaints")
          .select("*")
          .eq("id", idValue.trim())
          .maybeSingle();

        if (!error && data) {
          setComplaint(normalizeSupabaseComplaint(data));
          setNotFound(false);
          return;
        }
      } catch (error) {
        console.error("Supabase complaint lookup failed:", error);
      }
    }

    // 1. First check complaints created by this browser/user.
    const storedComplaint = localStorage.getItem(
      `complaint_${idValue.trim()}`
    );

    if (storedComplaint) {
      try {
        const parsedComplaint = JSON.parse(storedComplaint);

        setComplaint(parsedComplaint);
        setNotFound(false);
        return;
      } catch {
        // Continue to demo complaints.
      }
    }

    // 2. Check all locally saved user complaints.
    const storedUserComplaints = localStorage.getItem(
      "potholewatch_user_complaints"
    );

    if (storedUserComplaints) {
      try {
        const complaints = JSON.parse(storedUserComplaints);

        if (Array.isArray(complaints)) {
          const userComplaint = complaints.find(
            (item: Complaint) =>
              item?.id?.toLowerCase() === id
          );

          if (userComplaint) {
            setComplaint(userComplaint);
            setNotFound(false);
            return;
          }
        }
      } catch {
        // Continue to demo complaints.
      }
    }

    // 3. Finally check demo complaints.
    const result = demoComplaints.find(
      (item) => item.id.toLowerCase() === id
    );

    if (result) {
      setComplaint(result);
      setNotFound(false);
    } else {
      setComplaint(null);
      setNotFound(true);
    }
  }

  function normalizeSupabaseComplaint(row: Record<string, unknown>): Complaint {
    return {
      id: String(row.id || ""),
      registeredBy: {
        name: String(row.registered_name || "Citizen"),
        phone: String(row.registered_phone || "Not provided"),
        email: String(row.registered_email || "Not provided"),
        registeredOn: formatDate(row.registered_on),
      },
      issue: String(row.issue || "Unknown"),
      location: String(row.location || "Not provided"),
      coordinates: String(row.coordinates || "Not provided"),
      severity: String(row.severity || "Not provided"),
      description: String(row.description || "Not provided"),
      evidence: String(row.evidence || "Not provided"),
      verification: {
        status: String(row.verification_status || "Not provided"),
        confidence: String(row.verification_confidence || "Not provided"),
        duplicateCheck: String(row.duplicate_check || "Not provided"),
        locationCheck: String(row.location_check || "Not provided"),
      },
      assignedAuthority: String(row.assigned_authority || "Not assigned"),
      department: String(row.department || "Not assigned"),
      currentStatus: String(row.current_status || "Submitted"),
      lastUpdated: formatDate(row.last_updated),
    };
  }

  function formatDate(value: unknown) {
    if (!value) {
      return "Not available";
    }

    const date = new Date(String(value));
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString();
  }

  function trackComplaint() {
    loadComplaint(complaintId);
  }

  function getStatusIndex(status: string) {
    return statusSteps.indexOf(status);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="text-xl font-bold">
            PotholeWatch <span className="text-cyan-400">AI</span>
          </a>

          <a
            href="/report"
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Report Civic Issue
          </a>

          <a
            href="/dashboard"
            className="text-sm font-semibold text-slate-300 hover:text-cyan-300"
          >
            Dashboard
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {/* Title */}
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Complaint Tracking
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Track Your Complaint
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Enter your complaint ID to view the registered person,
            complaint details, verification information, authority
            assignment, and status.
          </p>
        </div>

        {/* Search */}
        <div className="mx-auto mb-10 max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Complaint ID
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={complaintId}
              onChange={(e) => {
                setComplaintId(e.target.value);
                setNotFound(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  trackComplaint();
                }
              }}
              placeholder="Example: PW-MYS-2026-0001"
              className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />

            <button
              onClick={trackComplaint}
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Track Complaint
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            You can enter the Complaint ID generated after submitting a
            complaint.
          </p>
        </div>

        {/* Not Found */}
        {notFound && (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-center">
            <p className="font-semibold text-red-300">
              Complaint not found
            </p>

            <p className="mt-1 text-sm text-red-200/70">
              Please check the complaint ID and try again.
            </p>
          </div>
        )}

        {/* Complaint Result */}
        {complaint && (
          <div className="space-y-6">
            {/* Complaint Header */}
            <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-white/5 p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-slate-400">
                    Complaint ID
                  </p>

                  <h2 className="mt-1 text-3xl font-bold text-cyan-300">
                    {complaint.id}
                  </h2>
                </div>

                <div className="rounded-full bg-orange-400/15 px-4 py-2 text-sm font-semibold text-orange-300">
                  {complaint.currentStatus}
                </div>
              </div>
            </div>

            {/* Registered By */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 text-xl">
                  👤
                </div>

                <div>
                  <h3 className="text-xl font-bold">
                    Registered By
                  </h3>

                  <p className="text-sm text-slate-400">
                    Person who submitted this complaint
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <InfoItem
                  label="Full Name"
                  value={complaint.registeredBy.name}
                />

                <InfoItem
                  label="Phone Number"
                  value={maskPhone(
                    complaint.registeredBy.phone
                  )}
                />

                <InfoItem
                  label="Email"
                  value={maskEmail(
                    complaint.registeredBy.email
                  )}
                />

                <InfoItem
                  label="Registered On"
                  value={complaint.registeredBy.registeredOn}
                />
              </div>
            </div>

            {/* Complaint Details */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400/10 text-xl">
                  🚧
                </div>

                <div>
                  <h3 className="text-xl font-bold">
                    Complaint Details
                  </h3>

                  <p className="text-sm text-slate-400">
                    Information submitted by the citizen
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <InfoItem
                  label="Issue Type"
                  value={complaint.issue}
                />

                <InfoItem
                  label="Severity"
                  value={complaint.severity}
                />

                <InfoItem
                  label="Location"
                  value={complaint.location}
                />

                <InfoItem
                  label="GPS Coordinates"
                  value={complaint.coordinates}
                />

                <InfoItem
                  label="Evidence"
                  value={complaint.evidence}
                />

                <InfoItem
                  label="Assigned Authority"
                  value={complaint.assignedAuthority}
                />

                <InfoItem
                  label="Department"
                  value={complaint.department}
                />
              </div>

              <div className="mt-5 rounded-xl bg-slate-900/70 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>

                <p className="text-sm leading-6 text-slate-300">
                  {complaint.description}
                </p>
              </div>
            </div>

            {/* Verification */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-400/10 text-xl">
                  🤖
                </div>

                <div>
                  <h3 className="text-xl font-bold">
                    Evidence Verification
                  </h3>

                  <p className="text-sm text-slate-400">
                    Automated complaint verification results
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <VerificationCard
                  label="Verification Status"
                  value={complaint.verification.status}
                  positive
                />

                <VerificationCard
                  label="Evidence Confidence"
                  value={complaint.verification.confidence}
                  positive
                />

                <VerificationCard
                  label="Duplicate Check"
                  value={complaint.verification.duplicateCheck}
                  positive
                />

                <VerificationCard
                  label="Location Check"
                  value={complaint.verification.locationCheck}
                  positive
                />
              </div>
            </div>

            {/* Status Timeline */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold">
                  Complaint Status Timeline
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Follow the progress of your complaint.
                </p>
              </div>

              <div className="space-y-5">
                {statusSteps.map((step, index) => {
                  const currentIndex = getStatusIndex(
                    complaint.currentStatus
                  );

                  const completed = index <= currentIndex;

                  return (
                    <div
                      key={step}
                      className="flex items-start gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                            completed
                              ? "bg-cyan-400 text-slate-950"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {completed ? "✓" : index + 1}
                        </div>

                        {index < statusSteps.length - 1 && (
                          <div
                            className={`mt-2 h-8 w-0.5 ${
                              index < currentIndex
                                ? "bg-cyan-400"
                                : "bg-slate-800"
                            }`}
                          />
                        )}
                      </div>

                      <div className="pt-1">
                        <p
                          className={`font-semibold ${
                            completed
                              ? "text-white"
                              : "text-slate-500"
                          }`}
                        >
                          {step}
                        </p>

                        {step === complaint.currentStatus && (
                          <p className="mt-1 text-sm text-cyan-300">
                            Current status
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Last Updated */}
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Last Updated
                  </p>

                  <p className="mt-1 font-medium text-slate-200">
                    {complaint.lastUpdated}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Assigned Authority
                  </p>

                  <p className="mt-1 font-medium text-cyan-300">
                    {complaint.assignedAuthority}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

function VerificationCard({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-sm font-semibold ${
          positive ? "text-emerald-300" : "text-slate-200"
        }`}
      >
        {positive && "✓ "}
        {value}
      </p>
    </div>
  );
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 5) {
    return phone;
  }

  return `${digits.slice(0, 5)} XXXXX`;
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return email;
  }

  const visibleName =
    name.length > 2 ? name.slice(0, 2) : name[0];

  return `${visibleName}***@${domain}`;
}