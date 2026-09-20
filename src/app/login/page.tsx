"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const OFFICE_HEAD_EMAIL = "potholewatch.officehead@gmail.com";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOfficeHead =
    email.trim().toLowerCase() === OFFICE_HEAD_EMAIL;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (!cleanEmail) {
        setError("Please enter your email.");
        return;
      }

      // OFFICE HEAD LOGIN
      if (isOfficeHead) {
        if (!password.trim()) {
          setError("Please enter the Office Head password.");
          return;
        }

        const { error: authError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (authError) {
          setError(authError.message);
          return;
        }

        const user = {
          name: "Office Head",
          email: cleanEmail,
          phone: phone.trim() || "Not provided",
          role: "office_head",
        };

        localStorage.setItem(
          "potholewatch_logged_in",
          "true"
        );

        localStorage.setItem(
          "potholewatch_current_user",
          JSON.stringify(user)
        );

        router.push("/dashboard");
        return;
      }

      // CITIZEN LOGIN
      // Make sure an old Office Head Supabase session
      // is not reused by a citizen.
      await supabase.auth.signOut();

      if (!phone.trim()) {
        setError("Please enter your phone number.");
        return;
      }

      if (mode === "register" && !name.trim()) {
        setError("Please enter your name.");
        return;
      }

      const user = {
        name: name.trim() || "Citizen",
        email: cleanEmail,
        phone: phone.trim(),
        role: "citizen",
      };

      localStorage.setItem(
        "potholewatch_logged_in",
        "true"
      );

      localStorage.setItem(
        "potholewatch_current_user",
        JSON.stringify(user)
      );

      router.push("/report");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-3xl font-bold text-slate-900"
          >
            PotholeWatch AI
          </Link>

          <p className="mt-2 text-sm text-slate-600">
            Detect. Verify. Prioritize. Resolve.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">

          {/* Login / Register */}
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
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
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Register
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* Name */}
            {mode === "register" && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-700"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-700"
              />
            </div>

            {/* Office Head */}
            {isOfficeHead && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm font-semibold text-blue-800">
                  🛡️ Office Head Account
                </p>

                <p className="mt-1 text-xs text-blue-700">
                  Authorized account for complaint status management.
                </p>
              </div>
            )}

            {/* Password */}
            {isOfficeHead && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Office Head Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter Office Head password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-700"
                />
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Phone Number
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                placeholder="Enter phone number"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-700"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading
                ? "Signing in..."
                : isOfficeHead
                ? "Login as Office Head"
                : mode === "login"
                ? "Login"
                : "Create Citizen Account"}
            </button>
          </form>

          {/* Demo information */}
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">
              Office Head access
            </p>

            <p className="mt-1 break-all text-xs text-slate-500">
              potholewatch.officehead@gmail.com
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Use the authorized Office Head password to enter the dashboard.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          PotholeWatch AI • Civic Governance & Clean Mysuru
        </p>
      </div>
    </main>
  );
}