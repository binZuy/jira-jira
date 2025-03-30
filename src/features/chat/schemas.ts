import { z } from "zod";

export const MessageSchema = z.object({
    messages: z.array(
        z.object({
            id: z.string(),
            role: z.enum(["user", "assistant"]),
            parts: z.array(
                z.object({
                    type: z.enum(["text"]),
                    text: z.string(),
                })
            ),
        })
    ),
});
