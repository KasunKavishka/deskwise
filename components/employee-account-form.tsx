"use client";

import { useState, type FormEvent } from "react";

import type { Profile } from "@/lib/deskwise-store";

type EmployeeAccountFormProps = {
  onCreated: (employee: Profile) => void;
};

export function EmployeeAccountForm({ onCreated }: EmployeeAccountFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        employee?: Profile;
        message?: string;
      };

      if (!response.ok || payload.ok !== true || !payload.employee) {
        throw new Error(payload.message ?? "Unable to create the employee account.");
      }

      form.reset();
      onCreated(payload.employee);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to create the employee account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-800">Create employee login</p>
      <label className="block space-y-1 text-xs font-medium text-slate-600">
        Employee name
        <input
          name="fullName"
          type="text"
          minLength={2}
          autoComplete="name"
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
      </label>
      <label className="block space-y-1 text-xs font-medium text-slate-600">
        Username
        <input
          name="username"
          type="text"
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}"
          autoComplete="off"
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
      </label>
      <label className="block space-y-1 text-xs font-medium text-slate-600">
        Temporary password to give employee
        <input
          name="password"
          type="password"
          minLength={12}
          autoComplete="new-password"
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Creating account…" : "Create employee account"}
      </button>
      <p className="text-xs leading-relaxed text-slate-500">
        Share this password with the employee securely. Deskwise won’t display it again.
      </p>
    </form>
  );
}
