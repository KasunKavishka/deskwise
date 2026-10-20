"use client";

import { useState, type FormEvent } from "react";

type AccountSettingsProps = {
  onToast: (toast: { kind: "success" | "error"; message: string }) => void;
};

export function AccountSettings({ onToast }: AccountSettingsProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.get("currentPassword"),
          newPassword: formData.get("newPassword"),
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? "Unable to update the password.");
      }

      form.reset();
      onToast({ kind: "success", message: "Password updated successfully." });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update the password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Change password</h3>
      <p className="mt-1 text-sm text-slate-500">Choose a password with at least 12 characters.</p>
      <div className="mt-4 space-y-3">
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-400"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          New password
          <input
            name="newPassword"
            type="password"
            minLength={12}
            autoComplete="new-password"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-400"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
