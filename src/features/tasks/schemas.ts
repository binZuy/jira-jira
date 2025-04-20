import { z } from "zod";
import { Priority, TaskStatus } from "@/lib/types/enums";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

export const createTaskSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
  assigneeId: z.string().trim().min(1, "Required"),
  roomId: z.string().min(1, "required"),
  priority: z.nativeEnum(Priority, { required_error: "Required" }),
  dueDate: z.coerce.date(),
  description: z.string().optional(),
  attachments: z
    .custom<File[]>((value) => {
      // Nếu không có file, trả về true (không lỗi)
      if (!value) return true;

      // Nếu là một mảng, kiểm tra các phần tử trong mảng
      if (Array.isArray(value)) {
        return value.every((file) => {
          // Kiểm tra xem mỗi phần tử có phải là file và kích thước có hợp lệ không
          return file instanceof File && file.size <= MAX_FILE_SIZE;
        });
      }

      // Nếu là một file duy nhất, kiểm tra
      if (value instanceof File) {
        return value.size <= MAX_FILE_SIZE;
      }

      return false; // Trả về false nếu không phải mảng hoặc file hợp lệ
    })
    .optional(),
});

export const taskAttachmentSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  filePath: z.string().min(1, "File ID is required"),
  fileName: z.string(),
  fileType: z.string(),
  fileUrl: z.string().url(),
});

export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
