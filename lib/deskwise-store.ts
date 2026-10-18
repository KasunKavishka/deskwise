export type ProfileRole = "employee" | "admin";

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  role: ProfileRole;
};

export type Desk = {
  id: string;
  label: string;
  deviceId: string;
  floor: string;
  x: number;
  y: number;
  active: boolean;
  createdAt: string;
};

export type Reservation = {
  id: string;
  deskId: string;
  userId: string;
  bookingDate: string;
  createdAt: string;
};

export type PresenceState = "not_checked_in" | "at_desk" | "temporarily_away";

export type DeskPresence = {
  deskId: string;
  state: PresenceState;
  updatedAt: string;
  lastEventId: string;
};

export type DashboardSummary = {
  totalActiveDesks: number;
  availableDesks: number;
  reservedDesks: number;
  currentEmployeeReservation?: Reservation;
};

export type DashboardData = {
  date: string;
  profiles: Profile[];
  desks: Desk[];
  reservations: Reservation[];
  presence: DeskPresence[];
  summary: DashboardSummary;
};

const profiles: Profile[] = [
  {
    id: "user-emp-1",
    fullName: "Lahiru Perera",
    email: "lahiru@deskwise.app",
    role: "employee",
  },
  {
    id: "user-emp-2",
    fullName: "Anushka Silva",
    email: "anushka@deskwise.app",
    role: "employee",
  },
  {
    id: "user-emp-3",
    fullName: "Nuwin Jayawardena",
    email: "nuwin@deskwise.app",
    role: "employee",
  },
  {
    id: "user-admin-1",
    fullName: "Nimali Fernando",
    email: "nimali@deskwise.app",
    role: "admin",
  },
];

const desks: Desk[] = [
  {
    id: "desk-01",
    label: "D-01",
    deviceId: "ESP32-001",
    floor: "Office",
    x: 10,
    y: 20,
    active: true,
    createdAt: "2025-01-11T08:30:00.000Z",
  },
  {
    id: "desk-02",
    label: "D-02",
    deviceId: "ESP32-002",
    floor: "Office",
    x: 30,
    y: 20,
    active: true,
    createdAt: "2025-01-11T08:35:00.000Z",
  },
  {
    id: "desk-03",
    label: "D-03",
    deviceId: "ESP32-003",
    floor: "Office",
    x: 50,
    y: 20,
    active: true,
    createdAt: "2025-01-11T08:40:00.000Z",
  },
  {
    id: "desk-04",
    label: "D-04",
    deviceId: "ESP32-004",
    floor: "Office",
    x: 70,
    y: 20,
    active: true,
    createdAt: "2025-01-11T08:45:00.000Z",
  },
];

const reservationStore: Reservation[] = [
  {
    id: "res-01",
    deskId: "desk-01",
    userId: "user-emp-1",
    bookingDate: getLocalDateForOffset(0),
    createdAt: new Date().toISOString(),
  },
  {
    id: "res-02",
    deskId: "desk-03",
    userId: "user-emp-2",
    bookingDate: getLocalDateForOffset(0),
    createdAt: new Date().toISOString(),
  },
  {
    id: "res-03",
    deskId: "desk-04",
    userId: "user-admin-1",
    bookingDate: getLocalDateForOffset(1),
    createdAt: new Date().toISOString(),
  },
];

const presenceStore: DeskPresence[] = [
  { deskId: "desk-01", state: "at_desk", updatedAt: new Date().toISOString(), lastEventId: "event-1" },
  { deskId: "desk-03", state: "temporarily_away", updatedAt: new Date().toISOString(), lastEventId: "event-2" },
  { deskId: "desk-04", state: "not_checked_in", updatedAt: new Date().toISOString(), lastEventId: "event-3" },
];

export function getLocalDateForOffset(offsetDays: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getLocalToday(): string {
  return getLocalDateForOffset(0);
}

export function getDashboard(date: string): DashboardData {
  const targetDate = date || getLocalToday();
  const reservationsForDate = reservationStore.filter((item) => item.bookingDate === targetDate);
  const activeDesks = desks.filter((desk) => desk.active);
  const summary: DashboardSummary = {
    totalActiveDesks: activeDesks.length,
    availableDesks: activeDesks.filter((desk) => !reservationsForDate.some((reservation) => reservation.deskId === desk.id)).length,
    reservedDesks: activeDesks.filter((desk) => reservationsForDate.some((reservation) => reservation.deskId === desk.id)).length,
    currentEmployeeReservation: reservationsForDate[0],
  };

  return {
    date: targetDate,
    profiles,
    desks,
    reservations: reservationsForDate,
    presence: presenceStore,
    summary,
  };
}

export function reserveDesk({
  deskId,
  userId,
  bookingDate,
}: {
  deskId: string;
  userId: string;
  bookingDate: string;
}): Reservation {
  const desk = desks.find((item) => item.id === deskId);

  if (!desk || !desk.active) {
    throw new Error("Selected desk is unavailable.");
  }

  const normalizedDate = bookingDate || getLocalToday();
  const reservationExists = reservationStore.some(
    (item) => item.deskId === deskId && item.bookingDate === normalizedDate,
  );

  if (reservationExists) {
    throw new Error("This desk has already been booked for the selected date.");
  }

  const selectedDate = new Date(`${normalizedDate}T00:00:00+05:30`);
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" }));
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    throw new Error("Bookings cannot be placed for past dates.");
  }

  const reservation: Reservation = {
    id: `res-${Date.now()}`,
    deskId,
    userId,
    bookingDate: normalizedDate,
    createdAt: new Date().toISOString(),
  };

  reservationStore.push(reservation);
  return reservation;
}

export function cancelReservation({
  reservationId,
  userId,
  role,
}: {
  reservationId: string;
  userId: string;
  role: ProfileRole;
}): Reservation {
  const reservationIndex = reservationStore.findIndex((reservation) => reservation.id === reservationId);

  if (reservationIndex === -1) {
    throw new Error("Reservation was not found.");
  }

  const reservation = reservationStore[reservationIndex];

  if (role !== "admin" && reservation.userId !== userId) {
    throw new Error("You can only cancel your own reservation.");
  }

  reservationStore.splice(reservationIndex, 1);
  return reservation;
}

export function getProfileById(userId: string): Profile | undefined {
  return profiles.find((profile) => profile.id === userId);
}

export function getDeskStatus(deskId: string, bookingDate: string): "available" | "reserved" | "mine" {
  const reservation = reservationStore.find(
    (item) => item.deskId === deskId && item.bookingDate === bookingDate,
  );

  if (!reservation) {
    return "available";
  }

  return reservation.userId === "user-emp-1" ? "mine" : "reserved";
}
