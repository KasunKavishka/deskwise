"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthScreen } from "@/components/auth-screen";
import { AccountSettings } from "@/components/account-settings";
import { EmployeeAccountForm } from "@/components/employee-account-form";
import type { DashboardData, Desk, Profile, Reservation } from "@/lib/deskwise-store";

const navigation = [
  { label: "Dashboard" },
  { label: "Reservations" },
  { label: "Employees" },
  { label: "Desks" },
  { label: "Settings" },
] as const;

type Section = (typeof navigation)[number]["label"];

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  }).format(new Date(`${value}T00:00:00+05:30`));
}

function getDefaultDateValue() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("Dashboard");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [authLoaded, setAuthLoaded] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSelectedDate(getDefaultDateValue());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let isMounted = true;
    void fetch("/api/auth/session")
      .then(async (response) => {
        const payload = (await response.json()) as {
          configured?: boolean;
          needsAdminSetup?: boolean;
          user?: Profile | null;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to check the sign-in session.");
        }

        if (!isMounted) return;
        setAuthConfigured(payload.configured === true);
        setNeedsAdminSetup(payload.needsAdminSetup === true);
        if (payload.user) {
          setCurrentUser(payload.user);
          setSelectedUserId(payload.user.id);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setToast({
            kind: "error",
            message: error instanceof Error ? error.message : "Unable to check the sign-in session.",
          });
        }
      })
      .finally(() => {
        if (isMounted) setAuthLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchDashboard = async (dateValue: string) => {
    const response = await fetch(`/api/dashboard?date=${dateValue}`);
    const payload = (await response.json()) as { data?: DashboardData; message?: string };
    if (!response.ok || !payload.data) {
      throw new Error(payload.message ?? "Unable to load the dashboard.");
    }
    setDashboard(payload.data);
  };

  useEffect(() => {
    if (!selectedDate || !currentUser) return;
    let isMounted = true;

    void fetch(`/api/dashboard?date=${selectedDate}`)
      .then(async (response) => {
        const payload = (await response.json()) as { data?: DashboardData; message?: string };
        if (!response.ok || !payload.data) {
          throw new Error(payload.message ?? "Unable to load the dashboard.");
        }
        if (isMounted) setDashboard(payload.data);
      })
      .catch((error) => {
        if (isMounted) {
          setToast({
            kind: "error",
            message: error instanceof Error ? error.message : "Unable to load the dashboard.",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, currentUser]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const reservationMap = useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const reservation of dashboard?.reservations ?? []) {
      map.set(reservation.deskId, reservation);
    }
    return map;
  }, [dashboard]);

  const currentUserReservation = useMemo(
    () => (dashboard?.reservations ?? []).find((reservation) => reservation.userId === selectedUserId),
    [dashboard, selectedUserId],
  );

  const handleReserve = async (deskId: string) => {
    if (!dashboard || !currentUser) return;
    setIsBusy(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deskId,
          bookingDate: selectedDate,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message ?? "Reservation failed.");
      }

      setToast({ kind: "success", message: "Desk reserved successfully." });
      await fetchDashboard(selectedDate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reservation failed.";
      setToast({ kind: "error", message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancel = async (reservationId: string) => {
    if (!currentUser) return;
    setIsBusy(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message ?? "Unable to cancel reservation.");
      }

      setToast({ kind: "success", message: "Reservation cancelled." });
      await fetchDashboard(selectedDate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cancellation failed.";
      setToast({ kind: "error", message });
    } finally {
      setIsBusy(false);
    }
  };

  const summaryCards = [
    { label: "Total active desks", value: dashboard?.summary.totalActiveDesks ?? 0, accent: "bg-slate-900" },
    { label: "Available desks", value: dashboard?.summary.availableDesks ?? 0, accent: "bg-emerald-500" },
    { label: "Reserved desks", value: dashboard?.summary.reservedDesks ?? 0, accent: "bg-blue-500" },
    { label: "My booking", value: currentUserReservation ? "Booked" : "Open", accent: "bg-amber-500" },
  ];

  const handleAuthenticated = (profile: Profile) => {
    setCurrentUser(profile);
    setSelectedUserId(profile.id);
    setAuthConfigured(true);
    setNeedsAdminSetup(false);
    setDashboard(null);
  };

  const handleLogout = async () => {
    setIsBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? "Unable to sign out.");
      }

      setCurrentUser(null);
      setSelectedUserId("");
      setDashboard(null);
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to sign out.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleEmployeeCreated = (employee: Profile) => {
    setDashboard((previous) =>
      previous
        ? { ...previous, profiles: [...previous.profiles, employee] }
        : previous,
    );
    setToast({ kind: "success", message: `Login created for ${employee.fullName}.` });
  };

  if (!authLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6fb] text-sm text-slate-500">
        Checking sign-in…
      </main>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthScreen
          configured={authConfigured}
          needsAdminSetup={needsAdminSetup}
          onAuthenticated={handleAuthenticated}
        />
        {toast && (
          <div role="alert" className="fixed bottom-5 right-5 z-50 rounded-2xl bg-white px-4 py-3 text-sm text-red-600 shadow-lg">
            {toast.message}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-72 border-r border-slate-200 bg-white px-6 py-7 lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f172a] text-sm font-semibold text-white">
              D
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Deskwise</p>
              <h1 className="text-xl font-semibold text-slate-900">Office flow</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveSection(item.label)}
                aria-current={activeSection === item.label ? "page" : undefined}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  activeSection === item.label
                    ? "bg-[#edf4ff] text-[#102a63]"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <span>{item.label}</span>
                {activeSection === item.label && <span className="h-2 w-2 rounded-full bg-[#2d6df6]" />}
              </button>
            ))}
          </nav>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Presence</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Device integration</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Not connected</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Smart office seat booking</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{activeSection}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{currentUser.fullName}</span>
                <span className="ml-2 text-slate-500">({currentUser.role})</span>
              </div>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleLogout()}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Log out
              </button>
            </div>
          </header>

          <nav aria-label="Main navigation" className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:hidden">
            {navigation.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveSection(item.label)}
                aria-current={activeSection === item.label ? "page" : undefined}
                className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium ${
                  activeSection === item.label
                    ? "bg-[#edf4ff] text-[#102a63]"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {activeSection === "Dashboard" && <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <span className={`h-2.5 w-2.5 rounded-full ${card.accent}`} />
                </div>
                <p className="text-3xl font-semibold text-slate-900">{card.value}</p>
              </div>
            ))}
          </section>}

          {(activeSection === "Dashboard" || activeSection === "Desks") && <section className={`mb-6 grid gap-4 ${activeSection === "Dashboard" ? "xl:grid-cols-[1.55fr_0.95fr]" : ""}`}>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">{activeSection === "Dashboard" ? "Availability overview" : "Desk inventory"}</p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {dashboard ? formatDateLabel(dashboard.date) : "Loading date"}
                  </h3>
                </div>

                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span>Select date</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none"
                  />
                </label>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f9fc] p-4">
                <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
                  <span>Office seats</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {(dashboard?.desks ?? []).map((desk: Desk) => {
                    const reservation = reservationMap.get(desk.id);
                    const isMine = reservation?.userId === selectedUserId;
                    const reservedBy = dashboard?.profiles.find((profile: Profile) => profile.id === reservation?.userId);

                    const deskClasses = desk.active
                      ? reservation
                        ? isMine
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-slate-100"
                        : "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-slate-200 text-slate-500";

                    return (
                      <div key={desk.id} className={`rounded-2xl border p-3 shadow-sm ${deskClasses}`}>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{desk.label}</span>
                          <span className={`h-2 w-2 rounded-full ${reservation ? (isMine ? "bg-blue-500" : "bg-slate-400") : "bg-emerald-500"}`} />
                        </div>

                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-slate-800">{desk.floor}</p>
                          <p className="text-slate-600">
                            {reservation ? (reservedBy ? reservedBy.fullName : "Reserved") : "Available"}
                          </p>
                          <p className="text-xs text-slate-500">{desk.active ? "Desk active" : "Desk inactive"}</p>
                        </div>

                        <div className="mt-4">
                          {reservation ? (
                            isMine || currentUser.role === "admin" ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleCancel(reservation.id)}
                                className="w-full rounded-xl border border-blue-200 bg-blue-100 px-2 py-2 text-xs font-semibold text-blue-700"
                              >
                                {isMine ? "Cancel my booking" : "Cancel booking"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-200 px-2 py-2 text-xs font-semibold text-slate-500"
                              >
                                Booked by {reservedBy?.fullName ?? "another employee"}
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              disabled={!desk.active || isBusy}
                              onClick={() => handleReserve(desk.id)}
                              className="w-full rounded-xl bg-emerald-600 px-2 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              Reserve seat
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {activeSection === "Dashboard" && <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Desk legend</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    Available
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-slate-400" />
                    Reserved by others
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />
                    Your booking
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    Temporarily away
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-800">Desk presence is not connected</p>
                <p className="mt-2 text-sm text-slate-500">
                  Reservations are available. Connect desk devices to show live occupancy here.
                </p>
              </div>
            </div>}
          </section>}

          {(activeSection === "Dashboard" || activeSection === "Reservations" || activeSection === "Employees") && <section className={`grid gap-4 ${activeSection === "Dashboard" ? "xl:grid-cols-[1.2fr_0.8fr]" : ""}`}>
            {(activeSection === "Dashboard" || activeSection === "Reservations") && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Reservation list</h3>
                  {activeSection === "Reservations" && (
                    <p className="mt-1 text-sm text-slate-500">{selectedDate ? formatDateLabel(selectedDate) : "Select a date"}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeSection === "Reservations" && (
                    <label className="sr-only" htmlFor="reservation-date">Reservation date</label>
                  )}
                  {activeSection === "Reservations" && (
                    <input
                      id="reservation-date"
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      aria-label="Reservation date"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
                    />
                  )}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {dashboard?.reservations.length ?? 0} reservations
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {(dashboard?.reservations ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No reservations for the selected date.
                  </div>
                ) : (
                  (dashboard?.reservations ?? []).map((reservation: Reservation) => {
                    const desk = dashboard?.desks.find((candidate: Desk) => candidate.id === reservation.deskId);
                    const profile = dashboard?.profiles.find((candidate: Profile) => candidate.id === reservation.userId);

                    return (
                      <div key={reservation.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">{desk?.label ?? "Desk"}</p>
                          <p className="text-sm text-slate-500">
                            {profile?.fullName ?? "Employee"} · {desk?.floor ?? "Office floor"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Booked</p>
                          {(reservation.userId === selectedUserId || currentUser.role === "admin") && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleCancel(reservation.id)}
                              className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
                            >
                              {currentUser.role === "admin" && reservation.userId !== selectedUserId ? "Cancel booking" : "Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>}

            {(activeSection === "Dashboard" || activeSection === "Employees") && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Employees</h3>
                  <p className="mt-1 text-sm text-slate-500">{dashboard?.profiles.length ?? 0} accounts</p>
                </div>
                {activeSection === "Dashboard" && (
                  <button type="button" onClick={() => setActiveSection("Employees")} className="text-sm font-medium text-blue-700 hover:text-blue-900">
                    Manage
                  </button>
                )}
              </div>
              {currentUser.role === "admin" && <EmployeeAccountForm onCreated={handleEmployeeCreated} />}
              <div className="mt-4 space-y-3">
                {(dashboard?.profiles ?? []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Employee accounts are not available yet.
                  </p>
                ) : (
                  (dashboard?.profiles ?? []).map((profile: Profile) => (
                    <div key={profile.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <div>
                        <p className="font-medium text-slate-800">{profile.fullName}</p>
                        <p className="text-xs text-slate-500">{profile.role}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${
                        profile.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {profile.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>}
          </section>}

          {activeSection === "Settings" && (
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Account</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Name</dt>
                    <dd className="font-medium text-slate-800">{currentUser.fullName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Username</dt>
                    <dd className="font-medium text-slate-800">{currentUser.username}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Role</dt>
                    <dd className="font-medium capitalize text-slate-800">{currentUser.role}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Office time zone</dt>
                    <dd className="font-medium text-slate-800">Asia/Colombo</dd>
                  </div>
                </dl>
              </div>
              <AccountSettings onToast={setToast} />
            </section>
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <p className={`text-sm font-medium ${toast.kind === "success" ? "text-emerald-600" : "text-red-600"}`}>
            {toast.message}
          </p>
        </div>
      )}
    </div>
  );
}
