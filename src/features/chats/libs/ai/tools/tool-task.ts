/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataStreamWriter, tool } from 'ai';
import { z } from "zod";
import { getAuthInfo } from "@/features/chats/queries";
import { TaskStatus } from "@/features/tasks/types";
import { DATABASE_ID, PROJECTS_ID, TASKS_ID, TASKLOGS_ID } from "@/config";
import { ID, Query } from "node-appwrite";
import { getWorkspaceId } from "@/lib/utils";

interface CreateDocumentProps {
  dataStream: DataStreamWriter;
}

export const createTask = ({ dataStream }: CreateDocumentProps) =>
  tool({
    description: "Create a new task in the Appwrite database",
    parameters: z.object({
      name: z.string().min(1, "Name is required"),
      status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
      workspaceId: z.string().optional(),
      projectId: z.string().optional(),
      assigneeId: z.string().optional(),
      dueDate: z.coerce.date(),
      description: z.string().optional(),
    }),
    execute: async ({
      name,
      status,
      workspaceId,
      projectId,
      assigneeId,
      dueDate,
      description,
    }) => {
      const { databases } = await getAuthInfo();
      const finalWorkspaceId = workspaceId || getWorkspaceId();

      const finalDueDate = dueDate || new Date(Date.now() + 86400000);

      let finalProjectId = projectId;
      if (!finalProjectId) {
        const projects = await databases.listDocuments(
          DATABASE_ID,
          PROJECTS_ID,
          [
            Query.equal("workspaceId", finalWorkspaceId),
            Query.orderAsc("createdAt"), // Sắp xếp theo thời gian tạo để lấy dự án đầu tiên
            Query.limit(1),
          ]
        );
        if (projects.documents.length > 0) {
          finalProjectId = projects.documents[0].$id;
        } else {
          throw new Error("No project found in the specified workspace.");
        }
      }

      const highestPositionTask = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        [
          Query.equal("status", status),
          Query.equal("workspaceId", finalWorkspaceId),
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
          workspaceId: finalWorkspaceId,
          projectId: finalProjectId,
          assigneeId,
          dueDate: finalDueDate,
          description,
          position: newPosition,
        }
      );

      return task;
    },
  });

export const updateTask = ({ dataStream }: CreateDocumentProps) =>
  tool({
    description: "Update an existing task in the Appwrite database",
    parameters: z.object({
      taskId: z.string().min(1, "Task ID is required"),
      name: z.string().optional(),
      status: z.nativeEnum(TaskStatus).optional(),
      projectId: z.string().optional(),
      dueDate: z.coerce.date().optional(),
      assigneeId: z.string().optional(),
      description: z.string().optional(),
    }),
    execute: async ({
      taskId,
      name,
      status,
      projectId,
      dueDate,
      assigneeId,
      description,
    }) => {
      const { databases, user } = await getAuthInfo();

      // Chuẩn bị dữ liệu cập nhật
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (status !== undefined) updateData.status = status;
      if (projectId !== undefined) updateData.projectId = projectId;
      if (dueDate !== undefined) updateData.dueDate = dueDate;
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
      if (description !== undefined) updateData.description = description;

      // Thực hiện cập nhật task
      const updatedTask = await databases.updateDocument(
        DATABASE_ID,
        TASKS_ID,
        taskId,
        updateData
      );

      // Tạo log cập nhật task
      await databases.createDocument(DATABASE_ID, TASKLOGS_ID, ID.unique(), {
        taskId,
        userId: user.$id,
        action: "updated",
        details: "Task updated via tool",
      });

      return updatedTask;
    },
  });

export const deleteTask = ({ dataStream }: CreateDocumentProps) =>
  tool({
    description: "Delete a task from the Appwrite database",
    parameters: z.object({
      taskId: z.string(),
    }),
    execute: async ({ taskId }) => {
      const { databases } = await getAuthInfo();
      await databases.deleteDocument(DATABASE_ID, TASKS_ID, taskId);
      return {
        success: true,
        message: `Task with ID ${taskId} deleted successfully.`,
      };
    },
  });

export const getTaskDetail = ({ dataStream }: CreateDocumentProps) =>
  tool({
    description: "Get detailed information about a specific task",
    parameters: z.object({
      taskId: z.string().min(1, "Task ID is required"),
    }),
    execute: async ({ taskId }) => {
      const { databases } = await getAuthInfo();
      const task = await databases.getDocument(DATABASE_ID, TASKS_ID, taskId);
      return task;
    },
  });

export const listTasks = ({ dataStream }: CreateDocumentProps) =>
  tool({
    description: "List tasks filtered by status and/or assignee",
    parameters: z.object({
      status: z.nativeEnum(TaskStatus).optional(),
      assigneeId: z.string().optional(),
      workspaceId: z.string().optional(),
    }),
    execute: async ({ status, assigneeId, workspaceId }) => {
      const { databases } = await getAuthInfo();
      const finalWorkspaceId = workspaceId || getWorkspaceId();

      // Xây dựng mảng query để lọc task theo workspace và các bộ lọc khác nếu có
      const queries = [Query.equal("workspaceId", finalWorkspaceId)];
      if (status) {
        queries.push(Query.equal("status", status));
      }
      if (assigneeId) {
        queries.push(Query.equal("assigneeId", assigneeId));
      }

      const tasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_ID,
        queries
      );
      return tasks;
    },
  });
