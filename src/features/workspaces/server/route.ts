import { Hono } from "hono";

import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { MemberRole } from "@/features/members/types";
// import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { supabaseMiddleware } from "@/lib/supabase-middleware";
import { generateID, generateInviteCode } from "@/lib/utils";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
// import { Workspace } from "../types";
// import { TaskStatus } from "@/features/tasks/types";

const app = new Hono()
  .use("*", supabaseMiddleware())
  .get("/", async (c) => {
    const user = c.get("user");
    const supabase = c.get("supabase");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("*")
      .eq("userId", user.id);

    if (membersError) {
      return c.json({ error: membersError.message }, 500);
    }
    if (members.length === 0) {
      return c.json({ data: { documents: [], total: 0 } });
    }

    const { data: workspaces, error: workspacesError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("userId", user.id);
    console.log("data", workspaces);
    if (workspacesError) {
      return c.json({ error: workspacesError.message }, 500);
    }
    if (workspaces.length === 0) {
      return c.json({ data: { documents: [], total: 0 } });
    }
    return c.json({ data: workspaces });
  })
  .get("/:workspaceId", async (c) => {
    const user = c.get("user");
    const supabase = c.get("supabase");
    const { workspaceId } = c.req.param();

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if the user is a member of the workspace
    const { data: members, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("userId", user.id)
      .eq("workspaceId", workspaceId)
      .single(); // We expect only one member record for a specific workspace

    if (memberError || !members) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Fetch the workspace details from the workspaces table
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single(); // Since workspaceId is unique, we expect a single record

    if (workspaceError || !workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    // Return the workspace data
    return c.json({ data: workspace });
  })
  .get("/:workspaceId/info", async (c) => {
    const supabase = c.get("supabase");
    const { workspaceId } = c.req.param();

    // Fetch the workspace info (name, imageUrl) from the workspaces table
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, name, imageUrl")
      .eq("id", workspaceId)
      .single(); // Expecting a single workspace

    if (workspaceError || !workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json({
      data: {
        id: workspace.id,
        name: workspace.name,
        imageUrl: workspace.imageUrl,
      },
    });
  })
  // .post(
  //   "/",
  //   zValidator("form", createWorkspaceSchema),
  //   async (c) => {
  //     const supabase = c.get("supabase");
  //     const user = c.get("user");

  //     const { name, image } = c.req.valid('form');

  //     let uploadedImageUrl: string | undefined;

  //     // Check if the image is a file and upload it to Supabase Storage
  //     if (image instanceof File) {
  //       const filePath = `${user.id}/${Date.now()}-${image.name}`; // Unique file path based on user and timestamp

  //       // Upload the file to the Supabase Storage
  //       const { data, error: uploadError } = await supabase
  //         .storage
  //         .from("attachments") // Replace 'attachments' with your bucket name
  //         .upload(filePath, image);

  //       if (uploadError) {
  //         return c.json({ error: uploadError.message }, 500);
  //       }

  //       // Retrieve the public URL of the uploaded image
  //       const { publicURL, error: urlError } = supabase
  //         .storage
  //         .from("attachments") // Replace 'attachments' with your bucket name
  //         .getPublicUrl(filePath);

  //       if (urlError) {
  //         return c.json({ error: urlError.message }, 500);
  //       }

  //       uploadedImageUrl = publicURL; // Use the public URL of the image
  //     }

  //     // Insert the new workspace into the 'workspaces' table
  //     const { data: workspace, error: workspaceError } = await supabase
  //       .from("workspaces")
  //       .insert([
  //         {
  //           name,
  //           userId: user.id,
  //           imageUrl: uploadedImageUrl, // Direct URL from Supabase Storage
  //           inviteCode: generateInviteCode(6),
  //         },
  //       ])
  //       .single(); // Fetch the single workspace object that was inserted

  //     if (workspaceError) {
  //       return c.json({ error: workspaceError.message }, 500);
  //     }

  //     // Add the user as a member of the new workspace
  //     const { error: memberError } = await supabase
  //       .from("members")
  //       .insert([
  //         {
  //           userId: user.id,
  //           workspaceId: workspace.id,
  //           role: MemberRole.ADMIN,
  //         },
  //       ]);

  //     if (memberError) {
  //       return c.json({ error: memberError.message }, 500);
  //     }

  //     // Return the created workspace as a response
  //     return c.json({ data: workspace });
  //   }
  // )
  .post(
    "/",
    zValidator("form", createWorkspaceSchema),
    async (c) => {
      const supabase = c.get("supabase");
      const user = c.get("user");

      const { name, image } = c.req.valid("form");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      let uploadedImageUrl: string | undefined;

      // Check if the image is a file and upload it to Supabase Storage
      if (image instanceof File) {
        const filePath = `${user.id}/${Date.now()}-${image.name}`; // Unique file path based on user and timestamp

        // Upload the file to the Supabase Storage
        const { error: uploadError } = await supabase
          .storage
          .from("storages") // Replace 'attachments' with your bucket name
          .upload(filePath, image);

        if (uploadError) {
          return c.json({ error: uploadError.message }, 500);
        }

        // Retrieve the public URL of the uploaded image
        const { data } = supabase
          .storage
          .from("storage") // Replace 'attachments' with your bucket name
          .getPublicUrl(filePath);

        uploadedImageUrl = data.publicUrl; // Use the public URL of the image
      }

      const id = generateID();
      // Insert the new workspace into the 'workspaces' table
      const { error: workspaceError } = await supabase
        .from("workspaces")
        .insert([
          {
            id,
            name,
            userId: user.id,
            imageUrl: uploadedImageUrl, // Direct URL from Supabase Storage
            inviteCode: generateInviteCode(6),
          },
        ]).select();
        // .single(); // Fetch the single workspace object that was inserted

      if (workspaceError) {
        return c.json({ error: workspaceError.message }, 500);
      }

      // Add the user as a member of the new workspace
      const { error: memberError } = await supabase
        .from("members")
        .insert([
          {
            userId: user.id,
            workspaceId: id,
            role: MemberRole.ADMIN,
          },
        ]);

      if (memberError) {
        return c.json({ error: memberError.message }, 500);
      }

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", id)
        .single(); // Fetch the single workspace object that was inserted

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }
      // Return the created workspace as a response
      return c.json({ data: workspace });
    }
  )
// .patch(
//   "/:workspaceId",
//   sessionMiddleware,
//   zValidator("form", updateWorkspaceSchema),
//   async (c) => {
//     const databases = c.get("databases");
//     const storage = c.get("storage");
//     const user = c.get("user");

//     const { workspaceId } = c.req.param();
//     const { name, image } = c.req.valid("form");

//     const member = await getMember({
//       databases,
//       workspaceId,
//       userId: user.$id,
//     });

//     if (!member || member.role !== MemberRole.ADMIN) {
//       return c.json({ error: "Unauthorized" }, 401);
//     }

//     let uploadedImageUrl: string | undefined;

//     if (image instanceof File) {
//       const file = await storage.createFile(
//         ATTACHMENTS_BUCKET_ID,
//         ID.unique(),
//         image
//       );

//       const arrayBuffer = await storage.getFilePreview(
//         ATTACHMENTS_BUCKET_ID,
//         file.$id
//       );

//       uploadedImageUrl = `data:image/png;base64,${Buffer.from(
//         arrayBuffer
//       ).toString("base64")}`;
//     } else {
//       uploadedImageUrl = image;
//     }

//     const workspace = await databases.updateDocument(
//       DATABASE_ID,
//       WORKSPACES_ID,
//       workspaceId,
//       {
//         name,
//         imageUrl: uploadedImageUrl,
//       }
//     );
//     return c.json({ data: workspace });
//   }
// )
.patch(
  "/:workspaceId",
  supabaseMiddleware(),
  zValidator("form", updateWorkspaceSchema),
  async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");
    const { workspaceId } = c.req.param();
    const { name, image } = c.req.valid("form");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    // Check member role
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("role")
      .eq("workspaceId", workspaceId)
      .eq("userId", user.id)
      .single();

    if (memberError || !member || member.role !== MemberRole.ADMIN) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    let uploadedImageUrl: string | undefined;

    if (image instanceof File) {
      const filePath = `${user.id}/${Date.now()}-${image.name}`;

      const { error: uploadError } = await supabase.storage
        .from("storages")
        .upload(filePath, image, { upsert: true });

      if (uploadError) {
        return c.json({ error: uploadError.message }, 500);
      }

      const { data } = supabase.storage
        .from("storages")
        .getPublicUrl(filePath);

      uploadedImageUrl = data.publicUrl;
    } else {
      uploadedImageUrl = image; // In case it's a string (already uploaded)
    }

    // Update workspace
    const { data: updatedWorkspace, error: updateError } = await supabase
      .from("workspaces")
      .update({
        name,
        imageUrl: uploadedImageUrl,
      })
      .eq("id", workspaceId)
      .single();

    if (updateError) {
      return c.json({ error: updateError.message }, 500);
    }

    return c.json({ data: updatedWorkspace });
  }
)
// .delete("/:workspaceId", sessionMiddleware, async (c) => {
//   const databases = c.get("databases");
//   const user = c.get("user");

//   const { workspaceId } = c.req.param();

//   const member = await getMember({
//     databases,
//     workspaceId,
//     userId: user.$id,
//   });

//   if (!member || member.role !== MemberRole.ADMIN) {
//     return c.json({ error: "Unauthorized" }, 401);
//   }

//   // delete members, projects and tasks
//   await databases.deleteDocument(DATABASE_ID, WORKSPACES_ID, workspaceId);

//   return c.json({ data: { $id: workspaceId } });
// })
.delete("/:workspaceId", supabaseMiddleware(), async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");
  const { workspaceId } = c.req.param();

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Verify if user is an admin member of the workspace
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("role")
    .eq("workspaceId", workspaceId)
    .eq("userId", user.id)
    .single();

  if (memberError || !member || member.role !== MemberRole.ADMIN) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Optionally delete related members, projects, and tasks here
  await supabase.from("members").delete().eq("workspaceId", workspaceId);
  await supabase.from("projects").delete().eq("workspaceId", workspaceId);
  await supabase.from("tasks").delete().eq("workspaceId", workspaceId);

  // Delete the workspace itself
  const { error: deleteError } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (deleteError) {
    return c.json({ error: deleteError.message }, 500);
  }

  return c.json({ data: { id: workspaceId } });
})

// .post("/:workspaceId/reset-invite-code", sessionMiddleware, async (c) => {
//   const databases = c.get("databases");
//   const user = c.get("user");

//   const { workspaceId } = c.req.param();

//   const member = await getMember({
//     databases,
//     workspaceId,
//     userId: user.$id,
//   });

//   if (!member || member.role !== MemberRole.ADMIN) {
//     return c.json({ error: "Unauthorized" }, 401);
//   }

//   // delete members, projects and tasks
//   const workspace = await databases.updateDocument(
//     DATABASE_ID,
//     WORKSPACES_ID,
//     workspaceId,
//     { inviteCode: generateInviteCode(6) }
//   );

//   return c.json({ data: workspace });
// })
.post("/:workspaceId/reset-invite-code", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");
  const { workspaceId } = c.req.param();

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  // Check if user is a member of the workspace and an admin
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("role")
    .eq("workspaceId", workspaceId)
    .eq("userId", user.id)
    .single();

  if (memberError || !member || member.role !== "ADMIN") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Reset the invite code
  const newInviteCode = generateInviteCode(6);

  const  updatedWorkspace = await supabase
    .from("workspaces")
    .update({ inviteCode: newInviteCode })
    .eq("id", workspaceId)
    .select().single();

  return c.json({ data: updatedWorkspace });
})

