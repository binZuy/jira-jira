import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    // Get room number from query parameters
    const url = new URL(req.url);
    const roomNumber = url.searchParams.get('roomNumber');
    
    if (!roomNumber) {
      return NextResponse.json({ error: 'Room number is required' }, { status: 400 });
    }
    
    console.log(`API - getRoomInfo: roomNumber: ${roomNumber}`);
    
    const supabase = await createClient();
    
    // Get room data from Supabase
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('roomNumber', Number(roomNumber))
      .single();
    
    if (roomError || !roomData) {
      console.error(`API - Room ${roomNumber} not found: ${roomError?.message || 'No data'}`);
      return NextResponse.json({ error: `Room ${roomNumber} not found` }, { status: 404 });
    }
    
    // Get tasks that have data for this room
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, status, priority, description, dueDate, roomStatus, linen, checkIn, checkOut, roomType, created_at, assigneeName, assigneeId')
      .eq('roomId', roomData.id);
    
    if (tasksError) {
      console.error(`API - Error fetching tasks for room ${roomNumber}:`, tasksError.message);
      return NextResponse.json({ 
        error: `Error fetching tasks for room ${roomNumber}: ${tasksError.message}` 
      }, { status: 500 });
    }
    
    // If there are no tasks, return basic room info
    if (!tasksData || tasksData.length === 0) {
      return NextResponse.json({
        roomNumber: roomData.roomNumber,
        roomType: roomData.roomType,
        id: roomData.id,
        created_at: roomData.created_at,
        tasks: [],
      });
    }
    
    // Get the most recent task to extract room data from
    // Sort tasks by created_at in descending order and take the first one
    const latestTask = tasksData.sort((a, b) => 
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    )[0];
    
    // Return both room data and associated task data
    const result = {
      roomNumber: roomData.roomNumber,
      roomType: latestTask.roomType || roomData.roomType,
      priority: latestTask.priority,
      status: latestTask.status,
      roomStatus: latestTask.roomStatus,
      linen: latestTask.linen ? String(latestTask.linen).charAt(0) + String(latestTask.linen).slice(1).toLowerCase() : '',
      checkInTime: latestTask.checkIn,
      checkOutTime: latestTask.checkOut,
      roomId: roomData.id,
      assigneeName: latestTask.assigneeName,
      dueDate: latestTask.dueDate,
      tasks: tasksData.map(task => ({
        id: task.id,
        name: task.name,
        status: task.status,
        priority: task.priority,
        description: task.description,
        dueDate: task.dueDate,
        assigneeName: task.assigneeName
      })),
    };
    
    console.log(`API - Retrieved information for room ${roomNumber}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API - Unexpected error in getRoomInfo:', error);
    return NextResponse.json({ 
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 