import { sessionMiddleware } from "@/lib/session-middleware";
// import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
// import { getMember } from "@/features/members/utils";
import {
  DATABASE_ID,
  CHATS_ID,
  MESSAGES_ID,
  // MEMBERS_ID,
  // PROJECTS_ID,
  // TASKS_ID,
  // COMMENTS_ID,
  // TASKLOGS_ID,
  // ATTACHMENTS_BUCKET_ID,
  // TASK_ATTACHMENT_ID,
} from "@/config";
import { Query } from "node-appwrite";
// import {
//   createDataStreamResponse,
//   appendResponseMessages,
//   streamText,
//   UIMessage,
//   smoothStream,
// } from "ai";
// import {
//   generateIDChat,
//   getMostRecentUserMessage,
//   getTrailingMessageId,
// } from "@/lib/utils";
// // import { useGetChat } from "@/features/chats/api/use-get-chat";
// import { MessageSchema } from "../../schemas";
// // import { z } from "zod";
// // import { Chat } from "@/features/chats/types";
// import { generateTitleFromUserMessage } from "@/app/(standalone)/workspaces/[workspaceId]/chats/actions";
// // import { createAdminClient } from "@/lib/appwrite";
// import { systemPrompt } from "../../libs/ai/prompts";
// import { myProvider } from "../../libs/ai/providers";
// import { getWeather } from "../../libs/ai/tools/get-weather";
// import { createDocument } from "../../libs/ai/tools/create-document";
// import { updateDocument } from "../../libs/ai/tools/update-document";
// import { saveChat, saveMessages } from "@/features/chats/queries";

export const maxDuration = 30;

const app = new Hono()
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
      return c.json({ message: "Chat not found" }, 404);
    }

    if (chat.userId !== user.$id) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    // const messages =
     await databases.listDocuments(DATABASE_ID, MESSAGES_ID, [
      Query.equal("chatId", chatId),
      Query.orderDesc("$createdAt"),
    ]);

    return c.json({ data: chat });
  })

export default app;
