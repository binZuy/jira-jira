import { createClient } from '@/lib/supabase/server';
import { roomData } from './room-data';

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
    const roomType = room['Room Type'].toUpperCase().replace(' ', '_');
    
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
    
    // Add room task data
    const { error: taskError } = await supabase
      .from('roomTask')
      .upsert({
        roomId: createdRoom.id,
        roomNumber: parseInt(roomNumber, 10),
        roomType: roomType,
        priority: room['Priority'].toUpperCase(),
        status: room['Status'].toUpperCase().replace(/ /g, '_'),
        roomStatus: room['Room Status'].toUpperCase().replace(/ /g, '_'),
        linen: room['Linen'].toUpperCase(),
        checkIn: room['Check In Time'],
        checkOut: room['Check Out Time'],
      }, { onConflict: 'roomId' });
    
    if (taskError) {
      console.error(`Error creating room task for room ${roomNumber}:`, taskError);
    } else {
      console.log(`Created/updated room task for room ${roomNumber}`);
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