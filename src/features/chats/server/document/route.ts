import { Hono } from "hono";
import { saveDocument } from "@/features/chats/queries";
import { getDocumentsById } from "@/features/chats/queries";
import { supabaseMiddleware } from "@/lib/supabase-middleware";

export const maxDuration = 30;

const app = new Hono()
  .get("/", supabaseMiddleware(), async (c) => {
    // const databases = c.get("databases");
    const user = c.get("user");
    const { id } = c.req.param() as { id: string };

    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const documents = await getDocumentsById({ id: id });

    const [document] = documents;
    if (!document) {
      return c.json({ message: "Document not found" }, 404);
    }

    if (document.userId !== user.id) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    return c.json({ data: documents });
  })
  .post("/", supabaseMiddleware(), async (c) => {
    const user = c.get("user");
    const { id } = c.req.param() as { id: string };
    const { content, title, kind } = await c.req.json();

    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const document = await saveDocument({
      id,
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
