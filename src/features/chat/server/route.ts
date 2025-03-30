import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
// import { getMember } from "@/features/members/utils";
// import {
//   DATABASE_ID,
//   MEMBERS_ID,
//   PROJECTS_ID,
//   TASKS_ID,
//   COMMENTS_ID,
//   TASKLOGS_ID,
//   ATTACHMENTS_BUCKET_ID,
//   TASK_ATTACHMENT_ID,
// } from "@/config";
// import { ID, Query } from "node-appwrite";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { MessageSchema } from "../schemas";
// import { z } from "zod";
// import { createAdminClient } from "@/lib/appwrite";

export const maxDuration = 30;

const app = new Hono().post(
  "/chat",
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
);

export default app;