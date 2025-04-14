import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";


import { supabaseMiddleware } from "@/lib/supabase-middleware";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
// import { getMember } from "@/features/members/utils";

// import { Project } from "../types";
import { createProjectSchema, updateProjectSchema } from "../schemas";
import { TaskStatus } from "@/features/tasks/types";
// import { saveProject } from "@/features/chats/queries";

const app = new Hono()
  .use("*", supabaseMiddleware()) // Apply Supabase middleware to the app
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

      if (!workspaceId) {
        return c.json({ error: "Missing workspaceId" }, 400);
      }

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Check if user is a member of the workspace
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("workspaceId", workspaceId)
        .eq("userId", user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Fetch projects for the given workspaceId
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("workspaceId", workspaceId)
        .order("createdAt", { ascending: false });

      if (projectsError) {
        return c.json({ error: projectsError.message }, 500);
      }

      return c.json({ data: projects });
    }
  )
  .get("/:projectId", async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");
    const { projectId } = c.req.param();
  
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    // Fetch the project using Supabase
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single(); // Using `.single()` to return a single row
  
    if (projectError || !project) {
      return c.json({ error: "Project not found" }, 404);
    }
  
    // Check if the user is a member of the workspace
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", project.workspaceId)
      .eq("userId", user.id)
      .single(); // Use `.single()` to expect a single member record
  
    if (memberError || !member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    // Return the project data if the user is authorized
    return c.json({ data: project });
  })
  // .post(
  //   "/",
  //   zValidator("form", createProjectSchema),
  //   async (c) => {
  //     const databases = c.get("databases");
  //     const storage = c.get("storage");
  //     const user = c.get("user");

  //     const { name, image, workspaceId } = c.req.valid("form");

  //     const member = await getMember({
  //       databases,
  //       workspaceId,
  //       userId: user.$id,
  //     });

  //     if (!member) {
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
  //     }

  //     // const project = await databases.createDocument(
  //     //   DATABASE_ID,
  //     //   PROJECTS_ID,
  //     //   ID.unique(),
  //     //   {
  //     //     name,
  //     //     imageUrl: uploadedImageUrl,
  //     //     workspaceId,
  //     //   }
  //     // );

  //     const project = await saveProject({
  //       workspaceId,
  //       name,
  //       imageUrl: uploadedImageUrl,
  //     })

  //     return c.json({ data: project });
  //   }
  // )
  .post(
    "/",
    zValidator("form", createProjectSchema), // Validate the request body with Zod schema
    async (c) => {
      const supabase = c.get("supabase"); // Get Supabase instance
      const user = c.get("user"); // Get the current user from context
      const { name, image, workspaceId } = c.req.valid("form");

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

      let uploadedImageUrl: string | undefined;

      // If an image is provided, upload it to Supabase Storage
      if (image instanceof File) {
        const filePath = `${user.id}/${Date.now()}-${image.name}`; // Create a unique file path

        // Upload the file to Supabase Storage
        const { data, error: uploadError } = await supabase
          .storage
          .from("storages") // Assuming the bucket name is ATTACHMENTS_BUCKET_ID
          .upload(filePath, image, { upsert: true });

        if (uploadError) {
          return c.json({ error: uploadError.message }, 500);
        }

        // Get the public URL of the uploaded file
        const { data: url } = supabase
          .storage
          .from("storages")
          .getPublicUrl(filePath);

        uploadedImageUrl = url.publicUrl;
      }

      // Insert the new project into the 'projects' table
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            name,
            workspaceId,
            imageUrl: uploadedImageUrl,
          },
        ]).select()
        .single(); // Use .single() to ensure it returns the inserted row

      if (projectError) {
        return c.json({ error: projectError.message }, 500);
      }

      // Return the created project data
      return c.json({ data: project });
    }
  )
  // .patch(
  //   "/:projectId",
  //   zValidator("form", updateProjectSchema),
  //   async (c) => {
  //     const databases = c.get("databases");
  //     const storage = c.get("storage");
  //     const user = c.get("user");

  //     const { projectId } = c.req.param();
  //     const { name, image } = c.req.valid("form");

  //     const existingProject = await databases.getDocument<Project>(
  //       DATABASE_ID,
  //       PROJECTS_ID,
  //       projectId
  //     );

  //     const member = await getMember({
  //       databases,
  //       workspaceId: existingProject.workspaceId,
  //       userId: user.$id,
  //     });

  //     if (!member) {
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

  //     const project = await databases.updateDocument(
  //       DATABASE_ID,
  //       PROJECTS_ID,
  //       projectId,
  //       {
  //         name,
  //         imageUrl: uploadedImageUrl,
  //       }
  //     );
  //     return c.json({ data: project });
  //   }
  // )
  .patch(
    "/:projectId",
    zValidator("form", updateProjectSchema),
    async (c) => {
      const supabase = c.get("supabase");
      const user = c.get("user");
  
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { projectId } = c.req.param();
      const { name, image } = c.req.valid("form");
  
      // Fetch the existing project
      const { data: existingProject, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single(); // Using .single() to ensure only one record is returned
  
      if (projectError || !existingProject) {
        return c.json({ error: "Project not found" }, 404);
      }
  
      // Check if the user is a member of the workspace
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("workspaceId", existingProject.workspaceId)
        .eq("userId", user.id)
        .single(); // Use .single() to expect a single member record
  
      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
  
      let uploadedImageUrl: string | undefined;
  
      // If an image is provided, upload it to Supabase Storage
      if (image instanceof File) {
        const filePath = `${user.id}/${Date.now()}-${image.name}`; // Create a unique file path
  
        // Upload the file to Supabase Storage
        const { data, error: uploadError } = await supabase
          .storage
          .from("storages") // Replace with your bucket name
          .upload(filePath, image, { upsert: true });
  
        if (uploadError) {
          return c.json({ error: uploadError.message }, 500);
        }
  
        // Get the public URL of the uploaded file
        const { data: url } = supabase
          .storage
          .from("storages") // Replace with your bucket name
          .getPublicUrl(filePath);
  
        uploadedImageUrl = url.publicUrl;
      } else {
        uploadedImageUrl = image; // If no new image is provided, keep the existing image URL
      }
  
      // Update the project with the new data
      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update({
          name,
          imageUrl: uploadedImageUrl,
        })
        .eq("id", projectId).select()
        .single(); // Use .single() to return the updated project
  
      if (updateError) {
        return c.json({ error: updateError.message }, 500);
      }
  
      return c.json({ data: updatedProject });
    }
  )
  // .delete("/:projectId", async (c) => {
  //   const databases = c.get("databases");
  //   const user = c.get("user");

  //   const { projectId } = c.req.param();

  //   const existingProject = await databases.getDocument<Project>(
  //     DATABASE_ID,
  //     PROJECTS_ID,
  //     projectId
  //   );

  //   const member = await getMember({
  //     databases,
  //     workspaceId: existingProject.workspaceId,
  //     userId: user.$id,
  //   });

  //   if (!member) {
  //     return c.json({ error: "Unauthorized" }, 401);
  //   }

  //   // delete members, projects and tasks
  //   await databases.deleteDocument(DATABASE_ID, PROJECTS_ID, projectId);

  //   return c.json({ data: { $id: existingProject.$id } });
  // })
  .delete("/:projectId", async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");
    const { projectId } = c.req.param();

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    // Fetch the existing project from Supabase
    const { data: existingProject, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
  
    if (projectError || !existingProject) {
      return c.json({ error: "Project not found" }, 404);
    }
  
    // Check if the user is a member of the workspace
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", existingProject.workspaceId)
      .eq("userId", user.id)
      .single();
  
    if (memberError || !member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    // Delete tasks associated with the project
    const { error: deleteTasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("projectId", projectId);
  
    if (deleteTasksError) {
      return c.json({ error: deleteTasksError.message }, 500);
    }
  
    // Delete the project itself
    const { error: deleteProjectError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);
  
    if (deleteProjectError) {
      return c.json({ error: deleteProjectError.message }, 500);
    }
  
    // Return the deleted project ID
    return c.json({ data: { id: existingProject.id } });
  })  
  // .get("/:projectId/analytics", sessionMiddleware, async (c) => {
  //   const databases = c.get("databases");
  //   const user = c.get("user");
  //   const { projectId } = c.req.param();

  //   const project = await databases.getDocument<Project>(
  //     DATABASE_ID,
  //     PROJECTS_ID,
  //     projectId
  //   );

  //   const member = await getMember({
  //     databases,
  //     workspaceId: project.workspaceId,
  //     userId: user.$id,
  //   });

  //   if (!member) {
  //     return c.json({ error: "Unauthorized" }, 401);
  //   }

  //   const now = new Date();
  //   const thisMonthStart = startOfMonth(now);
  //   const thisMonthEnd = endOfMonth(now);
  //   const lastMonthStart = startOfMonth(subMonths(now, 1));
  //   const lastMonthEnd = endOfMonth(subMonths(now, 1));

  //   const thisMonthTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
  //     ]
  //   );
  //   const lastMonthTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
  //     ]
  //   );

  //   const taskCount = thisMonthTasks.total;
  //   const taskDifference = taskCount - lastMonthTasks.total;

  //   const thisMonthAssignedTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.equal("assigneeId", member.$id),
  //       Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
  //     ]
  //   );
  //   const lastMonthAssignedTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.equal("assigneeId", member.$id),
  //       Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
  //     ]
  //   );

  //   const assignedTaskCount = thisMonthAssignedTasks.total;
  //   const assignedTaskDifference =
  //     assignedTaskCount - lastMonthAssignedTasks.total;

  //   const thisMonthIncompletedTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.notEqual("status", TaskStatus.DONE),
  //       Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
  //     ]
  //   );
  //   const lastMonthIncompletedTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.notEqual("status", TaskStatus.DONE),
  //       Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
  //     ]
  //   );

  //   const incompletedTaskCount = thisMonthIncompletedTasks.total;
  //   const incompletedTaskDifference =
  //     incompletedTaskCount - lastMonthIncompletedTasks.total;

  //   const thisMonthCompletedTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.equal("status", TaskStatus.DONE),
  //       Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
  //     ]
  //   );
  //   const lastMonthCompletedTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.equal("status", TaskStatus.DONE),
  //       Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
  //     ]
  //   );

  //   const completedTaskCount = thisMonthCompletedTasks.total;
  //   const completedTaskDifference =
  //     completedTaskCount - lastMonthCompletedTasks.total;

  //   const thisMonthOverdueTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.notEqual("status", TaskStatus.DONE),
  //       Query.lessThan("dueDate", now.toISOString()),
  //       Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
  //     ]
  //   );
  //   const lastMonthOverdueTasks = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     [
  //       Query.equal("projectId", projectId),
  //       Query.notEqual("status", TaskStatus.DONE),
  //       Query.lessThan("dueDate", now.toISOString()),
  //       Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
  //       Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
  //     ]
  //   );

  //   const overdueTaskCount = thisMonthOverdueTasks.total;
  //   const overdueTaskDifference =
  //     overdueTaskCount - lastMonthOverdueTasks.total;

  //   return c.json({
  //     data: {
  //       taskCount,
  //       taskDifference,
  //       assignedTaskCount,
  //       assignedTaskDifference,
  //       completedTaskCount,
  //       completedTaskDifference,
  //       incompletedTaskCount,
  //       incompletedTaskDifference,
  //       overdueTaskCount,
  //       overdueTaskDifference,
  //     },
  //   });
  // });
  .get("/:projectId/analytics", async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");
    const { projectId } = c.req.param();

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    // Fetch the project from Supabase
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
  
    if (projectError || !project) {
      return c.json({ error: "Project not found" }, 404);
    }
  
    // Check if the user is a member of the workspace
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", project.workspaceId)
      .eq("userId", user.id)
      .single();
  
    if (memberError || !member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
  
    // Fetch tasks for this month and last month
    const thisMonthTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .gte("createdAt", thisMonthStart.toISOString())
      .lte("createdAt", thisMonthEnd.toISOString());
  
    const lastMonthTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .gte("createdAt", lastMonthStart.toISOString())
      .lte("createdAt", lastMonthEnd.toISOString());
  
    const taskCount = thisMonthTasks.data?.length ?? 0;
    const taskDifference = taskCount - (lastMonthTasks.data?.length ?? 0);
  
    // Fetch assigned tasks for this month and last month
    const thisMonthAssignedTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .eq("assigneeId", member.userId)
      .gte("createdAt", thisMonthStart.toISOString())
      .lte("createdAt", thisMonthEnd.toISOString());
  
    const lastMonthAssignedTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .eq("assigneeId", member.userId)
      .gte("createdAt", lastMonthStart.toISOString())
      .lte("createdAt", lastMonthEnd.toISOString());
  
    const assignedTaskCount = thisMonthAssignedTasks.data?.length ?? 0;    
    const assignedTaskDifference = assignedTaskCount - (lastMonthAssignedTasks.data?.length ?? 0);
  
    // Fetch incomplete tasks for this month and last month
    const thisMonthIncompletedTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .neq("status", TaskStatus.DONE)
      .gte("createdAt", thisMonthStart.toISOString())
      .lte("createdAt", thisMonthEnd.toISOString());
  
    const lastMonthIncompletedTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .neq("status", TaskStatus.DONE)
      .gte("createdAt", lastMonthStart.toISOString())
      .lte("createdAt", lastMonthEnd.toISOString());
  
    const incompletedTaskCount = thisMonthIncompletedTasks.data?.length ?? 0;
    const incompletedTaskDifference =
      incompletedTaskCount - (lastMonthIncompletedTasks.data?.length ?? 0);
  
    // Fetch completed tasks for this month and last month
    const thisMonthCompletedTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .eq("status", TaskStatus.DONE)
      .gte("createdAt", thisMonthStart.toISOString())
      .lte("createdAt", thisMonthEnd.toISOString());
  
    const lastMonthCompletedTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .eq("status", TaskStatus.DONE)
      .gte("createdAt", lastMonthStart.toISOString())
      .lte("createdAt", lastMonthEnd.toISOString());
  
    const completedTaskCount = thisMonthCompletedTasks.data?.length ?? 0; 
    const completedTaskDifference =
      completedTaskCount - (lastMonthCompletedTasks.data?.length ?? 0);
  
    // Fetch overdue tasks for this month and last month
    const thisMonthOverdueTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .neq("status", TaskStatus.DONE)
      .lt("dueDate", now.toISOString()) // Due date before now
      .gte("createdAt", thisMonthStart.toISOString())
      .lte("createdAt", thisMonthEnd.toISOString());
  
    const lastMonthOverdueTasks = await supabase
      .from("tasks")
      .select("*")
      .eq("projectId", projectId)
      .neq("status", TaskStatus.DONE)
      .lt("dueDate", now.toISOString()) // Due date before now
      .gte("createdAt", lastMonthStart.toISOString())
      .lte("createdAt", lastMonthEnd.toISOString());
  
    const overdueTaskCount = thisMonthOverdueTasks.data?.length ?? 0;
    const overdueTaskDifference =
      overdueTaskCount - (lastMonthOverdueTasks.data?.length ?? 0);
  
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
  });
  

export default app;
