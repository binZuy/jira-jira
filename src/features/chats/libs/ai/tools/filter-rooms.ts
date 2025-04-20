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
    
    // Get all roomTasks with full details
    const { data: roomTasks, error: tasksError } = await supabase
      .from('roomTask')
      .select('*');
    
    if (tasksError) {
      return {
        error: `Error fetching room tasks: ${tasksError.message}`,
      };
    }
    
    // Combine rooms with their task data
    const combinedRooms = rooms.map(room => {
      const roomTask = roomTasks.find(task => task.roomId === room.id);
      
      // If no task data exists, return basic room data
      if (!roomTask) {
        return {
          'Room Number': room.roomNumber?.toString() || '',
          'Room Type': room.roomType || '',
          'Priority': '',
          'Status': '',
          'Room Status': '',
          'Linen': '',
          'Check In Time': null,
          'Check Out Time': null,
        };
      }
      
      // Return combined data
      return {
        'Room Number': room.roomNumber?.toString() || '',
        'Room Type': roomTask.roomType || room.roomType || '',
        'Priority': roomTask.priority || '',
        'Status': roomTask.status || '',
        'Room Status': roomTask.roomStatus || '',
        'Linen': roomTask.linen ? roomTask.linen.charAt(0) + roomTask.linen.slice(1).toLowerCase() : '',
        'Check In Time': roomTask.checkIn,
        'Check Out Time': roomTask.checkOut,
      };
    });
    
    // Apply filters if any
    let filteredRooms = [...combinedRooms];
    
    if (roomType) {
      filteredRooms = filteredRooms.filter(
        (room) => room['Room Type'].toLowerCase() === roomType.toLowerCase()
      );
    }
    
    if (priority) {
      filteredRooms = filteredRooms.filter(
        (room) => room['Priority'].toLowerCase() === priority.toLowerCase()
      );
    }
    
    if (status) {
      filteredRooms = filteredRooms.filter(
        (room) => room['Status'].toLowerCase() === status.toLowerCase()
      );
    }
    
    if (roomStatus) {
      filteredRooms = filteredRooms.filter(
        (room) => room['Room Status'].toLowerCase() === roomStatus.toLowerCase()
      );
    }
    
    if (linen) {
      const linenValue = linen.toUpperCase();
      filteredRooms = filteredRooms.filter(
        (room) => room['Linen'].toUpperCase() === linenValue
      );
    }
    
    return {
      count: filteredRooms.length,
      rooms: filteredRooms,
    };
  },
}); 