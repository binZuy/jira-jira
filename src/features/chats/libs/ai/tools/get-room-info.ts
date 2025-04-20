import { tool } from 'ai';
import { z } from 'zod';
import { roomData, RoomData } from '../../../../rooms/room-data';

export const getRoomInfo = tool({
  description: 'Get information about a specific room by its room number',
  parameters: z.object({
    roomNumber: z.string().describe('The room number to get information about'),
  }),
  execute: async ({ roomNumber }) => {
    const room = roomData.find((r) => r['Room Number'] === roomNumber);
    
    if (!room) {
      return {
        error: `Room ${roomNumber} not found in the dataset`,
      };
    }

    return {
      roomNumber: room['Room Number'],
      roomType: room['Room Type'],
      priority: room['Priority'],
      status: room['Status'],
      roomStatus: room['Room Status'],
      linen: room['Linen'],
      checkInTime: room['Check In Time'],
      checkOutTime: room['Check Out Time'],
    };
  },
}); 