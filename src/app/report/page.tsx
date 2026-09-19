"use client";

import { useState } from "react";

export default function ReportPage() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const handleCameraCapture = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);

    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);
  };

  const retakePhoto = () => {
    setImage(null);
    setFileName("");
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-10">
          <a
            href="/"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to Home
          </a>

          <h1 className="mt-6 text-4xl font-bold">
            Report a Pothole
          </h1>

          <p className="mt-3 text-slate-400">
            Capture road evidence using your camera and provide
            the location so our AI can analyze the issue.
          </p>
        </div>

        <form className="space-y-8">

          {/* Citizen Information */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
              Citizen Information
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Name
                </label>

                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Phone Number
                </label>

                <input
                  type="tel"
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

            </div>
          </section>

          {/* Camera Evidence */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="text-xl font-semibold">
              Road Evidence
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Capture a clear photo of the pothole using your device camera.
            </p>

            {!image && (
              <div className="mt-6 rounded-xl border-2 border-dashed border-slate-700 p-8 text-center">

                <div className="text-5xl">
                  📷
                </div>

                <p className="mt-4 text-slate-300">
                  Capture pothole image
                </p>

                {/* Native Camera */}
                <label
                  htmlFor="cameraInput"
                  className="mt-6 inline-block cursor-pointer rounded-xl bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500"
                >
                  📷 Take Photo
                </label>

                <input
                  id="cameraInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                />

                <p className="mt-4 text-xs text-slate-500">
                  Your device camera will open when you select Take Photo.
                </p>

              </div>
            )}

            {/* Captured Image */}
            {image && (
              <div className="mt-6">

                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-green-400">
                    ✓ Photo captured successfully
                  </p>
                </div>

                <img
                  src={image}
                  alt="Captured pothole"
                  className="w-full rounded-2xl border border-slate-700 object-contain"
                />

                <p className="mt-3 text-sm text-slate-400">
                  {fileName}
                </p>

                <button
                  type="button"
                  onClick={retakePhoto}
                  className="mt-4 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-3 text-sm text-blue-300 transition hover:bg-blue-500/20"
                >
                  🔄 Retake Photo
                </button>

              </div>
            )}

          </section>

          {/* Issue Details */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="text-xl font-semibold">
              Issue Details
            </h2>

            <div className="mt-6">

              <label className="mb-2 block text-sm text-slate-300">
                Describe the problem
              </label>

              <textarea
                rows={5}
                placeholder="Example: Large pothole near the main road causing difficulty for vehicles..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />

            </div>

          </section>

          {/* Location */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="text-xl font-semibold">
              Location
            </h2>

            <div className="mt-6">

              <label className="mb-2 block text-sm text-slate-300">
                Location
              </label>

              <input
                type="text"
                placeholder="Example: Ramaswamy Circle, Mysuru"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />

              <button
                type="button"
                className="mt-4 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-3 text-sm text-blue-300 transition hover:bg-blue-500/20"
              >
                📍 Use My Current Location
              </button>

            </div>

          </section>

          {/* Submit */}
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold transition hover:bg-blue-500"
          >
            🤖 Analyze & Submit Complaint
          </button>

        </form>

      </div>
    </main>
  );
}