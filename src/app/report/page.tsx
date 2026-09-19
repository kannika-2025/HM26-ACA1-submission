"use client";

import { useRef, useState } from "react";

type Coordinates = {
  latitude: number;
  longitude: number;
};

export default function ReportPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<Blob | null>(null);

  const [citizenName, setCitizenName] = useState("");
  const [phone, setPhone] = useState("");
  const [issueType, setIssueType] = useState("Pothole");
  const [severity, setSeverity] = useState("Major");
  const [description, setDescription] = useState("");

  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // -----------------------------
  // GET CURRENT GPS LOCATION
  // -----------------------------
  const getCurrentLocation = () => {
    setError("");
    setSuccess("");
    setLocationLoading(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this phone/browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setCoordinates({
          latitude,
          longitude,
        });

        setLocation(
          `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        );

        setLocationLoading(false);
        setSuccess("📍 Current location captured successfully.");
      },
      (error) => {
        console.error("GPS Error:", error);

        setLocationLoading(false);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError(
              "Location permission denied. Please enable Location permission for your browser."
            );
            break;

          case error.POSITION_UNAVAILABLE:
            setError(
              "Location unavailable. Please turn ON GPS/Location services and try again."
            );
            break;

          case error.TIMEOUT:
            setError(
              "Location request timed out. Please make sure GPS is ON and try again."
            );
            break;

          default:
            setError("Unable to get your current location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  };

  // -----------------------------
  // OPEN LIVE CAMERA
  // -----------------------------
  const openCamera = async () => {
    try {
      setError("");
      setSuccess("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCameraOpen(true);
    } catch (err) {
      console.error("Camera Error:", err);
      setError(
        "Unable to access camera. Please allow camera permission and try again."
      );
    }
  };

  // -----------------------------
  // CLOSE CAMERA
  // -----------------------------
  const closeCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setRecording(false);
  };

  // -----------------------------
  // TAKE PHOTO
  // -----------------------------
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setError("Camera is not ready.");
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera is still starting. Please wait a moment.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to capture photo.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);

    setPhoto(imageData);
    setSuccess("📸 Photo captured successfully.");
  };

  // -----------------------------
  // START VIDEO RECORDING
  // -----------------------------
  const startRecording = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;

    if (!stream) {
      setError("Please open the camera first.");
      return;
    }

    try {
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });

        setVideoFile(blob);
        setSuccess("🎥 Video recorded successfully.");
      };

      recorder.start();
      setRecording(true);
      setError("");
    } catch (err) {
      console.error("Recording Error:", err);
      setError("Video recording is not supported on this browser.");
    }
  };

  // -----------------------------
  // STOP VIDEO RECORDING
  // -----------------------------
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
  };

  // -----------------------------
  // SUBMIT COMPLAINT
  // -----------------------------
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!photo && !videoFile) {
      setError("Please capture a pothole photo or record a video.");
      return;
    }

    if (!coordinates) {
      setError("Please capture your current location.");
      return;
    }

    setSuccess(
      "✅ Complaint captured successfully. AI verification will be performed next."
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="text-xl font-bold">
            🕳️ PotholeWatch AI
          </a>

          <a
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Home
          </a>
        </div>
      </header>

      {/* PAGE */}
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
            Civic Complaint
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Report a Pothole
          </h1>

          <p className="mt-3 text-slate-400">
            Capture evidence, location and issue details so the complaint can
            be verified and prioritized.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* CAMERA SECTION */}
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">1. Capture Evidence</h2>

            <p className="mt-2 text-sm text-slate-400">
              Use your phone camera to capture the pothole.
            </p>

            <div className="mt-6 overflow-hidden rounded-xl bg-black">
              {cameraOpen ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-slate-500">
                  Camera preview will appear here
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-5 flex flex-wrap gap-3">
              {!cameraOpen ? (
                <button
                  type="button"
                  onClick={openCamera}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
                >
                  📷 Open Live Camera
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={takePhoto}
                    className="rounded-xl bg-green-600 px-5 py-3 font-semibold hover:bg-green-500"
                  >
                    📸 Take Photo
                  </button>

                  {!recording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="rounded-xl bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500"
                    >
                      🎥 Record Video
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="rounded-xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500"
                    >
                      ⏹️ Stop Recording
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={closeCamera}
                    className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-slate-300 hover:bg-white/5"
                  >
                    Close Camera
                  </button>
                </>
              )}
            </div>

            {photo && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold text-slate-300">
                  Captured Photo
                </p>

                <img
                  src={photo}
                  alt="Captured pothole"
                  className="max-h-96 w-full rounded-xl object-contain"
                />
              </div>
            )}

            {videoFile && (
              <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-green-300">
                🎥 Video evidence is ready.
              </div>
            )}
          </section>

          {/* LOCATION SECTION */}
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">2. Location</h2>

            <p className="mt-2 text-sm text-slate-400">
              Capture your current GPS location. This helps route the complaint
              to the correct local authority.
            </p>

            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="mt-4 w-full rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-4 font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {locationLoading
                ? "📍 Getting Your Location..."
                : "📍 Use My Current Location"}
            </button>

            {location && (
              <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                <p className="text-sm font-semibold text-green-300">
                  Location captured
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {location}
                </p>

                {coordinates && (
                  <p className="mt-2 text-xs text-slate-500">
                    Latitude: {coordinates.latitude.toFixed(6)} | Longitude:{" "}
                    {coordinates.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* CITIZEN DETAILS */}
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">3. Citizen Details</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Name
                </label>

                <input
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Phone
                </label>

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* ISSUE DETAILS */}
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold">4. Issue Details</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Issue Type
                </label>

                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                >
                  <option>Pothole</option>
                  <option>Road Damage</option>
                  <option>Open Manhole</option>
                  <option>Waterlogging</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Severity
                </label>

                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
                >
                  <option>Minor</option>
                  <option>Major</option>
                  <option>Dangerous</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-slate-300">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe the pothole or road issue..."
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          </section>

          {/* SUBMIT */}
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold hover:bg-blue-500"
          >
            🔍 Analyze & Submit Complaint
          </button>
        </form>
      </section>
    </main>
  );
}