// .post(
//   "/:workspaceId/join",
//   sessionMiddleware,
//   zValidator("json", z.object({ code: z.string() })),
//   async (c) => {
//     const { workspaceId } = c.req.param();
//     const { code } = c.req.valid("json");

//     const databases = c.get("databases");
//     const user = c.get("user");

//     const member = await getMember({
//       databases,
//       workspaceId,
//       userId: user.$id,
//     });

//     if (member) {
//       return c.json({ error: "Already a member" }, 400);
//     }

//     const workspace = await databases.getDocument<Workspace>(
//       DATABASE_ID,
//       WORKSPACES_ID,
//       workspaceId
//     );

//     if (workspace.inviteCode !== code) {
//       return c.json({ error: "Invalid invite code" }, 400);
//     }

//     await databases.createDocument(DATABASE_ID, MEMBERS_ID, ID.unique(), {
//       workspaceId,
//       userId: user.$id,
//       role: MemberRole.MEMBER,
//     });
//     return c.json({ data: workspace });
//   }
// )
.post(
  "/:workspaceId/join",
  zValidator("json", z.object({ code: z.string() })),
  async (c) => {
    const { workspaceId } = c.req.param();
    const { code } = c.req.valid("json");

    const supabase = c.get("supabase");
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    // Check if the user is already a member of the workspace
    const { data: existingMember, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", workspaceId)
      .eq("userId", user.id)
      .single();

    if (memberError || existingMember) {
      return c.json({ error: "Already a member" }, 400);
    }

    // Fetch the workspace and check the invite code
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("inviteCode")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || workspace.inviteCode !== code) {
      return c.json({ error: "Invalid invite code" }, 400);
    }

    // Add the user as a member
    const { error: insertMemberError } = await supabase
      .from("members")
      .insert({
        workspaceId,
        userId: user.id,
        role: "MEMBER", // Assuming "MEMBER" is the default role
      });

    if (insertMemberError) {
      return c.json({ error: insertMemberError.message }, 500);
    }

    return c.json({ data: workspace });
  }
)

