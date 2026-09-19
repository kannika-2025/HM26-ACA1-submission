"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "register" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    const user = {
      name: name.trim() || "Citizen",
      email: email.trim(),
      phone: phone.trim(),
    };

    localStorage.setItem("potholewatch_logged_in", "true");
    localStorage.setItem(
      "potholewatch_current_user",
      JSON.stringify(user)
    );

    router.push("/report");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">

        <Link
          href="/"
          className="mb-8 inline-block text-sm text-slate-400 hover:text-white"
        >
          ← Back to Home
        </Link>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-7 shadow-2xl">

          <div className="mb-7 text-center">
            <div className="mb-3 text-4xl">🛡️</div>

            <h1 className="text-3xl font-bold">
              {mode === "login" ? "Citizen Login" : "Create Account"}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {mode === "login"
                ? "Login to report and track civic issues."
                : "Register to submit civic complaints."}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`rounded-md py-2 text-sm font-medium ${
                mode === "login"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-300"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`rounded-md py-2 text-sm font-medium ${
                mode === "register"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-300"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === "register" && (
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Full Name
                </label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-slate-300">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">
                Phone Number
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-500 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              {mode === "login"
                ? "Login & Report Issue"
                : "Register & Report Issue"}
            </button>

          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Demo authentication for hackathon MVP
          </p>
        </div>
      </div>
    </main>
  );
}