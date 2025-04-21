import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { RoomType, TaskStatus, Priority, RoomStatus, Linen } from '@/lib/types/enums';

// Define interfaces for our data types
interface Room {
  id: number;
  roomNumber: number;
  roomType: RoomType;
  created_at: string;
}

interface TaskData {
  id: string;
  name: string;
  status: TaskStatus;
  priority: Priority;
  description?: string;
  dueDate?: string;
  roomStatus?: RoomStatus;
  linen?: Linen;
  checkIn?: string;
  checkOut?: string;
  roomType?: RoomType;
  created_at?: string;
  assigneeName?: string;
  assigneeId?: string;
}

export const getRoomInfo = tool({
  description: 'Get information about a specific room by its room number',
  parameters: z.object({
    roomNumber: z.string().describe('The room number to get information about'),
  }),
  execute: async ({ roomNumber }) => {
    const supabase = await createClient();
    
    // Get room data from Supabase
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('roomNumber', Number(roomNumber))
      .single();
    
    if (roomError || !roomData) {
      return {
        error: `Room ${roomNumber} not found in the database`,
      };
    }
    
    // Cast the room data to our Room interface
    const room = roomData as Room;
    
    // Get tasks that have data for this room
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, status, priority, description, dueDate, roomStatus, linen, checkIn, checkOut, roomType, created_at, assigneeName, assigneeId')
      .eq('roomId', room.id);
    
    if (tasksError) {
      console.error(`Error fetching tasks for room ${roomNumber}:`, tasksError.message);
      return {
        error: `Error fetching tasks for room ${roomNumber}: ${tasksError.message}`,
      };
    }
    
    // Cast the tasks data to our TaskData interface
    const tasks = tasksData as TaskData[];
    
    // If there are no tasks, return basic room info
    if (!tasks || tasks.length === 0) {
      return {
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        id: room.id,
        created_at: room.created_at,
        tasks: [],
      };
    }
    
    // Get the most recent task to extract room data from
    // Sort tasks by created_at in descending order and take the first one
    const latestTask = tasks.sort((a, b) => 
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    )[0];
    
    // Return both room data and associated task data
    return {
      roomNumber: room.roomNumber,
      roomType: latestTask.roomType || room.roomType,
      priority: latestTask.priority,
      status: latestTask.status,
      roomStatus: latestTask.roomStatus,
      linen: latestTask.linen ? String(latestTask.linen).charAt(0) + String(latestTask.linen).slice(1).toLowerCase() : '',
      checkInTime: latestTask.checkIn,
      checkOutTime: latestTask.checkOut,
      roomId: room.id,
      assigneeName: latestTask.assigneeName,
      dueDate: latestTask.dueDate,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        status: task.status,
        priority: task.priority,
        description: task.description,
        dueDate: task.dueDate,
        assigneeName: task.assigneeName
      })),
    };
  },
}); 