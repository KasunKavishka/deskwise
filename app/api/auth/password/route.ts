import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/supabase/auth";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (!getSupabasePublicConfig()) {
    return NextResponse.json({ ok: false, message: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (newPassword.length < 12) {
      return NextResponse.json(
        { ok: false, message: "The new password must be at least 12 characters." },
        { status: 400 },
      );
    }
    if (!currentPassword || currentPassword === newPassword) {
      return NextResponse.json(
        { ok: false, message: "Enter your current password and choose a different new password." },
        { status: 400 },
      );
    }

    const { profile, supabase } = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ ok: false, message: "Sign in to change your password." }, { status: 401 });
    }

    const { error: verificationError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });
    if (verificationError) {
      return NextResponse.json({ ok: false, message: "Your current password is incorrect." }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      console.error("Unable to update the Deskwise account password.", updateError);
      return NextResponse.json({ ok: false, message: "Unable to update the password." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to change the Deskwise account password.", error);
    return NextResponse.json({ ok: false, message: "Unable to update the password right now." }, { status: 503 });
  }
}
