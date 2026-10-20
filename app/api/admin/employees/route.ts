import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAdminConfig } from "@/lib/supabase/config";
import {
  normalizeUsername,
  profileFromAuthUser,
  usernameToEmail,
} from "@/lib/supabase/profiles";

export async function POST(request: Request) {
  if (!getSupabaseAdminConfig()) {
    return NextResponse.json({ ok: false, message: "Account management is not configured." }, { status: 503 });
  }

  try {
    const { profile: currentUser } = await getCurrentProfile();
    if (!currentUser) {
      return NextResponse.json({ ok: false, message: "Sign in to continue." }, { status: 401 });
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json({ ok: false, message: "Only an admin can create employee accounts." }, { status: 403 });
    }

    const body = (await request.json()) as {
      username?: unknown;
      fullName?: unknown;
      password?: unknown;
    };
    const username = normalizeUsername(body.username);
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || fullName.length < 2 || password.length < 12) {
      return NextResponse.json(
        { ok: false, message: "Use a valid username, a name, and a password with at least 12 characters." },
        { status: 400 },
      );
    }

    const { data, error } = await createSupabaseAdminClient().auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username, full_name: fullName },
      app_metadata: { username, role: "employee" },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { ok: false, message: error?.message ?? "Unable to create the employee account." },
        { status: 400 },
      );
    }

    const employee = profileFromAuthUser(data.user);
    if (!employee) {
      return NextResponse.json({ ok: false, message: "The new account could not be loaded." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, employee });
  } catch (error) {
    console.error("Unable to create a Deskwise employee account.", error);
    return NextResponse.json({ ok: false, message: "Unable to create the employee account." }, { status: 503 });
  }
}
