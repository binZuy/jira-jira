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
import {
  createDataStreamResponse,
  appendResponseMessages,
  streamText,
  // UIMessage,
  smoothStream,
} from "ai";
import {
  generateID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from "@/lib/utils";
// import { useGetChat } from "@/features/chats/api/use-get-chat";
// import { MessageSchema } from "../../schemas";
// import { z } from "zod";
// import { Chat } from "@/features/chats/types";
import { generateTitleFromUserMessage } from "@/app/(standalone)/workspaces/[workspaceId]/chats/actions";
import { systemPrompt } from "../../libs/ai/prompts";
import { myProvider } from "../../libs/ai/providers";
import { getWeather } from "../../libs/ai/tools/get-weather";
import { createDocument } from "../../libs/ai/tools/create-document";
import { updateDocument } from "../../libs/ai/tools/update-document";
import { requestSuggestions } from "../../libs/ai/tools/request-suggestions";
import { createTask, deleteTask, updateTask, getTaskDetail, listTasks } from "../../libs/ai/tools/tool-task";
import { saveChat, saveMessages, getChatById } from "@/features/chats/queries";

export const maxDuration = 30;

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    // zValidator("json", MessageSchema),
    async (c) => {
      console.log("POST / called");

      const user = c.get("user");
      // console.log("User retrieved from session:", user);

      const {
        id,
        messages,
        selectedChatModel,
      } = await c.req.json();

      console.log("Request payload:", { id, messages, selectedChatModel });

      if (!user) {
        console.error("Unauthorized: User not found in session");
        return c.json({ message: "Unauthorized" }, 401);
      }
      
      const userMessage = getMostRecentUserMessage(messages);
      if (!userMessage) {
        console.error("No user message found in messages:", messages);
        return c.json({ message: "No user message found" }, 400);
      }
      console.log("user mess", userMessage);
      const chat = await getChatById({ id });

      if (!chat) {
        const title = await generateTitleFromUserMessage({
          message: userMessage,
        });
        console.log("Generated chat title:", title);
        await saveChat({ id, title });
        console.log("Chat saved successfully:", { id, title });
      } else {
        if (chat.userId !== user.$id){
          return c.json({ message: "Unauthorized" }, 401);
        }
      }

      try {
        await saveMessages({
          messages: [
            {
              chatId: id,
              id: userMessage.id,
              role: "user",
              content: userMessage.content,
              parts: userMessage.parts,
            },
          ],
        });
        console.log("User message saved successfully:", userMessage);
      } catch (error) {
        console.error("Error saving user message:", error);
        return c.json({ message: "Failed to save user message" }, 500);
      }

      return createDataStreamResponse({
        execute: (dataStream) => {
          console.log("Starting data stream execution");

          try {
            const result = streamText({
              model: myProvider.languageModel(selectedChatModel),
              system: systemPrompt({ selectedChatModel }),
              messages,
              maxSteps: 5,
              experimental_activeTools:
                selectedChatModel === "chat-model-reasoning"
                  ? []
                  : ["getWeather", "createDocument", "updateDocument", "requestSuggestions",
                    "createTask", "updateTask", "deleteTask", "getTaskDetail", "listTasks"],
                  // ],
              experimental_transform: smoothStream({ chunking: "word" }),
              experimental_generateMessageId: generateID,
              tools: {
                getWeather,
                createDocument: createDocument({ dataStream }),
                updateDocument: updateDocument({ dataStream }),
                requestSuggestions: requestSuggestions({ dataStream }),
                createTask: createTask({ dataStream }),
                updateTask: updateTask({ dataStream }),
                deleteTask: deleteTask({ dataStream }),
                getTaskDetail: getTaskDetail({ dataStream }),
                listTasks: listTasks({ dataStream }),
              },
              onFinish: async ({ response }) => {
                console.log("Stream finished successfully:", response);

                if (user?.$id) {
                  try {
                    const assistantId = getTrailingMessageId({
                      messages: response.messages.filter(
                        (message) => message.role === "assistant"
                      ),
                    });

                    if (!assistantId) {
                      throw new Error("No assistant message found!");
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
                          content: assistantMessage.content,
                          parts: assistantMessage.parts,
                        },
                      ],
                    });
                    console.log("Assistant message saved successfully:", assistantMessage);
                  } catch (error) {
                    console.error("Failed to save assistant message:", error);
                  }
                }
              },
              experimental_telemetry: {
                isEnabled: false,
                functionId: "stream-text",
              },
            });

            result.consumeStream();
            console.log("Stream consumed successfully");

            result.mergeIntoDataStream(dataStream, {
              sendReasoning: true,
            });
            console.log("Stream merged into data stream successfully");
          } catch (error) {
            console.error("Error during data stream execution:", error);
            throw error;
          }
        },
        onError: (error) => {
          console.error("Error in createDataStreamResponse:", error);
          return "Oops, an error occurred!";
        },
      });
    }
  )
  .get("/:chatId", sessionMiddleware, async (c) => {
    const databases = c.get("databases");
    const user = c.get("user");
    const { chatId } = c.req.param();
    console.log("GET /:chatId called with chatId:", chatId);
    const chat = await databases.getDocument(DATABASE_ID, CHATS_ID, chatId);

    if (!chat) {
      return c.json({ message: "Chat not found" }, 404);
    }

    if (chat.userId !== user.$id) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const messages = await databases.listDocuments(DATABASE_ID, MESSAGES_ID, [
      Query.equal("chatId", chatId),
      Query.orderAsc("$createdAt"),
    ]);

    // Parse the `parts` field for each message
    const parsedMessages = messages.documents.map((message) => ({
      ...message,
      id: message.$id,
      role: message.role,
      chatId: message.chatId,
      parts: JSON.parse(message.parts), // Parse `parts` back into an object
    }));

    return c.json({ data: { chat, messages: parsedMessages } });
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

    return c.json({ data: { $id: chatId } });
  });

export default app;
