import { Models } from "node-appwrite";

export type Document = Models.Document & {
  id: string;
  title: string;
  kind: string;
  content: string;
  userId: string;
};

export type Suggestion = {
  id: string;
  documentId: string;
  originalText: string;
  suggestedText: string;
  description: string;
  userId: string;
  isResolved: boolean;
  // createdAt: Date;
  // updatedAt: Date;
};

export type Chat = {
  id: string;
  title: string;
  userId: string;
  content?: string;
  // createdAt?: Date;
};


export type Message = {
    id: string;
    chatId: string;
    role: "data" | "user" | "assistant" | "system";
    content?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parts: any;
    // createdAt?: Date;
    // updatedAt: Date;
}