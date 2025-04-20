import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const updateRoomData = tool({
  description: 'Update room information with a confirmation step. This tool will show a preview of the changes and require confirmation before applying them.',
  parameters: z.object({
    roomNumber: z.string().describe('The room number to update'),
    field: z.enum(['Room Type', 'Priority', 'Status', 'Room Status', 'Linen', 'Check In Time', 'Check Out Time']).describe('The field to update'),
    newValue: z.string().nullable().describe('The new value to set'),
  }),
  execute: async ({ roomNumber, field, newValue }) => {
    const supabase = await createClient();
    
    // First, get the room ID
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('roomNumber', Number(roomNumber))
      .single();
    
    if (roomError || !room) {
      return {
        error: `Room ${roomNumber} not found`,
      };
    }
    
    // Then get the room task data
    const { data: roomTask, error: taskError } = await supabase
      .from('roomTask')
      .select('*')
      .eq('roomId', room.id)
      .single();
    
    if (taskError && taskError.code !== 'PGRST116') {
      return {
        error: `Error fetching room task: ${taskError.message}`,
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
    
    // Get current value
    let currentValue = null;
    if (roomTask) {
      currentValue = roomTask[dbField];
    }

    // Return the update preview data
    return {
      type: 'update-preview',
      data: {
        roomNumber,
        field,
        currentValue,
        newValue,
      },
      onConfirm: {
        type: 'function',
        name: 'confirmRoomUpdate',
        args: {
          roomNumber,
          field,
          newValue,
          roomId: room.id
        }
      }
    };
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
    
    // Check if roomTask exists
    const { data: existingTask } = await supabase
      .from('roomTask')
      .select('id')
      .eq('roomId', roomId)
      .single();
    
    let updateResult;
    
    if (existingTask) {
      // Update existing roomTask
      const valueToUpdate = dbField === 'linen' && newValue 
        ? newValue.toUpperCase() 
        : newValue;
        
      updateResult = await supabase
        .from('roomTask')
        .update({ [dbField]: valueToUpdate })
        .eq('roomId', roomId);
    } else {
      // Create new roomTask for this room
      const valueToInsert = dbField === 'linen' && newValue 
        ? newValue.toUpperCase() 
        : newValue;
        
      updateResult = await supabase
        .from('roomTask')
        .insert({ 
          roomId,
          roomNumber,
          [dbField]: valueToInsert 
        });
    }
    
    if (updateResult.error) {
      return {
        error: `Failed to update room: ${updateResult.error.message}`,
      };
    }

    return {
      type: 'update-result',
      message: `Room ${roomNumber} ${field} has been updated to "${newValue}"`,
    };
  },
}); 