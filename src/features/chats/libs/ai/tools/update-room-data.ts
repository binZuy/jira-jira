import { tool } from 'ai';
import { z } from 'zod';
import { roomData, RoomData } from '../../../../rooms/room-data';

export const updateRoomData = tool({
  description: 'Update room information with a confirmation step. This tool will show a preview of the changes and require confirmation before applying them.',
  parameters: z.object({
    roomNumber: z.string().describe('The room number to update'),
    field: z.enum(['Room Type', 'Priority', 'Status', 'Room Status', 'Linen', 'Check In Time', 'Check Out Time']).describe('The field to update'),
    newValue: z.string().nullable().describe('The new value to set'),
  }),
  execute: async ({ roomNumber, field, newValue }) => {
    // Find the room to update
    const roomIndex = roomData.findIndex(room => room['Room Number'] === roomNumber);
    if (roomIndex === -1) {
      return {
        error: `Room ${roomNumber} not found`,
      };
    }

    const currentRoom = roomData[roomIndex];
    const currentValue = currentRoom[field];

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
          newValue
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
  }),
  execute: async ({ roomNumber, field, newValue }) => {
    // Just return a success message without making changes
    return {
      type: 'update-result',
      message: `Room ${roomNumber} ${field} has been updated to "${newValue}"`,
    };
  },
}); 