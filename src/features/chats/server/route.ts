import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
// import { getMember } from "@/features/members/utils";
import {
  DATABASE_ID,
  CHATS_ID,
  MESSAGES_ID,
  MEMBERS_ID,
  PROJECTS_ID,
  TASKS_ID,
  COMMENTS_ID,
  TASKLOGS_ID,
  ATTACHMENTS_BUCKET_ID,
  TASK_ATTACHMENT_ID,
} from "@/config";
import { ID, Query } from "node-appwrite";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { MessageSchema } from "../schemas";
import { z } from "zod";
import { Chat } from "@/features/chats/types";
// import { createAdminClient } from "@/lib/appwrite";

export const maxDuration = 30;

const app = new Hono()
  .post(
    "/:chatId",
    sessionMiddleware,
    zValidator("json", MessageSchema),
    async (c) => {
      const { messages } = await c.req.valid("json");

      const formattedMessages = messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.parts.map((part) => part.text).join(" "),
      }));

      const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: formattedMessages,
      });

      return result.toDataStreamResponse();
    }
  )
  .get("/", sessionMiddleware, async (c) => {
    const databases = c.get("databases");
    const user = c.get("user");

    const chats = await databases.listDocuments(DATABASE_ID, CHATS_ID, [
      Query.equal("userId", user.$id),
    ]);

    return c.json({ data: chats.documents });
  })
  .get("/:chatId", sessionMiddleware, async (c) => {
    const databases = c.get("databases");
    const user = c.get("user");
    const { chatId } = c.req.param();

    const chat = await databases.getDocument(DATABASE_ID, CHATS_ID, chatId);

    if (!chat) {
      return c.json({message: "Chat not found"}, 404);
    }
    
    if (chat.userId !== user.$id) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const messages = await databases.listDocuments(DATABASE_ID, MESSAGES_ID, [
      Query.equal("chatId", chatId),
      Query.orderDesc("createdAt"),
    ]);

    return c.json({ data: chat });
  })
  // Add delete chat endpoint
  .delete("/:chatId", sessionMiddleware, async (c) => {
    const databases = c.get("databases");
    const user = c.get("user");
    const { chatId } = c.req.param();

    const chat = await databases.getDocument(DATABASE_ID, CHATS_ID, chatId);
    if (!chat || chat.userId !== user.$id) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    await databases.deleteDocument(DATABASE_ID, CHATS_ID, chatId);
    // Optional: Delete associated messages
    const messages = await databases.listDocuments(DATABASE_ID, MESSAGES_ID, [
      Query.equal("chatId", chatId),
    ]);
    await Promise.all(
      messages.documents.map((message) =>
        databases.deleteDocument(DATABASE_ID, MESSAGES_ID, message.$id)
      )
    );

    return c.json({ message: "Chat deleted successfully" });
  })
  // Add save messages endpoint
  .post("/:chatId/messages", sessionMiddleware, async (c) => {
    const databases = c.get("databases");
    const user = c.get("user");
    const { chatId } = c.req.param();
    const { messages } = await c.req.json();

    const chat = await databases.getDocument(DATABASE_ID, CHATS_ID, chatId);
    if (!chat || chat.userId !== user.$id) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const savedMessages = await Promise.all(
      messages.map(async (message: any) => {
        return databases.createDocument(DATABASE_ID, MESSAGES_ID, ID.unique(), {
          chatId,
          userId: user.$id,
          role: message.role,
          content: message.content,
          createdAt: new Date().toISOString(),
        });
      })
    );

    return c.json({ data: savedMessages });
  });
  
export default app;
