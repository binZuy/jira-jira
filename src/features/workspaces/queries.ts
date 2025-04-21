import { createClient } from "@/lib/supabase/server";

interface Member {
  workspaceId: string | null;
}

export const getWorkspaces = async () => {
  const supabase = await createClient();

  // Get the current logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return [];
  }

  // Fetch the members related to the user
  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("workspaceId")
    .eq("userId", user.id);

  if (membersError || !members || members.length === 0) {
    return [];
  }

  // Get the workspace IDs of the current user
  const workspaceIds = members
    .map((member: Member) => member.workspaceId)
    .filter((id): id is string => id !== null);
  // Fetch the workspaces related to the user by the workspaceIds
  const { data: workspaces, error: workspacesError } = await supabase
    .from("workspaces")
    .select("*")
    .in("id", workspaceIds)
    .order("created_at", { ascending: false });
  if (workspacesError) {
    return [];
  }

  return workspaces;
};
