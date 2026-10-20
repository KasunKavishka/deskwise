import { NextResponse } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { normalizeUsername, profileFromAuthUser, usernameToEmail } from "@/lib/supabase/profiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!getSupabasePublicConfig()) {
    return NextResponse.json({ ok: false, message: "Authentication is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { username?: unknown; password?: unknown };
    const username = normalizeUsername(body.username);
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json({ ok: false, message: "Enter a valid username and password." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });

    if (error || !data.user) {
      return NextResponse.json({ ok: false, message: "Invalid username or password." }, { status: 401 });
    }

    const profile = profileFromAuthUser(data.user);
    if (!profile) {
      await supabase.auth.signOut();
      return NextResponse.json({ ok: false, message: "This account is not authorized for Deskwise." }, { status: 403 });
    }

    return NextResponse.json({ ok: true, user: profile });
  } catch (error) {
    console.error("Unable to sign in to Deskwise.", error);
    return NextResponse.json({ ok: false, message: "Unable to sign in right now." }, { status: 503 });
  }
}
