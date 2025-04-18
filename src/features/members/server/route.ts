import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { supabaseMiddleware } from "@/lib/supabase-middleware";
import { MemberRole } from "@/lib/types/enums";

const app = new Hono()
  .use("*", supabaseMiddleware())
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        workspaceId: z.string(),
      })
    ),
    async (c) => {
      const supabase = c.get("supabase");
      const user = c.get("user");
      const { workspaceId } = c.req.valid("query");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      // Check if the user is a member of the workspace
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("workspaceId", workspaceId)
        .eq("userId", user.id)
        .single();
      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Fetch all members of the workspace
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("*")
        .eq("workspaceId", workspaceId);
      if (membersError) {
        return c.json({ error: membersError.message }, 500);
      }

      return c.json({ data: members });
    }
  )
  .delete("/:memberId", async (c) => {
    const supabase = c.get("supabase");
    const { memberId } = c.req.param();
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Fetch the member to delete
    const { data: memberToDelete, error: memberToDeleteError } = await supabase
      .from("members")
      .select("id, workspaceId")
      .eq("userId", memberId)
      .single();

    if (memberToDeleteError || !memberToDelete) {
      return c.json({ error: "Member not found" }, 404);
    }

    // Fetch all members in the workspace
    const { data: allMembersInWorkspace, error: allMembersError } =
      await supabase
        .from("members")
        .select("*")
        .eq("workspaceId", memberToDelete.workspaceId);

    if (allMembersError) {
      return c.json({ error: "Error fetching workspace members" }, 500);
    }

    // Check if the current user is a member of the workspace
    const { data: currentUserMember } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", memberToDelete.workspaceId)
      .eq("userId", user.id)
      .single();

    // Ensure the current user can only delete themselves or an admin can delete any member
    if (
      currentUserMember.id !== memberToDelete.id &&
      currentUserMember.role !== MemberRole.ADMIN
    ) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Prevent deleting the last member in the workspace
    if (allMembersInWorkspace.length === 1) {
      return c.json({ error: "Cannot delete last member" }, 400);
    }

    // Delete the member
    const { error: deleteError } = await supabase
      .from("members")
      .delete()
      .eq("userId", memberId);

    if (deleteError) {
      return c.json({ error: deleteError.message }, 500);
    }

    // Return the deleted member's ID
    return c.json({ data: { id: memberToDelete.id } });
  })
  .patch(
    "/:memberId",
    zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
    async (c) => {
      const supabase = c.get("supabase");
      const { memberId } = c.req.param();
      const { role } = c.req.valid("json");
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Fetch the member to update
      const { data: memberToUpdate, error: memberToUpdateError } =
        await supabase
          .from("members")
          .select("id, workspaceId, role")
          .eq("userId", memberId)
          .single();

      if (memberToUpdateError || !memberToUpdate) {
        return c.json({ error: "Member not found" }, 404);
      }

      // Fetch all members in the workspace
      const { data: allMembersInWorkspace, error: allMembersError } =
        await supabase
          .from("members")
          .select("*")
          .eq("workspaceId", memberToUpdate.workspaceId);

      if (allMembersError) {
        return c.json({ error: "Error fetching workspace members" }, 500);
      }

      // Check if the current user is a member of the workspace
      const { data: currentUserMember, error: currentUserMemberError } =
        await supabase
          .from("members")
          .select("*")
          .eq("workspaceId", memberToUpdate.workspaceId)
          .eq("userId", user.id)
          .single();

      if (currentUserMemberError || !currentUserMember) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Ensure the current user is an admin
      if (currentUserMember.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Prevent downgrading the last admin member
      if (
        allMembersInWorkspace.length === 1 &&
        memberToUpdate.role === MemberRole.ADMIN
      ) {
        return c.json({ error: "Cannot downgrade the last admin" }, 400);
      }

      // Update the member's role
      const { error: updateError } = await supabase
        .from("members")
        .update({ role })
        .eq("id", memberId);

      if (updateError) {
        return c.json({ error: updateError.message }, 500);
      }

      // Return the updated member's ID
      return c.json({ data: { id: memberToUpdate.id } });
    }
  );

export default app;
