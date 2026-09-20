"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Detection = {
  issue: string;
  issueType?: string;
  verificationStatus?: string;
  evidenceQuality?: string;
  confidence: number;
  reason: string;
  evidenceStatus: string;
  canCreateComplaint: boolean;
  manualReview?: boolean;
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
  "Needs manual review": "Human Review",
  Unknown: "Human Review",
};

type DuplicateMatch = {
  kind: "Duplicate" | "Potential Duplicate";
  complaintId: string;
  status: string;
};

function parseCoordinates(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
}

function validCoordinates(latitude: number | null, longitude: number | null) {
  return latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function distanceInMeters(first: { latitude: number; longitude: number }, second: { latitude: number; longitude: number }) {
  const latitudeDelta = (second.latitude - first.latitude) * 111320;
  const longitudeDelta = (second.longitude - first.longitude) * 111320 * Math.cos((first.latitude * Math.PI) / 180);
  return Math.sqrt(latitudeDelta ** 2 + longitudeDelta ** 2);
}

function displayStatus(value: unknown) {
  const status = String(value || "Submitted");
  if (["WORK STARTED", "ASSIGNED", "ACKNOWLEDGED", "In Progress"].includes(status)) return "In Progress";
  if (["RESOLVED", "CLOSED", "Fixed"].includes(status)) return "Fixed";
  return "Submitted";
}

export default function DetectPage() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [detection, setDetection] = useState<Detection | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [user, setUser] = useState<User>({});
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(null);

  useEffect(() => {
    setIsLoggedIn(
      localStorage.getItem("potholewatch_logged_in") === "true"
    );

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
    setDuplicateMatch(null);
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

  function requestLocation() {
    return new Promise<{ latitude: number; longitude: number } | null>(
      (resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const nextLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setLatitude(nextLocation.latitude);
            setLongitude(nextLocation.longitude);
            resolve(nextLocation);
          },
          (error) => {
            console.warn("GPS unavailable during complaint creation:", error);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      }
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
        if (data?.category === "quota_or_rate_limit") {
          const manualReview: Detection = {
            issue: "Needs manual review",
            confidence: 0,
            evidenceStatus: "NEEDS_REVIEW",
            reason:
              "AI verification temporarily unavailable. Evidence will require manual review.",
            canCreateComplaint: true,
            manualReview: true,
          };

          setDetection(manualReview);
          setMessage(manualReview.reason);
          return;
        }

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

  async function createComplaint(ignoreDuplicate = false) {
    console.log("AI Civic Scan: Create Complaint clicked", {
      detection,
      isLoggedIn,
      hasUserName: Boolean(user.name),
      latitude,
      longitude,
      isCreating,
    });

    if (!detection) {
      console.error("AI Civic Scan validation failed: no detection result");
      setMessage("Cannot create complaint: AI detection result is missing.");
      return;
    }

    if (!detection.issue) {
      console.error("AI Civic Scan validation failed: issue is missing", detection);
      setMessage("Cannot create complaint: the scan result is missing an issue type.");
      return;
    }

    if (!isLoggedIn || !user.name) {
      console.error("AI Civic Scan validation failed: user is not logged in");
      setMessage("Please register or login first to create a complaint.");
      return;
    }

    const department = departmentMap[detection.issue];
    if (!department) {
      console.error("AI Civic Scan validation failed: department is missing", detection);
      setMessage("Cannot create complaint: no department could be assigned.");
      return;
    }

    setIsCreating(true);
    setMessage("Creating complaint and checking your location...");

    try {
      const locationResult =
        latitude !== null && longitude !== null
          ? { latitude, longitude }
          : await requestLocation();
      const complaintLatitude = locationResult?.latitude ?? null;
      const complaintLongitude = locationResult?.longitude ?? null;
      const newCoordinates = validCoordinates(complaintLatitude, complaintLongitude)
        ? { latitude: complaintLatitude as number, longitude: complaintLongitude as number }
        : null;
      const evidenceHash = image
        ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await image.arrayBuffer())))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("")
        : null;

      console.info("Duplicate detection: new complaint input", {
        issueType: detection.issue,
        coordinates: newCoordinates,
        evidenceHash,
      });

      if (isSupabaseConfigured && !ignoreDuplicate) {
        const { data: existingComplaints, error: duplicateQueryError } = await supabase
          .from("complaints")
          .select("*")
          .eq("issue", detection.issue);

        console.info("Duplicate detection: Supabase SELECT result", {
          success: !duplicateQueryError,
          rowCount: existingComplaints?.length ?? 0,
          error: duplicateQueryError?.message || null,
        });

        if (duplicateQueryError) {
          console.error("Duplicate detection: Supabase SELECT failed", duplicateQueryError);
          setMessage(`Unable to check for duplicate complaints: ${duplicateQueryError.message}`);
          return;
        }

        for (const existing of existingComplaints || []) {
          const existingCoordinates = validCoordinates(
            typeof existing.latitude === "number" ? existing.latitude : null,
            typeof existing.longitude === "number" ? existing.longitude : null
          )
            ? { latitude: existing.latitude as number, longitude: existing.longitude as number }
            : parseCoordinates(existing.coordinates);
          const evidenceText = typeof existing.evidence === "string" ? existing.evidence : "";
          const storedEvidenceHash = evidenceText.match(/evidence_hash:([a-f0-9]{64})/i)?.[1] || null;
          const existingHash = typeof existing.evidence_hash === "string"
            ? existing.evidence_hash
            : storedEvidenceHash;
          const nearby = newCoordinates && existingCoordinates
            ? distanceInMeters(newCoordinates, existingCoordinates) <= 100
            : false;
          const sameImage = Boolean(evidenceHash && existingHash && evidenceHash === existingHash);

          console.info("Duplicate detection: existing complaint candidate", {
            complaintId: existing.id,
            coordinates: existingCoordinates,
            evidenceHash: existingHash,
            issueType: existing.issue,
            nearby,
            sameImage,
          });

          if ((sameImage && nearby) || (sameImage && !newCoordinates && !existingCoordinates)) {
            setDuplicateMatch({
              kind: "Duplicate",
              complaintId: String(existing.id),
              status: displayStatus(existing.current_status || existing.status),
            });
            console.info("Duplicate detection: match found", { kind: "Duplicate", complaintId: existing.id });
            setMessage("Similar complaint already exists. Review it before creating another complaint.");
            return;
          }

          if (nearby) {
            setDuplicateMatch({
              kind: "Potential Duplicate",
              complaintId: String(existing.id),
              status: displayStatus(existing.current_status || existing.status),
            });
            console.info("Duplicate detection: match found", { kind: "Potential Duplicate", complaintId: existing.id });
            setMessage("Similar complaint already exists. Review it before creating another complaint.");
            return;
          }
        }
        console.info("Duplicate detection: no match found before INSERT");
      }

      const id = `PW-MYS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();
      const authority = routeAuthority(
        complaintLatitude,
        complaintLongitude
      );
      const location =
        complaintLatitude !== null && complaintLongitude !== null
          ? `GPS: ${complaintLatitude.toFixed(6)}, ${complaintLongitude.toFixed(6)}`
          : "Location unavailable";

      const row = {
        id,
        registered_name: user.name,
        registered_phone: user.phone || "",
        registered_email: user.email || "",
        registered_on: now,
        issue: detection.issue,
        location,
        coordinates:
          complaintLatitude !== null && complaintLongitude !== null
            ? `${complaintLatitude.toFixed(6)}, ${complaintLongitude.toFixed(6)}`
            : "Location unavailable",
        severity: "Major",
        description: detection.reason,
        evidence: evidenceHash
          ? `Photo captured or uploaded; evidence_hash:${evidenceHash}`
          : "Photo captured or uploaded",
        verification_status: detection.manualReview || !newCoordinates || detection.evidenceStatus !== "VERIFIED"
          ? "Needs Review"
          : "VERIFIED",
        verification_confidence: String(detection.confidence),
        duplicate_check: duplicateMatch ? `${duplicateMatch.kind}: ${duplicateMatch.complaintId}` : "No duplicate detected",
        location_check:
          complaintLatitude === null ? "Location unavailable" : "Location captured",
        assigned_authority: authority,
        department,
        current_status: "Submitted",
        last_updated: now,
        created_at: now,
      };

      let hasEvidenceHashColumn = false;
      let schemaColumns = new Set<string>();
      if (isSupabaseConfigured) {
        const { data: schemaSample, error: schemaError } = await supabase
          .from("complaints")
          .select("*")
          .limit(1);
        if (schemaError) {
          console.error("Duplicate detection: schema capability query failed", schemaError);
          setMessage(`Unable to confirm complaint storage fields: ${schemaError.message}`);
          return;
        }
        schemaColumns = new Set(Object.keys(schemaSample?.[0] || {}));
        hasEvidenceHashColumn = schemaColumns.has("evidence_hash");
      }
      const insertRow = {
        ...row,
        ...(hasEvidenceHashColumn ? { evidence_hash: evidenceHash } : {}),
        ...(schemaColumns.has("verification_reason") ? { verification_reason: detection.reason } : {}),
        ...(schemaColumns.has("duplicate_of") && duplicateMatch ? { duplicate_of: duplicateMatch.complaintId } : {}),
      };
      console.info("Duplicate detection: schema capability", {
        hasEvidenceHashColumn,
        hashStoredInEvidenceText: Boolean(evidenceHash),
      });

      let syncWarning = "";

      if (isSupabaseConfigured) {
        try {
          console.info("Duplicate detection: INSERT after preflight", { id, evidenceHash, coordinates: newCoordinates });
          const { error } = await supabase.from("complaints").insert(insertRow);
          if (error) {
            console.error("Supabase detection complaint insert failed:", error);
            syncWarning = `Online sync failed: ${error.message}`;
          }
        } catch (error) {
          console.error("Supabase detection complaint request failed:", error);
          syncWarning = "Online sync failed due to a network error.";
        }
      } else {
        syncWarning = "Online sync is not configured.";
      }

      const localComplaint = {
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
          reason: detection.reason,
          evidenceHash,
        },
        assignedAuthority: authority,
        department,
        currentStatus: row.current_status,
        lastUpdated: now,
        createdAt: now,
      };
      try {
        localStorage.setItem(`complaint_${id}`, JSON.stringify(localComplaint));
        localStorage.setItem("latest_complaint_id", id);
        const existingIds = JSON.parse(
          localStorage.getItem("potholewatch_user_complaints") || "[]"
        );
        const ids = Array.isArray(existingIds) ? existingIds : [];
        ids.push(id);
        localStorage.setItem("potholewatch_user_complaints", JSON.stringify(ids));
        console.log("AI Civic Scan: localStorage save succeeded", { id });
      } catch (error) {
        console.error("AI Civic Scan localStorage save failed:", error);
        throw new Error("Complaint could not be saved on this device.");
      }
      setComplaintId(id);
      setMessage(
        syncWarning
          ? `Complaint saved locally. ${syncWarning} Saved locally as a fallback.`
          : "Complaint Created Successfully"
      );
      console.log("AI Civic Scan: complaint creation completed", {
        id,
        supabaseSynced: !syncWarning,
        localStorageSaved: true,
      });
    } catch (error) {
      console.error("Detection complaint creation failed:", error);
      setMessage(
        error instanceof Error
          ? `Unable to create complaint: ${error.message}`
          : "Unable to create complaint. Please try again."
      );
    } finally {
      setIsCreating(false);
    }
  }

  function resetScan() {
    setImage(null);
    setPreviewUrl("");
    setDetection(null);
    setComplaintId(null);
    setMessage("");
  }

  const department = detection
    ? departmentMap[detection.issue] || "Human review"
    : "-";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
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

          {!isLoggedIn && (
            <p className="mt-4 text-sm text-orange-200">
              Please register or login first to create a complaint.{" "}
              <Link href="/login" className="font-semibold text-cyan-300 underline">
                Go to login
              </Link>
            </p>
          )}
        </div>

        {complaintId && (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <h2 className="text-2xl font-bold text-emerald-300">
              Complaint Created Successfully
            </h2>
            <p className="mt-4 text-sm uppercase tracking-wide text-slate-400">
              Complaint ID
            </p>
            <p className="mt-1 text-3xl font-bold text-white">{complaintId}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/track?id=${encodeURIComponent(complaintId)}`}
                className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950"
              >
                Track Complaint
              </Link>
              <button
                onClick={resetScan}
                className="rounded-lg border border-white/10 px-5 py-3 font-semibold text-slate-200 hover:bg-white/5"
              >
                Create Another Scan
              </button>
            </div>
          </div>
        )}

        {detection && (
          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6">
            <h2 className="text-2xl font-bold text-cyan-200">
              {detection.manualReview
                ? "Needs manual review"
                : detection.canCreateComplaint
                  ? "Possible civic issue detected"
                  : "Needs human review"}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Result
                label="Detected issue"
                value={detection.manualReview ? "Needs manual review" : detection.issue === "Unknown" ? "No clear civic issue" : detection.issue}
              />
              <Result label="Confidence" value={`${detection.confidence}%`} />
              <Result label="Evidence status" value={detection.verificationStatus || (detection.manualReview ? "Needs Review" : detection.evidenceStatus === "VERIFIED" ? "Verified" : "Needs Review")} />
              <Result label="Evidence quality" value={detection.evidenceQuality || "Review required"} />
              <Result label="Recommended department" value={department} />
              <Result label="Recommended authority" value={routeAuthority(latitude, longitude)} />
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-300">{detection.reason}</p>
            {duplicateMatch && !complaintId && (
              <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                <p className="font-semibold">Similar complaint already exists</p>
                <p className="mt-2">Existing Complaint ID: {duplicateMatch.complaintId}</p>
                <p className="mt-1">Status: {duplicateMatch.status}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/track?id=${encodeURIComponent(duplicateMatch.complaintId)}`}
                    className="rounded-lg border border-amber-200/40 px-4 py-2 font-semibold text-amber-100 hover:bg-amber-200/10"
                  >
                    View Existing Complaint
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void createComplaint(true);
                    }}
                    disabled={isCreating}
                    className="rounded-lg bg-amber-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
                  >
                    Submit Anyway
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => void createComplaint()} disabled={isCreating || Boolean(complaintId) || Boolean(duplicateMatch)} className="mt-6 rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
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
