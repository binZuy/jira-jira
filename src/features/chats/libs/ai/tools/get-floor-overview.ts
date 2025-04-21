import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { 
  FloorRoomOverviewInputSchema,
  FloorRoomOverviewOutputSchema,
  RoomTaskSummarySchema,
  FloorSummarySchema
} from '@/features/chats/schemas';
import { TaskStatus } from '@/lib/types/enums';

export const getFloorOverview = tool({
  description: 'Get an overview of floors, their rooms, and the number of tasks for each room. This tool will automatically display a visual dashboard. Do not include text explanations when using this tool - the visual representation is sufficient.',
  parameters: FloorRoomOverviewInputSchema,
  execute: async ({ floor }, { toolCallId, messages }) => {
    try {
      console.log(`Getting floor overview${floor ? ` for floor ${floor}` : ''}`);
      
      const supabase = await createClient();
      
      // Get all rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id, roomNumber');
      
      if (roomsError) {
        console.error(`Error fetching rooms:`, roomsError.message);
        return {
          error: `Error fetching rooms: ${roomsError.message}`,
        };
      }
      
      if (!roomsData || roomsData.length === 0) {
        return {
          overview: [],
        };
      }
      
      // Group rooms by floor
      const floorMap = new Map<number, Array<{ id: number, roomNumber: string }>>();
      
      roomsData.forEach(room => {
        // Extract the floor number from the room number (e.g., 201 -> 2)
        const roomNumberStr = String(room.roomNumber);
        const floorNumber = parseInt(roomNumberStr.charAt(0), 10);
        
        // Filter by floor if specified
        if (floor !== undefined && floorNumber !== floor) {
          return;
        }
        
        if (!floorMap.has(floorNumber)) {
          floorMap.set(floorNumber, []);
        }
        
        floorMap.get(floorNumber)?.push({
          id: room.id,
          roomNumber: roomNumberStr,
        });
      });
      
      // Initialize result array
      const overview: Array<z.infer<typeof FloorSummarySchema>> = [];
      
      // Process each floor
      for (const [floorNumber, rooms] of Array.from(floorMap.entries())) {
        console.log(`Processing floor ${floorNumber} with ${rooms.length} rooms`);
        
        const roomIds = rooms.map((room: { id: number; roomNumber: string }) => room.id);
        
        // Get tasks for all rooms on this floor
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('id, roomId, status')
          .in('roomId', roomIds);
        
        if (tasksError) {
          console.error(`Error fetching tasks for floor ${floorNumber}:`, tasksError.message);
          continue;
        }
        
        // Group tasks by room
        const roomTasksMap = new Map<number, Array<{ id: string, status: TaskStatus }>>();
        
        tasksData?.forEach(task => {
          if (!task.roomId) return; // Skip if roomId is null
          
          if (!roomTasksMap.has(task.roomId)) {
            roomTasksMap.set(task.roomId, []);
          }
          
          roomTasksMap.get(task.roomId)?.push({
            id: task.id,
            status: task.status as TaskStatus,
          });
        });
        
        // Create summary for each room
        const roomSummaries: Array<z.infer<typeof RoomTaskSummarySchema>> = [];
        let totalTasks = 0;
        
        rooms.forEach((room: { id: number; roomNumber: string }) => {
          const tasks = roomTasksMap.get(room.id) || [];
          const taskCount = tasks.length;
          const activeTaskCount = tasks.filter(task => 
            task.status === TaskStatus.IN_PROGRESS || 
            task.status === TaskStatus.TODO).length;
          const completedTaskCount = tasks.filter(task => 
            task.status === TaskStatus.DONE).length;
          
          totalTasks += taskCount;
          
          roomSummaries.push({
            roomNumber: room.roomNumber,
            taskCount,
            activeTaskCount,
            completedTaskCount,
          });
        });
        
        // Sort rooms by room number
        roomSummaries.sort((a, b) => 
          parseInt(a.roomNumber) - parseInt(b.roomNumber)
        );
        
        // Add floor summary to overview
        overview.push({
          floor: floorNumber,
          rooms: roomSummaries,
          totalTasks,
          totalRooms: rooms.length,
        });
      }
      
      // Sort floors numerically
      overview.sort((a, b) => a.floor - b.floor);
      
      console.log(`Returning overview with ${overview.length} floors`);
      
      return { overview };
    } catch (error) {
      console.error('Unexpected error in getFloorOverview:', error);
      return {
        error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
}); 