import { createClient } from "@/lib/supabase/client";

export const getWorkspaces = async () => {
  const supabase = await createClient();

  // Get the current logged-in user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { workspaces: [], total: 0 };
  }

  // Fetch the members related to the user
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('*')
    .eq('userId', user.id);

  if (membersError || !members || members.length === 0) {
    return { workspaces: [], total: 0 };
  }

  // Get the workspace IDs of the current user
  const workspaceIds = members.map((member) => member.workspaceId);

  // Fetch the workspaces related to the user by the workspaceIds
  const { data: workspaces, error: workspacesError, count } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact' })
    .in('id', workspaceIds)
    .order('createdAt', { ascending: false });

  if (workspacesError) {
    return { workspaces: [], total: 0 };
  }

  return workspaces;
};
