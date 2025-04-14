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
  .delete("/:taskId", async (c) => {
    const { taskId } = c.req.param();

    const supabase = c.get("supabase");
    const user = c.get("user");

    const member = await getMember({
      databases,
      workspaceId: task.workspaceId,
      userId: user.$id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get all attachments for this task
    const attachments = await databases.listDocuments(
      DATABASE_ID,
      TASK_ATTACHMENT_ID,
      [Query.equal("taskId", taskId)]
    );

    // Delete all attachment files from storage
    for (const attachment of attachments.documents) {
      try {
        await storage.deleteFile(ATTACHMENTS_BUCKET_ID, attachment.fileId);
      } catch (error) {
        console.error(`Failed to delete file ${attachment.fileId}:`, error);
      }
    }

    // Delete all attachment records from database
    for (const attachment of attachments.documents) {
      try {
        await databases.deleteDocument(
          DATABASE_ID,
          TASK_ATTACHMENT_ID,
          attachment.$id
        );
      } catch (error) {
        console.error(`Failed to delete attachment record ${attachment.$id}:`, error);
      }
    }

    // Delete the task
    await databases.deleteDocument(DATABASE_ID, TASKS_ID, taskId);

    // Create log for task deletion
    await databases.createDocument(
      DATABASE_ID,
      TASKLOGS_ID,
      ID.unique(),
      {
        taskId,
        userId: user.$id,
        action: "deleted",
        details: "Task deleted"
      }
    );

    return c.json({ data: { $id: task.$id}});
  })
  .get(
    "/",
    sessionMiddleware,
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
      const { users } = await createAdminClient();
      const databases = c.get("databases");
      const user = c.get("user");

      const { workspaceId, projectId, status, search, assigneeId, dueDate } =
        c.req.valid("query");

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const query = [
        Query.equal("workspaceId", workspaceId),
        Query.orderDesc("$createdAt"),
      ];

      if (projectId) {
        console.log("projectId: ", projectId);
        query.push(Query.equal("projectId", projectId));
      }
      if (status) {
        console.log("status: ", status);
        query.push(Query.equal("status", status));
      }
      if (assigneeId) {
        console.log("assigneeId: ", assigneeId);
        query.push(Query.equal("assigneeId", assigneeId));
      }
      if (dueDate) {
        console.log("dueDate: ", dueDate);
        query.push(Query.equal("dueDate", dueDate));
      }
      if (search) {
        console.log("search: ", search);
        query.push(Query.equal("search", search));
      }

      const tasks = await databases.listDocuments<Task>(
        DATABASE_ID,
        TASKS_ID,
        query
      );

      const projectIds = tasks.documents.map((task) => task.projectId);
      const assigneeIds = tasks.documents.map((task) => task.assigneeId);

      const projects = await databases.listDocuments<Project>(
        DATABASE_ID,
        PROJECTS_ID,
        projectIds.length > 0 ? [Query.contains("$id", projectIds)] : []
      );

      const members = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        assigneeIds.length > 0 ? [Query.contains("$id", assigneeIds)] : []
      );

      const assignees = await Promise.all(
        members.documents.map(async (member) => {
          const user = await users.get(member.userId);

          return {
            ...member,
            name: user.name,
            email: user.email,
          };
        })
      );

      const populatedTasks = tasks.documents.map((task) => {
        const project = projects.documents.find(
          (project) => project.$id === task.projectId
        );

        const assignee = assignees.find(
          (assignee) => assignee.$id === task.assigneeId
        );

        return {
          ...task,
          project,
          assignee,
        };
      });
      return c.json({ data: { ...tasks, documents: populatedTasks } });
    }
  )
  .patch(
    "/:taskId",
    sessionMiddleware,
    zValidator("form", createTaskSchema.partial()),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const storage = c.get("storage");
      const formData = await c.req.formData();

      const name = formData.get("name") as string;
      const status = formData.get("status") as TaskStatus;
      const projectId = formData.get("projectId") as string;
      const dueDate = formData.get("dueDate") as string;
      const assigneeId = formData.get("assigneeId") as string;
      const description = formData.get("description") as string | null;
      const attachments = formData.getAll("attachments") as File[];

      const { taskId } = c.req.param();

      const existingTask = await databases.getDocument<Task>(
        DATABASE_ID,
        TASKS_ID,
        taskId
      );

      const member = await getMember({
        databases,
        workspaceId: existingTask.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Handle new attachments if any
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          if (file instanceof File) {
            const fileId = ID.unique();
            await storage.createFile(ATTACHMENTS_BUCKET_ID, fileId, file);
            
            let fileUrl;
            if (file.type.startsWith('image/')) {
              const arrayBuffer = await storage.getFilePreview(ATTACHMENTS_BUCKET_ID, fileId);
              fileUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
            } else {
              const arrayBuffer = await storage.getFileDownload(ATTACHMENTS_BUCKET_ID, fileId);
              fileUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
            }
            
            await databases.createDocument(
              DATABASE_ID,
              TASK_ATTACHMENT_ID,
              ID.unique(),
              {
                taskId,
                fileId,
                fileName: file.name,
                fileType: file.type,
                fileUrl,
              }
            );
          }
        }
      }

      const task = await databases.updateDocument<Task>(
        DATABASE_ID,
        TASKS_ID,
        taskId,
        {
          name,
          status,
          projectId,
          dueDate,
          assigneeId,
          description,
        }
      );

      // Create log for task update
      await databases.createDocument(
        DATABASE_ID,
        TASKLOGS_ID,
        ID.unique(),
        {
          taskId,
          userId: user.$id,
          action: "updated",
          details: "Task updated"
        }
      );

      return c.json({ data: task });
    }
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("form", createTaskSchema),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const storage = c.get("storage");
      const formData = await c.req.formData();

      // Retrieve fields
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

      for (const file of normalizedFiles) {
        if (file instanceof File) {
          const fileId = ID.unique();
          await storage.createFile(ATTACHMENTS_BUCKET_ID, fileId, file);
          
          let fileUrl;
          if (file.type.startsWith('image/')) {
            const arrayBuffer = await storage.getFilePreview(ATTACHMENTS_BUCKET_ID, fileId);
            fileUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
          } else {
            const arrayBuffer = await storage.getFileDownload(ATTACHMENTS_BUCKET_ID, fileId);
            fileUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
          }
          
          attachments.push({
            taskId: "", // Will be updated after task creation
            fileId,
            fileName: file.name,
            fileType: file.type,
            fileUrl
          });
        }
      }

      // Determine new position if needed (or use existing logic)
      const highestPositionTask = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("status", status),
          Query.equal("workspaceId", workspaceId),
          Query.orderAsc("position"),
          Query.limit(1),
        ]
      );

      const newPosition =
        highestPositionTask.documents.length > 0
          ? highestPositionTask.documents[0].position + 1000
          : 1000;

      // Create task document including attachments field if needed
      const task = await databases.createDocument(
        DATABASE_ID,
        TASKS_ID,
        ID.unique(),
        {
          name,
          status,
          workspaceId,
          projectId,
          assigneeId,
          dueDate,
          description,
          position: newPosition,
        }
      );

      // Now create attachment records with the task ID
      for (const attachment of attachments) {
        attachment.taskId = task.$id;
        await databases.createDocument(
          DATABASE_ID,
          TASK_ATTACHMENT_ID,
          ID.unique(),
          attachment
        );
      }

      // Log activity for creation
      await databases.createDocument(
        DATABASE_ID,
        TASKLOGS_ID,
        ID.unique(),
        {
          taskId: task.$id,
          action: "created",
          userId: user.$id,
          details: `Created task "${name}" withattachment(s)`,
        }
      );

      return c.json({ data: task });
    }
  )
  .get("/:taskId", sessionMiddleware, async (c) => {
    const currentUser = c.get("user");
    const databases = c.get("databases");
    const { users } = await createAdminClient();
    const { taskId } = await c.req.param();

    // Fetch task details
    const task = await databases.getDocument<Task>(
      DATABASE_ID,
      TASKS_ID,
      taskId
    );

    // Check if the user is authorized to access the task
    const currentMember = await getMember({
      databases,
      workspaceId: task.workspaceId,
      userId: currentUser.$id,
    });

    if (!currentMember) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Fetch project details
    const project = await databases.getDocument<Project>(
      DATABASE_ID,
      PROJECTS_ID,
      task.projectId
    );

    // Fetch assignee details
    const member = await databases.getDocument(
      DATABASE_ID,
      MEMBERS_ID,
      task.assigneeId
    );

    const user = await users.get(member.userId);

    const assignee = { ...member, name: user.name, email: user.email };

    // Fetch attachments for the task
    const attachments = await databases.listDocuments(
      DATABASE_ID,
      TASK_ATTACHMENT_ID,
      [Query.equal("taskId", taskId)]
    );

    // Return task details along with project, assignee, and attachments
    return c.json({
      data: {
        ...task,
        project,
        assignee,
        attachments: attachments.documents, // Include attachments here
      },
    });
  })
  .post(
    "/bulk-update",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        tasks: z.array(
          z.object({
            $id: z.string(),
            status: z.nativeEnum(TaskStatus),
            position: z.number().int().positive().min(1000).max(1_000_000),
          })
        ),
      })
    ),
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { tasks } = await c.req.valid("json");

      const tasksToUpdate = await databases.listDocuments<Task>(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.contains(
            "$id",
            tasks.map((task) => task.$id)
          ),
        ]
      );

      const workspaceIds = new Set(
        tasksToUpdate.documents.map((task) => task.workspaceId)
      );
      if (workspaceIds.size !== 1) {
        return c.json(
          { error: "All tasks must belong to the same workspaceId" },
          400
        );
      }

      const workspaceId = workspaceIds.values().next().value;

      if (workspaceId === undefined) {
        return c.json({ error: "No workspaceId found" }, 400);
      }
      
      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const { $id, status, position } = task;
          return databases.updateDocument<Task>(DATABASE_ID, TASKS_ID, $id, {
            status,
            position,
          });
        })
      );
      return c.json({ data: updatedTasks });
    }
  )
  // Comments routes
  .post(
    "/:taskId/comments",
    sessionMiddleware,
    zValidator("json", z.object({
      content: z.string().min(1)
    })),
    async (c) => {
      const { taskId } = c.req.param();
      const { content } = c.req.valid("json");
      const databases = c.get("databases");
      const user = c.get("user");

      const comment = await databases.createDocument(
        DATABASE_ID,
        COMMENTS_ID,
        ID.unique(),
        {
          taskId,
          userId: user.$id,
          content
        }
      );

      // Create log for comment
      await databases.createDocument(
        DATABASE_ID,
        TASKLOGS_ID,
        ID.unique(),
        {
          taskId,
          userId: user.$id,
          action: "commented",
          details: "User commented on task",
        }
      );

      return c.json({ data: comment });
    }
  )
  .get(
    "/:taskId/comments",
    sessionMiddleware,
    async (c) => {
      const { taskId } = c.req.param();
      const { users } = await createAdminClient();
      const databases = c.get("databases");

      const comments = await databases.listDocuments<TaskComment>(
        DATABASE_ID,
        COMMENTS_ID,
        [Query.equal("taskId", taskId)]
      );

      const populatedComments = await Promise.all(
        comments.documents.map(async (comment) => {
          const user = await users.get(comment.userId);
          return {
            ...comment,
            user: {
              name: user.name,
              imageUrl: user.prefs.avatarUrl,
            },
          };
        })
      );

      return c.json({ data: populatedComments });
    }
  )
  // Task Logs routes
  .get(
    "/:taskId/logs",
    sessionMiddleware,
    async (c) => {
      const { taskId } = c.req.param();
      const { users } = await createAdminClient();
      const databases = c.get("databases");

      const logs = await databases.listDocuments(
        DATABASE_ID,
        TASKLOGS_ID,
        [
          Query.equal("taskId", taskId),
          Query.orderDesc("$createdAt")
        ]
      );

      const populatedLogs = await Promise.all(
        logs.documents.map(async (log) => {
          const user = await users.get(log.userId);
          return {
            ...log,
            user: {
              name: user.name,
              imageUrl: user.prefs.avatarUrl,
            },
          };
        })
      );

      return c.json({ data: populatedLogs });
    }
  );

export default app;
