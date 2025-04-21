import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { TaskStatus, Priority } from '@/lib/types/enums';

export const updateRoomData = tool({
  description: 'Update room information with a confirmation step. This tool will show a preview of the changes and require confirmation before applying them.',
  parameters: z.object({
    roomNumber: z.string().describe('The room number to update'),
    field: z.enum(['Room Type', 'Priority', 'Status', 'Room Status', 'Linen', 'Check In Time', 'Check Out Time']).describe('The field to update'),
    newValue: z.string().nullable().describe('The new value to set'),
  }),
  execute: async ({ roomNumber, field, newValue }) => {
    try {
      console.log(`UpdateRoomData called for room ${roomNumber}, field ${field}, new value: ${newValue}`);
      
      const supabase = await createClient();
      
      // First, get the room ID
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('roomNumber', Number(roomNumber))
        .single();
      
      if (roomError || !room) {
        console.error(`Room not found error: ${roomError?.message || 'No room data'}`);
        return {
          error: `Room ${roomNumber} not found`,
        };
      }

      console.log(`Found room with ID: ${room.id}`);

      // Get the most recent task for this room to get current values
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('roomId', room.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (tasksError) {
        console.error(`Error fetching room tasks: ${tasksError.message}`);
        return {
          error: `Error fetching room tasks: ${tasksError.message}`,
        };
      }

      // Map UI field names to database column names
      const fieldMapping = {
        'Room Type': 'roomType',
        'Priority': 'priority',
        'Status': 'status',
        'Room Status': 'roomStatus',
        'Linen': 'linen',
        'Check In Time': 'checkIn',
        'Check Out Time': 'checkOut',
      };
      
      const dbField = fieldMapping[field];
      
      // Get current value from the most recent task
      let currentValue = null;
      const latestTask = tasks && tasks.length > 0 ? tasks[0] : null;
      if (latestTask) {
        currentValue = latestTask[dbField as keyof typeof latestTask];
        console.log(`Current value for ${field}: ${currentValue}`);
      } else {
        console.log(`No tasks found for room ${roomNumber}`);
      }
      
      // Get all tasks related to this room to inform the confirmation
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('roomId', room.id);
      
      if (allTasksError) {
        console.error(`Error fetching all room tasks: ${allTasksError.message}`);
        return {
          error: `Error fetching all room tasks: ${allTasksError.message}`,
        };
      }
      
      const result = {
        type: 'confirmation-required',
        message: `You're about to update the ${field} for Room ${roomNumber}`,
        details: {
          room: roomNumber,
          field,
          currentValue: currentValue || 'Not set',
          newValue: newValue || 'Not set',
          tasksAffected: (allTasks || []).length,
          roomId: room.id
        },
      };
      
      console.log('UpdateRoomData response:', JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Unexpected error in updateRoomData:', error);
      return {
        error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Separate function for confirmation
export const confirmRoomUpdate = tool({
  description: 'Confirm and apply the room update',
  parameters: z.object({
    roomNumber: z.string(),
    field: z.enum(['Room Type', 'Priority', 'Status', 'Room Status', 'Linen', 'Check In Time', 'Check Out Time']),
    newValue: z.string().nullable(),
    roomId: z.number(),
  }),
  execute: async ({ roomNumber, field, newValue, roomId }) => {
    try {
      console.log(`Confirming room update for room ${roomNumber} (ID: ${roomId}), field: ${field}, new value: ${newValue}`);
      
      const supabase = await createClient();
      
      // Map UI field names to database column names
      const fieldMapping = {
        'Room Type': 'roomType',
        'Priority': 'priority',
        'Status': 'status',
        'Room Status': 'roomStatus',
        'Linen': 'linen',
        'Check In Time': 'checkIn',
        'Check Out Time': 'checkOut',
      };
      
      const dbField = fieldMapping[field];
      
      // Get all tasks for this room
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('roomId', roomId);
      
      if (tasksError) {
        console.error(`Error fetching tasks: ${tasksError.message}`);
        return {
          error: `Error fetching tasks: ${tasksError.message}`,
        };
      }
      
      console.log(`Found ${tasks?.length || 0} tasks for room ${roomNumber}`);
      
      let updateError = null;
      
      // If there are existing tasks, update all of them with the new value
      if (tasks && tasks.length > 0) {
        const valueToUpdate = dbField === 'linen' && newValue 
          ? newValue.toUpperCase() 
          : newValue;
        
        console.log(`Updating ${tasks.length} tasks with ${dbField}=${valueToUpdate}`);
        
        // Update all tasks associated with this room
        console.log(`Executing update query for roomId: ${roomId}, field: ${dbField}, value: ${valueToUpdate}`);
        const { error, data } = await supabase
          .from('tasks')
          .update({ [dbField]: valueToUpdate })
          .eq('roomId', roomId)
          .select();
        
        console.log(`Update result: ${error ? 'Error' : 'Success'}, affected rows: ${data?.length || 0}`);
        updateError = error;
      } else {
        // Create a new task entry for this room with the minimal required fields
        const valueToInsert = dbField === 'linen' && newValue 
          ? newValue.toUpperCase() 
          : newValue;
        
        // Get the room number from the rooms table
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('roomNumber, roomType')
          .eq('id', roomId)
          .single();
        
        if (roomError || !room) {
          console.error(`Room not found with ID ${roomId}: ${roomError?.message || 'No data'}`);
          return {
            error: `Room not found with ID ${roomId}`,
          };
        }
        
        console.log(`Creating new task for room ${roomNumber} with ${dbField}=${valueToInsert}`);
        
        // Create a basic task for this room
        const { error } = await supabase
          .from('tasks')
          .insert({
            roomId,
            name: `Room ${roomNumber} maintenance`,
            status: TaskStatus.TODO,
            priority: Priority.MEDIUM,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            [dbField]: valueToInsert,
          });
        
        updateError = error;
        if (error) {
          console.error(`Error creating task: ${error.message}`);
        }
      }
      
      if (updateError) {
        return {
          error: `Failed to update room: ${updateError.message}`,
        };
      }

      const result = {
        type: 'update-result',
        message: `Room ${roomNumber} ${field} has been updated to "${newValue}"`,
        data: {
          roomNumber,
          field,
          newValue,
          status: 'success'
        }
      };
      
      console.log('Update successful:', JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Unexpected error in confirmRoomUpdate:', error);
      return {
        error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
}); 