import { Hono } from "hono";

import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { MemberRole } from "@/lib/types/enums";
// import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { supabaseMiddleware } from "@/lib/supabase-middleware";
import { generateID, generateInviteCode } from "@/lib/utils";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";

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
      .select("workspaceId")
      .eq("userId", user.id);

    if (membersError) {
      return c.json({ error: membersError.message }, 500);
    }
    if (members.length === 0) {
      return c.json({ data: [] });
    }
    const workspaceIds = members.map((member) => member.workspaceId);
    const { data: workspaces, error: workspacesError } = await supabase
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds)
      .order("created_at", { ascending: false });
    if (workspacesError) {
      return c.json({ error: workspacesError.message }, 500);
    }
    if (workspaces.length === 0) {
      return c.json({ data: [] });
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
      .eq("workspaceId", workspaceId);

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
      data: workspace,
    });
  })
  .post("/", zValidator("form", createWorkspaceSchema), async (c) => {
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
      const { error: uploadError } = await supabase.storage
        .from("storages") // Replace 'attachments' with your bucket name
        .upload(filePath, image);

      if (uploadError) {
        return c.json({ error: uploadError.message }, 500);
      }

      // Retrieve the public URL of the uploaded image
      const { data } = supabase.storage
        .from("storage") // Replace 'attachments' with your bucket name
        .getPublicUrl(filePath);

      uploadedImageUrl = data.publicUrl; // Use the public URL of the image
    }

    const id = generateID();
    // Insert the new workspace into the 'workspaces' table
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert([
        {
          id,
          name,
          userId: user.id,
          imageUrl: uploadedImageUrl, // Direct URL from Supabase Storage
          inviteCode: generateInviteCode(6),
        },
      ])
      .select("id, name, imageUrl")
      .single();

    if (workspaceError) {
      return c.json({ error: workspaceError.message }, 500);
    }

    // Add the user as a member of the new workspace
    const { error: memberError } = await supabase.from("members").insert([
      {
        name: user.user_metadata.name,
        avatar_url: user.user_metadata.avatar_url,
        email: user.email,
        userId: user.id,
        workspaceId: id,
        role: MemberRole.ADMIN,
      },
    ]);

    if (memberError) {
      return c.json({ error: memberError.message }, 500);
    }

    // Return the created workspace as a response
    return c.json({ data: workspace });
  })
  .patch(
    "/:workspaceId",
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
        .select()
        .single();

      if (updateError) {
        return c.json({ error: updateError.message }, 500);
      }

      return c.json({ data: updatedWorkspace });
    }
  )
  .delete("/:workspaceId", async (c) => {
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
      return c.json({ error: "Unauthorized member" }, 401);
    }
    const { error: deleteError } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId);

    if (deleteError) {
      return c.json({ error: deleteError.message }, 500);
    }

    return c.json({ data: { id: workspaceId } });
  })
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

    const { data: updatedWorkspace } = await supabase
      .from("workspaces")
      .update({ inviteCode: newInviteCode })
      .eq("id", workspaceId)
      .select("*")
      .single();

    return c.json({ data: updatedWorkspace });
  })
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
        .select("id")
        .eq("workspaceId", workspaceId)
        .eq("userId", user.id)
        .single();
      if (!memberError || existingMember) {
        return c.json({ error: "Already a member" }, 400);
      }

      // Fetch the workspace and check the invite code
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId)
        .single();

      if (workspaceError || workspace.inviteCode !== code) {
        return c.json({ error: "Invalid invite code" }, 400);
      }

      // Add the user as a member
      const { error: insertMemberError } = await supabase
        .from("members")
        .insert({
          name: user.user_metadata.name,
          email: user.email,
          avatar_url: user.user_metadata.avatar_url,
          workspaceId,
          userId: user.id,
          role: MemberRole.MEMBER,
        });

      if (insertMemberError) {
        return c.json({ error: insertMemberError.message }, 500);
      }

      return c.json({ data: workspace });
    }
  )
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

    let projectIds: string[] = [];
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("workspaceId", workspaceId);
    if (!projects) {
      projectIds = [];
    } else {
      projectIds = projects.map((project) => project.id);
    }

    // Fetch task data for this month and last month
    const { data: thisMonthTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .gte("created_at", thisMonthStart.toISOString())
      .lte("created_at", thisMonthEnd.toISOString());

    // Debug raw task data to check what's in the database
    const { data: allTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds);

    const { data: lastMonthTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());

    const taskCount = thisMonthTasks !== null ? thisMonthTasks.length : 0;
    const taskDifference = taskCount - (lastMonthTasks?.length ?? 0);

    // Fetch assigned tasks for this month and last month
    const { data: thisMonthAssignedTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .eq("assigneeId", member.userId) // Assumes `userId` from the `members` table
      .gte("created_at", thisMonthStart.toISOString())
      .lte("created_at", thisMonthEnd.toISOString());

    const { data: lastMonthAssignedTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .eq("assigneeId", member.userId)
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());

    const assignedTaskCount = thisMonthAssignedTasks?.length ?? 0;
    const assignedTaskDifference =
      assignedTaskCount - (lastMonthAssignedTasks?.length ?? 0);
    // Fetch incomplete tasks for this month and last month
    const { data: thisMonthIncompletedTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .neq("status", "DONE")
      .gte("created_at", thisMonthStart.toISOString())
      .lte("created_at", thisMonthEnd.toISOString());

    const { data: lastMonthIncompletedTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .neq("status", "DONE")
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());

    const incompletedTaskCount = thisMonthIncompletedTasks?.length ?? 0;
    const incompletedTaskDifference =
      incompletedTaskCount - (lastMonthIncompletedTasks?.length ?? 0);
    // Fetch completed tasks for this month and last month
    const { data: thisMonthCompletedTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .eq("status", "DONE")
      .gte("created_at", thisMonthStart.toISOString())
      .lte("created_at", thisMonthEnd.toISOString());

    const { data: lastMonthCompletedTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .eq("status", "DONE")
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());

    const completedTaskCount = thisMonthCompletedTasks?.length ?? 0;
    const completedTaskDifference =
      completedTaskCount - (lastMonthCompletedTasks?.length ?? 0);

    // Fetch overdue tasks for this month and last month
    const { data: thisMonthOverdueTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .neq("status", "DONE")
      .lt("dueDate", now.toISOString())
      .gte("created_at", thisMonthStart.toISOString())
      .lte("created_at", thisMonthEnd.toISOString());

    const { data: lastMonthOverdueTasks } = await supabase
      .from("tasks")
      .select("*")
      .in("projectId", projectIds)
      .neq("status", "DONE")
      .lt("dueDate", now.toISOString())
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());

    const overdueTaskCount = thisMonthOverdueTasks?.length ?? 0;
    const overdueTaskDifference =
      overdueTaskCount - (lastMonthOverdueTasks?.length ?? 0);

    const result = {
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
    };

    return c.json(result);
  });

export default app;
