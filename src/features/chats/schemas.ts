import { z } from "zod";

export const MessageSchema = z.object({
    id: z.string(),
    messages: z.array(
        z.object({
            id: z.string(),
            role: z.enum(["user", "assistant", "system", "data"]),
            parts: z.array(
                z.object({
                    type: z.enum(["text"]),
                    text: z.string(),
                })
            ),
            content: z.string(),
        }),
    ),
    selectedChatModel: z.string(),
});
