"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Detection = {
  issue: string;
  confidence: number;
  reason: string;
  evidenceStatus: string;
  canCreateComplaint: boolean;
};

type User = {
  name?: string;
  phone?: string;
  email?: string;
};

const departmentMap: Record<string, string> = {
  Pothole: "Road & Infrastructure",
  "Road Damage": "Road & Infrastructure",
  "Garbage Dumping": "Solid Waste Management",
  "Waste Dumping": "Solid Waste Management",
  "Overflowing Garbage Bin": "Solid Waste Management",
  "Unsegregated Waste": "Solid Waste Management",
  "Open Manhole": "Drainage / Sewerage",
  Drain: "Drainage / Sewerage",
  "Broken Streetlight": "Electrical / Street Lighting",
  "Water Leakage": "Water Supply",
};

export default function DetectPage() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [detection, setDetection] = useState<Detection | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [user, setUser] = useState<User>({});

  useEffect(() => {
    const storedUser = localStorage.getItem("potholewatch_current_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser({});
      }
    }
  }, []);

  function selectImage(file: File | undefined) {
    if (!file) {
      return;
    }

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setDetection(null);
    setMessage("");
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setMessage("GPS is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setMessage("Location captured successfully.");
      },
      () => setMessage("Location was not available. You can still review the scan.")
    );
  }

  async function analyzeImage() {
    if (!image) {
      setMessage("Choose or capture an image first.");
      return;
    }

    setIsAnalyzing(true);
    setDetection(null);
    setMessage("Gemini AI is analyzing the image...");

    try {
      const formData = new FormData();
      formData.append("image", image);
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "AI analysis failed.");
      }

      setDetection(data);
      setMessage(
        data.canCreateComplaint
          ? "Possible civic issue detected. Review the result before creating a complaint."
          : "Needs human review. No clear civic issue was verified."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function routeAuthority(lat: number | null, lng: number | null) {
    if (lat === null || lng === null) {
      return "City Corporation";
    }

    if (lat >= 12.25 && lat <= 12.4 && lng >= 76.55 && lng <= 76.72) {
      return "City Corporation";
    }

    if (lat >= 12.1 && lat <= 12.5) {
      return "Town Panchayat";
    }

    return "Gram Panchayat";
  }

  async function createComplaint() {
    if (!detection?.canCreateComplaint || detection.issue === "Unknown") {
      setMessage("Needs human review before a complaint can be created.");
      return;
    }

    setIsCreating(true);
    const id = `PW-MYS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const authority = routeAuthority(latitude, longitude);
    const department = departmentMap[detection.issue] || "Road & Infrastructure";
    const location =
      latitude !== null && longitude !== null
        ? `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        : "Location not captured";

    const row = {
      id,
      registered_name: user.name || "Anonymous citizen",
      registered_phone: user.phone || "",
      registered_email: user.email || "",
      registered_on: now,
      issue: detection.issue,
      location,
      coordinates:
        latitude !== null && longitude !== null
          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : "Not available",
      severity: "Major",
      description: detection.reason,
      evidence: "Photo captured or uploaded",
      verification_status: latitude === null ? "NEEDS_REVIEW" : "VERIFIED",
      verification_confidence: String(detection.confidence),
      duplicate_check: "Needs review if a duplicate is reported",
      location_check: latitude === null ? "Needs review" : "Location captured",
      assigned_authority: authority,
      department,
      current_status: "Submitted",
      last_updated: now,
      created_at: now,
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("complaints").insert(row);
        if (error) {
          throw error;
        }
      }

      localStorage.setItem(`complaint_${id}`, JSON.stringify({
        id,
        registeredBy: {
          name: row.registered_name,
          phone: row.registered_phone,
          email: row.registered_email,
          registeredOn: now,
        },
        issue: row.issue,
        location: row.location,
        coordinates: row.coordinates,
        severity: row.severity,
        description: row.description,
        evidence: row.evidence,
        verification: {
          status: row.verification_status,
          confidence: row.verification_confidence,
          duplicateCheck: row.duplicate_check,
          locationCheck: row.location_check,
        },
        assignedAuthority: authority,
        department,
        currentStatus: "Submitted",
        lastUpdated: now,
        createdAt: now,
      }));
      setMessage(`Complaint created: ${id}`);
    } catch (error) {
      console.error("Detection complaint creation failed:", error);
      localStorage.setItem(`complaint_${id}`, JSON.stringify({
        id,
        registeredBy: {
          name: row.registered_name,
          phone: row.registered_phone,
          email: row.registered_email,
          registeredOn: now,
        },
        issue: row.issue,
        location: row.location,
        coordinates: row.coordinates,
        severity: row.severity,
        description: row.description,
        evidence: row.evidence,
        verification: {
          status: "NEEDS_REVIEW",
          confidence: row.verification_confidence,
          duplicateCheck: row.duplicate_check,
          locationCheck: row.location_check,
        },
        assignedAuthority: authority,
        department,
        currentStatus: "Submitted",
        lastUpdated: now,
        createdAt: now,
      }));
      setMessage(`Saved locally as ${id}; online sync is unavailable.`);
    } finally {
      setIsCreating(false);
    }
  }

  const department = detection
    ? departmentMap[detection.issue] || "Human review"
    : "-";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold">
            PotholeWatch <span className="text-cyan-400">AI</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/track" className="text-slate-300 hover:text-cyan-300">Track Complaint</Link>
            <Link href="/dashboard" className="text-slate-300 hover:text-cyan-300">Dashboard</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">AI Civic Scan</p>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Check an image for civic issues</h1>
        <p className="mt-4 max-w-2xl text-slate-400">Upload or capture evidence. AI results are suggestions and should be reviewed by a person.</p>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => selectImage(event.target.files?.[0])}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-semibold file:text-slate-950"
          />

          {previewUrl && (
            <img src={previewUrl} alt="Selected civic evidence" className="mt-6 max-h-96 w-full rounded-xl object-contain" />
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={analyzeImage} disabled={!image || isAnalyzing} className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
              {isAnalyzing ? "Analyzing..." : "Analyze Image"}
            </button>
            <button onClick={captureLocation} className="rounded-lg border border-white/10 px-5 py-3 font-semibold text-slate-200 hover:bg-white/5">
              Capture GPS
            </button>
          </div>

          {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
        </div>

        {detection && (
          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6">
            <h2 className="text-2xl font-bold text-cyan-200">
              {detection.canCreateComplaint ? "Possible civic issue detected" : "Needs human review"}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Result label="Detected issue" value={detection.issue === "Unknown" ? "No clear civic issue" : detection.issue} />
              <Result label="Confidence" value={`${detection.confidence}%`} />
              <Result label="Recommended department" value={department} />
              <Result label="Recommended authority" value={routeAuthority(latitude, longitude)} />
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-300">{detection.reason}</p>
            <button onClick={createComplaint} disabled={!detection.canCreateComplaint || isCreating} className="mt-6 rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
              {isCreating ? "Creating..." : "Create Complaint"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-100">{value}</p>
    </div>
  );
}
