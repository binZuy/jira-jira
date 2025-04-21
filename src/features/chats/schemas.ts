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

// Floor Overview Tool schemas
export const FloorRoomOverviewInputSchema = z.object({
  floor: z.number().optional().describe('Optional floor number to filter rooms by (e.g., 2 for rooms 201, 202, etc.)'),
});

export const RoomTaskSummarySchema = z.object({
  roomNumber: z.string(),
  taskCount: z.number(),
  activeTaskCount: z.number().optional(),
  completedTaskCount: z.number().optional(),
});

export const FloorSummarySchema = z.object({
  floor: z.number(),
  rooms: z.array(RoomTaskSummarySchema),
  totalTasks: z.number(),
  totalRooms: z.number(),
});

export const FloorRoomOverviewOutputSchema = z.object({
  overview: z.array(FloorSummarySchema),
});

export type FloorRoomOverviewInput = z.infer<typeof FloorRoomOverviewInputSchema>;
export type FloorRoomOverviewOutput = z.infer<typeof FloorRoomOverviewOutputSchema>;
export type RoomTaskSummary = z.infer<typeof RoomTaskSummarySchema>;
export type FloorSummary = z.infer<typeof FloorSummarySchema>;
