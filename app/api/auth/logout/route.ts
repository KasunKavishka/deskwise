import { NextResponse } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  if (!getSupabasePublicConfig()) {
    return NextResponse.json({ ok: false, message: "Authentication is not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Unable to sign out of Deskwise.", error);
    return NextResponse.json({ ok: false, message: "Unable to sign out right now." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
