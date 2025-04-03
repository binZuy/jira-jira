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
import { createDataStreamResponse, streamText, UIMessage, smoothStream } from "ai";
import { generateIDChat, getMostRecentUserMessage, getTrailingMessageId } from "@/lib/utils";
import { useGetChat } from "@/features/chats/api/use-get-chat";
import { MessageSchema } from "../schemas";
import { z } from "zod";
import { Chat } from "@/features/chats/types";
import { generateTitleFromUserMessage } from "@/app/(standalone)/workspaces/[workspaceId]/chats/actions";
// import { createAdminClient } from "@/lib/appwrite";
import { systemPrompt } from "../libs/ai/prompts";
import { myProvider } from "../libs/ai/providers";
import { getWeather} from "../libs/ai/tools/get-weather";
import { createDocument } from "../libs/ai/tools/create-document";
import { updateDocument } from "../libs/ai/tools/update-document";
import { requestSuggestions } from "../libs/ai/tools/request-suggestions";

export const maxDuration = 30;

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", MessageSchema),
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      // const { chatId } = c.req.param();
      const { id: chatId, messages, selectedChatModel } = (await c.req.valid("json")) as {
        id: string;
        messages: Array<UIMessage>;
        selectedChatModel: string;
      };

      // if (!messages || messages.length === 0) {
      //   return c.json({ message: "No messages provided" }, 400);
      // }

      const userMessage = getMostRecentUserMessage(messages);
      if (!userMessage) {
        return c.json({ message: "No user message found" }, 400);
      }

      if (!user) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const {data: chat} = await useGetChat({ chatId });
      if (!chat) {
        const title = await generateTitleFromUserMessage({
          message: userMessage,
        });
        await databases.createDocument(DATABASE_ID, CHATS_ID, chatId, {
          // const formattedMessages = messages.map((message) => ({
          //   id: message.id,
          //   role: message.role,
          //   content: message.parts.map((part) => part.text).join(" "),
          userId: user.$id,
          title: title,
          // content: userMessage.parts.map((part) => part.text).join(" "),
        });
      } else {
        if (chat.userId !== user.$id) {
          return c.json({ message: "Unauthorized" }, 401);
        }
      }

      await databases.createDocument(
        DATABASE_ID,
        MESSAGES_ID,
        userMessage.id,
        {
          chatId: chatId,
          role: userMessage.role,
          parts: userMessage.parts,
          content: userMessage.content,
        });

      return createDataStreamResponse({
        execute: (dataStream) => {
          const result = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt({ selectedChatModel }),
            messages,
            maxSteps: 5,
            experimental_activeTools:
              selectedChatModel === "chat-model-reasoning"
                ? []
                : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
                experimental_transform: smoothStream({ chunking: 'word' }),
                experimental_generateMessageId: generateIDChat,
                tools: {
                  getWeather,
                  createDocument: createDocument({ dataStream }),
                  updateDocument: updateDocument({ dataStream }),
                  requestSuggestions: requestSuggestions({
                    dataStream
                  }),
                },
                onFinish: async ({ response }) => {
                  if (user?.$id) {
                    try {
                      const assistantId = getTrailingMessageId({
                        messages: response.messages.filter(
                          (message) => message.role === 'assistant',
                        ),
                      });
      
                      if (!assistantId) {
                        throw new Error('No assistant message found!');
                      }
      
                      const [, assistantMessage] = appendResponseMessages({
                        messages: [userMessage],
                        responseMessages: response.messages,
                      });
      
                      await saveMessages({
                        messages: [
                          {
                            id: assistantId,
                            chatId: id,
                            role: assistantMessage.role,
                            parts: assistantMessage.parts,
                            attachments:
                              assistantMessage.experimental_attachments ?? [],
                            createdAt: new Date(),
                          },
                        ],
                      });
                    } catch (_) {
                      console.error('Failed to save chat');
                    }
                  }
                },
                experimental_telemetry: {
                  isEnabled: false,
                  functionId: 'stream-text',
                },
              });
        }
      });
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
      return c.json({ message: "Chat not found" }, 404);
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
