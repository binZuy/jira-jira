/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseMiddleware } from "@/lib/supabase-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTaskSchema } from "../schemas";
import { z } from "zod";
import { Action, TaskStatus, Priority } from "@/lib/types/enums";

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

    // Delete the task after creating the log
    const { error: deleteTaskError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteTaskError) {
      return c.json({ error: deleteTaskError.message }, 500);
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
        roomId: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        search: z.string().nullish(),
        priority: z.nativeEnum(Priority).nullish(),
        dueDate: z.string().nullish(),
      })
    ),
    async (c) => {
      const supabase = c.get("supabase");
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const {
        workspaceId,
        projectId,
        status,
        search,
        assigneeId,
        roomId,
        dueDate,
        priority,
      } = c.req.valid("query");

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

      // There are two ways to get tasks from a workspace:
      // 1. Direct query using the workspace relationship (more efficient)
      // 2. Query tasks through projects (what we're currently doing)
      
      // Initialize the query - we'll use a join approach with tasks and projects
      let query = supabase
        .from("tasks")
        .select("*, projects!inner(id, workspaceId, name)")
        .eq("projects.workspaceId", workspaceId)
        .order("created_at", { ascending: false });
      
      // This approach uses a join with the projects table rather than
      // fetching all project IDs first and then using an IN clause
      // It's more efficient as it's a single query instead of two

      if (projectId) {
        query = query.eq("projectId", projectId);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (priority) {
        query = query.eq("priority", priority);
      }
      if (assigneeId) {
        query = query.eq("assigneeId", assigneeId);
      }
      if (roomId) {
        query = query.eq("roomId", Number(roomId));
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

      console.log("tasks", tasks);
      const listtasks = await Promise.all(
        tasks.map(async (task) => {
          const { data: assignee } = await supabase
            .from("members")
            .select("id, userId, name, email,role")
            .eq("userId", task.assigneeId)
            .eq("workspaceId", workspaceId)
            .single();
          return {
            ...task,
            assignee,
          };
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
      const roomId = formData.get("roomId") as string;
      const assigneeId = formData.get("assigneeId") as string;
      const description = formData.get("description") as string | null;
      // const attachments = formData.getAll("attachments") as File[];
      const priority = formData.get("priority") as Priority;
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

      // Initialize update object with provided fields
      const updateData: Record<string, any> = {};
      
      // Add basic fields if provided
      if (name) updateData.name = name;
      if (status) updateData.status = status;
      if (projectId) updateData.projectId = projectId;
      if (dueDate) updateData.dueDate = dueDate;
      if (description !== undefined) updateData.description = description;
      if (priority) updateData.priority = priority;
      
      // Handle room data if roomId is provided
      if (roomId) {
        const { data: room } = await supabase
          .from("rooms")
          .select("id, roomNumber, roomType")
          .eq("id", Number(roomId))
          .single();
          
        if (!room) {
          return c.json({ error: "Room not found" }, 404);
        }
        
        updateData.roomId = room.id;
        updateData.roomNumber = room.roomNumber;
        updateData.roomType = room.roomType;
      }

      // Handle assignee data if assigneeId is provided
      if (assigneeId) {
        const { data: assignee } = await supabase
          .from("members")
          .select("name")
          .eq("userId", assigneeId)
          .single();
            
        if (!assignee) {
          return c.json({ error: "Assignee not found" }, 404);
        }
        
        updateData.assigneeId = assigneeId;
        updateData.assigneeName = assignee.name;
      }
        
      // Update the task details
      const { error: updateError } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);

      if (updateError) {
        return c.json({ error: updateError.message }, 500);
      }

      // Create a log for the task update
      const { error: logError } = await supabase.from("logs").insert([
        {
          taskId,
          userId: user.id,
          action: Action.UPDATED,
          details: updateData,
        },
      ]);

      if (logError) {
        return c.json({ error: logError.message }, 500);
      }

      // Return the updated task details
      return c.json({
        data: {
          id: existingTask.id,
          ...updateData
        },
      });
    }
  )
  .post("/", zValidator("form", createTaskSchema), async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");
    const formData = await c.req.formData();

    if (!user) {
      console.error("Unauthorized access attempt.");
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Retrieve fields from the form
    const name = formData.get("name") as string;
    const status = formData.get("status") as TaskStatus;
    const workspaceId = formData.get("workspaceId") as string;
    const projectId = formData.get("projectId") as string;
    const assigneeId = formData.get("assigneeId") as string;
    const roomId = formData.get("roomId") as string;
    const dueDate = formData.get("dueDate") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as Priority;

    // Process attachments
    // const files = formData.getAll("attachments");
    // const normalizedFiles = Array.isArray(files) ? files : [files]; // Ensure it's always an array
    // const attachments = [];

    // Handle file uploads and create attachment records
    // for (const file of normalizedFiles) {
    //   if (file instanceof File) {
    //     const filePath = `${user.id}/${Date.now()}-${file.name}`; // Unique file path based on user and timestamp

    //     // Upload file to Supabase Storage
    //     const { error: uploadError } = await supabase.storage
    //       .from("attachments")
    //       .upload(filePath, file);

    //     if (uploadError) {
    //       console.error(
    //         `Failed to upload file ${file.name}:`,
    //         uploadError.message
    //       );
    //       continue;
    //     }

    //     // Generate file URL
    //     let fileUrl;
    //     if (file.type.startsWith("image/")) {
    //       const { data: previewData } = await supabase.storage
    //         .from("storages")
    //         .getPublicUrl(filePath);

    //       fileUrl = previewData.publicUrl;
    //     } else {
    //       const { error: downloadError } = await supabase.storage
    //         .from("storages")
    //         .download(filePath);

    //       if (downloadError) {
    //         console.error("Failed to download file:", downloadError.message);
    //         continue;
    //       }

    //       fileUrl = ``;
    //     }

    //     // Store the attachment details
    //     attachments.push({
    //       taskId: "", // Will be updated after task creation
    //       filePath,
    //       fileName: file.name,
    //       fileType: file.type,
    //       fileUrl,
    //     });
    //   }
    // }

    // Determine the new position for the task
    const { data: highestPositionTask, error: highestPositionError } =
      await supabase
        .from("tasks")
        .select("position")
        .eq("projectId", projectId)
        .order("position", { ascending: true })
        .limit(1);

    if (highestPositionError) {
      console.error(
        "Error fetching highest position task:",
        highestPositionError.message
      );
      return c.json({ error: highestPositionError.message }, 400);
    }

    const newPosition =
      highestPositionTask.length > 0
        ? highestPositionTask[0].position + 1000
        : 1000;

    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", Number(roomId))
      .single();

    if (!room ) {
      return c.json({ error: "Room not found" }, 404);
    }

    const { data: assignee } = await supabase
      .from("members")
      .select("name")
      .eq("userId", assigneeId)
      .eq("workspaceId", workspaceId)
      .single();
      
    if (!assignee) {
      return c.json({ error: "Assignee not found" }, 404);
    }
      
        // Create the task document in the tasks table
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert([
        {
          name,
          status,
          projectId,
          assigneeId,
          roomId: Number(roomId),
          dueDate,
          description,
          priority,
          position: newPosition,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          assigneeName: assignee.name,
        },
      ])
      .select()
      .single();

    if (taskError) {
      return c.json({ error: taskError.message }, 500);
    }

    // Now create attachment records with the task ID
    // for (const attachment of attachments) {
    //   attachment.taskId = task.id; // Assign the task ID to each attachment
    //   const { error: attachmentError } = await supabase
    //     .from("attachments")
    //     .insert([
    //       {
    //         taskId: task.id,
    //         filePath: attachment.filePath,
    //         fileName: attachment.fileName,
    //         fileType: attachment.fileType,
    //         fileUrl: attachment.fileUrl,
    //       },
    //     ]);

    //   if (attachmentError) {
    //     console.error(
    //       "Failed to save attachment record:",
    //       attachmentError.message
    //     );
    //   }
    // }

    // Log activity for task creation
    const { error: logError } = await supabase.from("logs").insert([
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
          roomId,
          dueDate,
          description,
          priority,
        },
      },
    ]);

    if (logError) {
      console.error("Failed to log task creation:", logError.message);
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

    console.log("task", task);
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

    console.log(task.assigneeId);
    // Fetch assignee details
    const { data: assignee, error: memberFetchError } = await supabase
      .from("members")
      .select("*")
      .eq("userId", task.assigneeId)
      .eq("workspaceId", project.workspaceId)
      .single();

    console.log("member", memberFetchError);
    if (memberFetchError || !assignee) {
      return c.json({ error: "Assignee not found" }, 404);
    }

    // Fetch attachments for the task
    // const { data: attachments, error: attachmentsError } = await supabase
    //   .from("attachments")
    //   .select("*")
    //   .eq("taskId", taskId);

    // if (attachmentsError) {
    //   return c.json({ error: "Error fetching attachments" }, 500);
    // }

    // Return task details along with project, assignee, and attachments
    return c.json({
      data: {
        ...task,
        project,
        assignee,
        // attachments,
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
        console.error("Unauthorized access attempt.");
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Fetch tasks from Supabase
      const { data: tasksToUpdate, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .in(
          "id",
          tasks.map((task) => task.id)
        );

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError.message);
        return c.json({ error: tasksError.message }, 500);
      }

      if (!tasksToUpdate || tasksToUpdate.length === 0) {
        return c.json({ error: "No tasks found for the provided IDs." }, 404);
      }

      const projectIds = Array.from(
        new Set(tasksToUpdate.map((task) => task.projectId))
      );
      console.log("Project IDs found:", projectIds);
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds);
      if (!projects || projectsError) {
        return c.json({ error: "Projects not found"}, 404);
      }

      const workspaceIds = Array.from(
        new Set(projects.map((project) => project.workspaceId)));
      // Check if the user is a member of the workspace
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("workspaceId", workspaceIds)
        .eq("userId", user.id)
        .single();

      if (memberError || !member) {
        console.error("User is not a member of the workspace.");
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
            console.error(`Failed to update task ${id}:`, updateError.message);
            return { id, error: updateError.message };
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
        ])
        .select()
        .single(); // Use .single() to ensure a single row is returned

      if (commentError) {
        return c.json({ error: commentError.message }, 500);
      }

      // Create a log for the comment
      const { error: logError } = await supabase.from("logs").insert([
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
    const commentUserIds = comments.map((comment) => comment.userId);

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
      const user = memberMap[comment.userId] || {
        name: "Unknown",
        imageUrl: "",
      };
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
      .from("logs")
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
