import { supabaseMiddleware } from "@/lib/supabase-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTaskSchema } from "../schemas";
// import {}
import { getMember } from "@/features/members/utils";
import { ID, Query } from "node-appwrite";
import { Task, TaskStatus, TaskComment } from "../types";
import { z } from "zod";
import { createAdminClient } from "@/lib/appwrite";
import { Project } from "@/features/projects/types";

const app = new Hono()
  .use("*", supabaseMiddleware())
  // .delete("/:taskId", async (c) => {
  //   const { taskId } = c.req.param();

  //   const supabase = c.get("supabase");
  //   const user = c.get("user");

  //   const member = await getMember({
  //     databases,
  //     workspaceId: task.workspaceId,
  //     userId: user.$id,
  //   });

  //   if (!member) {
  //     return c.json({ error: "Unauthorized" }, 401);
  //   }

  //   // Get all attachments for this task
  //   const attachments = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASK_ATTACHMENT_ID,
  //     [Query.equal("taskId", taskId)]
  //   );

  //   // Delete all attachment files from storage
  //   for (const attachment of attachments.documents) {
  //     try {
  //       await storage.deleteFile(ATTACHMENTS_BUCKET_ID, attachment.fileId);
  //     } catch (error) {
  //       console.error(`Failed to delete file ${attachment.fileId}:`, error);
  //     }
  //   }

  //   // Delete all attachment records from database
  //   for (const attachment of attachments.documents) {
  //     try {
  //       await databases.deleteDocument(
  //         DATABASE_ID,
  //         TASK_ATTACHMENT_ID,
  //         attachment.$id
  //       );
  //     } catch (error) {
  //       console.error(`Failed to delete attachment record ${attachment.$id}:`, error);
  //     }
  //   }

  //   // Delete the task
  //   await databases.deleteDocument(DATABASE_ID, TASKS_ID, taskId);

  //   // Create log for task deletion
  //   await databases.createDocument(
  //     DATABASE_ID,
  //     TASKLOGS_ID,
  //     ID.unique(),
  //     {
  //       taskId,
  //       userId: user.$id,
  //       action: "deleted",
  //       details: "Task deleted"
  //     }
  //   );

  //   return c.json({ data: { $id: task.$id}});
  // })
  .delete("/:taskId", async (c) => {
    const { taskId } = c.req.param();
    const supabase = c.get("supabase");
    const user = c.get("user");
  
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Fetch the task from Supabase
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();
  
    if (taskError || !task) {
      return c.json({ error: "Task not found" }, 404);
    }
  
    // Check if the user is a member of the workspace
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", task.workspaceId)
      .eq("userId", user.id)
      .single();
  
    if (memberError || !member) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    // Fetch all attachments related to the task
    const { data: attachments, error: attachmentsError } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("taskId", taskId);
  
    if (attachmentsError) {
      return c.json({ error: "Error fetching attachments" }, 500);
    }
  
    // Delete all attachment files from Supabase Storage
    for (const attachment of attachments) {
      try {
        const { error: deleteFileError } = await supabase.storage
          .from("attachments")
          .remove([attachment.fileId]);
  
        if (deleteFileError) {
          console.error(`Failed to delete file ${attachment.fileId}:`, deleteFileError.message);
        }
      } catch (error) {
        console.error(`Failed to delete file ${attachment.fileId}:`, error);
      }
    }
  
    // Delete all attachment records from the "task_attachments" table
    for (const attachment of attachments) {
      try {
        const { error: deleteRecordError } = await supabase
          .from("task_attachments")
          .delete()
          .eq("id", attachment.id);
  
        if (deleteRecordError) {
          console.error(`Failed to delete attachment record ${attachment.id}:`, deleteRecordError.message);
        }
      } catch (error) {
        console.error(`Failed to delete attachment record ${attachment.id}:`, error);
      }
    }
  
    // Delete the task from the "tasks" table
    const { error: deleteTaskError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);
  
    if (deleteTaskError) {
      return c.json({ error: deleteTaskError.message }, 500);
    }
  
    // Create log for task deletion
    const { error: logError } = await supabase
      .from("tasklogs")
      .insert([
        {
          taskId,
          userId: user.id,
          action: "deleted",
          details: "Task deleted",
        },
      ]);
  
    if (logError) {
      return c.json({ error: logError.message }, 500);
    }
  
    // Return the deleted task's ID
    return c.json({ data: { id: task.id } });
  })  
  // .get(
  //   "/",
  //   sessionMiddleware,
  //   zValidator(
  //     "query",
  //     z.object({
  //       workspaceId: z.string(),
  //       projectId: z.string().nullish(),
  //       assigneeId: z.string().nullish(),
  //       status: z.nativeEnum(TaskStatus).nullish(),
  //       search: z.string().nullish(),
  //       dueDate: z.string().nullish(),
  //     })
  //   ),
  //   async (c) => {
  //     const { users } = await createAdminClient();
  //     const databases = c.get("databases");
  //     const user = c.get("user");

  //     const { workspaceId, projectId, status, search, assigneeId, dueDate } =
  //       c.req.valid("query");

  //     const member = await getMember({
  //       databases,
  //       workspaceId,
  //       userId: user.$id,
  //     });

  //     if (!member) {
  //       return c.json({ error: "Unauthorized" }, 401);
  //     }

  //     const query = [
  //       Query.equal("workspaceId", workspaceId),
  //       Query.orderDesc("$createdAt"),
  //     ];

  //     if (projectId) {
  //       console.log("projectId: ", projectId);
  //       query.push(Query.equal("projectId", projectId));
  //     }
  //     if (status) {
  //       console.log("status: ", status);
  //       query.push(Query.equal("status", status));
  //     }
  //     if (assigneeId) {
  //       console.log("assigneeId: ", assigneeId);
  //       query.push(Query.equal("assigneeId", assigneeId));
  //     }
  //     if (dueDate) {
  //       console.log("dueDate: ", dueDate);
  //       query.push(Query.equal("dueDate", dueDate));
  //     }
  //     if (search) {
  //       console.log("search: ", search);
  //       query.push(Query.equal("search", search));
  //     }

  //     const tasks = await databases.listDocuments<Task>(
  //       DATABASE_ID,
  //       TASKS_ID,
  //       query
  //     );

  //     const projectIds = tasks.documents.map((task) => task.projectId);
  //     const assigneeIds = tasks.documents.map((task) => task.assigneeId);

  //     const projects = await databases.listDocuments<Project>(
  //       DATABASE_ID,
  //       PROJECTS_ID,
  //       projectIds.length > 0 ? [Query.contains("$id", projectIds)] : []
  //     );

  //     const members = await databases.listDocuments(
  //       DATABASE_ID,
  //       MEMBERS_ID,
  //       assigneeIds.length > 0 ? [Query.contains("$id", assigneeIds)] : []
  //     );

  //     const assignees = await Promise.all(
  //       members.documents.map(async (member) => {
  //         const user = await users.get(member.userId);

  //         return {
  //           ...member,
  //           name: user.name,
  //           email: user.email,
  //         };
  //       })
  //     );

  //     const populatedTasks = tasks.documents.map((task) => {
  //       const project = projects.documents.find(
  //         (project) => project.$id === task.projectId
  //       );

  //       const assignee = assignees.find(
  //         (assignee) => assignee.$id === task.assigneeId
  //       );

  //       return {
  //         ...task,
  //         project,
  //         assignee,
  //       };
  //     });
  //     return c.json({ data: { ...tasks, documents: populatedTasks } });
  //   }
  // )
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        workspaceId: z.string(),
        projectId: z.string().nullish(),
        assigneeId: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        search: z.string().nullish(),
        dueDate: z.string().nullish(),
      })
    ),
    async (c) => {
      const supabase = c.get("supabase");
      const user = c.get("user");
  
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      
      const { workspaceId, projectId, status, search, assigneeId, dueDate } =
        c.req.valid("query");
  
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
  
      // Prepare the base query for tasks
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("workspaceId", workspaceId)
        .order("createdAt", { ascending: false });
  
      if (projectId) {
        query = query.eq("projectId", projectId);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (assigneeId) {
        query = query.eq("assigneeId", assigneeId);
      }
      if (dueDate) {
        query = query.eq("dueDate", dueDate);
      }
      if (search) {
        query = query.ilike("search", `%${search}%`); // Use `ilike` for case-insensitive search
      }
  
      // Fetch tasks based on the query
      const { data: tasks, error: tasksError } = await query;
  
      if (tasksError) {
        return c.json({ error: tasksError.message }, 500);
      }
  
      const projectIds = tasks.map((task) => task.projectId);
      const assigneeIds = tasks.map((task) => task.assigneeId);
  
      // Fetch projects related to the tasks
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds);
  
      if (projectsError) {
        return c.json({ error: projectsError.message }, 500);
      }
  
      // Fetch members (assignees) related to the tasks
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("*")
        .in("id", assigneeIds);
  
      if (membersError) {
        return c.json({ error: membersError.message }, 500);
      }
  
      // Map assignees to their user details
      const assignees = await Promise.all(
        members.map(async (member) => {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("name, email")
            .eq("id", member.userId)
            .single();
  
          if (userError) {
            return { ...member, name: "Unknown", email: "Unknown" }; // Handle missing user details
          }
  
          return {
            ...member,
            name: userData.name,
            email: userData.email,
          };
        })
      );
  
      // Populate tasks with associated project and assignee details
      const populatedTasks = tasks.map((task) => {
        const project = projects.find((project) => project.id === task.projectId);
        const assignee = assignees.find((assignee) => assignee.id === task.assigneeId);
  
        return {
          ...task,
          project,
          assignee,
        };
      });
  
      return c.json({ data: { documents: populatedTasks } });
    }
  )  
  // .patch(
  //   "/:taskId",
  //   sessionMiddleware,
  //   zValidator("form", createTaskSchema.partial()),
  //   async (c) => {
  //     const user = c.get("user");
  //     const databases = c.get("databases");
  //     const storage = c.get("storage");
  //     const formData = await c.req.formData();

  //     const name = formData.get("name") as string;
  //     const status = formData.get("status") as TaskStatus;
  //     const projectId = formData.get("projectId") as string;
  //     const dueDate = formData.get("dueDate") as string;
  //     const assigneeId = formData.get("assigneeId") as string;
  //     const description = formData.get("description") as string | null;
  //     const attachments = formData.getAll("attachments") as File[];

  //     const { taskId } = c.req.param();

  //     const existingTask = await databases.getDocument<Task>(
  //       DATABASE_ID,
  //       TASKS_ID,
  //       taskId
  //     );

  //     const member = await getMember({
  //       databases,
  //       workspaceId: existingTask.workspaceId,
  //       userId: user.$id,
  //     });

  //     if (!member) {
  //       return c.json({ error: "Unauthorized" }, 401);
  //     }

  //     // Handle new attachments if any
  //     if (attachments && attachments.length > 0) {
  //       for (const file of attachments) {
  //         if (file instanceof File) {
  //           const fileId = ID.unique();
  //           await storage.createFile(ATTACHMENTS_BUCKET_ID, fileId, file);
            
  //           let fileUrl;
  //           if (file.type.startsWith('image/')) {
  //             const arrayBuffer = await storage.getFilePreview(ATTACHMENTS_BUCKET_ID, fileId);
  //             fileUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
  //           } else {
  //             const arrayBuffer = await storage.getFileDownload(ATTACHMENTS_BUCKET_ID, fileId);
  //             fileUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
  //           }
            
  //           await databases.createDocument(
  //             DATABASE_ID,
  //             TASK_ATTACHMENT_ID,
  //             ID.unique(),
  //             {
  //               taskId,
  //               fileId,
  //               fileName: file.name,
  //               fileType: file.type,
  //               fileUrl,
  //             }
  //           );
  //         }
  //       }
  //     }

  //     const task = await databases.updateDocument<Task>(
  //       DATABASE_ID,
  //       TASKS_ID,
  //       taskId,
  //       {
  //         name,
  //         status,
  //         projectId,
  //         dueDate,
  //         assigneeId,
  //         description,
  //       }
  //     );

  //     // Create log for task update
  //     await databases.createDocument(
  //       DATABASE_ID,
  //       TASKLOGS_ID,
  //       ID.unique(),
  //       {
  //         taskId,
  //         userId: user.$id,
  //         action: "updated",
  //         details: "Task updated"
  //       }
  //     );

  //     return c.json({ data: task });
  //   }
  // )
  .patch(
    "/:taskId",
    zValidator("form", createTaskSchema.partial()),
    async (c) => {
      const supabase = c.get("supabase");
      const user = c.get("user");
      const formData = await c.req.formData();

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
  
      const name = formData.get("name") as string;
      const status = formData.get("status") as TaskStatus;
      const projectId = formData.get("projectId") as string;
      const dueDate = formData.get("dueDate") as string;
      const assigneeId = formData.get("assigneeId") as string;
      const description = formData.get("description") as string | null;
      const attachments = formData.getAll("attachments") as File[];
  
      const { taskId } = c.req.param();
  
      // Fetch the existing task
      const { data: existingTask, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();
  
      if (taskError || !existingTask) {
        return c.json({ error: "Task not found" }, 404);
      }
  
      // Check if the user is a member of the workspace
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("workspaceId", existingTask.workspaceId)
        .eq("userId", user.id)
        .single();
  
      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
  
      // Handle new attachments if any
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (file instanceof File) {
            const fileId = ID.unique(); // Assuming you have a method to generate unique IDs
            
            // Upload the file to Supabase storage
            const { data, error: uploadError } = await supabase.storage
              .from("attachments") // Assuming 'attachments' is the storage bucket
              .upload(fileId, file);
  
            if (uploadError) {
              console.error(`Failed to upload file ${file.name}:`, uploadError.message);
              continue;
            }
  
            let fileUrl: string;
            if (file.type.startsWith("image/")) {
              const { data: previewData } = await supabase.storage
                .from("storages")
                .getPublicUrl(fileId);
  
              fileUrl = previewData.publicUrl
            } else {
              const { data: fileData, error: downloadError } = await supabase.storage
                .from("storages")
                .download(fileId);
  
              if (downloadError) {
                console.error("Failed to download file:", downloadError.message);
                continue;
              }
  
              fileUrl = '';
            }
  
            // Create a record for the attachment in the "task_attachments" table
            const { error: attachmentError } = await supabase
              .from("task_attachments")
              .insert([
                {
                  taskId,
                  fileId,
                  fileName: file.name,
                  fileType: file.type,
                  fileUrl,
                },
              ]);
  
            if (attachmentError) {
              console.error("Failed to save attachment record:", attachmentError.message);
            }
          }
        }
      }
  
      // Update the task details
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          name,
          status,
          projectId,
          dueDate,
          assigneeId,
          description,
        })
        .eq("id", taskId);
  
      if (updateError) {
        return c.json({ error: updateError.message }, 500);
      }
  
      // Create a log for the task update
      const { error: logError } = await supabase
        .from("tasklogs")
        .insert([
          {
            taskId,
            userId: user.id,
            action: "updated",
            details: "Task updated",
          },
        ]);
  
      if (logError) {
        return c.json({ error: logError.message }, 500);
      }
  
      // Return the updated task details
      return c.json({ data: { id: existingTask.id, name, status, assigneeId, dueDate, projectId, description } });
    }
  )  
  // .post(
  //   "/",
  //   sessionMiddleware,
  //   zValidator("form", createTaskSchema),
  //   async (c) => {
  //     const user = c.get("user");
  //     const databases = c.get("databases");
  //     const storage = c.get("storage");
  //     const formData = await c.req.formData();

  //     // Retrieve fields
  //     const name = formData.get("name") as string;
  //     const status = formData.get("status") as TaskStatus;
  //     const workspaceId = formData.get("workspaceId") as string;
  //     const projectId = formData.get("projectId") as string;
  //     const assigneeId = formData.get("assigneeId") as string;
  //     const dueDate = formData.get("dueDate") as string;
  //     const description = formData.get("description") as string;

  //     // Process attachments (normalize to always be an array)
  //     const files = formData.getAll("attachments");
  //     const normalizedFiles = Array.isArray(files) ? files : [files]; // Ensure it's always an array
  //     const attachments = [];

  //     for (const file of normalizedFiles) {
  //       if (file instanceof File) {
  //         const fileId = ID.unique();
  //         await storage.createFile(ATTACHMENTS_BUCKET_ID, fileId, file);
          
  //         let fileUrl;
  //         if (file.type.startsWith('image/')) {
  //           const arrayBuffer = await storage.getFilePreview(ATTACHMENTS_BUCKET_ID, fileId);
  //           fileUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
  //         } else {
  //           const arrayBuffer = await storage.getFileDownload(ATTACHMENTS_BUCKET_ID, fileId);
  //           fileUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
  //         }
          
  //         attachments.push({
  //           taskId: "", // Will be updated after task creation
  //           fileId,
  //           fileName: file.name,
  //           fileType: file.type,
  //           fileUrl
  //         });
  //       }
  //     }

  //     // Determine new position if needed (or use existing logic)
  //     const highestPositionTask = await databases.listDocuments(
  //       DATABASE_ID,
  //       TASKS_ID,
  //       [
  //         Query.equal("status", status),
  //         Query.equal("workspaceId", workspaceId),
  //         Query.orderAsc("position"),
  //         Query.limit(1),
  //       ]
  //     );

  //     const newPosition =
  //       highestPositionTask.documents.length > 0
  //         ? highestPositionTask.documents[0].position + 1000
  //         : 1000;

  //     // Create task document including attachments field if needed
  //     const task = await databases.createDocument(
  //       DATABASE_ID,
  //       TASKS_ID,
  //       ID.unique(),
  //       {
  //         name,
  //         status,
  //         workspaceId,
  //         projectId,
  //         assigneeId,
  //         dueDate,
  //         description,
  //         position: newPosition,
  //       }
  //     );

  //     // Now create attachment records with the task ID
  //     for (const attachment of attachments) {
  //       attachment.taskId = task.$id;
  //       await databases.createDocument(
  //         DATABASE_ID,
  //         TASK_ATTACHMENT_ID,
  //         ID.unique(),
  //         attachment
  //       );
  //     }

  //     // Log activity for creation
  //     await databases.createDocument(
  //       DATABASE_ID,
  //       TASKLOGS_ID,
  //       ID.unique(),
  //       {
  //         taskId: task.$id,
  //         action: "created",
  //         userId: user.$id,
  //         details: `Created task "${name}" withattachment(s)`,
  //       }
  //     );

  //     return c.json({ data: task });
  //   }
  // )
  .post(
    "/",
    zValidator("form", createTaskSchema),
    async (c) => {
      const supabase = c.get("supabase");
      const user = c.get("user");
      const formData = await c.req.formData();
  
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Retrieve fields from the form
      const name = formData.get("name") as string;
      const status = formData.get("status") as TaskStatus;
      const workspaceId = formData.get("workspaceId") as string;
      const projectId = formData.get("projectId") as string;
      const assigneeId = formData.get("assigneeId") as string;
      const dueDate = formData.get("dueDate") as string;
      const description = formData.get("description") as string;
  
      // Process attachments (normalize to always be an array)
      const files = formData.getAll("attachments");
      const normalizedFiles = Array.isArray(files) ? files : [files]; // Ensure it's always an array
      const attachments = [];
  
      // Handle file uploads and create attachment records
      for (const file of normalizedFiles) {
        if (file instanceof File) {
          const fileId = ID.unique();
  
          // Upload file to Supabase Storage
          const { data, error: uploadError } = await supabase.storage
            .from("attachments")
            .upload(fileId, file);
  
          if (uploadError) {
            console.error(`Failed to upload file ${file.name}:`, uploadError.message);
            continue;
          }
  
          // Generate file URL
          let fileUrl;
          if (file.type.startsWith('image/')) {
            const { data: previewData } = await supabase.storage
              .from("attachments")
              .getPublicUrl(fileId);
  
            fileUrl = previewData.publicUrl;
          } else {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from("attachments")
              .download(fileId);
  
            if (downloadError) {
              console.error("Failed to download file:", downloadError.message);
              continue;
            }
  
            fileUrl = ``;
          }
  
          // Store the attachment details
          attachments.push({
            taskId: "", // Will be updated after task creation
            fileId,
            fileName: file.name,
            fileType: file.type,
            fileUrl,
          });
        }
      }
  
      // Determine the new position for the task
      const { data: highestPositionTask, error: highestPositionError } = await supabase
        .from("tasks")
        .select("position")
        .eq("status", status)
        .eq("workspaceId", workspaceId)
        .order("position", { ascending: true })
        .limit(1);
  
      if (highestPositionError) {
        return c.json({ error: highestPositionError.message }, 500);
      }
  
      const newPosition = highestPositionTask.length > 0
        ? highestPositionTask[0].position + 1000
        : 1000;
  
      // Create the task document in the tasks table
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert([
          {
            name,
            status,
            workspaceId,
            projectId,
            assigneeId,
            dueDate,
            description,
            position: newPosition,
          },
        ]).select()
        .single();
  
      if (taskError) {
        return c.json({ error: taskError.message }, 500);
      }
  
      // Now create attachment records with the task ID
      for (const attachment of attachments) {
        attachment.taskId = task.id; // Assign the task ID to each attachment
        const { error: attachmentError } = await supabase
          .from("task_attachments")
          .insert([
            {
              taskId: task.id,
              fileId: attachment.fileId,
              fileName: attachment.fileName,
              fileType: attachment.fileType,
              fileUrl: attachment.fileUrl,
            },
          ]);
  
        if (attachmentError) {
          console.error("Failed to save attachment record:", attachmentError.message);
        }
      }
  
      // Log activity for task creation
      const { error: logError } = await supabase
        .from("tasklogs")
        .insert([
          {
            taskId: task.id,
            action: "created",
            userId: user.id,
            details: `Created task "${name}" with attachment(s)`,
          },
        ]);
  
      if (logError) {
        return c.json({ error: logError.message }, 500);
      }
  
      // Return the created task
      return c.json({ data: task });
    }
  )  
  // .get("/:taskId", async (c) => {
  //   const currentUser = c.get("user");
  //   const databases = c.get("databases");
  //   const { users } = await createAdminClient();
  //   const { taskId } = await c.req.param();

  //   // Fetch task details
  //   const task = await databases.getDocument<Task>(
  //     DATABASE_ID,
  //     TASKS_ID,
  //     taskId
  //   );

  //   // Check if the user is authorized to access the task
  //   const currentMember = await getMember({
  //     databases,
  //     workspaceId: task.workspaceId,
  //     userId: currentUser.$id,
  //   });

  //   if (!currentMember) {
  //     return c.json({ error: "Unauthorized" }, 401);
  //   }

  //   // Fetch project details
  //   const project = await databases.getDocument<Project>(
  //     DATABASE_ID,
  //     PROJECTS_ID,
  //     task.projectId
  //   );

  //   // Fetch assignee details
  //   const member = await databases.getDocument(
  //     DATABASE_ID,
  //     MEMBERS_ID,
  //     task.assigneeId
  //   );

  //   const user = await users.get(member.userId);

  //   const assignee = { ...member, name: user.name, email: user.email };

  //   // Fetch attachments for the task
  //   const attachments = await databases.listDocuments(
  //     DATABASE_ID,
  //     TASK_ATTACHMENT_ID,
  //     [Query.equal("taskId", taskId)]
  //   );

  //   // Return task details along with project, assignee, and attachments
  //   return c.json({
  //     data: {
  //       ...task,
  //       project,
  //       assignee,
  //       attachments: attachments.documents, // Include attachments here
  //     },
  //   });
  // })
  .get("/:taskId", async (c) => {
    const supabase = c.get("supabase");
    const currentUser = c.get("user");
    const { taskId } = await c.req.param();
  
    if (!currentUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    // Fetch task details
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();
  
    if (taskError || !task) {
      return c.json({ error: "Task not found" }, 404);
    }
  
    // Check if the user is authorized to access the task
    const { data: currentMember, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", task.workspaceId)
      .eq("userId", currentUser.id)
      .single();
  
    if (memberError || !currentMember) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", task.projectId)
      .single();
  
    if (projectError || !project) {
      return c.json({ error: "Project not found" }, 404);
    }
  
    // Fetch assignee details
    const { data: member, error: memberFetchError } = await supabase
      .from("members")
      .select("*")
      .eq("id", task.assigneeId)
      .single();
  
    if (memberFetchError || !member) {
      return c.json({ error: "Assignee not found" }, 404);
    }
  
    // Fetch user details for the assignee
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", member.userId)
      .single();
  
    if (userError || !user) {
      return c.json({ error: "User not found" }, 404);
    }
  
    // Prepare assignee data
    const assignee = { ...member, name: user.name, email: user.email };
  
    // Fetch attachments for the task
    const { data: attachments, error: attachmentsError } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("taskId", taskId);
  
    if (attachmentsError) {
      return c.json({ error: "Error fetching attachments" }, 500);
    }
  
    // Return task details along with project, assignee, and attachments
    return c.json({
      data: {
        ...task,
        project,
        assignee,
        attachments,
      },
    });
  })
  
  // .post(
  //   "/bulk-update",
  //   sessionMiddleware,
  //   zValidator(
  //     "json",
  //     z.object({
  //       tasks: z.array(
  //         z.object({
  //           $id: z.string(),
  //           status: z.nativeEnum(TaskStatus),
  //           position: z.number().int().positive().min(1000).max(1_000_000),
  //         })
  //       ),
  //     })
  //   ),
  //   async (c) => {
  //     const databases = c.get("databases");
  //     const user = c.get("user");
  //     const { tasks } = await c.req.valid("json");

  //     const tasksToUpdate = await databases.listDocuments<Task>(
  //       DATABASE_ID,
  //       TASKS_ID,
  //       [
  //         Query.contains(
  //           "$id",
  //           tasks.map((task) => task.$id)
  //         ),
  //       ]
  //     );

  //     const workspaceIds = new Set(
  //       tasksToUpdate.documents.map((task) => task.workspaceId)
  //     );
  //     if (workspaceIds.size !== 1) {
  //       return c.json(
  //         { error: "All tasks must belong to the same workspaceId" },
  //         400
  //       );
  //     }

  //     const workspaceId = workspaceIds.values().next().value;

  //     if (workspaceId === undefined) {
  //       return c.json({ error: "No workspaceId found" }, 400);
  //     }
      
  //     const member = await getMember({
  //       databases,
  //       workspaceId,
  //       userId: user.$id,
  //     });

  //     if (!member) {
  //       return c.json({ error: "Unauthorized" }, 401);
  //     }

  //     const updatedTasks = await Promise.all(
  //       tasks.map(async (task) => {
  //         const { $id, status, position } = task;
  //         return databases.updateDocument<Task>(DATABASE_ID, TASKS_ID, $id, {
  //           status,
  //           position,
  //         });
  //       })
  //     );
  //     return c.json({ data: updatedTasks });
  //   }
  // )
  // Comments routes
  // .post(
  //   "/:taskId/comments",
  //   zValidator("json", z.object({
  //     content: z.string().min(1)
  //   })),
  //   async (c) => {
  //     const { taskId } = c.req.param();
  //     const { content } = c.req.valid("json");
  //     const databases = c.get("databases");
  //     const user = c.get("user");

  //     const comment = await databases.createDocument(
  //       DATABASE_ID,
  //       COMMENTS_ID,
  //       ID.unique(),
  //       {
  //         taskId,
  //         userId: user.$id,
  //         content
  //       }
  //     );

  //     // Create log for comment
  //     await databases.createDocument(
  //       DATABASE_ID,
  //       TASKLOGS_ID,
  //       ID.unique(),
  //       {
  //         taskId,
  //         userId: user.$id,
  //         action: "commented",
  //         details: "User commented on task",
  //       }
  //     );

  //     return c.json({ data: comment });
  //   }
  // )
  .post(
    "/:taskId/comments",
    zValidator("json", z.object({
      content: z.string().min(1),
    })),
    async (c) => {
      const supabase = c.get("supabase");
      const { taskId } = c.req.param();
      const { content } = c.req.valid("json");
      const user = c.get("user");
  
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Create a comment for the task
      const { data: comment, error: commentError } = await supabase
        .from("comments")
        .insert([
          {
            taskId,
            userId: user.id,
            content,
          },
        ])
        .single(); // Use .single() to ensure a single row is returned
  
      if (commentError) {
        return c.json({ error: commentError.message }, 500);
      }
  
      // Create a log for the comment
      const { error: logError } = await supabase
        .from("tasklogs")
        .insert([
          {
            taskId,
            userId: user.id,
            action: "commented",
            details: "User commented on task",
          },
        ]);
  
      if (logError) {
        return c.json({ error: logError.message }, 500);
      }
  
      // Return the created comment
      return c.json({ data: comment });
    }
  )  
  // .get(
  //   "/:taskId/comments",
  //   sessionMiddleware,
  //   async (c) => {
  //     const { taskId } = c.req.param();
  //     const { users } = await createAdminClient();
  //     const databases = c.get("databases");

  //     const comments = await databases.listDocuments<TaskComment>(
  //       DATABASE_ID,
  //       COMMENTS_ID,
  //       [Query.equal("taskId", taskId)]
  //     );

  //     const populatedComments = await Promise.all(
  //       comments.documents.map(async (comment) => {
  //         const user = await users.get(comment.userId);
  //         return {
  //           ...comment,
  //           user: {
  //             name: user.name,
  //             imageUrl: user.prefs.avatarUrl,
  //           },
  //         };
  //       })
  //     );

  //     return c.json({ data: populatedComments });
  //   }
  // )
  .get(
    "/:taskId/comments",
    async (c) => {
      const supabase = c.get("supabase");
      const user = c.get("user");
      const { taskId } = c.req.param();
  
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Fetch comments for the specified task
      const { data: comments, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("taskId", taskId);
  
      if (commentsError) {
        return c.json({ error: commentsError.message }, 500);
      }
  
      // Fetch user details for each comment's userId
      const populatedComments = await Promise.all(
        comments.map(async (comment) => {
          // Fetch user data for the comment's userId
          const { data: user, error: userError } = await supabase
            .from("users")
            .select("name, prefs")
            .eq("id", comment.userId)
            .single();
  
          if (userError || !user) {
            return { ...comment, user: { name: "Unknown", imageUrl: "" } };
          }
  
          return {
            ...comment,
            user: {
              name: user.name,
              imageUrl: user.prefs?.avatarUrl || "", // Handle potential nullish value for avatarUrl
            },
          };
        })
      );
  
      return c.json({ data: populatedComments });
    }
  )  
  // Task Logs routes
  // .get(
  //   "/:taskId/logs",
  //   sessionMiddleware,
  //   async (c) => {
  //     const { taskId } = c.req.param();
  //     const { users } = await createAdminClient();
  //     const databases = c.get("databases");

  //     const logs = await databases.listDocuments(
  //       DATABASE_ID,
  //       TASKLOGS_ID,
  //       [
  //         Query.equal("taskId", taskId),
  //         Query.orderDesc("$createdAt")
  //       ]
  //     );

  //     const populatedLogs = await Promise.all(
  //       logs.documents.map(async (log) => {
  //         const user = await users.get(log.userId);
  //         return {
  //           ...log,
  //           user: {
  //             name: user.name,
  //             imageUrl: user.prefs.avatarUrl,
  //           },
  //         };
  //       })
  //     );

  //     return c.json({ data: populatedLogs });
  //   }
  // );
  .get(
    "/:taskId/logs",
    async (c) => {
      const supabase = c.get("supabase");
      const { taskId } = c.req.param();
      const user = c.get("user");
      
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      // Fetch task logs for the specified taskId and order by creation date
      const { data: logs, error: logsError } = await supabase
        .from("tasklogs")
        .select("*")
        .eq("taskId", taskId)
        .order("createdAt", { ascending: false });
  
      if (logsError) {
        return c.json({ error: logsError.message }, 500);
      }
  
      // Fetch user details for each log's userId
      const populatedLogs = await Promise.all(
        logs.map(async (log) => {
          // Fetch user data for the comment's userId
          const { data: user, error: userError } = await supabase
            .from("users")
            .select("name, prefs")
            .eq("id", log.userId)
            .single();
  
          if (userError || !user) {
            return { ...log, user: { name: "Unknown", imageUrl: "" } };
          }
  
          return {
            ...log,
            user: {
              name: user.name,
              imageUrl: user.prefs?.avatarUrl || "", // Handle potential nullish value for avatarUrl
            },
          };
        })
      );
  
      return c.json({ data: populatedLogs });
    }
  );
  

export default app;