// .get("/:workspaceId/analytics", sessionMiddleware, async (c) => {
//     const databases = c.get("databases");
//     const user = c.get("user");
//     const { workspaceId } = c.req.param();

//     const member = await getMember({
//       databases,
//       workspaceId,
//       userId: user.$id,
//     });

//     if (!member) {
//       return c.json({ error: "Unauthorized" }, 401);
//     }

//     const now = new Date();
//     const thisMonthStart = startOfMonth(now);
//     const thisMonthEnd = endOfMonth(now);
//     const lastMonthStart = startOfMonth(subMonths(now, 1));
//     const lastMonthEnd = endOfMonth(subMonths(now, 1));

//     const thisMonthTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
//       ]
//     );
//     const lastMonthTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
//       ]
//     );

//     const taskCount = thisMonthTasks.total;
//     const taskDifference = taskCount - lastMonthTasks.total;

//     const thisMonthAssignedTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.equal("assigneeId", member.$id),
//         Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
//       ]
//     );
//     const lastMonthAssignedTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.equal("assigneeId", member.$id),
//         Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
//       ]
//     );

//     const assignedTaskCount = thisMonthAssignedTasks.total;
//     const assignedTaskDifference =
//       assignedTaskCount - lastMonthAssignedTasks.total;

//     const thisMonthIncompletedTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.notEqual("status", TaskStatus.DONE),
//         Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
//       ]
//     );
//     const lastMonthIncompletedTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.notEqual("status", TaskStatus.DONE),
//         Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
//       ]
//     );

