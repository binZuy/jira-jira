import { sessionMiddleware } from "@/lib/session-middleware";
// import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { saveDocument } from "@/features/chats/queries";
// import { Query } from "node-appwrite";
import { getDocumentsById } from "@/features/chats/queries";

export const maxDuration = 30;

const app = new Hono()
  .get("/:documentId", sessionMiddleware, async (c) => {
    // const databases = c.get("databases");
    const user = c.get("user");
    const { documentId } = c.req.param();

    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const documents = await getDocumentsById({ id: documentId });

    const [document] = documents;
    if (!document) {
      return c.json({ message: "Document not found" }, 404);
    }

    if (document.userId !== user.$id) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    return c.json({ data: documents });
  })
  .post("/:documentId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { documentId } = c.req.param();
    const { content, title, kind } = await c.req.json();

    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const document = await saveDocument({
      id: documentId,
      content,
      title,
      kind,
    });

    if (!document) {
      return c.json({ message: "Failed to save document" }, 500);
    }

    return c.json({ data: document });
  });

export default app;
