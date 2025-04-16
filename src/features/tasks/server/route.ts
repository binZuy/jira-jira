/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseMiddleware } from "@/lib/supabase-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTaskSchema } from "../schemas";
import { z } from "zod";
import { Action, TaskStatus } from "@/lib/types/enums";

const app = new Hono()
  .use("*", supabaseMiddleware())
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

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, workspaceId")
      .eq("id", task.projectId)
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

    // Fetch all attachments related to the task
    const { data: attachments, error: attachmentsError } = await supabase
      .from("attachments")
      .delete()
      .eq("taskId", taskId)
      .select();

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
          console.error(
            `Failed to delete file ${attachment.fileId}:`,
            deleteFileError.message
          );
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
          console.error(
            `Failed to delete attachment record ${attachment.id}:`,
            deleteRecordError.message
          );
        }
      } catch (error) {
        console.error(
          `Failed to delete attachment record ${attachment.id}:`,
          error
        );
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
    const { error: logError } = await supabase.from("tasklogs").insert([
      {
        taskId,
        userId: user.id,
        action: Action.DELETED,
        details: {
          taskId: taskId,
        },
      },
    ]);

    if (logError) {
      return c.json({ error: logError.message }, 500);
    }

    // Return the deleted task's ID
    return c.json({ data: { id: task.id } });
  })
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
  
      // Prepare the base query for tasks and include related project and assignee data
      let query = supabase
        .from("tasks")
        .select("*, projects(id, workspaceId, name)")
        .eq("projects.workspaceId", workspaceId)
        .order("created_at", { ascending: false });
  
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
  
      // Fetch tasks along with associated projects and members (assignees)
      const { data: tasks, error: tasksError } = await query;
  
      if (tasksError) {
        return c.json({ error: tasksError.message }, 500);
      }

      const listtasks = await Promise.all(
        tasks.map(async (task) => {
          const { data: assignee } = await supabase.from("members").select("id, userId, name, email").eq("userId", task.assigneeId).single();
          return {
            ...task,
            assignee,
          }
        })
      );
      // Return populated tasks (the projects and assignees are already embedded in the task objects)
      return c.json({ data: listtasks });
    }
  )
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

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, workspaceId")
        .eq("id", existingTask.projectId)
        .single();

      if ( projectError || !project ) {
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

      // Handle new attachments if any
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (file instanceof File) {
              const filePath = `${user.id}/${Date.now()}-${file.name}`; // Unique file path based on user and timestamp
            const { error: uploadError } = await supabase.storage
              .from("storages") // Assuming 'attachments' is the storage bucket
              .upload(filePath, file);

            if (uploadError) {
              console.error(
                `Failed to upload file ${file.name}:`,
                uploadError.message
              );
              continue;
            }

            let fileUrl: string;
            if (file.type.startsWith("image/")) {
              const { data: previewData } = await supabase.storage
                .from("storages")
                .getPublicUrl(filePath);

              fileUrl = previewData.publicUrl;
            } else {
              const { error: downloadError } =
                await supabase.storage.from("storages").download(filePath);

              if (downloadError) {
                console.error(
                  "Failed to download file:",
                  downloadError.message
                );
                continue;
              }

              fileUrl = "";
            }

            // Create a record for the attachment in the "task_attachments" table
            const { error: attachmentError } = await supabase
              .from("attachments")
              .insert([
                {
                  taskId,
                  filePath,
                  fileName: file.name,
                  fileType: file.type,
                  fileUrl,
                },
              ]);

            if (attachmentError) {
              console.error(
                "Failed to save attachment record:",
                attachmentError.message
              );
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
      const { error: logError } = await supabase.from("tasklogs").insert([
        {
          taskId,
          userId: user.id,
          action: Action.UPDATED,
          details: {
            name,
            status,
            assigneeId,
            dueDate,
            projectId,
            description,
          },
        },
      ]);

      if (logError) {
        return c.json({ error: logError.message }, 500);
      }

      // Return the updated task details
      return c.json({
        data: {
          id: existingTask.id,
          name,
          status,
          assigneeId,
          dueDate,
          projectId,
          description,
        },
      });
    }
  )
  .post("/", zValidator("form", createTaskSchema), async (c) => {
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
        const filePath = `${user.id}/${Date.now()}-${file.name}`; // Unique file path based on user and timestamp

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(filePath, file);

        if (uploadError) {
          console.error(
            `Failed to upload file ${file.name}:`,
            uploadError.message
          );
          continue;
        }

        // Generate file URL
        let fileUrl;
        if (file.type.startsWith("image/")) {
          const { data: previewData } = await supabase.storage
            .from("storages")
            .getPublicUrl(filePath);

          fileUrl = previewData.publicUrl;
        } else {
          const { error: downloadError } =
            await supabase.storage.from("storages").download(filePath);

          if (downloadError) {
            console.error("Failed to download file:", downloadError.message);
            continue;
          }

          fileUrl = ``;
        }

        // Store the attachment details
        attachments.push({
          taskId: "", // Will be updated after task creation
          filePath,
          fileName: file.name,
          fileType: file.type,
          fileUrl,
        });
      }
    }

    // Determine the new position for the task
    const { data: highestPositionTask, error: highestPositionError } =
      await supabase
        .from("tasks")
        .select("position, projectId, projects(id, workspaceId)")
        .eq("projects.id", projectId)
        .eq("status", status)
        .eq("projects.workspaceId", workspaceId)
        .order("position", { ascending: true })
        .limit(1);

    if (highestPositionError) {
      return c.json({ error: highestPositionError.message }, 500);
    }

    const newPosition =
      highestPositionTask.length > 0
        ? highestPositionTask[0].position + 1000
        : 1000;

    // Create the task document in the tasks table
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert([
        {
          name,
          status,
          projectId,
          assigneeId,
          dueDate,
          description,
          position: newPosition,
        },
      ])
      .select()
      .single();

    if (taskError) {
      return c.json({ error: taskError.message }, 500);
    }

    // Now create attachment records with the task ID
    for (const attachment of attachments) {
      attachment.taskId = task.id; // Assign the task ID to each attachment
      const { error: attachmentError } = await supabase
        .from("attachments")
        .insert([
          {
            taskId: task.id,
            filePath: attachment.filePath,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileUrl: attachment.fileUrl,
          },
        ]);

      if (attachmentError) {
        console.error(
          "Failed to save attachment record:",
          attachmentError.message
        );
      }
    }

    // Log activity for task creation
    const { error: logError } = await supabase.from("tasklogs").insert([
      {
        taskId: task.id,
        action: Action.CREATED,
        userId: user.id,
        details: {
          name,
          status,
          workspaceId,
          projectId,
          assigneeId,
          dueDate,
          description,
        },
      },
    ]);

    if (logError) {
      return c.json({ error: logError.message }, 500);
    }

    // Return the created task
    return c.json({ data: task });
  })
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

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", task.projectId)
      .single();

    if (projectError || !project) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Check if the user is authorized to access the task
    const { data: currentMember, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("workspaceId", project.workspaceId)
      .eq("userId", currentUser.id)
      .single();

    if (memberError || !currentMember) {
      return c.json({ error: "Unauthorized" }, 401);
    }


    // Fetch assignee details
    const { data: assignee, error: memberFetchError } = await supabase
      .from("members")
      .select("*")
      .eq("userId", task.assigneeId)
      .single();

    if (memberFetchError || !assignee) {
      return c.json({ error: "Assignee not found" }, 404);
    }

    // Fetch attachments for the task
    const { data: attachments, error: attachmentsError } = await supabase
      .from("attachments")
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
  .post(
    "/bulk-update",
    zValidator(
      "json",
      z.object({
        tasks: z.array(
          z.object({
            id: z.string(),
            status: z.nativeEnum(TaskStatus),
            position: z.number().int().positive().min(1000).max(1_000_000),
          })
        ),
      })
    ),
    async (c) => {
      const supabase = c.get("supabase");
      const user = c.get("user");
      const { tasks } = await c.req.valid("json");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
  
      // Fetch tasks from Supabase
      const { data: tasksToUpdate, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .in("id", tasks.map((task) => task.id));
  
      if (tasksError) {
        return c.json({ error: tasksError.message }, 500);
      }
  
      const workspaceIds = Array.from(new Set(tasksToUpdate.map((task) => task.workspaceId)));
      if (workspaceIds.length !== 1) {
        return c.json({ error: "All tasks must belong to the same workspaceId" }, 400);
      }
      
      const workspaceId = workspaceIds[0];
      if (!workspaceId) {
        return c.json({ error: "No workspaceId found" }, 400);
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
  
      // Update tasks
      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const { id, status, position } = task;
          const { error: updateError } = await supabase
            .from("tasks")
            .update({ status, position })
            .eq("id", id);
          if (updateError) {
            return { error: updateError.message };
          }
          return { id, status, position };
        })
      );
  
      return c.json({ data: updatedTasks });
    }
  )
  .post(
    "/:taskId/comments",
    zValidator(
      "json",
      z.object({
        content: z.string().min(1),
      })
    ),
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
        ]).select()
        .single(); // Use .single() to ensure a single row is returned

      if (commentError) {
        return c.json({ error: commentError.message }, 500);
      }

      // Create a log for the comment
      const { error: logError } = await supabase.from("tasklogs").insert([
        {
          taskId,
          userId: user.id,
          action: Action.COMMENTED,
          details: {
            commentId: comment.id,
            content: comment.content,
          },
        },
      ]);

      if (logError) {
        return c.json({ error: logError.message }, 500);
      }

      // Return the created comment
      return c.json({ data: comment });
    }
  )
  .get("/:taskId/comments", async (c) => {
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

    // Fetch user details for each comment's userId from the members table
    const commentUserIds = comments.map(comment => comment.userId);

    // Fetch members (who are also users) related to the comments
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, userId, name, email, avatar_url") // Fetch the necessary fields from members table
      .in("userId", commentUserIds);

    if (membersError) {
      return c.json({ error: membersError.message }, 500);
    }

    // Map member data to comments by userId
    const memberMap = members.reduce((acc: Record<string, any>, member) => {
      acc[member.userId] = {
        name: member.name,
        imageUrl: member.avatar_url || "",
      };
      return acc;
    }, {});

    // Populate comments with user data (name and imageUrl)
    const populatedComments = comments.map((comment) => {
      const user = memberMap[comment.userId] || { name: "Unknown", imageUrl: "" };
      return {
        ...comment,
        user,
      };
    });

    return c.json({ data: populatedComments });
  })
  .get("/:taskId/logs", async (c) => {
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
      .order("created_at", { ascending: false });

    if (logsError) {
        return c.json({ error: logsError.message }, 500);
    }

    // Fetch user details (from members table) for each log's userId
    const logUserIds = logs.map((log) => log.userId);

    // Fetch members (who are also users) related to the logs
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, userId, name, email, avatar_url") // Fetch the necessary fields from members table
      .in("userId", logUserIds);

    if (membersError) {
        return c.json({ error: membersError.message }, 500);
    }

    // Map member data to logs by userId
    const memberMap = members.reduce((acc: Record<string, any>, member) => {
        acc[member.userId] = {
            name: member.name,
            imageUrl: member.avatar_url || "", // Handle potential nullish value for avatarUrl
        };
        return acc;
    }, {});

    // Populate logs with user data (name and imageUrl)
    const populatedLogs = logs.map((log) => {
        const user = memberMap[log.userId] || { name: "Unknown", imageUrl: "" };
        return {
            ...log,
            user,
        };
    });

    return c.json({ data: populatedLogs });
});


export default app;
