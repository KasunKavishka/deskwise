import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAdminConfig } from "@/lib/supabase/config";
import {
  getActiveDesk,
  reservationFromRecord,
  validateBookingDate,
  type ReservationRecord,
} from "@/lib/deskwise-store";

export async function POST(request: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json({ ok: false, message: "Reservation authentication is not configured." }, { status: 503 });
  }

  try {
    const { profile } = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ ok: false, message: "Sign in to reserve a desk." }, { status: 401 });
    }

    const body = (await request.json()) as { deskId?: unknown; bookingDate?: unknown };
    if (typeof body.deskId !== "string" || typeof body.bookingDate !== "string") {
      return NextResponse.json({ ok: false, message: "Desk and booking date are required." }, { status: 400 });
    }

    if (!getActiveDesk(body.deskId)) {
      return NextResponse.json({ ok: false, message: "Selected desk is unavailable." }, { status: 400 });
    }

    const bookingDate = validateBookingDate(body.bookingDate);
    const { data, error } = await createSupabaseAdminClient()
      .from("reservations")
      .insert({
        desk_id: body.deskId,
        user_id: profile.id,
        booking_date: bookingDate,
      })
      .select("id,desk_id,user_id,booking_date,created_at")
      .single();

    if (error?.code === "23505") {
      return NextResponse.json(
        { ok: false, message: "This desk has already been booked for the selected date." },
        { status: 409 },
      );
    }
    if (error || !data) {
      console.error("Unable to save the Deskwise reservation.", error);
      return NextResponse.json({ ok: false, message: "Unable to save the reservation." }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      reservation: reservationFromRecord(data as ReservationRecord),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create reservation.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json({ ok: false, message: "Reservation authentication is not configured." }, { status: 503 });
  }

  try {
    const { profile } = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ ok: false, message: "Sign in to cancel a reservation." }, { status: 401 });
    }

    const body = (await request.json()) as { reservationId?: unknown };
    if (typeof body.reservationId !== "string" || !body.reservationId) {
      return NextResponse.json({ ok: false, message: "Reservation ID is required." }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("reservations")
      .select("id,desk_id,user_id,booking_date,created_at")
      .eq("id", body.reservationId)
      .maybeSingle();

    if (error) {
      console.error("Unable to load the Deskwise reservation.", error);
      return NextResponse.json({ ok: false, message: "Unable to load the reservation." }, { status: 503 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, message: "Reservation was not found." }, { status: 404 });
    }
    if (profile.role !== "admin" && data.user_id !== profile.id) {
      return NextResponse.json({ ok: false, message: "You can only cancel your own reservation." }, { status: 403 });
    }

    const { error: deleteError } = await adminClient
      .from("reservations")
      .delete()
      .eq("id", body.reservationId);

    if (deleteError) {
      console.error("Unable to cancel the Deskwise reservation.", deleteError);
      return NextResponse.json({ ok: false, message: "Unable to cancel the reservation." }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      reservation: reservationFromRecord(data as ReservationRecord),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel reservation.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
