/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArtifactKind } from "@/features/chats/components/artifact";
import { Json } from "@/lib/types/supabase";

export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum RoomType {
  STANDARD = "STANDARD",
  SUITE = "SUITE",
  DELUXE = "DELUXE",
  PRESIDENT = "PRESIDENT",
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  OUT_OF_SERVICE = "OUT_OF_SERVICE",
  DO_NOT_DISTURB = "DO_NOT_DISTURB",
  READY_FOR_INSPECTION = "READY_FOR_INSPECTION",
}

export enum Action {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  COMMENTED = "COMMENTED",
  ASSIGNED_TO = "ASSIGNED_TO",
  DELETED = "DELETED",
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum RoomStatus {
  STAY_OVER = "STAY_OVER",
  DEPARTURE = "DEPARTURE",
}

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
  DATA = "data",
}

export enum Linen {
  YES = "YES", 
  NO = "NO"
}

export type Workspace = {
  id: string;
  name: string;
  imageUrl?: string;
  userId: string;
  inviteCode: string;
};

export type Project = {
  id: string;
  name: string;
  imageUrl?: string;
  workspaceId: string;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  userId: string;
  workspaceId: string;
  role: MemberRole;
};
export type Task = {
  id: string;
  name: string;
  status: TaskStatus;
  priority: Priority;
  roomId: number;
  workspaceId: string;
  assigneeId: string;
  projectId: string;
  position: number;
  dueDate: string;
  description?: string;
  projects: Project;
  assignee: Member;
  attachments?: File[] | any[];
};

export type Chat = {
  id: string;
  title: string;
  userId: string;
  created_at?: any;
};

export type Message = {
  id: string;
  chatId: string;
  role: string;
  content?: string;
  parts: Json;
};

export type Document = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string | null;
  created_at: any;
};

export type Suggestion = {
  id: string;
  documentId: string;
  originalText: string;
  suggestedText: string;
  description: string;
  userId: string;
  isResolved: boolean;
};

export type Room = {
  id: number;
  roomNumber: number;
  roomType: RoomType;
}
