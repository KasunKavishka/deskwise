import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { listDeskwiseProfiles } from "@/lib/supabase/admin-users";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAdminConfig } from "@/lib/supabase/config";
import {
  normalizeUsername,
  profileFromAuthUser,
  usernameToEmail,
} from "@/lib/supabase/profiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function matchesSetupSecret(provided: unknown, expected: string | undefined) {
  if (typeof provided !== "string" || !expected) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

export async function POST(request: Request) {
  const adminConfig = getSupabaseAdminConfig();
  const setupSecret = process.env.ADMIN_SETUP_SECRET;
  if (!adminConfig || !setupSecret) {
    return NextResponse.json({ ok: false, message: "Admin setup is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      setupSecret?: unknown;
      username?: unknown;
      fullName?: unknown;
      password?: unknown;
    };
    const username = normalizeUsername(body.username);
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!matchesSetupSecret(body.setupSecret, setupSecret)) {
      return NextResponse.json({ ok: false, message: "The admin setup code is not valid." }, { status: 403 });
    }
    if (!username || fullName.length < 2 || password.length < 12) {
      return NextResponse.json(
        { ok: false, message: "Use a valid username, a name, and a password with at least 12 characters." },
        { status: 400 },
      );
    }

    const adminClient = createSupabaseAdminClient();
    const profiles = await listDeskwiseProfiles(adminClient);
    if (profiles.some((profile) => profile.role === "admin")) {
      return NextResponse.json({ ok: false, message: "The initial admin account has already been set up." }, { status: 409 });
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username, full_name: fullName },
      app_metadata: { username, role: "admin" },
    });

    if (error || !data.user) {
      console.error("Unable to create the initial Deskwise admin account.", error);
      return NextResponse.json({ ok: false, message: "Unable to create the initial admin account." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });

    if (signInError || !signInData.user) {
      return NextResponse.json({ ok: true, needsLogin: true });
    }

    const profile = profileFromAuthUser(signInData.user);
    if (!profile) {
      return NextResponse.json({ ok: false, message: "The admin account was created but could not be loaded." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user: profile });
  } catch (error) {
    console.error("Unable to complete Deskwise admin setup.", error);
    return NextResponse.json({ ok: false, message: "Unable to complete admin setup." }, { status: 503 });
  }
}
