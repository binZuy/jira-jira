
// import { DATABASE_ID, MEMBERS_ID } from "@/config";

import { Database } from "@/lib/types/supabase";

interface GetMemberProps {
  supabase: Database
  workspaceId: string;
  userId: string;
}

export const getMember = async ({
  supabase,
  workspaceId,
  userId,
}: GetMemberProps) => {
  const { data: members, error } = await supabase
  .from("members")
  .select("*")
  .eq("workspaceId", workspaceId)  // Filter by workspaceId
  .eq("userId", userId);  // Filter by userId

if (error) {
  // Handle error (you can log the error or return an empty object)
  console.error("Error fetching member:", error.message);
  return null;  // Return null if there is an error
}

  return members;
};
