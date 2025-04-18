import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { supabaseMiddleware } from "@/lib/supabase-middleware";
import { createRoomSchema, updateRoomSchema } from "@/features/rooms/schemas";

const app = new Hono()
  .use("*", supabaseMiddleware())
  .get("/", async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user is a member of the workspace
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*");

    if (roomsError || !rooms) {
      return c.json({ error: "Rooms not found" }, 400);
    }

    if (rooms.length === 0) {
      return c.json({ data: [] });
    }

    return c.json({ data: rooms });
  })
  .get("/:roomId", async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");
    const { roomId } = c.req.param();
    const id = Number(roomId);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();

    if (roomError || !room) {
      return c.json({ error: "Room not found" }, 404);
    }

    return c.json({ data: room });
  })
  .post(
    "/",
    zValidator("json", createRoomSchema), // Validate the request body with Zod schema
    async (c) => {
      const supabase = c.get("supabase"); // Get Supabase instance
      const user = c.get("user"); // Get the current user from context
      const { name, roomType } = c.req.valid("json");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert([
          {
            name,
            roomType,
          },
        ])
        .select()
        .single(); // Use .single() to ensure it returns the inserted row

      if (roomError) {
        return c.json({ error: roomError.message }, 500);
      }

      // Return the created project data
      return c.json({ data: room });
    }
  )
  .patch("/:roomId", zValidator("json", updateRoomSchema), async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { roomId } = c.req.param();
    const id = Number(roomId);
    const { name, roomType } = c.req.valid("json");

    // Fetch the existing project
    const { data: existingRoom, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();

    if (roomError || !existingRoom) {
      return c.json({ error: "Room not found" }, 404);
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({
        name,
        roomType: roomType,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return c.json({ error: updateError.message }, 500);
    }

    return c.json({ data: updatedRoom });
  })
  .delete("/:roomId", async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");
    const { roomId } = c.req.param();
    const id = Number(roomId);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Fetch the existing project from Supabase
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", id)
      .single();

    if (roomError || !room) {
      return c.json({ error: "Room not found" }, 404);
    }

    // Delete tasks associated with the project
    const { error: deleteTasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("roomId", id);

    if (deleteTasksError) {
      return c.json({ error: deleteTasksError.message }, 500);
    }

    // Delete the project itself
    const { error: deleteRoomError } = await supabase
      .from("rooms")
      .delete()
      .eq("id", id);

    if (deleteRoomError) {
      return c.json({ error: deleteRoomError.message }, 500);
    }

    // Return the deleted project ID
    return c.json({ data: { id: room.id } });
  });

export default app;
