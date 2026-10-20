import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { listDeskwiseProfiles } from "@/lib/supabase/admin-users";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAdminConfig } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/supabase/auth";

export async function GET() {
  const cookieStore = await cookies();
  const hasSupabaseSessionCookie = cookieStore.getAll().some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
  );

  if (!getSupabaseAdminConfig()) {
    return NextResponse.json({
      configured: false,
      needsAdminSetup: false,
      user: null,
      ...(hasSupabaseSessionCookie && { message: "Supabase session exists but server configuration is incomplete." }),
    });
  }

  try {
    const { profile } = await getCurrentProfile();
    if (profile) {
      return NextResponse.json({ configured: true, needsAdminSetup: false, user: profile });
    }

    const profiles = await listDeskwiseProfiles(createSupabaseAdminClient());
    return NextResponse.json({
      configured: true,
      needsAdminSetup: !profiles.some((candidate) => candidate.role === "admin"),
      user: null,
    });
  } catch (error) {
    console.error("Unable to load authentication session.", error);
    return NextResponse.json(
      { configured: true, needsAdminSetup: false, user: null, message: "Authentication is temporarily unavailable." },
      { status: 503 },
    );
  }
}
