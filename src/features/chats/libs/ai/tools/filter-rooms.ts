import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const filterRooms = tool({
  description: 'Filter rooms by their properties',
  parameters: z.object({
    roomType: z.string().optional().describe('Filter by room type (e.g. Suite, Deluxe, Standard, President)'),
    priority: z.string().optional().describe('Filter by priority (e.g. Low, Medium, High)'),
    status: z.string().optional().describe('Filter by status (e.g. To Do, Done, Out of Service, etc.)'),
    roomStatus: z.string().optional().describe('Filter by room status (e.g. Stayover, Departure)'),
    linen: z.string().optional().describe('Filter by linen status (Yes or No)'),
  }),
  execute: async ({ roomType, priority, status, roomStatus, linen }) => {
    const supabase = await createClient();
    
    // First get all rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, roomNumber, roomType');
    
    if (roomsError) {
      return {
        error: `Error fetching rooms: ${roomsError.message}`,
      };
    }
    
    // Get all tasks with full details
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*');
    
    if (tasksError) {
      return {
        error: `Error fetching tasks: ${tasksError.message}`,
      };
    }
    
    // Process filters and apply them
    let filteredRooms = rooms;
    
    // Create a map to associate rooms with their latest task info
    const roomTaskMap = new Map();
    
    // Go through all tasks and keep only the latest one for each room
    tasks?.forEach(task => {
      if (!task.roomId) return;
      
      if (!roomTaskMap.has(task.roomId) || 
          new Date(task.created_at) > new Date(roomTaskMap.get(task.roomId).created_at)) {
        roomTaskMap.set(task.roomId, task);
      }
    });
    
    // Now apply the filters
    if (roomType || priority || status || roomStatus || linen) {
      filteredRooms = rooms.filter(room => {
        // Get the latest task for this room
        const latestTask = roomTaskMap.get(room.id);
        
        // If no task exists and we're filtering by task properties, exclude this room
        if (!latestTask && (priority || status || roomStatus || linen)) {
          return false;
        }
        
        // Apply room type filter
        if (roomType && 
            (!latestTask?.roomType || 
             !latestTask.roomType.toLowerCase().includes(roomType.toLowerCase())) && 
            (!room.roomType || 
             !room.roomType.toLowerCase().includes(roomType.toLowerCase()))) {
          return false;
        }
        
        // Apply priority filter
        if (priority && 
            (!latestTask?.priority || 
             !latestTask.priority.toLowerCase().includes(priority.toLowerCase()))) {
          return false;
        }
        
        // Apply status filter
        if (status && 
            (!latestTask?.status || 
             !latestTask.status.toLowerCase().includes(status.toLowerCase()))) {
          return false;
        }
        
        // Apply room status filter
        if (roomStatus && 
            (!latestTask?.roomStatus || 
             !latestTask.roomStatus.toLowerCase().includes(roomStatus.toLowerCase()))) {
          return false;
        }
        
        // Apply linen filter
        if (linen && 
            (!latestTask?.linen || 
             !latestTask.linen.toLowerCase().includes(linen.toLowerCase()))) {
          return false;
        }
        
        return true;
      });
    }
    
    // Return formatted data
    return {
      count: filteredRooms.length,
      rooms: filteredRooms.map(room => {
        const latestTask = roomTaskMap.get(room.id);
        return {
          roomNumber: room.roomNumber,
          roomType: latestTask?.roomType || room.roomType,
          priority: latestTask?.priority || null,
          status: latestTask?.status || null,
          roomStatus: latestTask?.roomStatus || null,
          linen: latestTask?.linen || null,
        };
      }),
    };
  },
}); 