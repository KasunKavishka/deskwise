"use client";

import { useState, type FormEvent } from "react";

import type { Profile } from "@/lib/deskwise-store";

type AuthScreenProps = {
  configured: boolean;
  needsAdminSetup: boolean;
  onAuthenticated: (profile: Profile) => void;
};

type FormMode = "login" | "setup";

export function AuthScreen({ configured, needsAdminSetup, onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<FormMode>(needsAdminSetup ? "setup" : "login");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const endpoint = mode === "setup" ? "/api/auth/bootstrap" : "/api/auth/login";
    const body =
      mode === "setup"
        ? {
            setupSecret: formData.get("setupSecret"),
            username: formData.get("username"),
            fullName: formData.get("fullName"),
            password: formData.get("password"),
          }
        : {
            username: formData.get("username"),
            password: formData.get("password"),
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        user?: Profile;
        needsLogin?: boolean;
        message?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? "Unable to authenticate.");
      }

      if (payload.user) {
        onAuthenticated(payload.user);
        return;
      }

      if (payload.needsLogin) {
        setMode("login");
        setError("Admin account created. Sign in with the new username and password.");
        return;
      }

      throw new Error("Authentication completed without returning an account.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to authenticate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSetup = mode === "setup" && needsAdminSetup;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6fb] px-4 py-10 text-slate-800">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f172a] font-semibold text-white">D</div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Deskwise</p>
            <h1 className="text-xl font-semibold text-slate-900">Office flow</h1>
          </div>
        </div>

        {!configured ? (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <h2 className="font-semibold">Supabase is not configured</h2>
            <p className="mt-2">
              Set the Supabase project URL, publishable key, service-role key, and admin setup secret in the Vercel
              project settings, then redeploy.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500">{isSetup ? "Secure first-time setup" : "Sign in to your account"}</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              {isSetup ? "Create the fixed admin account" : "Welcome back"}
            </h2>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {isSetup && (
                <>
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    Admin setup secret
                    <input
                      name="setupSecret"
                      type="password"
                      minLength={32}
                      autoComplete="off"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-400"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    Admin name
                    <input
                      name="fullName"
                      type="text"
                      minLength={2}
                      autoComplete="name"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-400"
                    />
                  </label>
                </>
              )}

              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                Username
                <input
                  name="username"
                  type="text"
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}"
                  autoComplete="username"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-400"
                />
              </label>

              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                Password
                <input
                  name="password"
                  type="password"
                  minLength={isSetup ? 12 : undefined}
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-400"
                />
                {isSetup && <span className="block text-xs font-normal text-slate-500">Use at least 12 characters.</span>}
              </label>

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "Please wait…" : isSetup ? "Create admin account" : "Sign in"}
              </button>
            </form>

            {needsAdminSetup && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode(isSetup ? "login" : "setup");
                }}
                className="mt-4 w-full text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                {isSetup ? "Already set up? Sign in" : "Set up the first admin account"}
              </button>
            )}

            <p className="mt-5 text-xs leading-relaxed text-slate-500">
              {isSetup
                ? "This one-time setup is available only until the first admin account is created."
                : "Employees get their username and password from the office admin."}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
