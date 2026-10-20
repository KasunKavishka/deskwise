import type { SupabaseClient } from "@supabase/supabase-js";

import type { Profile } from "@/lib/deskwise-store";

import { profileFromAuthUser } from "./profiles";

export async function listDeskwiseProfiles(client: SupabaseClient): Promise<Profile[]> {
  const profiles: Profile[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Unable to load employee accounts: ${error.message}`);

    profiles.push(
      ...data.users
        .map(profileFromAuthUser)
        .filter((profile): profile is Profile => profile !== null),
    );

    if (data.users.length < 1000) return profiles;
    page += 1;
  }
}
