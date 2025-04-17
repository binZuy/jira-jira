import { Hono } from "hono";
import { getSuggestionsByDocumentId } from "@/features/chats/queries";
import { supabaseMiddleware } from "@/lib/supabase-middleware";

export const maxDuration = 30;

const app = new Hono()
  .get("/", supabaseMiddleware(), async (c) => {
    const user = c.get("user");
    const { documentId } = c.req.param() as { documentId: string };

    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    if (!documentId) {
      return c.json({ message: "Document ID is required" }, 400);
    }

    const suggestions = await getSuggestionsByDocumentId({
      documentId
    });

    const [suggestion] = suggestions;

    if (!suggestion) {
      return c.json([], 200);
    }

    return c.json({ data: suggestions });
  });
export default app;
