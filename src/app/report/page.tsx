"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

const SEVERITIES = ["Minor", "Major", "Dangerous"];

type VerificationStatus = "idle" | "checking" | "verified" | "review";

type Authority = {
  name: string;
  reason: string;
  confidence: string;
};

type RiskLevel = "Low" | "Medium" | "High";

export default function ReportPage() {
  /* ---------- CITIZEN ---------- */

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  /* ---------- ISSUE ---------- */

  const [issueType, setIssueType] = useState("Pothole");
  const [severity, setSeverity] = useState("Major");
  const [description, setDescription] = useState("");

  /* ---------- CAMERA ---------- */

  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  /* ---------- GPS ---------- */

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [locationStatus, setLocationStatus] = useState(
    "Location not captured"
  );

  /* ---------- AUTHORITY ---------- */

  const [authority, setAuthority] = useState<Authority | null>(null);

  /* ---------- AI VERIFICATION ---------- */

  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("idle");

  const [verificationMessage, setVerificationMessage] = useState("");

  const [detectedIssue, setDetectedIssue] = useState("Unknown");
  const [detectionConfidence, setDetectionConfidence] = useState(0);

  /* ---------- COMPLAINT ---------- */

  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [neglectRisk, setNeglectRisk] = useState<RiskLevel>("Low");

  /* ---------- CAMERA ---------- */

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      streamRef.current = stream;

      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (error) {
      console.error("Camera error:", error);

      alert(
        "Unable to access the camera. Please allow camera permission and try again."
      );
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  }

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      alert("Camera is not ready.");
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert("Camera is still loading. Please wait a moment and try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      alert("Unable to capture the image.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);

    setPhoto(imageData);
    setVideoFile(null);

    setVerificationStatus("idle");
    setVerificationMessage("");

    setDetectedIssue("Unknown");
    setDetectionConfidence(0);
  }

  function startRecording() {
    const stream = streamRef.current;

    if (!stream) {
      alert("Camera is not ready.");
      return;
    }

    recordedChunksRef.current = [];

    let options: MediaRecorderOptions = {};

    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      options = {
        mimeType: "video/webm;codecs=vp9,opus",
      };
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      options = {
        mimeType: "video/webm",
      };
    }

    try {
      const recorder = new MediaRecorder(stream, options);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: options.mimeType || "video/webm",
        });

        const file = new File(
          [blob],
          `civic-evidence-${Date.now()}.webm`,
          {
            type: blob.type,
          }
        );

        setVideoFile(file);
        setPhoto(null);

        setVerificationStatus("review");
        setVerificationMessage(
          "Video captured. Photo-based AI verification is currently required before complaint registration."
        );

        setDetectedIssue("Unknown");
        setDetectionConfidence(0);
      };

      recorder.start();

      setRecording(true);
    } catch (error) {
      console.error("Recording error:", error);

      alert("Unable to start video recording.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    setRecording(false);
  }

  /* ---------- GPS ---------- */

  function getLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("GPS is not supported by this browser.");
      return;
    }

    setLocationStatus("Getting your current GPS location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);

        setLocationStatus(
          `Location captured: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        );

        calculateAuthority(lat, lng);
      },
      (error) => {
        console.error("GPS error:", error);

        setLocationStatus(
          "Unable to capture GPS. Please allow location permission."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  /* ---------- AUTHORITY ROUTING ---------- */

  function calculateAuthority(lat: number, lng: number) {
    /*
      MVP routing engine.

      The citizen does NOT choose the authority.

      The application uses captured coordinates and issue type
      to produce the most likely responsible authority.

      These are demonstration rules and are NOT official
      administrative boundaries.
    */

    let selectedAuthority = "City Corporation";

    let reason =
      "The submitted location is currently handled using the city-area MVP routing rule.";

    let confidence = "Medium";

    const insideDemoCityZone =
      lat >= 12.25 &&
      lat <= 12.4 &&
      lng >= 76.55 &&
      lng <= 76.72;

    if (insideDemoCityZone) {
      selectedAuthority = "City Corporation";

      reason =
        "The GPS coordinates fall inside the configured Mysuru city demonstration zone.";

      confidence = "High";
    } else if (lat >= 12.1 && lat <= 12.5) {
      selectedAuthority = "Town Panchayat";

      reason =
        "The GPS coordinates fall outside the configured city zone but within the wider Mysuru demonstration region.";

      confidence = "Medium";
    } else {
      selectedAuthority = "Gram Panchayat";

      reason =
        "The GPS coordinates fall outside the configured city/town demonstration zones.";

      confidence = "Low";
    }

    if (
      issueType === "Overflowing Garbage Bin" ||
      issueType === "Waste Dumping" ||
      issueType === "Unsegregated Waste"
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
    if (latitude !== null && longitude !== null) {
      calculateAuthority(latitude, longitude);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueType]);

  /* ---------- GEMINI AI EVIDENCE VERIFICATION ---------- */

  async function verifyEvidence() {
    if (!photo) {
      if (videoFile) {
        setVerificationStatus("review");

        setVerificationMessage(
          "Video analysis will be added next. Please capture a photo for AI verification."
        );
      } else {
        alert("Please capture a photo before verification.");
      }

      return;
    }

    setVerificationStatus("checking");

    setVerificationMessage("AI is analyzing the actual image...");

    setDetectedIssue("Unknown");
    setDetectionConfidence(0);

    try {
      const imageResponse = await fetch(photo);

      const imageBlob = await imageResponse.blob();

      const formData = new FormData();

      formData.append(
        "image",
        new File([imageBlob], "civic-evidence.jpg", {
          type: imageBlob.type || "image/jpeg",
        })
      );

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Image analysis failed.");
      }

      const confidence =
        typeof result.confidence === "number"
          ? result.confidence
          : 0;

      setDetectedIssue(result.issue || "Unknown");

      setDetectionConfidence(confidence);

      if (
        result.evidenceStatus === "VERIFIED" &&
        result.canCreateComplaint === true &&
        result.issue &&
        result.issue !== "Unknown"
      ) {
        /*
          Important:
          The issue selected by the citizen is replaced by the
          AI-detected supported civic issue.
        */

        setIssueType(result.issue);

        setVerificationStatus("verified");

        setVerificationMessage(
          `${result.issue} detected with ${confidence}% confidence. ${result.reason}`
        );
      } else {
        setVerificationStatus("review");

        setVerificationMessage(
          `No supported civic issue was confidently detected. ${
            result.reason || ""
          }`
        );
      }
    } catch (error) {
      console.error("AI verification error:", error);

      setVerificationStatus("review");

      setDetectedIssue("Unknown");

      setDetectionConfidence(0);

      setVerificationMessage(
        error instanceof Error
          ? error.message
          : "Unable to analyze the image. Please try again."
      );
    }
  }

  /* ---------- COMPLAINT ---------- */

  function generateComplaintId() {
    const year = new Date().getFullYear();

    const randomNumber = Math.floor(1000 + Math.random() * 9000);

    return `PW-MYS-${year}-${randomNumber}`;
  }

  function calculateNeglectRisk(): RiskLevel {
    if (severity === "Dangerous") {
      return "Medium";
    }

    return "Low";
  }

  function submitComplaint() {
    if (!name.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (!phone.trim()) {
      alert("Please enter your phone number.");
      return;
    }

    if (!email.trim()) {
      alert("Please enter your email address.");
      return;
    }

    if (!photo && !videoFile) {
      alert("Please capture a photo or video.");
      return;
    }

    if (latitude === null || longitude === null) {
      alert("Please capture your GPS location.");
      return;
    }

    if (verificationStatus !== "verified") {
      alert("Please complete AI evidence verification before submitting.");
      return;
    }

    if (!authority) {
      calculateAuthority(latitude, longitude);

      alert(
        "The responsible authority is still being calculated. Please wait a moment and try again."
      );

      return;
    }

    const generatedId = generateComplaintId();

    const currentTime = new Date().toISOString();

    setComplaintId(generatedId);

    setSubmittedAt(currentTime);

    setNeglectRisk(calculateNeglectRisk());

    setSubmitted(true);

    closeCamera();

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }

  /* ---------- RESET ---------- */

  function resetComplaint() {
    setComplaintId(null);

    setSubmitted(false);

    setSubmittedAt(null);

    setPhoto(null);

    setVideoFile(null);

    setVerificationStatus("idle");

    setVerificationMessage("");

    setDetectedIssue("Unknown");

    setDetectionConfidence(0);

    setDescription("");

    setLatitude(null);

    setLongitude(null);

    setLocationStatus("Location not captured");

    setAuthority(null);

    setNeglectRisk("Low");
  }

  const videoUrl = videoFile
    ? URL.createObjectURL(videoFile)
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}

      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold">
            PotholeWatch{" "}
            <span className="text-cyan-400">AI</span>
          </Link>

          <Link
            href="/track"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          >
            Track Complaint
          </Link>
        </div>
      </header>

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
            Capture evidence, share your location, automatically route
            the complaint and track what happens after submission.
          </p>
        </div>

        {/* SUCCESS */}

        {submitted && complaintId && (
          <div className="mb-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-2xl text-emerald-300">
                ✓
              </div>

              <div>
                <h2 className="text-2xl font-bold text-emerald-300">
                  Complaint Submitted!
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  Your civic complaint has been registered for
                  follow-through.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                label="Complaint ID"
                value={complaintId}
              />

              <InfoCard
                label="AI Detected Issue"
                value={detectedIssue}
              />

              <InfoCard
                label="Responsible Authority"
                value={authority?.name || "Calculating..."}
              />

              <InfoCard
                label="Initial Status"
                value="Reported"
              />

              <InfoCard
                label="Neglect Risk"
                value={neglectRisk}
              />

              <InfoCard
                label="Registered By"
                value={name}
              />
            </div>

            <div className="mt-6 rounded-xl bg-slate-950/60 p-5">
              <p className="text-sm font-semibold text-cyan-300">
                Automatic Routing
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {authority?.reason}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                Routing confidence: {authority?.confidence}
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-5">
              <p className="font-semibold text-yellow-300">
                ⚠ Follow-through started
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                The complaint starts with status{" "}
                <strong>Reported</strong>. Future updates can move it
                through Acknowledged, Assigned, In Progress and
                Resolved.
              </p>
            </div>

            <p className="mt-5 text-sm text-slate-400">
              Save your Complaint ID so you can track the complaint.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/track?id=${complaintId}`}
                className="rounded-xl bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Track My Complaint
              </Link>

              <button
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
            {/* CITIZEN */}

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <SectionHeading
                icon="👤"
                title="Registered Citizen"
                subtitle="Enter the details of the person reporting the issue."
              />

              <div className="grid gap-5 md:grid-cols-3">
                <InputField
                  label="Full Name"
                  value={name}
                  onChange={setName}
                  placeholder="Enter full name"
                  required
                />

                <InputField
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  placeholder="Enter phone number"
                  type="tel"
                  required
                />

                <InputField
                  label="Email Address"
                  value={email}
                  onChange={setEmail}
                  placeholder="Enter email address"
                  type="email"
                  required
                />
              </div>
            </section>

            {/* EVIDENCE */}

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <SectionHeading
                icon="📷"
                title="Capture Civic Evidence"
                subtitle="Use your phone camera to capture a photo or video of the civic problem."
              />

              {!cameraOpen ? (
                <button
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
                      onClick={takePhoto}
                      disabled={recording}
                      className="rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"
                    >
                      📸 Take Photo
                    </button>

                    {!recording ? (
                      <button
                        onClick={startRecording}
                        className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white"
                      >
                        🎥 Start Video
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white"
                      >
                        ⏹ Stop Recording
                      </button>
                    )}

                    <button
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

                {videoFile && (
                  <div className="rounded-xl border border-emerald-400/20 bg-slate-900 p-4">
                    <p className="text-sm font-semibold text-emerald-300">
                      ✓ Video captured
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      Video evidence is ready for civic review.
                    </p>

                    {videoUrl && (
                      <video
                        controls
                        className="mt-4 aspect-video w-full rounded-lg"
                        src={videoUrl}
                      />
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* ISSUE */}

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <SectionHeading
                icon="🚧"
                title="Civic Issue"
                subtitle="Select what type of civic problem you are reporting."
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
                    setDescription(e.target.value)
                  }
                  rows={5}
                  placeholder="Describe the issue, nearby landmark, traffic impact, safety risk, garbage overflow, road damage, etc."
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>
            </section>

            {/* LOCATION */}

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <SectionHeading
                icon="📍"
                title="Location & Automatic Routing"
                subtitle="GPS is used to determine the most likely responsible authority."
              />

              <button
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
                  {latitude !== null ? "✓ " : ""}
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
                    Routing confidence: {authority.confidence}
                  </div>
                </div>
              )}
            </section>

            {/* AI VERIFICATION */}

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <SectionHeading
                icon="🔎"
                title="AI Evidence Verification"
                subtitle="Gemini analyzes the actual image before a complaint can be registered."
              />

              <div className="mb-5 rounded-xl border border-purple-400/20 bg-purple-400/5 p-4">
                <p className="text-sm font-semibold text-purple-300">
                  Gemini Vision Verification
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  The AI checks whether the captured image visibly
                  contains a supported civic problem. Unrelated images
                  such as portraits, rooms, floors or selfies should be
                  rejected.
                </p>
              </div>

              <button
                onClick={verifyEvidence}
                disabled={
                  verificationStatus === "checking" ||
                  !photo
                }
                className="rounded-xl bg-purple-500 px-5 py-3 font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verificationStatus === "checking"
                  ? "🔎 AI Analyzing Image..."
                  : "🔎 Analyze Image with AI"}
              </button>

              {verificationStatus !== "idle" && (
                <div
                  className={`mt-5 rounded-xl border p-5 ${
                    verificationStatus === "verified"
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : verificationStatus === "checking"
                        ? "border-purple-400/30 bg-purple-400/10"
                        : "border-yellow-400/30 bg-yellow-400/10"
                  }`}
                >
                  <div className="grid gap-4 sm:grid-cols-4">
                    <VerificationItem
                      label="Evidence"
                      value={
                        verificationStatus === "verified"
                          ? "VERIFIED"
                          : verificationStatus === "checking"
                            ? "ANALYZING"
                            : "NOT VERIFIED"
                      }
                    />

                    <VerificationItem
                      label="AI Detected Issue"
                      value={detectedIssue}
                    />

                    <VerificationItem
                      label="AI Confidence"
                      value={`${detectionConfidence}%`}
                    />

                    <VerificationItem
                      label="Submission"
                      value={
                        verificationStatus === "verified"
                          ? "Ready"
                          : "Blocked"
                      }
                    />
                  </div>

                  {verificationMessage && (
                    <p className="mt-4 text-sm leading-6 text-slate-300">
                      {verificationMessage}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* SUBMIT */}

            <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
              <div className="mb-5">
                <h2 className="text-2xl font-bold">
                  Ready to Submit?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  The system will create a Complaint ID and record the
                  AI-verified issue, responsible authority, evidence
                  status, location and initial follow-through state.
                </p>
              </div>

              <button
                onClick={submitComplaint}
                disabled={
                  verificationStatus !== "verified" ||
                  latitude === null ||
                  !authority
                }
                className="w-full rounded-xl bg-cyan-400 px-6 py-4 text-lg font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                🚀 Submit Civic Complaint
              </button>

              <p className="mt-3 text-center text-xs text-slate-500">
                You must capture GPS and successfully pass AI evidence
                verification before submission.
              </p>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

/* ---------- COMPONENTS ---------- */

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
        <h2 className="text-xl font-bold">{title}</h2>

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
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}

        {required && (
          <span className="ml-1 text-cyan-400">*</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
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
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-semibold text-white">
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