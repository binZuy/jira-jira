import { z } from "zod";
import { TaskStatus } from "./types";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

export const createTaskSchema = z.object({
  name: z.string().min(1, "Name is required").max(256),
  workspaceId: z.string().min(1, "Workspace ID is required").max(48),
  projectId: z.string().min(1, "Project ID is required").max(50),
  description: z.string().max(2048).optional(),
  assigneeId: z.string().min(1, "Assignee ID is required").max(50),
  dueDate: z.coerce.date(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"], {
    required_error: "Status is required",
  }),
  attachments: z
    .custom<File[]>((value) => {
      if (!value) return true;
      if (Array.isArray(value)) {
        return value.every((file) => {
          return file instanceof File && file.size <= MAX_FILE_SIZE;
        });
      }
      if (value instanceof File) {
        return value.size <= MAX_FILE_SIZE;
      }
      return false;
    })
    .optional(),
});

export const taskAttachmentSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  fileId: z.string().min(1, "File ID is required"),
  fileName: z.string(),
  fileType: z.string(),
  fileUrl: z.string().url(),
});

export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
