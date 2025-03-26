import { z } from "zod";
import { TaskStatus } from "./types";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

export const createTaskSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
  assigneeId: z.string().trim().min(1, "Required"),
  dueDate: z.coerce.date(),
  description: z.string().optional(),
  attachments: z.array(
    z
      .instanceof(File)
      .refine((file) => file.size <= MAX_FILE_SIZE, {
        message: "File size must be less than 1MB",
      })
      .refine(
        (file) =>
          [
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
          ].includes(file.type),
        {
          message:
            "Only JPEG, PNG, PDF, Excel, and Word files are allowed",
        }
      )
  ).optional(),
});

export const taskAttachmentSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  fileId: z.string().min(1, "File ID is required"),
  fileName: z.string(),
  fileType: z.string(),
  fileUrl: z.string().url(),
});

export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