//     const incompletedTaskCount = thisMonthIncompletedTasks.total;
//     const incompletedTaskDifference =
//       incompletedTaskCount - lastMonthIncompletedTasks.total;

//     const thisMonthCompletedTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.equal("status", TaskStatus.DONE),
//         Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
//       ]
//     );
//     const lastMonthCompletedTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.equal("status", TaskStatus.DONE),
//         Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
//       ]
//     );

//     const completedTaskCount = thisMonthCompletedTasks.total;
//     const completedTaskDifference =
//       completedTaskCount - lastMonthCompletedTasks.total;

//     const thisMonthOverdueTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.notEqual("status", TaskStatus.DONE),
//         Query.lessThan("dueDate", now.toISOString()),
//         Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
//       ]
//     );
//     const lastMonthOverdueTasks = await databases.listDocuments(
//       DATABASE_ID,
//       TASKS_ID,
//       [
//         Query.equal("workspaceId", workspaceId),
//         Query.notEqual("status", TaskStatus.DONE),
//         Query.lessThan("dueDate", now.toISOString()),
//         Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
//         Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
//       ]
//     );

//     const overdueTaskCount = thisMonthOverdueTasks.total;
//     const overdueTaskDifference =
//       overdueTaskCount - lastMonthOverdueTasks.total;

//     return c.json({
//       data: {
//         taskCount,
//         taskDifference,
//         assignedTaskCount,
//         assignedTaskDifference,
//         completedTaskCount,
//         completedTaskDifference,
//         incompletedTaskCount,
//         incompletedTaskDifference,
//         overdueTaskCount,
//         overdueTaskDifference,
//       },
//     });
//   })
.get("/:workspaceId/analytics", async (c) => {
  const supabase = c.get("supabase");
  const user = c.get("user");
  const { workspaceId } = c.req.param();

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  // Check if user is a member of the workspace
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("role, userId")
    .eq("workspaceId", workspaceId)
    .eq("userId", user.id)
    .single();

  if (memberError || !member) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Define date ranges for this month and last month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Fetch task data for this month and last month
  const thisMonthTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .gte("createdAt", thisMonthStart.toISOString())
    .lte("createdAt", thisMonthEnd.toISOString());

  const lastMonthTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .gte("createdAt", lastMonthStart.toISOString())
    .lte("createdAt", lastMonthEnd.toISOString());
const taskCount = thisMonthTasks.data !== null ? thisMonthTasks.data.length : 0;
  const taskDifference = taskCount - (lastMonthTasks.data?.length ?? 0);

  // Fetch assigned tasks for this month and last month
  const thisMonthAssignedTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .eq("assigneeId", member.userId) // Assumes `userId` from the `members` table
    .gte("createdAt", thisMonthStart.toISOString())
    .lte("createdAt", thisMonthEnd.toISOString());

  const lastMonthAssignedTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .eq("assigneeId", member.userId)
    .gte("createdAt", lastMonthStart.toISOString())
    .lte("createdAt", lastMonthEnd.toISOString());

  const assignedTaskCount = thisMonthAssignedTasks.data?.length ?? 0;
  const assignedTaskDifference = assignedTaskCount - (lastMonthAssignedTasks.data?.length ?? 0);
  // Fetch incomplete tasks for this month and last month
  const thisMonthIncompletedTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .neq("status", "DONE")
    .gte("createdAt", thisMonthStart.toISOString())
    .lte("createdAt", thisMonthEnd.toISOString());

  const lastMonthIncompletedTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .neq("status", "DONE")
    .gte("createdAt", lastMonthStart.toISOString())
    .lte("createdAt", lastMonthEnd.toISOString());

const incompletedTaskCount = thisMonthIncompletedTasks.data?.length ?? 0;
const incompletedTaskDifference = incompletedTaskCount - (lastMonthIncompletedTasks.data?.length ?? 0);
  // Fetch completed tasks for this month and last month
  const thisMonthCompletedTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .eq("status", "DONE")
    .gte("createdAt", thisMonthStart.toISOString())
    .lte("createdAt", thisMonthEnd.toISOString());

  const lastMonthCompletedTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .eq("status", "DONE")
    .gte("createdAt", lastMonthStart.toISOString())
    .lte("createdAt", lastMonthEnd.toISOString());

  const completedTaskCount = thisMonthCompletedTasks.data?.length ?? 0;
  const completedTaskDifference = completedTaskCount - (lastMonthCompletedTasks.data?.length ?? 0);

  // Fetch overdue tasks for this month and last month
  const thisMonthOverdueTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .neq("status", "DONE")
    .lt("dueDate", now.toISOString())
    .gte("createdAt", thisMonthStart.toISOString())
    .lte("createdAt", thisMonthEnd.toISOString());

  const lastMonthOverdueTasks = await supabase
    .from("tasks")
    .select("*")
    .eq("workspaceId", workspaceId)
    .neq("status", "DONE")
    .lt("dueDate", now.toISOString())
    .gte("createdAt", lastMonthStart.toISOString())
    .lte("createdAt", lastMonthEnd.toISOString());

  const overdueTaskCount = thisMonthOverdueTasks.data?.length ?? 0;
  const overdueTaskDifference = overdueTaskCount - (lastMonthOverdueTasks.data?.length ?? 0);

  return c.json({
    data: {
      taskCount,
      taskDifference,
      assignedTaskCount,
      assignedTaskDifference,
      completedTaskCount,
      completedTaskDifference,
      incompletedTaskCount,
      incompletedTaskDifference,
      overdueTaskCount,
      overdueTaskDifference,
    },
  });
})

export default app;
