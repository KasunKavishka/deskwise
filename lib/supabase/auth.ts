import { createSupabaseServerClient } from "./server";
import { profileFromAuthUser } from "./profiles";

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  return {
    supabase,
    profile: error || !data.user ? null : profileFromAuthUser(data.user),
  };
}
