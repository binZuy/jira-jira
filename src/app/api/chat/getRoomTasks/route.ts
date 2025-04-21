import { NextResponse } from 'next/server';
import { getRoomTasks } from '@/features/chats/libs/ai/tools/get-room-tasks';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Get room number from query parameters
    const url = new URL(req.url);
    const roomNumber = url.searchParams.get('roomNumber');
    
    if (!roomNumber) {
      return NextResponse.json({ error: 'Room number is required' }, { status: 400 });
    }
    
    console.log(`API - getRoomTasks: roomNumber: ${roomNumber}`);
    
    // Execute the tool function
    const result = await getRoomTasks.execute(
      { roomNumber },
      { toolCallId: `get-room-tasks-${Date.now()}`, messages: [] }
    );
    
    console.log(`API - Retrieved ${result.taskCount || 0} tasks for room ${roomNumber}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API - Unexpected error in getRoomTasks:', error);
    return NextResponse.json({ 
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 