import { createClient } from "@/lib/supabase/client";

// Define the Member interface
interface Member {
  workspaceId: string; // Adjust the type if necessary
  // Add other properties if needed
}

export const getWorkspaces = async () => {
  const supabase = await createClient();

  // Get the current logged-in user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  // console.log(user);
  if (userError || !user) {
    return [];
  }

  // Fetch the members related to the user
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('workspaceId')
    .eq('userId', user.id);

  if (membersError || !members || members.length === 0) {
    return [];
  }

  // Get the workspace IDs of the current user
  const workspaceIds = members.map((member: Member) => member.workspaceId);

  // Fetch the workspaces related to the user by the workspaceIds
  const { data: workspaces, error: workspacesError, count } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact' })
    .in('id', workspaceIds)
    .order('createdAt', { ascending: false });

  if (workspacesError) {
    return [];
  }

  return workspaces;
};
