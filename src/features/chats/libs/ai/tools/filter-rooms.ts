import { z } from 'zod';
import { roomData } from '../../../../rooms/room-data';

const filterParamsSchema = z.object({
  roomType: z.enum(['Standard', 'Deluxe', 'Suite', 'President']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.enum(['Out of Service', 'Ready for Inspection', 'In Progress', 'Done', 'To Do', 'Do Not Disturb']).optional(),
  roomStatus: z.enum(['Departure', 'Stayover']).optional(),
  linen: z.enum(['Yes', 'No']).optional(),
  floor: z.enum(['1', '2', '3', '4', '5']).optional(),
});

export const filterRooms = {
  name: 'filterRooms',
  description: 'Filter rooms based on specific criteria such as status, type, priority, etc.',
  parameters: filterParamsSchema,
  execute: async (params: z.infer<typeof filterParamsSchema>) => {
    let filteredRooms = [...roomData];

    // Apply filters if they are provided
    if (params.roomType) {
      filteredRooms = filteredRooms.filter(room => room['Room Type'] === params.roomType);
    }
    if (params.priority) {
      filteredRooms = filteredRooms.filter(room => room['Priority'] === params.priority);
    }
    if (params.status) {
      filteredRooms = filteredRooms.filter(room => room['Status'] === params.status);
    }
    if (params.roomStatus) {
      filteredRooms = filteredRooms.filter(room => room['Room Status'] === params.roomStatus);
    }
    if (params.linen) {
      filteredRooms = filteredRooms.filter(room => room['Linen'] === params.linen);
    }
    if (params.floor) {
      filteredRooms = filteredRooms.filter(room => room['Room Number'].startsWith(params.floor!));
    }

    return {
      count: filteredRooms.length,
      rooms: filteredRooms
    };
  }
}; 