import { NextResponse } from "next/server";

import {
  cancelReservation,
  reserveDesk,
  type ProfileRole,
} from "@/lib/deskwise-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      deskId: string;
      userId: string;
      bookingDate: string;
    };

    const reservation = reserveDesk(body);
    return NextResponse.json({ ok: true, reservation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create reservation.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      reservationId: string;
      userId: string;
      role: ProfileRole;
    };

    const reservation = cancelReservation(body);
    return NextResponse.json({ ok: true, reservation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel reservation.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
