import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { supabaseMiddleware } from "@/lib/supabase-middleware";
// import { getMember } from "@/features/members/utils";

import { Query } from "node-appwrite";
import { Member, MemberRole } from "../types";

const app = new Hono()
  .use("*", supabaseMiddleware())
  // .get(
  //   "/",
  //   zValidator(
  //     "query",
  //     z.object({
  //       workspaceId: z.string(),
  //     })
  //   ),
  //   async (c) => {
  //     const { users } = await createAdminClient();
  //     const databases = c.get("databases");
  //     const user = c.get("user");
  //     const { workspaceId } = c.req.valid("query");

  //     const member = await getMember({
  //       databases,
  //       workspaceId,
  //       userId: user.$id,
  //     });

  //     if (!member) {
  //       return c.json({ error: "Unauthorized" }, 401);
  //     }

  //     const members = await databases.listDocuments<Member>(DATABASE_ID, MEMBERS_ID, [
  //       Query.equal("workspaceId", workspaceId),
  //     ]);

  //     const populatedMembers = await Promise.all(
  //       members.documents.map(async (member) => {
  //         const user = await users.get(member.userId);

  //         return {
  //           ...member,
  //           name: user.name || user.email,
  //           email: user.email,
  //         };
  //       })
  //     );
  //     return c.json({
  //       data: {
  //         ...members,
  //         documents: populatedMembers,
  //       },
  //     });
  //   }
  // )
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
  
      // Fetch user details for each member
      const populatedMembers = await Promise.all(
        members.map(async (member) => {
          // Fetch user details using the userId from the member
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("name, email")
            .eq("id", member.userId)
            .single(); // Assuming there is a `users` table with `name` and `email`
  
          if (userError || !userData) {
            return { ...member, name: "Unknown", email: "Unknown" }; // Handle case where user details are missing
          }
  
          return {
            ...member,
            name: userData.name || userData.email,
            email: userData.email,
          };
        })
      );
  
      return c.json({
        data: {
          members: populatedMembers,
        },
      });
    }
  )
  // .delete("/:memberId", sessionMiddleware, async (c) => {
  //   const { memberId } = c.req.param();
  //   const user = c.get("user");
  //   const databases = c.get("databases");

  //   const memberToDelete = await databases.getDocument(
  //     DATABASE_ID,
  //     MEMBERS_ID,
  //     memberId
  //   );

  //   const allMembersInWorkspace = await databases.listDocuments(
  //     DATABASE_ID,
  //     MEMBERS_ID,
  //     [Query.equal("workspaceId", memberToDelete.workspaceId)]
  //   );

  //   const member = await getMember({
  //     databases,
  //     workspaceId: memberToDelete.workspaceId,
  //     userId: user.$id,
  //   });

  //   if (!member) {
  //     return c.json({ error: "Unauthorized" }, 401);
  //   }

  //   if (member.$id !== memberToDelete.$id && member.role !== MemberRole.ADMIN) {
  //     return c.json({ error: "Unauthorized" }, 401);
  //   }

  //   if (allMembersInWorkspace.total === 1) {
  //     return c.json({ error: "Cannot delete last member" }, 400);
  //   }

  //   await databases.deleteDocument(DATABASE_ID, MEMBERS_ID, memberId);

  //   return c.json({ data: { $id: memberToDelete.$id } });
  // })
  .delete("/:memberId", async (c) => {
    const supabase = c.get("supabase");
    const { memberId } = c.req.param();
    const user = c.get("user");
  
    // Fetch the member to delete
    const { data: memberToDelete, error: memberToDeleteError } = await supabase
      .from("members")
      .select("*")
      .eq("id", memberId)
      .single();
  
    if (memberToDeleteError || !memberToDelete) {
      return c.json({ error: "Member not found" }, 404);
    }
  
    // Fetch all members in the workspace
    const { data: allMembersInWorkspace, error: allMembersError } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", memberToDelete.workspaceId);
  
    if (allMembersError) {
      return c.json({ error: "Error fetching workspace members" }, 500);
    }
  
    // Check if the current user is a member of the workspace
    const { data: currentUserMember, error: currentUserMemberError } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", memberToDelete.workspaceId)
      .eq("userId", user.id)
      .single();
  
    if (currentUserMemberError || !currentUserMember) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    // Ensure the current user can only delete themselves or an admin can delete any member
    if (currentUserMember.id !== memberToDelete.id && currentUserMember.role !== "ADMIN") {
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
      .eq("id", memberId);
  
    if (deleteError) {
      return c.json({ error: deleteError.message }, 500);
    }
  
    // Return the deleted member's ID
    return c.json({ data: { id: memberToDelete.id } });
  })  
  // .patch(
  //   "/:memberId",
  //   sessionMiddleware,
  //   zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
  //   async (c) => {
  //       const { memberId } = c.req.param();
  //       const { role } = c.req.valid("json");
  //       const user = c.get("user");
  //       const databases = c.get("databases");
    
  //       const memberToUpdate = await databases.getDocument(
  //         DATABASE_ID,
  //         MEMBERS_ID,
  //         memberId
  //       );
    
  //       const allMembersInWorkspace = await databases.listDocuments(
  //         DATABASE_ID,
  //         MEMBERS_ID,
  //         [Query.equal("workspaceId", memberToUpdate.workspaceId)]
  //       );
    
  //       const member = await getMember({
  //         databases,
  //         workspaceId: memberToUpdate.workspaceId,
  //         userId: user.$id,
  //       });
    
  //       if (!member) {
  //         return c.json({ error: "Unauthorized" }, 401);
  //       }
    
  //       if ( member.role !== MemberRole.ADMIN) {
  //         return c.json({ error: "Unauthorized" }, 401);
  //       }
    
  //       if (allMembersInWorkspace.total === 1) {
  //         return c.json({ error: "Cannot downgradelast member" }, 400);
  //       }
    
  //       await databases.updateDocument(DATABASE_ID, MEMBERS_ID, memberId,{ role});
    
  //       return c.json({ data: { $id: memberToUpdate.$id } });
  //     }
  // );
  .patch(
    "/:memberId",
    zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
    async (c) => {
      const supabase = c.get("supabase");
      const { memberId } = c.req.param();
      const { role } = c.req.valid("json");
      const user = c.get("user");
  
      // Fetch the member to update
      const { data: memberToUpdate, error: memberToUpdateError } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .single();
  
      if (memberToUpdateError || !memberToUpdate) {
        return c.json({ error: "Member not found" }, 404);
      }
  
      // Fetch all members in the workspace
      const { data: allMembersInWorkspace, error: allMembersError } = await supabase
        .from("members")
        .select("*")
        .eq("workspaceId", memberToUpdate.workspaceId);
  
      if (allMembersError) {
        return c.json({ error: "Error fetching workspace members" }, 500);
      }
  
      // Check if the current user is a member of the workspace
      const { data: currentUserMember, error: currentUserMemberError } = await supabase
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
      if (allMembersInWorkspace.length === 1 && memberToUpdate.role === MemberRole.ADMIN) {
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
