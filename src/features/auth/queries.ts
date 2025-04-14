import { createClient } from "@/lib/supabase/client";

export const getCurrent = async () => {
  try {
    const supabase = await createClient();
    return await supabase.auth.getUser();
  } catch {
    return { data: {user: null}};
  }
};
