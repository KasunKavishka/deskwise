import { NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listDeskwiseProfiles } from "@/lib/supabase/admin-users";
import { getSupabaseAdminConfig } from "@/lib/supabase/config";
import { getDashboard, getLocalToday, isCalendarDate, reservationFromRecord, type ReservationRecord } from "@/lib/deskwise-store";

export async function GET(request: NextRequest) {
  if (!getSupabaseAdminConfig()) {
    return Response.json({ ok: false, message: "Dashboard authentication is not configured." }, { status: 503 });
  }

  const { profile } = await getCurrentProfile();
  if (!profile) {
    return Response.json({ ok: false, message: "Sign in to view the dashboard." }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date") ?? getLocalToday();
  if (!isCalendarDate(date)) {
    return Response.json({ ok: false, message: "Enter a valid date." }, { status: 400 });
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const [profiles, reservationsResult] = await Promise.all([
      listDeskwiseProfiles(adminClient),
      adminClient
        .from("reservations")
        .select("id,desk_id,user_id,booking_date,created_at")
        .eq("booking_date", date)
        .order("created_at", { ascending: true }),
    ]);
    if (reservationsResult.error) throw reservationsResult.error;

    const reservations = (reservationsResult.data as ReservationRecord[]).map(reservationFromRecord);
    const data = getDashboard(date, profiles, reservations);
    return Response.json({ ok: true, data });
  } catch (error) {
    console.error("Unable to load the Deskwise dashboard.", error);
    return Response.json({ ok: false, message: "Unable to load the dashboard." }, { status: 503 });
  }
}
