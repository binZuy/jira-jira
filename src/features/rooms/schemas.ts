import { RoomType } from "@/lib/types/enums";
import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  roomType: z.nativeEnum(RoomType, { required_error: "Required" }),
});

export const updateRoomSchema = z.object({
  name: z.string().trim().min(1, "Minimum 1 character required").optional(),
  roomType: z.nativeEnum(RoomType, { required_error: "Required" }).optional(),
});