export type ProfileRole = "employee" | "admin";

export type Profile = {
  id: string;
  username: string;
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

export type ReservationRecord = {
  id: string;
  desk_id: string;
  user_id: string;
  booking_date: string;
  created_at: string;
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
  summary: DashboardSummary;
};

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

export function getActiveDesk(deskId: string): Desk | undefined {
  const desk = desks.find((item) => item.id === deskId);
  return desk?.active ? desk : undefined;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateBookingDate(bookingDate: string): string {
  if (!isCalendarDate(bookingDate)) {
    throw new Error("Enter a valid booking date.");
  }

  if (bookingDate < getLocalToday()) {
    throw new Error("Bookings cannot be placed for past dates.");
  }

  return bookingDate;
}

export function reservationFromRecord(record: ReservationRecord): Reservation {
  return {
    id: record.id,
    deskId: record.desk_id,
    userId: record.user_id,
    bookingDate: record.booking_date,
    createdAt: record.created_at,
  };
}

export function getDashboard(date: string, profiles: Profile[], reservations: Reservation[]): DashboardData {
  const targetDate = date || getLocalToday();
  const reservationsForDate = reservations.filter((item) => item.bookingDate === targetDate);
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
    summary,
  };
}
