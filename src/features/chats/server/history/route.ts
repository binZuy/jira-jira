import { sessionMiddleware } from "@/lib/session-middleware";
import { Hono } from "hono";
import { getChatsByUserId } from "../../queries";

const app = new Hono()
  .get("/", sessionMiddleware, async (c) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    
    const chats = await getChatsByUserId();

    return c.json({ data: chats });
  })

export default app;
