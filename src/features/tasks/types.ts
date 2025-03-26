/* eslint-disable @typescript-eslint/no-explicit-any */
import { Models } from "node-appwrite";

export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE",
}

export type Task = Models.Document & {
  name: string;
  status: TaskStatus;
  workspaceId: string;
  assigneeId: string;
  projectId: string;
  position: number;
  dueDate: string;
  description?: string;
  attachments?: File[] | any[];
  
}

export type TaskComment = Models.Document & {
  taskId: string;
  userId: string;
  content: string;
}

export type TaskLog = Models.Document & {
  taskId: string;
  userId: string;
  action: 'created' | 'updated' | 'commented' | 'status_changed' | 'deleted';
  details: string;
}