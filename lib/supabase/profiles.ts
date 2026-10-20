import type { User } from "@supabase/supabase-js";

import type { Profile, ProfileRole } from "@/lib/deskwise-store";

export const USERNAME_EMAIL_DOMAIN = "login.deskwise.app";
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim().toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}

export function profileFromAuthUser(user: User): Profile | null {
  const role = user.app_metadata.role;
  const username =
    typeof user.app_metadata.username === "string"
      ? user.app_metadata.username
      : typeof user.user_metadata.username === "string"
        ? user.user_metadata.username
        : null;

  if ((role !== "admin" && role !== "employee") || !username) {
    return null;
  }

  const fullName =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : username;

  return {
    id: user.id,
    username,
    fullName,
    email: user.email ?? usernameToEmail(username),
    role: role as ProfileRole,
  };
}
