import { createClient } from '@/lib/supabase/server';
import { roomData } from './room-data';
import { RoomType, TaskStatus, Priority, RoomStatus, Linen } from '@/lib/types/enums';

/**
 * Migration script to populate Supabase with the initial room data
 * Run this script once to set up the database with the static room data
 */
export async function migrateRoomsToSupabase() {
  const supabase = await createClient();
  
  console.log('Starting room data migration...');
  console.log(`Found ${roomData.length} rooms to migrate`);
  
  // Create rooms first
  for (const room of roomData) {
    const roomNumber = room['Room Number'];
    const rawRoomType = room['Room Type'].toUpperCase().replace(' ', '_');
    
    // Map to valid room type enum
    let roomType: RoomType;
    switch (rawRoomType) {
      case 'STANDARD':
        roomType = RoomType.STANDARD;
        break;
      case 'DELUXE':
        roomType = RoomType.DELUXE;
        break;
      case 'SUITE':
        roomType = RoomType.SUITE;
        break;
      case 'PRESIDENT':
        roomType = RoomType.PRESIDENT;
        break;
      default:
        roomType = RoomType.STANDARD;
    }
    
    // Add room to rooms table
    const { data: createdRoom, error: roomError } = await supabase
      .from('rooms')
      .upsert({
        roomNumber: parseInt(roomNumber, 10),
        roomType,
      }, { onConflict: 'roomNumber' })
      .select('id')
      .single();
    
    if (roomError) {
      console.error(`Error creating room ${roomNumber}:`, roomError);
      continue;
    }
    
    console.log(`Created/updated room ${roomNumber} with ID ${createdRoom.id}`);
    
    // Map values to valid enums
    const rawPriority = room['Priority'].toUpperCase();
    const priority = rawPriority === 'HIGH' ? Priority.HIGH : 
                     rawPriority === 'MEDIUM' ? Priority.MEDIUM : 
                     Priority.LOW;
                     
    const rawStatus = room['Status'].toUpperCase().replace(/ /g, '_');
    let status: TaskStatus;
    if (rawStatus === 'TO_DO' || rawStatus === 'TODO') status = TaskStatus.TODO;
    else if (rawStatus === 'IN_PROGRESS') status = TaskStatus.IN_PROGRESS;
    else if (rawStatus === 'DONE') status = TaskStatus.DONE;
    else if (rawStatus === 'OUT_OF_SERVICE') status = TaskStatus.OUT_OF_SERVICE;
    else if (rawStatus === 'DO_NOT_DISTURB') status = TaskStatus.DO_NOT_DISTURB;
    else if (rawStatus === 'READY_FOR_INSPECTION') status = TaskStatus.READY_FOR_INSPECTION;
    else status = TaskStatus.TODO;
    
    const rawRoomStatus = room['Room Status'].toUpperCase().replace(/ /g, '_');
    let roomStatus: RoomStatus;
    if (rawRoomStatus === 'STAYOVER' || rawRoomStatus === 'STAY_OVER') roomStatus = RoomStatus.STAY_OVER;
    else if (rawRoomStatus === 'DEPARTURE') roomStatus = RoomStatus.DEPARTURE;
    else roomStatus = RoomStatus.STAY_OVER;
    
    const rawLinen = room['Linen'].toUpperCase();
    const linen = rawLinen === 'YES' ? Linen.YES : Linen.NO;
    
    // Create a task for this room with all the room data
    const { error: taskError } = await supabase
      .from('tasks')
      .insert({
        name: `Room ${roomNumber} setup`,
        roomId: createdRoom.id,
        roomNumber: parseInt(roomNumber, 10),
        roomType,
        priority,
        status,
        roomStatus,
        linen,
        checkIn: room['Check In Time'],
        checkOut: room['Check Out Time'],
        // Add required fields for a task
        assigneeId: '00000000-0000-0000-0000-000000000000', // Default assignee ID
        projectId: '00000000-0000-0000-0000-000000000000', // Default project ID
        position: 1000,
        description: `Initial setup for Room ${roomNumber}`,
      });
    
    if (taskError) {
      console.error(`Error creating task for room ${roomNumber}:`, taskError);
    } else {
      console.log(`Created task for room ${roomNumber}`);
    }
  }
  
  console.log('Room data migration completed!');
  return { success: true, message: 'Room data migration completed' };
}

// Export a helper API route handler
export async function migrateHandler() {
  try {
    const result = await migrateRoomsToSupabase();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
} 