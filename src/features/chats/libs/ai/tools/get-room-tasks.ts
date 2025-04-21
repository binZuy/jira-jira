import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { RoomType, TaskStatus, Priority, RoomStatus, Linen } from '@/lib/types/enums';

// Define interfaces for task data
interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  priority: Priority;
  description?: string;
  dueDate?: string;
  roomStatus?: RoomStatus;
  linen?: Linen;
  created_at?: string;
  assigneeName?: string;
  assigneeId?: string;
}

export const getRoomTasks = tool({
  description: 'Get detailed task information for a specific room by its room number. This tool is used to display a list of tasks for a room in a modal view.',
  parameters: z.object({
    roomNumber: z.string().describe('The room number to get task information for'),
  }),
  execute: async ({ roomNumber }, { toolCallId, messages }) => {
    try {
      console.log(`Getting task details for room ${roomNumber}`);
      
      const supabase = await createClient();
      
      // First get the room id
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, roomNumber, roomType')
        .eq('roomNumber', Number(roomNumber))
        .single();
      
      if (roomError || !roomData) {
        console.error(`Room ${roomNumber} not found:`, roomError?.message || 'No data');
        return {
          error: `Room ${roomNumber} not found in the database`,
        };
      }
      
      // Get all tasks for this room
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, name, status, priority, description, dueDate, roomStatus, linen, created_at, assigneeName, assigneeId')
        .eq('roomId', roomData.id);
      
      if (tasksError) {
        console.error(`Error fetching tasks for room ${roomNumber}:`, tasksError.message);
        return {
          error: `Error fetching tasks for room ${roomNumber}: ${tasksError.message}`,
        };
      }
      
      // Format tasks for display
      const tasks = (tasksData || []).map(task => ({
        id: task.id,
        name: task.name,
        status: task.status,
        priority: task.priority,
        description: task.description,
        dueDate: task.dueDate,
        roomStatus: task.roomStatus,
        linen: task.linen,
        created_at: task.created_at,
        assigneeName: task.assigneeName,
      }));
      
      // Sort tasks by created_at in descending order
      tasks.sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      
      // Return room data with tasks
      return {
        roomNumber: roomData.roomNumber,
        roomType: roomData.roomType,
        roomId: roomData.id,
        taskCount: tasks.length,
        tasks,
      };
    } catch (error) {
      console.error('Unexpected error in getRoomTasks:', error);
      return {
        error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
}); 