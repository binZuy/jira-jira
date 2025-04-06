import { sessionMiddleware } from "@/lib/session-middleware";
// import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
// import { getMember } from "@/features/members/utils";
// import {
//   DATABASE_ID,
//   CHATS_ID,
//   MESSAGES_ID,
// MEMBERS_ID,
// PROJECTS_ID,
// TASKS_ID,
// COMMENTS_ID,
// TASKLOGS_ID,
// ATTACHMENTS_BUCKET_ID,
// TASK_ATTACHMENT_ID,
// } from "@/config";
// import { Query } from "node-appwrite";
import { getDocumentsById } from "@/features/chats/queries";

export const maxDuration = 30;

const app = new Hono().get("/:documentId", sessionMiddleware, async (c) => {
  // const databases = c.get("databases");
  const user = c.get("user");
  const { documentId } = c.req.param();

  const documents = await getDocumentsById({ id: documentId });

  const [document] = documents;
  if (!document) {
    return c.json({ message: "Document not found" }, 404);
  }

  if (document.userId !== user.$id) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  return c.json({ data: documents });
});

export default app;
