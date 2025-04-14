/* eslint-disable @typescript-eslint/no-explicit-any */
import { Models } from "node-appwrite";
import { ArtifactKind } from "@/features/chats/components/artifact";
export type Document = Models.Document & {
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  id: string;
};

export type Suggestion = Models.Document &{
  documentId: string;
  originalText: string;
  suggestedText: string;
  description: string;
  userId: string;
  isResolved: boolean;
};

export type Chat = Models.Document & {
  title: string;
  userId: string;
  content?: string;
};

export type DBMessage = Models.Document & {
  chatId: string;
  role: "data" | "user" | "assistant" | "system";
  content?: string;
  parts: any;
}

export type Message = {
    id: string;
    chatId: string;
    role: "data" | "user" | "assistant" | "system";
    content?: string;
    parts: any;
}