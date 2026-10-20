import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminConfig } from "./config";

export function createSupabaseAdminClient() {
  const config = getSupabaseAdminConfig();
  if (!config) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
