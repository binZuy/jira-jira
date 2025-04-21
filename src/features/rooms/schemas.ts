import { RoomType } from "@/lib/types/enums";
import { z } from "zod";

export const createRoomSchema = z.object({
  roomNumber: z.number().min(1, "Required"),
  roomType: z.nativeEnum(RoomType, { required_error: "Required" }),
});

export const updateRoomSchema = z.object({
  roomNumber: z.number().min(1, "Required").optional(),
  roomType: z.nativeEnum(RoomType, { required_error: "Required" }).optional(),
});