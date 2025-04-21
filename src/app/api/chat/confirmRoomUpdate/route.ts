import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { TaskStatus, Priority } from '@/lib/types/enums';

export async function POST(req: Request) {
  try {
    const { roomNumber, field, newValue, roomId } = await req.json();
    console.log(`API - confirmRoomUpdate: roomId: ${roomId}, field: ${field}, value: ${newValue}`);
    
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // Map UI field names to database column names
    const fieldMapping: Record<string, string> = {
      'Room Type': 'roomType',
      'Priority': 'priority',
      'Status': 'status',
      'Room Status': 'roomStatus',
      'Linen': 'linen',
      'Check In Time': 'checkIn',
      'Check Out Time': 'checkOut',
    };
    
    const dbField = fieldMapping[field];
    if (!dbField) {
      return NextResponse.json({ error: `Invalid field: ${field}` }, { status: 400 });
    }
    
    // Get all tasks for this room
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('roomId', roomId);
    
    if (tasksError) {
      console.error(`API - Error fetching tasks: ${tasksError.message}`);
      return NextResponse.json({ error: `Error fetching tasks: ${tasksError.message}` }, { status: 500 });
    }
    
    console.log(`API - Found ${tasks?.length || 0} tasks for room ${roomNumber}`);
    
    let updateError = null;
    
    // Normalize value based on field type
    const normalizeValue = (field: string, value: string) => {
      if (!value) return value;
      
      // Special cases for status
      if (field === 'status') {
        // Convert "TO DO" to "TODO" (special case without underscore)
        if (value.toUpperCase() === 'TO DO') return 'TODO';
        
        // Replace spaces with underscores for status enums
        return value.toUpperCase().replace(/\s+/g, '_');
      }
      
      // For other enum fields, convert to uppercase and replace spaces with underscores
      if (field === 'priority' || field === 'roomStatus' || field === 'roomType' || field === 'linen') {
        return value.toUpperCase().replace(/\s+/g, '_');
      }
      
      return value;
    };
    
    // If there are existing tasks, update all of them with the new value
    if (tasks && tasks.length > 0) {
      // Normalize value based on the field type
      const valueToUpdate = normalizeValue(dbField, newValue);
      
      console.log(`API - Executing update query for roomId: ${roomId}, field: ${dbField}, value: ${valueToUpdate}`);
      const { error, data } = await supabase
        .from('tasks')
        .update({ [dbField]: valueToUpdate })
        .eq('roomId', roomId)
        .select();
      
      console.log(`API - Update result: ${error ? 'Error' : 'Success'}, affected rows: ${data?.length || 0}`);
      updateError = error;
    } else {
      // Create a new task entry for this room with the minimal required fields
      const valueToInsert = normalizeValue(dbField, newValue);
      
      // Get the room number from the rooms table
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('roomNumber, roomType')
        .eq('id', roomId)
        .single();
      
      if (roomError || !room) {
        console.error(`API - Room not found with ID ${roomId}: ${roomError?.message || 'No data'}`);
        return NextResponse.json({ error: `Room not found with ID ${roomId}` }, { status: 404 });
      }
      
      console.log(`API - Creating new task for room ${roomNumber} with ${dbField}=${valueToInsert}`);
      
      // Create a basic task for this room
      const { error, data } = await supabase
        .from('tasks')
        .insert({
          roomId,
          name: `Room ${roomNumber} maintenance`,
          status: TaskStatus.TODO,
          priority: Priority.MEDIUM,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          [dbField]: valueToInsert,
        })
        .select();
      
      console.log(`API - Task creation result: ${error ? 'Error' : 'Success'}, created: ${data?.length || 0} tasks`);
      updateError = error;
    }
    
    if (updateError) {
      console.error(`API - Failed to update room: ${updateError.message}`);
      return NextResponse.json({ error: `Failed to update room: ${updateError.message}` }, { status: 500 });
    }
    
    console.log(`API - Update successful for room ${roomNumber}`);
    return NextResponse.json({ 
      message: `Room ${roomNumber} ${field} has been updated to "${newValue}"`,
      status: 'success'
    });
  } catch (error) {
    console.error('API - Unexpected error in confirmRoomUpdate:', error);
    return NextResponse.json({ 
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 