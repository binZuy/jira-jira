import { z } from "zod";

export const MessageSchema = z.object({
  id: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant", "system", "data"]),
      parts: z.array(
        z.object({
          type: z.enum(["text", "step-start"]), // Allow "text" and "step-start"
          text: z.string().optional(),         // Make "text" optional
        })
      ),
      content: z.string(),
    })
  ),
  selectedChatModel: z.string(),
});
