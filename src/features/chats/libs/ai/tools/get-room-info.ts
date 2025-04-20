import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const getRoomInfo = tool({
  description: 'Get information about a specific room by its room number',
  parameters: z.object({
    roomNumber: z.string().describe('The room number to get information about'),
  }),
  execute: async ({ roomNumber }) => {
    const supabase = await createClient();
    
    // Get room data from Supabase
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('roomNumber', Number(roomNumber))
      .single();
    
    if (roomError || !room) {
      return {
        error: `Room ${roomNumber} not found in the database`,
      };
    }
    
    // Get related tasks for this room
    const { data: roomTasks, error: tasksError } = await supabase
      .from('roomTask')
      .select('*')
      .eq('roomId', room.id)
      .single();
    
    // Get actual tasks assigned to this room
    const { data: tasks, error: tasksListError } = await supabase
      .from('tasks')
      .select('id, name, status, priority, description, dueDate')
      .eq('roomId', room.id);
    
    if (tasksListError) {
      console.error(`Error fetching tasks for room ${roomNumber}:`, tasksListError.message);
    }
      
    if (tasksError || !roomTasks) {
      // Return just the room data if no tasks are found
      return {
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        // Return basic room info without task details
        id: room.id,
        created_at: room.created_at,
        tasks: tasks || [],
      };
    }
    
    // Return both room data and associated task data
    return {
      roomNumber: roomTasks.roomNumber,
      roomType: roomTasks.roomType,
      priority: roomTasks.priority,
      status: roomTasks.status,
      roomStatus: roomTasks.roomStatus,
      linen: roomTasks.linen ? roomTasks.linen.charAt(0) + roomTasks.linen.slice(1).toLowerCase() : '',
      checkInTime: roomTasks.checkIn,
      checkOutTime: roomTasks.checkOut,
      roomId: room.id,
      taskId: roomTasks.taskId,
      tasks: tasks || [],
    };
  },
}); 