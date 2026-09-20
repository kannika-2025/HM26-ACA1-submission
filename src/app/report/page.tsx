"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type VerificationStatus =
  | "idle"
  | "checking"
  | "verified"
  | "review";

type Authority = {
  name: string;
  reason: string;
  confidence: string;
};

type User = {
  name: string;
  email: string;
  phone: string;
};

const ISSUE_TYPES = [
  "Pothole",
  "Road Damage",
  "Open Manhole",
  "Broken Streetlight",
  "Water Leakage",
  "Overflowing Garbage Bin",
  "Waste Dumping",
  "Unsegregated Waste",
  "Other",
];

const SEVERITIES = [
  "Minor",
  "Major",
  "Dangerous",
];

export default function ReportPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] =
    useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);

  const [photo, setPhoto] = useState<string | null>(null);
  const [videoFile, setVideoFile] =
    useState<Blob | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [issueType, setIssueType] =
    useState("Pothole");

  const [severity, setSeverity] =
    useState("Major");

  const [description, setDescription] =
    useState("");

  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  const [locationStatus, setLocationStatus] =
    useState("Location not captured");

  const [authority, setAuthority] =
    useState<Authority | null>(null);

  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("idle");

  const [verificationMessage, setVerificationMessage] =
    useState("");

  const [manualReview, setManualReview] =
    useState(false);

  const [detectedIssue, setDetectedIssue] =
    useState("Unknown");

  const [detectionConfidence, setDetectionConfidence] =
    useState(0);

  const [verificationModel, setVerificationModel] =
    useState("");

  const [complaintId, setComplaintId] =
    useState<string | null>(null);

  const [submitted, setSubmitted] =
    useState(false);

  const [syncMessage, setSyncMessage] =
    useState("");
  const [duplicateMatch, setDuplicateMatch] = useState<{
    id: string;
    status: string;
    area: string;
  } | null>(null);

  const [isLoadingUser, setIsLoadingUser] =
    useState(true);

  // ---------------------------------------------------------
  // Load optional registered-user details without gating public reporting.
  // ---------------------------------------------------------

  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        "potholewatch_current_user"
      );

    if (storedUser) {
      try {
        const user: User = JSON.parse(storedUser);

        setName(user.name || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
      } catch (error) {
        console.error("Unable to load saved user details:", error);
      }
    }

    setIsLoadingUser(false);
  }, []);

  // ---------------------------------------------------------
  // CAMERA STREAM
  // ---------------------------------------------------------

  useEffect(() => {
    if (
      !cameraOpen ||
      !cameraStream ||
      !videoRef.current
    ) {
      return;
    }

    const video = videoRef.current;

    video.srcObject = cameraStream;

    const startVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.error(
          "Video play error:",
          error
        );
      }
    };

    startVideo();

    return () => {
      video.srcObject = null;
    };
  }, [cameraOpen, cameraStream]);

  // ---------------------------------------------------------
  // CLEAN CAMERA
  // ---------------------------------------------------------

  useEffect(() => {
    return () => {
      cameraStream
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, [cameraStream]);

  // ---------------------------------------------------------
  // OPEN CAMERA
  // ---------------------------------------------------------

  async function openCamera() {
    try {
      if (
        !navigator.mediaDevices?.getUserMedia
      ) {
        alert(
          "Camera is not supported by this browser."
        );
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
          },
          audio: true,
        });

      setCameraStream(stream);
      setCameraOpen(true);
    } catch (error) {
      console.error(
        "Camera error:",
        error
      );

      alert(
        "Camera permission was not granted. Please allow camera access and try again."
      );
    }
  }

  // ---------------------------------------------------------
  // CLOSE CAMERA
  // ---------------------------------------------------------

  function closeCamera() {
    cameraStream
      ?.getTracks()
      .forEach((track) => track.stop());

    setCameraStream(null);
    setCameraOpen(false);
    setRecording(false);
  }

  // ---------------------------------------------------------
  // TAKE PHOTO
  // ---------------------------------------------------------

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      alert(
        "Camera is still starting. Please try again."
      );
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      alert(
        "Could not capture the photo."
      );
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const image =
      canvas.toDataURL(
        "image/jpeg",
        0.9
      );

    setPhoto(image);
    setVideoFile(null);

    // New evidence means old verification is invalid.
    setVerificationStatus("idle");
    setVerificationMessage("");
    setManualReview(false);
    setDetectedIssue("Unknown");
    setDetectionConfidence(0);
    setVerificationModel("");

    closeCamera();
  }

  // ---------------------------------------------------------
  // START VIDEO
  // ---------------------------------------------------------

  function startRecording() {
    if (!cameraStream) {
      alert(
        "Please open the camera first."
      );
      return;
    }

    if (!window.MediaRecorder) {
      alert(
        "Video recording is not supported by this browser."
      );
      return;
    }

    try {
      recordedChunksRef.current = [];

      const recorder =
        new MediaRecorder(
          cameraStream
        );

      recorder.ondataavailable =
        (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(
              event.data
            );
          }
        };

      recorder.onstop = () => {
        const blob = new Blob(
          recordedChunksRef.current,
          {
            type:
              recorder.mimeType ||
              "video/webm",
          }
        );

        setVideoFile(blob);
        setPhoto(null);

        setVerificationStatus("idle");
        setVerificationMessage("");
        setManualReview(false);
        setDetectedIssue("Unknown");
        setDetectionConfidence(0);
        setVerificationModel("");
      };

      mediaRecorderRef.current =
        recorder;

      recorder.start();

      setRecording(true);
    } catch (error) {
      console.error(
        "Recording error:",
        error
      );

      alert(
        "Could not start video recording."
      );
    }
  }

  // ---------------------------------------------------------
  // STOP VIDEO
  // ---------------------------------------------------------

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    setRecording(false);
  }

  // ---------------------------------------------------------
  // GPS LOCATION
  // ---------------------------------------------------------

  function getLocation() {
    if (!navigator.geolocation) {
      setLocationStatus(
        "GPS is not supported by this browser."
      );
      return;
    }

    setLocationStatus(
      "Getting your location..."
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat =
          position.coords.latitude;

        const lng =
          position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        setLocationStatus(
          "Location captured successfully"
        );
      },
      (error) => {
        console.error(
          "GPS error:",
          error
        );

        setLocationStatus(
          "Unable to get location. Please allow location permission."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  // ---------------------------------------------------------
  // AUTHORITY ROUTING
  // ---------------------------------------------------------

  function calculateAuthority(
    lat: number,
    lng: number
  ) {
    let selectedAuthority =
      "City Corporation";

    let reason =
      "The submitted location is being handled using the configured MVP routing rule.";

    let confidence = "Medium";

    // Demonstration Mysuru city zone.
    // These are MVP rules, not official boundary data.
    const insideDemoCityZone =
      lat >= 12.25 &&
      lat <= 12.40 &&
      lng >= 76.55 &&
      lng <= 76.72;

    if (insideDemoCityZone) {
      selectedAuthority =
        "City Corporation";

      reason =
        "The GPS coordinates fall inside the configured Mysuru city demonstration zone.";

      confidence = "High";
    } else if (
      lat >= 12.10 &&
      lat <= 12.50
    ) {
      selectedAuthority =
        "Town Panchayat";

      reason =
        "The GPS coordinates fall outside the configured city zone but within the wider Mysuru demonstration region.";

      confidence = "Medium";
    } else {
      selectedAuthority =
        "Gram Panchayat";

      reason =
        "The GPS coordinates fall outside the configured city and town demonstration zones.";

      confidence = "Low";
    }

    if (
      issueType ===
        "Overflowing Garbage Bin" ||
      issueType === "Waste Dumping" ||
      issueType ===
        "Unsegregated Waste"
    ) {
      reason +=
        " Waste-related complaints are routed using the same location authority.";
    }

    setAuthority({
      name: selectedAuthority,
      reason,
      confidence,
    });
  }

  useEffect(() => {
    if (
      latitude !== null &&
      longitude !== null
    ) {
      calculateAuthority(
        latitude,
        longitude
      );
    }
  }, [
    latitude,
    longitude,
    issueType,
  ]);

  // ---------------------------------------------------------
  // CONVERT DATA URL TO FILE
  // ---------------------------------------------------------

  async function dataUrlToFile(
    dataUrl: string,
    fileName: string
  ) {
    const response =
      await fetch(dataUrl);

    const blob =
      await response.blob();

    return new File(
      [blob],
      fileName,
      {
        type:
          blob.type ||
          "image/jpeg",
      }
    );
  }

  // ---------------------------------------------------------
  // GEMINI VERIFICATION
  // ---------------------------------------------------------

  async function verifyEvidence() {
    if (!photo) {
      if (videoFile) {
        setVerificationStatus(
          "review"
        );

        setVerificationMessage(
          "Video evidence is captured, but Gemini image verification currently requires a photo. Please capture a photo for AI verification."
        );

        return;
      }

      alert(
        "Please capture a photo before verification."
      );

      return;
    }

    setVerificationStatus(
      "checking"
    );

    setManualReview(false);

    setVerificationMessage(
      "Gemini AI is analyzing the image..."
    );

    setDetectedIssue("Unknown");
    setDetectionConfidence(0);
    setVerificationModel("");

    let nonAvailabilityResponseError = false;

    try {
      const imageFile =
        await dataUrlToFile(
          photo,
          "civic-evidence.jpg"
        );

      const formData =
        new FormData();

      formData.append(
        "image",
        imageFile
      );

      const response =
        await fetch(
          "/api/analyze-image",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        const availabilityFailure = [
          "quota_or_rate_limit",
          "gemini_service_unavailable",
          "network_error",
          "model_not_found",
        ].includes(data?.category);

        if (availabilityFailure) {
          setDetectedIssue("Needs manual review");
          setDetectionConfidence(0);
          setManualReview(true);
          setVerificationStatus("review");
          setVerificationMessage(
            "AI verification temporarily unavailable. Evidence will require manual review."
          );
          return;
        }

        nonAvailabilityResponseError = true;
        throw new Error(
          data?.error ||
            "Gemini verification failed."
        );
      }

      const issue =
        typeof data.issue === "string"
          ? data.issue
          : "Unknown";

      const confidence =
        typeof data.confidence ===
        "number"
          ? data.confidence
          : 0;

      setDetectedIssue(issue);
      setDetectionConfidence(
        confidence
      );

      setVerificationModel(
        typeof data.model === "string"
          ? data.model
          : ""
      );

      if (
        data.evidenceStatus ===
          "VERIFIED" &&
        data.canCreateComplaint ===
          true
      ) {
        setVerificationStatus(
          "verified"
        );

        setManualReview(false);

        setVerificationMessage(
          data.reason ||
            `Gemini verified ${issue} with ${confidence}% confidence.`
        );
      } else {
        setVerificationStatus(
          "review"
        );

        setVerificationMessage(
          data.reason ||
            "The image could not be confidently verified as a supported civic issue."
        );
      }
    } catch (error) {
      console.error(
        "Gemini verification error:",
        error
      );

      setVerificationStatus(
        "review"
      );

      if (nonAvailabilityResponseError) {
        setManualReview(false);
        setVerificationMessage(
          error instanceof Error
            ? error.message
            : "Gemini verification failed. Please try again."
        );
      } else {
        setManualReview(true);
        setDetectedIssue("Needs manual review");
        setDetectionConfidence(0);
        setVerificationMessage(
          "AI verification temporarily unavailable. Evidence will require manual review."
        );
      }
    }
  }

  // ---------------------------------------------------------
  // COMPLAINT ID
  // ---------------------------------------------------------

  function generateComplaintId() {
    const year =
      new Date().getFullYear();

    const randomNumber =
      Math.floor(
        1000 +
          Math.random() * 9000
      );

    return `PW-MYS-${year}-${randomNumber}`;
  }

  // ---------------------------------------------------------
  // SUBMIT COMPLAINT
  // ---------------------------------------------------------

  function getDepartment(issue: string) {
    const departmentMap: Record<string, string> = {
      Pothole: "Road & Infrastructure",
      "Road Damage": "Road & Infrastructure",
      "Open Manhole": "Drainage / Sewerage",
      "Broken Streetlight": "Electrical / Street Lighting",
      "Water Leakage": "Water Supply",
      "Garbage / Waste Dumping": "Solid Waste Management",
      "Waste Dumping": "Solid Waste Management",
      "Overflowing Garbage Bin": "Solid Waste Management",
      "Unsegregated Waste": "Solid Waste Management",
    };

    return departmentMap[issue] || "Road & Infrastructure";
  }

  async function submitComplaint(ignoreDuplicate = false) {
    if (!name.trim()) {
      alert(
        "Please enter your full name."
      );
      return;
    }

    const needsReview = manualReview || verificationStatus !== "verified";
    const selectedAuthority = authority || {
      name: "City Corporation",
      reason: "Location was not available, so the complaint will be reviewed by the city civic desk.",
      confidence: "Manual review",
    };
    setAuthority(selectedAuthority);

    const evidenceFile = photo
      ? await dataUrlToFile(photo, "civic-evidence.jpg")
      : null;
    const evidenceHash = evidenceFile
      ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await evidenceFile.arrayBuffer())))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("")
      : null;

    if (isSupabaseConfigured && !ignoreDuplicate) {
      const { data: existing, error: duplicateError } = await supabase
        .from("complaints")
        .select("*")
        .eq("issue", issueType);
      if (duplicateError) {
        console.error("Report duplicate check failed:", duplicateError);
        setSyncMessage("Complaint data is temporarily unavailable. Please try again.");
        return;
      }
      const currentCoordinates = latitude !== null && longitude !== null
        ? { latitude, longitude }
        : null;
      const parseCoordinates = (value: unknown) => {
        const match = typeof value === "string" ? value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/) : null;
        return match ? { latitude: Number(match[1]), longitude: Number(match[2]) } : null;
      };
      const distance = (first: { latitude: number; longitude: number }, second: { latitude: number; longitude: number }) => {
        const lat = (second.latitude - first.latitude) * 111320;
        const lng = (second.longitude - first.longitude) * 111320 * Math.cos((first.latitude * Math.PI) / 180);
        return Math.sqrt(lat ** 2 + lng ** 2);
      };
      const statusLabel = (value: unknown) => {
        const status = String(value || "Submitted");
        return ["RESOLVED", "CLOSED", "Fixed"].includes(status)
          ? "Fixed"
          : ["ACKNOWLEDGED", "ASSIGNED", "WORK STARTED", "In Progress"].includes(status)
            ? "In Progress"
            : "Submitted";
      };
      const match = (existing || []).find((row) => {
        const candidateCoordinates = row.latitude !== null && row.longitude !== null
          ? { latitude: Number(row.latitude), longitude: Number(row.longitude) }
          : parseCoordinates(row.coordinates);
        const candidateHash = typeof row.evidence_hash === "string"
          ? row.evidence_hash
          : String(row.evidence || "").match(/evidence_hash:([a-f0-9]{64})/i)?.[1] || null;
        const nearby = Boolean(currentCoordinates && candidateCoordinates && distance(currentCoordinates, candidateCoordinates) <= 100);
        return nearby && Boolean(evidenceHash && candidateHash && evidenceHash === candidateHash) || nearby;
      });
      if (match) {
        setDuplicateMatch({
          id: String(match.id),
          status: statusLabel(match.current_status || match.status),
          area: String(match.location || match.coordinates || "Reported location"),
        });
        return;
      }
    }

    const generatedId =
      generateComplaintId();

    const currentTime =
      new Date().toISOString();

    const storedUser =
      localStorage.getItem(
        "potholewatch_current_user"
      );

    let loggedInUser: User | null =
      null;

    if (storedUser) {
      try {
        loggedInUser =
          JSON.parse(storedUser);
      } catch {
        loggedInUser = null;
      }
    }

    const complaint = {
      complaintId:
        generatedId,

      registeredBy: {
        name:
          loggedInUser?.name ||
          name.trim(),
        phone:
          loggedInUser?.phone ||
          phone.trim(),
        email:
          loggedInUser?.email ||
          email.trim(),
        registeredOn: currentTime,
      },

      registeredOn:
        currentTime,

      issue:
        issueType,

      severity,

      description,

      location:
        latitude !== null && longitude !== null
          ? `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : "Location unavailable",

      coordinates:
        latitude !== null && longitude !== null
          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : "Location unavailable",

      latitude,

      longitude,

      evidence: evidenceHash
        ? `${photo ? "Photo" : "Video"}; evidence_hash:${evidenceHash}`
        : photo ? "Photo" : "Video",

      verification: {
        status: needsReview ? "Needs Review" : "VERIFIED",

        detectedIssue,

        confidence:
          detectionConfidence,

        model:
          verificationModel,

          duplicateCheck: duplicateMatch ? `Potential duplicate: ${duplicateMatch.id}` : "No duplicate detected",

        locationCheck:
          latitude !== null && longitude !== null
            ? "Location verified"
            : "Location unavailable - manual review required",
      },

      authority: {
          name:
          selectedAuthority.name,

          reason:
          selectedAuthority.reason,

          confidence:
          selectedAuthority.confidence,
      },

      status: "Submitted",

      currentStatus: "Submitted",

      assignedAuthority: selectedAuthority.name,

      department: needsReview
        ? "Human Review"
        : getDepartment(issueType),

      statusHistory: [
        {
          status: "Submitted",
          timestamp:
            currentTime,
        },
      ],

      lastUpdated:
        currentTime,

      neglectRisk:
        severity === "Dangerous"
          ? "Medium"
          : "Low",
    };

    setSyncMessage("");

    if (isSupabaseConfigured) {
      try {
        let duplicateCheck = "Not checked";
        const { data: possibleDuplicates } = await supabase
          .from("complaints")
          .select("id")
          .eq("issue", complaint.issue)
          .eq("coordinates", complaint.coordinates)
          .limit(1);

        if (possibleDuplicates?.length) {
          duplicateCheck = "Possible duplicate - review required";
          complaint.verification.status = "NEEDS_REVIEW";
          complaint.verification.duplicateCheck = duplicateCheck;
        }

        const { error } = await supabase.from("complaints").insert({
          id: generatedId,
          registered_name: complaint.registeredBy.name,
          registered_phone: complaint.registeredBy.phone,
          registered_email: complaint.registeredBy.email,
          registered_on: currentTime,
          issue: complaint.issue,
          location: complaint.location,
          coordinates: complaint.coordinates,
          severity: complaint.severity,
          description: complaint.description,
          evidence: complaint.evidence,
          verification_status: complaint.verification.status,
          verification_confidence: String(
            complaint.verification.confidence
          ),
          duplicate_check: duplicateCheck,
          location_check: "Location verified",
          assigned_authority: complaint.authority.name,
          department: complaint.department,
          current_status: "Submitted",
          last_updated: currentTime,
          created_at: currentTime,
        });

        if (!error) {
          setSyncMessage("Online complaint record created.");
        } else {
          console.error("Supabase complaint insert failed:", error);
          setSyncMessage(
            "Saved on this device. Online sync is temporarily unavailable."
          );
        }
      } catch (error) {
        console.error("Supabase complaint insert failed:", error);
        setSyncMessage(
          "Saved on this device. Online sync is temporarily unavailable."
        );
      }
    } else {
      setSyncMessage(
        "Saved on this device. Online sync is not configured."
      );
    }

    // Save complete complaint.
    localStorage.setItem(
      `complaint_${generatedId}`,
      JSON.stringify(
        complaint
      )
    );

    // Save latest complaint.
    localStorage.setItem(
      "latest_complaint_id",
      generatedId
    );

    // Save complaint for this user.
    const existingUserComplaints =
      JSON.parse(
        localStorage.getItem(
          "potholewatch_user_complaints"
        ) || "[]"
      );

    existingUserComplaints.push(
      generatedId
    );

    localStorage.setItem(
      "potholewatch_user_complaints",
      JSON.stringify(
        existingUserComplaints
      )
    );

    setComplaintId(
      generatedId
    );

    setSubmitted(true);

    closeCamera();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ---------------------------------------------------------
  // RESET
  // ---------------------------------------------------------

  function resetComplaint() {
    setComplaintId(null);
    setSubmitted(false);

    setPhoto(null);
    setVideoFile(null);

    setVerificationStatus(
      "idle"
    );

    setManualReview(false);

    setVerificationMessage("");

    setDetectedIssue(
      "Unknown"
    );

    setDetectionConfidence(0);

    setVerificationModel("");

    setDescription("");

    setLatitude(null);
    setLongitude(null);

    setLocationStatus(
      "Location not captured"
    );

    setAuthority(null);
  }

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (isLoadingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="text-3xl">
            PotholeWatch AI
          </div>

          <p className="mt-3 text-slate-400">
            Checking your login...
          </p>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // VIDEO PREVIEW URL
  // ---------------------------------------------------------

  const videoUrl =
    videoFile
      ? URL.createObjectURL(
          videoFile
        )
      : null;

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <section className="mx-auto max-w-5xl px-6 py-10">

        {/* HEADING */}
        <div className="mb-10 text-center">

          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Civic Issue Reporting
          </p>

          <h1 className="text-4xl font-bold sm:text-5xl">
            Report a Civic Problem
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Capture evidence, verify it with Gemini AI,
            share your GPS location and receive a unique
            Complaint ID.
          </p>

        </div>

        {/* SUCCESS */}
        {submitted &&
          complaintId && (
            <div className="mb-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6">

              <div className="mb-6 flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-2xl text-emerald-300">
                  ✓
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-emerald-300">
                    Complaint Submitted Successfully!
                  </h2>

                  <p className="mt-1 text-sm text-slate-300">
                    Your civic complaint has been registered.
                  </p>
                </div>

              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <InfoCard
                  label="Complaint ID"
                  value={complaintId}
                  highlight
                />

                <InfoCard
                  label="Registered By"
                  value={name}
                />

                <InfoCard
                  label="Issue"
                  value={issueType}
                />

                <InfoCard
                  label="AI Verification"
                  value={manualReview ? "Needs Review" : "Verified"}
                />

                <InfoCard
                  label="AI Confidence"
                  value={`${detectionConfidence}%`}
                />

                <InfoCard
                  label="Authority"
                  value={
                    authority?.name ||
                    "Calculating..."
                  }
                />

              </div>

              <div className="mt-6 rounded-xl bg-slate-950/60 p-5">

                <p className="text-sm font-semibold text-cyan-300">
                  Complaint ID
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {complaintId}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Save this ID to track your complaint.
                </p>

              </div>

              {syncMessage && (
                <p className="mt-4 text-xs text-slate-400">
                  {syncMessage}
                </p>
              )}

              <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">

                <p className="font-semibold text-cyan-300">
                  Automatic Routing
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {authority?.reason}
                </p>

                <p className="mt-3 text-xs text-slate-500">
                  Routing confidence:{" "}
                  {authority?.confidence}
                </p>

              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                <Link
                  href={`/track?id=${complaintId}`}
                  className="rounded-xl bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  🔎 Track My Complaint
                </Link>

                <button
                  type="button"
                  onClick={resetComplaint}
                  className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-200 transition hover:bg-white/5"
                >
                  Report Another Issue
                </button>

              </div>

            </div>
          )}

        {!submitted && (
          <div className="space-y-6">

            {/* USER */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">

              <SectionHeading
                icon="👤"
                title="Citizen Details"
                subtitle="Name is required. Phone and email are optional for follow-up."
              />

              <div className="grid gap-5 md:grid-cols-3">

                <InputField
                  label="Full Name"
                  value={name}
                  onChange={setName}
                  placeholder="Your name"
                />

                <InputField
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  placeholder="Phone number"
                  type="tel"
                />

                <InputField
                  label="Email Address"
                  value={email}
                  onChange={setEmail}
                  placeholder="Email address"
                  type="email"
                />

              </div>

              <p className="mt-4 text-xs text-slate-500">
                You can submit publicly without creating an account.
              </p>

            </section>

            {/* CAMERA */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">

              <SectionHeading
                icon="📷"
                title="Capture Civic Evidence"
                subtitle="Use your phone camera to capture the problem."
              />

              {!cameraOpen ? (
                <button
                  type="button"
                  onClick={openCamera}
                  className="w-full rounded-xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300"
                >
                  📷 Open Mobile Camera
                </button>
              ) : (
                <div>

                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">

                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="aspect-video w-full object-cover"
                    />

                  </div>

                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">

                    <button
                      type="button"
                      onClick={takePhoto}
                      disabled={recording}
                      className="rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"
                    >
                      📸 Take Photo
                    </button>

                    {!recording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white"
                      >
                        🎥 Start Video
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white"
                      >
                        ⏹ Stop Recording
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={closeCamera}
                      className="rounded-xl border border-white/10 px-4 py-3 font-semibold text-slate-200"
                    >
                      Close Camera
                    </button>

                  </div>

                  {recording && (
                    <p className="mt-4 text-center text-sm font-semibold text-red-400">
                      🔴 Recording in progress...
                    </p>
                  )}

                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">

                {photo && (
                  <div className="overflow-hidden rounded-xl border border-emerald-400/20 bg-slate-900">

                    <div className="border-b border-white/10 px-4 py-3">
                      <p className="text-sm font-semibold text-emerald-300">
                        ✓ Photo captured
                      </p>
                    </div>

                    <img
                      src={photo}
                      alt="Captured civic evidence"
                      className="aspect-video w-full object-cover"
                    />

                  </div>
                )}

                {videoFile && videoUrl && (
                  <div className="rounded-xl border border-emerald-400/20 bg-slate-900 p-4">

                    <p className="text-sm font-semibold text-emerald-300">
                      ✓ Video captured
                    </p>

                    <video
                      controls
                      className="mt-4 aspect-video w-full rounded-lg"
                      src={videoUrl}
                    />

                  </div>
                )}

              </div>

            </section>

            {/* ISSUE */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">

              <SectionHeading
                icon="🚧"
                title="Civic Issue"
                subtitle="Select the type and severity of the problem."
              />

              <div className="grid gap-5 md:grid-cols-2">

                <SelectField
                  label="Issue Type"
                  value={issueType}
                  onChange={setIssueType}
                  options={ISSUE_TYPES}
                />

                <SelectField
                  label="Severity"
                  value={severity}
                  onChange={setSeverity}
                  options={SEVERITIES}
                />

              </div>

              <div className="mt-5">

                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                  rows={5}
                  placeholder="Describe the issue, nearby landmark, traffic impact, safety risk, etc."
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />

              </div>

            </section>

            {/* LOCATION */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">

              <SectionHeading
                icon="📍"
                title="Location & Automatic Routing"
                subtitle="GPS helps determine the likely responsible authority."
              />

              <button
                type="button"
                onClick={getLocation}
                className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                📍 Capture Current GPS Location
              </button>

              <div className="mt-4 rounded-xl bg-slate-900 p-4">

                <p
                  className={`text-sm font-medium ${
                    latitude !== null
                      ? "text-emerald-300"
                      : "text-slate-400"
                  }`}
                >
                  {latitude !== null
                    ? "✓ "
                    : ""}
                  {locationStatus}
                </p>

                {latitude !== null &&
                  longitude !== null && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">

                      <InfoItem
                        label="Latitude"
                        value={latitude.toFixed(6)}
                      />

                      <InfoItem
                        label="Longitude"
                        value={longitude.toFixed(6)}
                      />

                    </div>
                  )}

              </div>

              {authority && (
                <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">

                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                    Automatically Selected Authority
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {authority.name}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {authority.reason}
                  </p>

                  <div className="mt-4 inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                    Routing confidence:{" "}
                    {authority.confidence}
                  </div>

                </div>
              )}

            </section>

            {/* GEMINI */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">

              <SectionHeading
                icon="🤖"
                title="Gemini AI Evidence Verification"
                subtitle="Gemini analyzes the captured photo before the complaint can be submitted."
              />

              <div className="mb-5 rounded-xl border border-purple-400/20 bg-purple-400/5 p-4">

                <p className="text-sm font-semibold text-purple-300">
                  AI verification
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  The image is checked for a visible supported civic issue.
                </p>

              </div>

              <button
                type="button"
                onClick={verifyEvidence}
                disabled={
                  verificationStatus ===
                    "checking" ||
                  !photo
                }
                className="rounded-xl bg-purple-500 px-5 py-3 font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verificationStatus ===
                "checking"
                  ? "🤖 Gemini is Analyzing..."
                  : "🤖 Analyze Image with AI"}
              </button>

              {verificationStatus !==
                "idle" && (
                <div
                  className={`mt-5 rounded-xl border p-5 ${
                    verificationStatus ===
                    "verified"
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : verificationStatus ===
                          "checking"
                        ? "border-purple-400/30 bg-purple-400/10"
                        : "border-yellow-400/30 bg-yellow-400/10"
                  }`}
                >

                  <div className="grid gap-4 sm:grid-cols-3">

                    <VerificationItem
                      label="Evidence"
                      value={
                        verificationStatus ===
                        "verified"
                          ? "VERIFIED"
                          : verificationStatus ===
                              "checking"
                            ? "CHECKING"
                            : "NOT VERIFIED"
                      }
                    />

                    <VerificationItem
                      label="AI Detected Issue"
                      value={
                        detectedIssue
                      }
                    />

                    <VerificationItem
                      label="AI Confidence"
                      value={`${detectionConfidence}%`}
                    />

                  </div>

                  {verificationMessage && (
                    <p className="mt-4 text-sm leading-6 text-slate-300">
                      {verificationMessage}
                    </p>
                  )}

                  {verificationModel && (
                    <p className="mt-3 text-xs text-slate-500">
                      Model:{" "}
                      {verificationModel}
                    </p>
                  )}

                </div>
              )}

            </section>

            {/* SUBMIT */}
            <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">

              <h2 className="text-2xl font-bold">
                Ready to Submit?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Your complaint can be submitted even when evidence or location needs manual review.
              </p>

              <button
                type="button"
                onClick={() => void submitComplaint()}
                disabled={false}
                className="mt-5 w-full rounded-xl bg-cyan-400 px-6 py-4 text-lg font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                🚀 Submit Civic Complaint
              </button>

              <p className="mt-3 text-center text-xs text-slate-500">
                Gemini, GPS and contact details are optional. Uncertain evidence is saved for manual review.
              </p>

              {duplicateMatch && !submitted && (
                <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-100">
                  <p className="font-semibold">Similar complaint already exists.</p>
                  <p className="mt-2">Existing Complaint ID: {duplicateMatch.id}</p>
                  <p className="mt-1">Current Status: {duplicateMatch.status}</p>
                  <p className="mt-1">Location: {duplicateMatch.area}</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Link href={`/track?id=${encodeURIComponent(duplicateMatch.id)}`} className="rounded-lg border border-amber-200/40 px-4 py-3 text-center font-semibold hover:bg-amber-200/10">
                      View Existing Complaint
                    </Link>
                    <button type="button" onClick={() => void submitComplaint(true)} className="rounded-lg bg-amber-300 px-4 py-3 font-semibold text-slate-950">
                      Submit Anyway
                    </button>
                  </div>
                </div>
              )}

            </section>

          </div>
        )}

      </section>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xl">
        {icon}
      </div>

      <div>
        <h2 className="text-xl font-bold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {subtitle}
        </p>
      </div>

    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}

        {required && (
          <span className="ml-1 text-cyan-400">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
      />

    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  options: string[];
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
      >

        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}

      </select>

    </div>
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

      <p className="mt-1 break-all text-sm font-medium text-slate-200">
        {value}
      </p>

    </div>
  );
}

function InfoCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-950/70 p-5">

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 font-semibold ${
          highlight
            ? "text-xl text-cyan-300"
            : "text-white"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

function VerificationItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950/50 p-4">

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-emerald-300">
        {value}
      </p>

    </div>
  );
}